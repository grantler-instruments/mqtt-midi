import type {
  Direction,
  ParsedTopicStub,
  SystemMessageType,
} from "./types.js";

const SYSTEM_TYPES = new Set<SystemMessageType>([
  "clock",
  "start",
  "stop",
  "continue",
]);

export function assertPrefix(prefix: string): void {
  if (!prefix || prefix.includes("+") || prefix.includes("#")) {
    throw new Error("prefix must be a non-empty MQTT topic segment without wildcards");
  }
}

export function buildTopic(
  prefix: string,
  direction: Direction,
  ...segments: (string | number)[]
): string {
  assertPrefix(prefix);
  return [prefix, direction, ...segments.map(String)].join("/");
}

export function buildControlChangeTopic(
  prefix: string,
  direction: Direction,
  channel: number,
  controller: number,
): string {
  return buildTopic(prefix, direction, "cc", channel, controller);
}

export function buildNoteOnTopic(
  prefix: string,
  direction: Direction,
  channel: number,
  note: number,
): string {
  return buildTopic(prefix, direction, "noteon", channel, note);
}

export function buildNoteOffTopic(
  prefix: string,
  direction: Direction,
  channel: number,
  note: number,
): string {
  return buildTopic(prefix, direction, "noteoff", channel, note);
}

export function buildProgramChangeTopic(
  prefix: string,
  direction: Direction,
  channel: number,
): string {
  return buildTopic(prefix, direction, "program", channel);
}

export function buildPitchBendTopic(
  prefix: string,
  direction: Direction,
  channel: number,
): string {
  return buildTopic(prefix, direction, "pitchbend", channel);
}

export function buildSysexTopic(prefix: string, direction: Direction): string {
  return buildTopic(prefix, direction, "sysex");
}

export function buildSystemTopic(
  prefix: string,
  direction: Direction,
  type: SystemMessageType,
): string {
  return buildTopic(prefix, direction, type);
}

export function parseTopic(prefix: string, topic: string): ParsedTopicStub | null {
  const expectedPrefix = `${prefix}/`;
  if (!topic.startsWith(expectedPrefix)) {
    return null;
  }

  const rest = topic.slice(expectedPrefix.length);
  const parts = rest.split("/");
  if (parts.length < 2) {
    return null;
  }

  const direction = parts[0];
  if (direction !== "in" && direction !== "out") {
    return null;
  }

  const type = parts[1];
  const meta = { direction } as const;

  if (type === "sysex") {
    return { kind: "sysex", ...meta };
  }

  if (SYSTEM_TYPES.has(type as SystemMessageType)) {
    return { kind: "system", ...meta, type: type as SystemMessageType };
  }

  if (type === "cc" && parts.length === 4) {
    const channel = Number(parts[2]);
    const controller = Number(parts[3]);
    if (!isValidChannel(channel) || !isValidController(controller)) {
      return null;
    }
    return { kind: "controlChange", ...meta, channel, controller };
  }

  if (type === "noteon" && parts.length === 4) {
    const channel = Number(parts[2]);
    const note = Number(parts[3]);
    if (!isValidChannel(channel) || !isValidNote(note)) {
      return null;
    }
    return { kind: "noteOn", ...meta, channel, note };
  }

  if (type === "noteoff" && parts.length === 4) {
    const channel = Number(parts[2]);
    const note = Number(parts[3]);
    if (!isValidChannel(channel) || !isValidNote(note)) {
      return null;
    }
    return { kind: "noteOff", ...meta, channel, note };
  }

  if (type === "program" && parts.length === 3) {
    const channel = Number(parts[2]);
    if (!isValidChannel(channel)) {
      return null;
    }
    return { kind: "programChange", ...meta, channel };
  }

  if (type === "pitchbend" && parts.length === 3) {
    const channel = Number(parts[2]);
    if (!isValidChannel(channel)) {
      return null;
    }
    return { kind: "pitchBend", ...meta, channel };
  }

  return null;
}

export function isValidChannel(channel: number): boolean {
  return Number.isInteger(channel) && channel >= 1 && channel <= 16;
}

export function isValidNote(note: number): boolean {
  return Number.isInteger(note) && note >= 0 && note <= 127;
}

export function isValidController(controller: number): boolean {
  return Number.isInteger(controller) && controller >= 0 && controller <= 127;
}

export function isValidSevenBit(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 127;
}

export function isValidPitchBend(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 16383;
}
