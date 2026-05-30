import type { SystemMessageType } from "@grantler-instruments/mqtt-midi";

export type ParsedMidiMessage =
  | { kind: "noteOn"; channel: number; note: number; velocity: number }
  | { kind: "noteOff"; channel: number; note: number; velocity: number }
  | { kind: "controlChange"; channel: number; controller: number; value: number }
  | { kind: "programChange"; channel: number; program: number }
  | { kind: "pitchBend"; channel: number; value: number }
  | { kind: "sysex"; data: number[] }
  | { kind: "system"; type: SystemMessageType };

const SYSTEM_BY_STATUS: Record<number, SystemMessageType> = {
  0xf8: "clock",
  0xfa: "start",
  0xfc: "stop",
  0xfb: "continue",
};

/** Parse a single RtMidi message (status + data bytes). */
export function parseMidiMessage(message: number[]): ParsedMidiMessage | null {
  if (message.length === 0) {
    return null;
  }

  const status = message[0]!;

  if (status >= 0xf8) {
    const type = SYSTEM_BY_STATUS[status];
    return type ? { kind: "system", type } : null;
  }

  if (status === 0xf0) {
    return { kind: "sysex", data: [...message] };
  }

  const command = status & 0xf0;
  const midiChannel = (status & 0x0f) + 1;

  if (midiChannel < 1 || midiChannel > 16) {
    return null;
  }

  switch (command) {
    case 0x90: {
      if (message.length < 3) {
        return null;
      }
      const note = message[1]!;
      const velocity = message[2]!;
      if (velocity === 0) {
        return { kind: "noteOff", channel: midiChannel, note, velocity: 0 };
      }
      return { kind: "noteOn", channel: midiChannel, note, velocity };
    }
    case 0x80: {
      if (message.length < 3) {
        return null;
      }
      return {
        kind: "noteOff",
        channel: midiChannel,
        note: message[1]!,
        velocity: message[2]!,
      };
    }
    case 0xb0: {
      if (message.length < 3) {
        return null;
      }
      return {
        kind: "controlChange",
        channel: midiChannel,
        controller: message[1]!,
        value: message[2]!,
      };
    }
    case 0xc0: {
      if (message.length < 2) {
        return null;
      }
      return {
        kind: "programChange",
        channel: midiChannel,
        program: message[1]!,
      };
    }
    case 0xe0: {
      if (message.length < 3) {
        return null;
      }
      const lsb = message[1]!;
      const msb = message[2]!;
      return {
        kind: "pitchBend",
        channel: midiChannel,
        value: (msb << 7) | lsb,
      };
    }
    default:
      return null;
  }
}

export function toMidiBytes(parsed: ParsedMidiMessage): number[] {
  switch (parsed.kind) {
    case "noteOn":
      return [0x90 | (parsed.channel - 1), parsed.note, parsed.velocity];
    case "noteOff":
      return [0x80 | (parsed.channel - 1), parsed.note, parsed.velocity];
    case "controlChange":
      return [0xb0 | (parsed.channel - 1), parsed.controller, parsed.value];
    case "programChange":
      return [0xc0 | (parsed.channel - 1), parsed.program];
    case "pitchBend": {
      const lsb = parsed.value & 0x7f;
      const msb = (parsed.value >> 7) & 0x7f;
      return [0xe0 | (parsed.channel - 1), lsb, msb];
    }
    case "sysex":
      return parsed.data;
    case "system": {
      const status = Object.entries(SYSTEM_BY_STATUS).find(([, t]) => t === parsed.type)?.[0];
      return status !== undefined ? [Number(status)] : [];
    }
  }
}
