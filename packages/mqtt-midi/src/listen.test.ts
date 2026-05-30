import { describe, expect, it } from "vitest";

import { listenTopicPattern } from "./listen.js";

const PREFIX = "midi/stage-left";

describe("listenTopicPattern", () => {
  it("builds all-channel note on pattern", () => {
    expect(listenTopicPattern(PREFIX, "noteOn")).toBe("midi/stage-left/out/noteon/#");
  });

  it("builds channel-scoped note on pattern", () => {
    expect(listenTopicPattern(PREFIX, "noteOn", 1)).toBe(
      "midi/stage-left/out/noteon/1/#",
    );
  });

  it("builds exact control change pattern with controller filter", () => {
    expect(
      listenTopicPattern(PREFIX, "controlChange", 1, { controller: 7 }),
    ).toBe("midi/stage-left/out/cc/1/7");
  });

  it("builds channel-scoped control change wildcard", () => {
    expect(listenTopicPattern(PREFIX, "controlChange", 1)).toBe(
      "midi/stage-left/out/cc/1/#",
    );
  });

  it("builds sysex pattern", () => {
    expect(listenTopicPattern(PREFIX, "sysex")).toBe("midi/stage-left/out/sysex");
  });

  it("builds clock pattern", () => {
    expect(listenTopicPattern(PREFIX, "clock")).toBe("midi/stage-left/out/clock");
  });

  it("supports inbound direction", () => {
    expect(listenTopicPattern(PREFIX, "noteOn", 2, { direction: "in" })).toBe(
      "midi/stage-left/in/noteon/2/#",
    );
  });
});
