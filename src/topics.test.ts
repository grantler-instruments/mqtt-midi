import { describe, expect, it } from "vitest";

import {
  buildControlChangeTopic,
  buildNoteOnTopic,
  buildSysexTopic,
  parseTopic,
} from "./topics.js";

const PREFIX = "midi/stage-left";

describe("topics", () => {
  it("builds control change topic", () => {
    expect(buildControlChangeTopic(PREFIX, "in", 1, 7)).toBe(
      "midi/stage-left/in/cc/1/7",
    );
  });

  it("builds note on topic", () => {
    expect(buildNoteOnTopic(PREFIX, "out", 2, 60)).toBe(
      "midi/stage-left/out/noteon/2/60",
    );
  });

  it("parses control change round-trip", () => {
    const topic = buildControlChangeTopic(PREFIX, "out", 1, 7);
    const parsed = parseTopic(PREFIX, topic);
    expect(parsed).toEqual({
      kind: "controlChange",
      direction: "out",
      channel: 1,
      controller: 7,
    });
  });

  it("parses sysex topic", () => {
    const topic = buildSysexTopic(PREFIX, "in");
    expect(parseTopic(PREFIX, topic)).toEqual({
      kind: "sysex",
      direction: "in",
    });
  });

  it("parses system clock", () => {
    expect(parseTopic(PREFIX, `${PREFIX}/out/clock`)).toEqual({
      kind: "system",
      direction: "out",
      type: "clock",
    });
  });

  it("rejects topics outside prefix", () => {
    expect(parseTopic(PREFIX, "midi/other/out/cc/1/7")).toBeNull();
  });
});
