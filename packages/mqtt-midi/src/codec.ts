import { isValidPitchBend, isValidSevenBit } from "./topics.js";

export function toPayload(data: Uint8Array | number[]): Uint8Array {
  return data instanceof Uint8Array ? data : Uint8Array.from(data);
}

export function payloadToBytes(payload: Buffer | Uint8Array | string): Uint8Array {
  if (typeof payload === "string") {
    return new TextEncoder().encode(payload);
  }
  if (payload instanceof Uint8Array) {
    return payload;
  }
  return Uint8Array.from(payload);
}

export function encodeSevenBit(value: number): Uint8Array {
  if (!isValidSevenBit(value)) {
    throw new RangeError(`Expected 7-bit MIDI value 0–127, got ${value}`);
  }
  return Uint8Array.of(value);
}

export function decodeSevenBit(payload: Uint8Array): number {
  if (payload.length !== 1) {
    throw new RangeError(`Expected 1-byte payload, got ${payload.length} bytes`);
  }
  const value = payload[0]!;
  if (!isValidSevenBit(value)) {
    throw new RangeError(`Invalid 7-bit MIDI value: ${value}`);
  }
  return value;
}

export function encodePitchBend(value: number): Uint8Array {
  if (!isValidPitchBend(value)) {
    throw new RangeError(`Expected pitch bend 0–16383, got ${value}`);
  }
  const lsb = value & 0x7f;
  const msb = (value >> 7) & 0x7f;
  return Uint8Array.of(lsb, msb);
}

export function decodePitchBend(payload: Uint8Array): number {
  if (payload.length !== 2) {
    throw new RangeError(`Expected 2-byte pitch bend payload, got ${payload.length} bytes`);
  }
  const lsb = payload[0]!;
  const msb = payload[1]!;
  if (lsb > 127 || msb > 127) {
    throw new RangeError("Pitch bend bytes must be 7-bit values");
  }
  return (msb << 7) | lsb;
}

export interface SysexPayload {
  data: number[];
}

export function encodeSysexJson(data: number[]): Uint8Array {
  for (const byte of data) {
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
      throw new RangeError(`Invalid SysEx byte: ${byte}`);
    }
  }
  const json = JSON.stringify({ data });
  return new TextEncoder().encode(json);
}

export function decodeSysexJson(payload: Uint8Array): SysexPayload {
  const text = new TextDecoder().decode(payload);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SyntaxError("SysEx payload must be JSON");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("data" in parsed) ||
    !Array.isArray((parsed as SysexPayload).data)
  ) {
    throw new SyntaxError('SysEx JSON must be { "data": number[] }');
  }

  const data = (parsed as SysexPayload).data;
  for (const byte of data) {
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
      throw new RangeError(`Invalid SysEx byte in JSON: ${byte}`);
    }
  }

  return { data };
}

export function encodeEmptyPayload(): Uint8Array {
  return new Uint8Array(0);
}
