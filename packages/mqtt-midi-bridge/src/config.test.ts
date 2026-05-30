import { describe, expect, it } from "vitest";

import {
  DEFAULT_VIRTUAL_PORT_NAME,
  parseConfigJson,
  resolveBridgeConfig,
  supportsVirtualMidiPorts,
} from "./config.js";

describe("parseConfigJson", () => {
  it("parses a valid config", () => {
    expect(
      parseConfigJson(`{
        "url": "mqtt://localhost",
        "prefix": "remote",
        "midiIn": "In",
        "midiOut": "Out"
      }`),
    ).toEqual({
      url: "mqtt://localhost",
      prefix: "remote",
      midiIn: "In",
      midiOut: "Out",
    });
  });

  it("rejects unknown keys", () => {
    expect(() => parseConfigJson('{"url":"x","extra":1}')).toThrow(/Unknown config keys/);
  });
});

describe("resolveBridgeConfig", () => {
  it("merges CLI over file", () => {
    const options = resolveBridgeConfig(
      { url: "mqtt://a", prefix: "p", midiIn: "A", midiOut: "B" },
      { prefix: "override" },
    );
    expect(options.url).toBe("mqtt://a");
    expect(options.prefix).toBe("override");
    expect(options.midiIn).toEqual({ mode: "name", name: "A" });
  });

  it("uses virtual from file", () => {
    const options = resolveBridgeConfig({ url: "mqtt://x", prefix: "p", virtual: "Virt" });
    expect(options.midiIn).toEqual({ mode: "virtual", name: "Virt" });
  });

  it("requires url and prefix", () => {
    expect(() => resolveBridgeConfig({ midiIn: "a", midiOut: "b" })).toThrow(/url and prefix/);
  });

  it("defaults to virtual port on macOS when MIDI unset", () => {
    const options = resolveBridgeConfig(
      { url: "mqtt://x", prefix: "p" },
      {},
      { platform: "darwin" },
    );
    expect(options.midiIn).toEqual({
      mode: "virtual",
      name: DEFAULT_VIRTUAL_PORT_NAME,
    });
  });

  it("requires named ports on Windows when MIDI unset", () => {
    expect(() =>
      resolveBridgeConfig({ url: "mqtt://x", prefix: "p" }, {}, { platform: "win32" }),
    ).toThrow(/loopMIDI/i);
  });
});

describe("supportsVirtualMidiPorts", () => {
  it("is true on darwin and linux", () => {
    expect(supportsVirtualMidiPorts("darwin")).toBe(true);
    expect(supportsVirtualMidiPorts("linux")).toBe(true);
    expect(supportsVirtualMidiPorts("win32")).toBe(false);
  });
});
