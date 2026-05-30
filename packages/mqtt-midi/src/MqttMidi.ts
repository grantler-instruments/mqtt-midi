import mqtt, { type MqttClient } from "mqtt";

import {
  decodePitchBend,
  decodeSevenBit,
  decodeSysexJson,
  encodeEmptyPayload,
  encodePitchBend,
  encodeSevenBit,
  encodeSysexJson,
  payloadToBytes,
  toPayload,
} from "./codec.js";
import { isLifecycleEvent, isMidiListenEvent, listenTopicPattern } from "./listen.js";
import type { ListenOptions, MidiListenEvent } from "./listen.js";
import {
  dispatchMidiListeners,
  MqttMidiChannel,
  type MidiListenerRegistration,
  type MqttMidiCore,
} from "./MqttMidiChannel.js";
import {
  parseControlChangeSend,
  parseNoteOffSend,
  parseNoteOnSend,
  parsePitchBendSend,
  parseProgramChangeSend,
  parseSysexSend,
} from "./sendArgs.js";
import { TopicSubscriptionRegistry } from "./subscriptions.js";
import {
  buildControlChangeTopic,
  buildNoteOffTopic,
  buildNoteOnTopic,
  buildPitchBendTopic,
  buildProgramChangeTopic,
  buildSysexTopic,
  buildSystemTopic,
  isValidChannel,
  isValidController,
  isValidNote,
  isValidPitchBend,
  isValidSevenBit,
  parseTopic,
} from "./topics.js";
import type {
  Direction,
  MqttMidiEvent,
  MqttMidiEvents,
  MqttMidiListener,
  MqttMidiOptions,
  SystemMessageType,
} from "./types.js";

export class MqttMidi implements MqttMidiCore {
  private readonly url: string;
  private readonly prefix: string;
  private readonly defaultDirection: Direction;
  private readonly mqttOptions: MqttMidiOptions["mqttOptions"];
  private client: MqttClient | null = null;
  private readonly lifecycleListeners = new Map<
    "connect" | "disconnect" | "error",
    Set<(...args: unknown[]) => void>
  >();
  private readonly midiListeners = new Set<MidiListenerRegistration>();
  private readonly listenerLookup = new Map<string, MidiListenerRegistration>();

  private listenerKey(
    event: MidiListenEvent,
    listener: MqttMidiListener<MidiListenEvent>,
    channel?: number,
  ): string {
    return `${event}:${channel ?? "*"}:${listener}`;
  }
  private readonly topicRegistry = new TopicSubscriptionRegistry();
  private readonly rawTopicRegistry = new TopicSubscriptionRegistry();

  constructor(options: MqttMidiOptions) {
    if (!options.url) {
      throw new Error("url is required");
    }
    if (!options.prefix) {
      throw new Error("prefix is required");
    }
    this.url = options.url;
    this.prefix = options.prefix;
    this.defaultDirection = options.defaultDirection ?? "out";
    this.mqttOptions = options.mqttOptions;
  }

  get connected(): boolean {
    return this.client?.connected ?? false;
  }

  get topicPrefix(): string {
    return this.prefix;
  }

  channel(channel: number): MqttMidiChannel {
    if (!isValidChannel(channel)) {
      throw new RangeError(`channel must be 1–16, got ${channel}`);
    }
    return new MqttMidiChannel(this, channel);
  }

  on<E extends MqttMidiEvent>(event: E, listener: MqttMidiListener<E>): this {
    if (isLifecycleEvent(event)) {
      this.addLifecycleListener(event, listener as MqttMidiListener<typeof event>);
      return this;
    }
    if (isMidiListenEvent(event)) {
      this.registerMidiListener(event, listener as MqttMidiListener<typeof event>);
    }
    return this;
  }

  off<E extends MqttMidiEvent>(event: E, listener: MqttMidiListener<E>): this {
    if (isLifecycleEvent(event)) {
      this.lifecycleListeners.get(event)?.delete(listener as (...args: unknown[]) => void);
      return this;
    }
    if (isMidiListenEvent(event)) {
      this.unregisterMidiListener(event, listener as MqttMidiListener<typeof event>);
    }
    return this;
  }

  registerMidiListener<E extends MidiListenEvent>(
    event: E,
    listener: MqttMidiListener<E>,
    options: ListenOptions & { channel?: number } = {},
  ): void {
    const direction = options.direction ?? this.defaultDirection;
    const topic = listenTopicPattern(this.prefix, event, options.channel, {
      direction,
      controller: options.controller,
    });

    const key = this.listenerKey(event, listener as MqttMidiListener<MidiListenEvent>, options.channel);
    if (this.listenerLookup.has(key)) {
      return;
    }

    const registration: MidiListenerRegistration = {
      event,
      topic,
      channel: options.channel,
      controller: options.controller,
      direction,
      listener: listener as (...args: unknown[]) => void,
    };

    this.midiListeners.add(registration);
    this.listenerLookup.set(key, registration);
    void this.addTopicSubscription(this.topicRegistry, topic);
  }

