import { describe, expect, it } from "vitest";

import {
  decodePitchBend,
  decodeSevenBit,
  decodeSysexJson,
  encodePitchBend,
  encodeSevenBit,
  encodeSysexJson,
} from "./codec.js";

describe("codec", () => {
  it("encodes and decodes 7-bit value", () => {
    const payload = encodeSevenBit(127);
    expect(decodeSevenBit(payload)).toBe(127);
  });

  it("encodes and decodes pitch bend", () => {
    const payload = encodePitchBend(8192);
    expect(decodePitchBend(payload)).toBe(8192);
  });

  it("encodes and decodes sysex json", () => {
    const data = [0xf0, 0x7d, 0x09, 0xf7];
    const payload = encodeSysexJson(data);
    expect(decodeSysexJson(payload).data).toEqual(data);
  });

  it("rejects invalid sysex bytes", () => {
    expect(() => encodeSysexJson([256])).toThrow(RangeError);
  });

  it("rejects malformed sysex json", () => {
    const payload = new TextEncoder().encode("{}");
    expect(() => decodeSysexJson(payload)).toThrow(SyntaxError);
  });
});
