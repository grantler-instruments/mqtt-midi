import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { IClientOptions } from "mqtt";

import type { MqttMidiBridgeOptions } from "./bridge.js";
import type { MidiEndpoint } from "./midiPorts.js";

/** Default virtual port name when none is configured (macOS, Linux). */
export const DEFAULT_VIRTUAL_PORT_NAME = "mqtt-midi-bridge";

/** RtMidi can create virtual ports on macOS and Linux (ALSA). Not on Windows. */
export function supportsVirtualMidiPorts(platform: NodeJS.Platform = process.platform): boolean {
  return platform === "darwin" || platform === "linux";
}

export interface ResolveBridgeConfigOptions {
  /** Override for tests; defaults to `process.platform`. */
  platform?: NodeJS.Platform;
}

/** JSON config file shape (camelCase keys). */
export interface BridgeConfigFile {
  url?: string;
  prefix?: string;
  midiIn?: string;
  midiOut?: string;
  virtual?: string;
  mqttOptions?: IClientOptions;
}

export interface CliOverrides {
  url?: string;
  prefix?: string;
  midiIn?: string;
  midiOut?: string;
  virtual?: string;
}

export async function loadConfigFile(path: string): Promise<BridgeConfigFile> {
  const absolute = resolve(path);
  let text: string;
  try {
    text = await readFile(absolute, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not read config file "${absolute}": ${message}`);
  }
  return parseConfigJson(text, absolute);
}

export function parseConfigJson(text: string, source = "config"): BridgeConfigFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON in ${source}: ${message}`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Config must be a JSON object (${source})`);
  }

  const obj = parsed as Record<string, unknown>;
  const config: BridgeConfigFile = {};

  if (obj.url !== undefined) {
    config.url = requireString(obj.url, "url", source);
  }
  if (obj.prefix !== undefined) {
    config.prefix = requireString(obj.prefix, "prefix", source);
  }
  if (obj.midiIn !== undefined) {
    config.midiIn = requireString(obj.midiIn, "midiIn", source);
  }
  if (obj.midiOut !== undefined) {
    config.midiOut = requireString(obj.midiOut, "midiOut", source);
  }
  if (obj.virtual !== undefined) {
    config.virtual = requireString(obj.virtual, "virtual", source);
  }
  if (obj.mqttOptions !== undefined) {
    if (typeof obj.mqttOptions !== "object" || obj.mqttOptions === null || Array.isArray(obj.mqttOptions)) {
      throw new Error(`mqttOptions must be an object (${source})`);
    }
    config.mqttOptions = obj.mqttOptions as IClientOptions;
  }

  const unknown = Object.keys(obj).filter(
    (k) => !["url", "prefix", "midiIn", "midiOut", "virtual", "mqttOptions"].includes(k),
  );
  if (unknown.length > 0) {
    throw new Error(`Unknown config keys: ${unknown.join(", ")} (${source})`);
  }

  return config;
}

/** Merge file config with CLI flags (CLI wins). */
export function resolveBridgeConfig(
  file: BridgeConfigFile,
  cli: CliOverrides = {},
  options: ResolveBridgeConfigOptions = {},
): MqttMidiBridgeOptions {
  const platform = options.platform ?? process.platform;
  const url = cli.url ?? file.url;
  const prefix = cli.prefix ?? file.prefix;
  const virtualExplicit = cli.virtual ?? file.virtual;
  const midiInName = cli.midiIn ?? file.midiIn;
  const midiOutName = cli.midiOut ?? file.midiOut;

  if (!url || !prefix) {
    throw new Error("url and prefix are required (config file and/or --url / --prefix)");
  }

  if (virtualExplicit && (midiInName || midiOutName)) {
    throw new Error("Use either virtual or midiIn/midiOut, not both");
  }

  if ((midiInName && !midiOutName) || (!midiInName && midiOutName)) {
    throw new Error("midiIn and midiOut must both be set when using named ports");
  }

  let virtualName = virtualExplicit;
  if (!virtualName && !midiInName && !midiOutName) {
    if (supportsVirtualMidiPorts(platform)) {
      virtualName = DEFAULT_VIRTUAL_PORT_NAME;
    } else if (platform === "win32") {
      throw new Error(
        "On Windows, set midiIn and midiOut to existing ports (e.g. loopMIDI). " +
          "Virtual port creation is not supported. Run with --list-ports to see names.",
      );
    } else {
      throw new Error(
        "Set virtual, or midiIn and midiOut (config file and/or CLI). " +
          "Virtual ports are only auto-created on macOS and Linux.",
      );
    }
  }

  let midiIn: MidiEndpoint;
  let midiOut: MidiEndpoint;

  if (virtualName) {
    midiIn = { mode: "virtual", name: virtualName };
    midiOut = { mode: "virtual", name: virtualName };
  } else if (midiInName && midiOutName) {
    midiIn = { mode: "name", name: midiInName };
    midiOut = { mode: "name", name: midiOutName };
  } else {
    throw new Error(
      "MIDI ports required: set virtual, or midiIn and midiOut (config file and/or CLI flags)",
    );
  }

  return {
    url,
    prefix,
    mqttOptions: file.mqttOptions,
    midiIn,
    midiOut,
  };
}

function requireString(value: unknown, key: string, source: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${key} must be a non-empty string (${source})`);
  }
  return value;
}
