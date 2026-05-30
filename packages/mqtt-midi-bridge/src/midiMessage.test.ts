import { describe, expect, it } from "vitest";

import { parseMidiMessage, toMidiBytes } from "./midiMessage.js";

describe("parseMidiMessage", () => {
  it("parses note on", () => {
    expect(parseMidiMessage([0x90, 60, 100])).toEqual({
      kind: "noteOn",
      channel: 1,
      note: 60,
      velocity: 100,
    });
  });

  it("treats note on velocity 0 as note off", () => {
    expect(parseMidiMessage([0x90, 60, 0])).toEqual({
      kind: "noteOff",
      channel: 1,
      note: 60,
      velocity: 0,
    });
  });

  it("parses pitch bend", () => {
    expect(parseMidiMessage([0xe0, 0x00, 0x40])).toEqual({
      kind: "pitchBend",
      channel: 1,
      value: 8192,
    });
  });

  it("parses clock", () => {
    expect(parseMidiMessage([0xf8])).toEqual({ kind: "system", type: "clock" });
  });
});

describe("toMidiBytes", () => {
  it("round-trips note on", () => {
    const parsed = parseMidiMessage([0x91, 64, 127])!;
    expect(toMidiBytes(parsed)).toEqual([0x91, 64, 127]);
  });
});
