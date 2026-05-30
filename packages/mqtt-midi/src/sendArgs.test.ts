import { describe, expect, it } from "vitest";

import {
  parseControlChangeSend,
  parseNoteOffSend,
  parseNoteOnSend,
  parsePitchBendSend,
  parseProgramChangeSend,
  parseSysexSend,
} from "./sendArgs.js";

describe("sendArgs", () => {
  it("parses note on", () => {
    expect(parseNoteOnSend(1, 60, 100)).toEqual({
      channel: 1,
      note: 60,
      velocity: 100,
      direction: "in",
    });
  });

  it("parses note off with direction as third arg", () => {
    expect(parseNoteOffSend(1, 60, "out")).toEqual({
      channel: 1,
      note: 60,
      velocity: 0,
      direction: "out",
    });
  });

  it("parses control change", () => {
    expect(parseControlChangeSend(1, 7, 127, "out")).toEqual({
      channel: 1,
      controller: 7,
      value: 127,
      direction: "out",
    });
  });

  it("parses sysex array", () => {
    expect(parseSysexSend([0xf0, 0xf7], "out")).toEqual({
      data: [0xf0, 0xf7],
      direction: "out",
    });
  });

  it("parses program change", () => {
    expect(parseProgramChangeSend(1, 5, "out")).toEqual({
      channel: 1,
      program: 5,
      direction: "out",
    });
  });

  it("parses pitch bend", () => {
    expect(parsePitchBendSend(1, 8192)).toEqual({
      channel: 1,
      value: 8192,
      direction: "in",
    });
  });
});