  unregisterMidiListener<E extends MidiListenEvent>(
    event: E,
    listener: MqttMidiListener<E>,
    channel?: number,
  ): void {
    const key = this.listenerKey(event, listener as MqttMidiListener<MidiListenEvent>, channel);
    const registration = this.listenerLookup.get(key);
    if (!registration) {
      return;
    }

    this.midiListeners.delete(registration);
    this.listenerLookup.delete(key);
    void this.removeTopicSubscription(this.topicRegistry, registration.topic);
  }

  /** Subscribe to a raw MQTT topic pattern (wildcards allowed). */
  subscribe(topic: string): this {
    if (!topic) {
      throw new Error("topic is required");
    }
    void this.addTopicSubscription(this.rawTopicRegistry, topic);
    return this;
  }

  /** Unsubscribe from a raw MQTT topic pattern. */
  unsubscribe(topic: string): this {
    void this.removeTopicSubscription(this.rawTopicRegistry, topic);
    return this;
  }

  async connect(): Promise<this> {
    if (this.client?.connected) {
      return this;
    }

    await new Promise<void>((resolve, reject) => {
      const client = mqtt.connect(this.url, this.mqttOptions);

      const onConnect = () => {
        cleanup();
        this.client = client;
        this.wireClient(client);
        void this.syncBrokerSubscriptions(client).then(
          () => {
            this.emitLifecycle("connect");
            resolve();
          },
          (err) => {
            client.end(true);
            this.client = null;
            reject(err);
          },
        );
      };

      const onError = (err: Error) => {
        cleanup();
        client.end(true);
        reject(err);
      };

      const cleanup = () => {
        client.off("connect", onConnect);
        client.off("error", onError);
      };

      client.once("connect", onConnect);
      client.once("error", onError);
    });

    return this;
  }

  async disconnect(): Promise<void> {
    const client = this.client;
    if (!client) {
      return;
    }

    await new Promise<void>((resolve) => {
      client.end(false, {}, () => {
        this.client = null;
        this.emitLifecycle("disconnect");
        resolve();
      });
    });
  }

  sendControlChange(channel: number, controller: number, value: number, direction?: Direction): void {
    const { channel: ch, controller: cc, value: val, direction: dir } = parseControlChangeSend(
      channel,
      controller,
      value,
      direction,
    );
    this.assertChannel(ch);
    if (!isValidController(cc)) {
      throw new RangeError(`controller must be 0–127, got ${cc}`);
    }
    const topic = buildControlChangeTopic(this.prefix, dir, ch, cc);
    this.publish(topic, encodeSevenBit(val));
  }

  sendNoteOn(channel: number, note: number, velocity: number, direction?: Direction): void {
    const { channel: ch, note: n, velocity: vel, direction: dir } = parseNoteOnSend(
      channel,
      note,
      velocity,
      direction,
    );
    this.assertChannel(ch);
    if (!isValidNote(n)) {
      throw new RangeError(`note must be 0–127, got ${n}`);
    }
    const topic = buildNoteOnTopic(this.prefix, dir, ch, n);
    this.publish(topic, encodeSevenBit(vel));
  }

  sendNoteOff(
    channel: number,
    note: number,
    velocity?: number,
    direction?: Direction,
  ): void;
  sendNoteOff(channel: number, note: number, direction: Direction): void;
  sendNoteOff(
    channel: number,
    note: number,
    velocityOrDirection?: number | Direction,
    direction?: Direction,
  ): void {
    const { channel: ch, note: n, velocity: vel, direction: dir } = parseNoteOffSend(
      channel,
      note,
      velocityOrDirection,
      direction,
    );
    this.assertChannel(ch);
    if (!isValidNote(n)) {
      throw new RangeError(`note must be 0–127, got ${n}`);
    }
    const topic = buildNoteOffTopic(this.prefix, dir, ch, n);
    this.publish(topic, encodeSevenBit(vel));
  }

  sendProgramChange(channel: number, program: number, direction?: Direction): void {
    const { channel: ch, program: prog, direction: dir } = parseProgramChangeSend(
      channel,
      program,
      direction,
    );
    this.assertChannel(ch);
    if (!isValidSevenBit(prog)) {
      throw new RangeError(`program must be 0–127, got ${prog}`);
    }
    const topic = buildProgramChangeTopic(this.prefix, dir, ch);
    this.publish(topic, encodeSevenBit(prog));
  }

  sendPitchBend(channel: number, value: number, direction?: Direction): void {
    const { channel: ch, value: val, direction: dir } = parsePitchBendSend(
      channel,
      value,
      direction,
    );
    this.assertChannel(ch);
    if (!isValidPitchBend(val)) {
      throw new RangeError(`pitch bend must be 0–16383, got ${val}`);
    }
    const topic = buildPitchBendTopic(this.prefix, dir, ch);
    this.publish(topic, encodePitchBend(val));
  }

  sendSysex(data: number[], direction?: Direction): void {
    const { data: bytes, direction: dir } = parseSysexSend(data, direction);
    const topic = buildSysexTopic(this.prefix, dir);
    this.publish(topic, encodeSysexJson(bytes));
  }

