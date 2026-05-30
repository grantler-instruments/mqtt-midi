import type { Direction, MqttMidiEvent, SystemMessageType } from "./types.js";
import { isValidChannel, isValidController } from "./topics.js";

/** MIDI events that map to MQTT topic subscriptions. */
export type MidiListenEvent = Exclude<MqttMidiEvent, "connect" | "disconnect" | "error">;

export interface ListenOptions {
  /** MQTT direction segment (default: `out`) */
  direction?: Direction;
  /** Control change controller 0–127 (channel-scoped listeners only) */
  controller?: number;
}

export function listenTopicPattern(
  prefix: string,
  event: MidiListenEvent,
  channel?: number,
  options: ListenOptions = {},
): string {
  const direction = options.direction ?? "out";

  if (channel !== undefined && !isValidChannel(channel)) {
    throw new RangeError(`channel must be 1–16, got ${channel}`);
  }

  if (options.controller !== undefined) {
    if (event !== "controlChange") {
      throw new Error("controller filter applies only to controlChange listeners");
    }
    if (channel === undefined) {
      throw new Error("controller filter requires a channel-scoped listener");
    }
    if (!isValidController(options.controller)) {
      throw new RangeError(`controller must be 0–127, got ${options.controller}`);
    }
    return `${prefix}/${direction}/cc/${channel}/${options.controller}`;
  }

  switch (event) {
    case "noteOn":
      return channel !== undefined
        ? `${prefix}/${direction}/noteon/${channel}/#`
        : `${prefix}/${direction}/noteon/#`;
    case "noteOff":
      return channel !== undefined
        ? `${prefix}/${direction}/noteoff/${channel}/#`
        : `${prefix}/${direction}/noteoff/#`;
    case "controlChange":
      return channel !== undefined
        ? `${prefix}/${direction}/cc/${channel}/#`
        : `${prefix}/${direction}/cc/#`;
    case "programChange":
      return channel !== undefined
        ? `${prefix}/${direction}/program/${channel}`
        : `${prefix}/${direction}/program/#`;
    case "pitchBend":
      return channel !== undefined
        ? `${prefix}/${direction}/pitchbend/${channel}`
        : `${prefix}/${direction}/pitchbend/#`;
    case "sysex":
      return `${prefix}/${direction}/sysex`;
    case "clock":
    case "start":
    case "stop":
    case "continue":
      return `${prefix}/${direction}/${event satisfies SystemMessageType}`;
    default: {
      const _exhaustive: never = event;
      throw new Error(`Unknown listen event: ${_exhaustive}`);
    }
  }
}

export function isLifecycleEvent(event: MqttMidiEvent): event is "connect" | "disconnect" | "error" {
  return event === "connect" || event === "disconnect" || event === "error";
}

export function isMidiListenEvent(event: MqttMidiEvent): event is MidiListenEvent {
  return !isLifecycleEvent(event);
}
