import type { Direction, MqttMidiEvents, MqttMidiListener } from "./types.js";
import type { ListenOptions, MidiListenEvent } from "./listen.js";

export interface MidiListenerRegistration {
  event: MidiListenEvent;
  topic: string;
  channel?: number;
  controller?: number;
  direction: Direction;
  listener: (...args: unknown[]) => void;
}

export class MqttMidiChannel {
  constructor(
    private readonly mqttMidi: MqttMidiCore,
    private readonly channel: number,
  ) {}

  on<E extends MidiListenEvent>(
    event: E,
    listener: MqttMidiListener<E>,
  ): this;
  on<E extends MidiListenEvent>(
    event: E,
    options: ListenOptions,
    listener: MqttMidiListener<E>,
  ): this;
  on<E extends MidiListenEvent>(
    event: E,
    listenerOrOptions: MqttMidiListener<E> | ListenOptions,
    maybeListener?: MqttMidiListener<E>,
  ): this {
    const { options, listener } = parseOnArgs(listenerOrOptions, maybeListener);
    this.mqttMidi.registerMidiListener(event, listener, {
      ...options,
      channel: this.channel,
    });
    return this;
  }

  off<E extends MidiListenEvent>(event: E, listener: MqttMidiListener<E>): this {
    this.mqttMidi.unregisterMidiListener(event, listener, this.channel);
    return this;
  }
}

/** Shared listener registration surface used by {@link MqttMidi} and {@link MqttMidiChannel}. */
export interface MqttMidiCore {
  registerMidiListener<E extends MidiListenEvent>(
    event: E,
    listener: MqttMidiListener<E>,
    options?: ListenOptions & { channel?: number },
  ): void;
  unregisterMidiListener<E extends MidiListenEvent>(
    event: E,
    listener: MqttMidiListener<E>,
    channel?: number,
  ): void;
}

function parseOnArgs<E extends MidiListenEvent>(
  listenerOrOptions: MqttMidiListener<E> | ListenOptions,
  maybeListener?: MqttMidiListener<E>,
): { options: ListenOptions; listener: MqttMidiListener<E> } {
  if (typeof listenerOrOptions === "function") {
    return { options: {}, listener: listenerOrOptions };
  }
  if (!maybeListener) {
    throw new Error("listener is required");
  }
  return { options: listenerOrOptions, listener: maybeListener };
}

export function dispatchMidiListeners(
  registrations: Iterable<MidiListenerRegistration>,
  event: MidiListenEvent,
  message: MqttMidiEvents[MidiListenEvent],
): void {
  for (const reg of registrations) {
    if (reg.event !== event) {
      continue;
    }
    if (reg.channel !== undefined && "channel" in message && message.channel !== reg.channel) {
      continue;
    }
    if (
      reg.controller !== undefined &&
      "controller" in message &&
      message.controller !== reg.controller
    ) {
      continue;
    }
    if ("direction" in message && message.direction !== reg.direction) {
      continue;
    }
    (reg.listener as (msg: typeof message) => void)(message);
  }
}