  sendSystem(type: SystemMessageType, direction: Direction = "in"): void {
    const topic = buildSystemTopic(this.prefix, direction, type);
    this.publish(topic, encodeEmptyPayload());
  }

  sendClock(direction: Direction = "in"): void {
    this.sendSystem("clock", direction);
  }

  sendStart(direction: Direction = "in"): void {
    this.sendSystem("start", direction);
  }

  sendStop(direction: Direction = "in"): void {
    this.sendSystem("stop", direction);
  }

  sendContinue(direction: Direction = "in"): void {
    this.sendSystem("continue", direction);
  }

  private wireClient(client: MqttClient): void {
    client.on("message", (topic, payload) => {
      try {
        this.handleMessage(topic, payload);
      } catch (err) {
        this.emitLifecycle("error", err instanceof Error ? err : new Error(String(err)));
      }
    });

    client.on("error", (err) => {
      this.emitLifecycle("error", err);
    });

    client.on("close", () => {
      if (this.client === client) {
        this.client = null;
        this.emitLifecycle("disconnect");
      }
    });
  }

  private async syncBrokerSubscriptions(client: MqttClient): Promise<void> {
    const topics = new Set([
      ...this.topicRegistry.topics,
      ...this.rawTopicRegistry.topics,
    ]);
    await Promise.all([...topics].map((topic) => this.topicRegistry.subscribe(client, topic)));
  }

  private async addTopicSubscription(
    registry: TopicSubscriptionRegistry,
    topic: string,
  ): Promise<void> {
    const first = registry.increment(topic);
    if (first && this.client?.connected) {
      await registry.subscribe(this.client, topic);
    }
  }

  private async removeTopicSubscription(
    registry: TopicSubscriptionRegistry,
    topic: string,
  ): Promise<void> {
    const last = registry.decrement(topic);
    if (last && this.client?.connected) {
      await registry.unsubscribe(this.client, topic);
    }
  }

  private handleMessage(topic: string, payload: Buffer): void {
    const parsed = parseTopic(this.prefix, topic);
    if (!parsed) {
      return;
    }

    const bytes = payloadToBytes(payload);

    if (parsed.kind === "sysex") {
      const { data } = decodeSysexJson(bytes);
      dispatchMidiListeners(this.midiListeners, "sysex", {
        direction: parsed.direction,
        data,
      });
      return;
    }

    if (parsed.kind === "system") {
      dispatchMidiListeners(this.midiListeners, parsed.type, {
        direction: parsed.direction,
        type: parsed.type,
      });
      return;
    }

    switch (parsed.kind) {
      case "controlChange":
        dispatchMidiListeners(this.midiListeners, "controlChange", {
          direction: parsed.direction,
          channel: parsed.channel,
          controller: parsed.controller,
          value: decodeSevenBit(bytes),
        });
        break;
      case "noteOn":
        dispatchMidiListeners(this.midiListeners, "noteOn", {
          direction: parsed.direction,
          channel: parsed.channel,
          note: parsed.note,
          velocity: decodeSevenBit(bytes),
        });
        break;
      case "noteOff":
        dispatchMidiListeners(this.midiListeners, "noteOff", {
          direction: parsed.direction,
          channel: parsed.channel,
          note: parsed.note,
          velocity: decodeSevenBit(bytes),
        });
        break;
      case "programChange":
        dispatchMidiListeners(this.midiListeners, "programChange", {
          direction: parsed.direction,
          channel: parsed.channel,
          program: decodeSevenBit(bytes),
        });
        break;
      case "pitchBend":
        dispatchMidiListeners(this.midiListeners, "pitchBend", {
          direction: parsed.direction,
          channel: parsed.channel,
          value: decodePitchBend(bytes),
        });
        break;
    }
  }

  private publish(topic: string, payload: Uint8Array): void {
    const client = this.client;
    if (!client?.connected) {
      throw new Error("MqttMidi is not connected");
    }
    client.publish(topic, toPayload(payload) as Buffer);
  }

  private assertChannel(channel: number): void {
    if (!isValidChannel(channel)) {
      throw new RangeError(`channel must be 1–16, got ${channel}`);
    }
  }

  private addLifecycleListener<E extends "connect" | "disconnect" | "error">(
    event: E,
    listener: MqttMidiListener<E>,
  ): void {
    let set = this.lifecycleListeners.get(event);
    if (!set) {
      set = new Set();
      this.lifecycleListeners.set(event, set);
    }
    set.add(listener as (...args: unknown[]) => void);
  }

  private emitLifecycle<E extends "connect" | "disconnect" | "error">(
    event: E,
    ...args: MqttMidiEvents[E] extends void ? [] : [MqttMidiEvents[E]]
  ): void {
    const set = this.lifecycleListeners.get(event);
    if (!set) {
      return;
    }
    for (const listener of set) {
      if (args.length === 0) {
        (listener as () => void)();
      } else {
        (listener as (message: MqttMidiEvents[E]) => void)(args[0]);
      }
    }
  }
}

export { MqttMidiChannel };
