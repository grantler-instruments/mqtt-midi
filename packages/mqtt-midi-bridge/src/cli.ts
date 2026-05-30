#!/usr/bin/env node

import { parseArgs } from "node:util";

import { startBridge } from "./bridge.js";
import { loadConfigFile, resolveBridgeConfig } from "./config.js";
import type { CliOverrides } from "./config.js";
import { listMidiPorts } from "./midiPorts.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    url: { type: "string", short: "u" },
    prefix: { type: "string", short: "p" },
    config: { type: "string", short: "c" },
    "midi-in": { type: "string" },
    "midi-out": { type: "string" },
    virtual: { type: "string" },
    "list-ports": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  printHelp();
  process.exit(0);
}

if (values["list-ports"]) {
  const ports = listMidiPorts();
  console.log("MIDI inputs:");
  for (const name of ports.inputs) {
    console.log(`  ${name}`);
  }
  console.log("MIDI outputs:");
  for (const name of ports.outputs) {
    console.log(`  ${name}`);
  }
  process.exit(0);
}

if (positionals.length > 0) {
  console.error(`Unexpected arguments: ${positionals.join(" ")}`);
  printHelp();
  process.exit(1);
}

const cli: CliOverrides = {
  url: values.url,
  prefix: values.prefix,
  midiIn: values["midi-in"],
  midiOut: values["midi-out"],
  virtual: values.virtual,
};

let bridgeOptions;
try {
  const file = values.config ? await loadConfigFile(values.config) : {};
  bridgeOptions = resolveBridgeConfig(file, cli);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  printHelp();
  process.exit(1);
}

let bridge: Awaited<ReturnType<typeof startBridge>> | null = null;

try {
  bridge = await startBridge(bridgeOptions);
  const midiLabel =
    bridgeOptions.midiIn.mode === "virtual"
      ? `virtual MIDI "${bridgeOptions.midiIn.name}"`
      : `MIDI in "${bridgeOptions.midiIn.name}" → out "${bridgeOptions.midiOut.name}"`;
  console.log(
    `mqtt-midi-bridge connected (${bridgeOptions.url}, prefix="${bridgeOptions.prefix}", ${midiLabel})`,
  );
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const shutdown = async () => {
  if (bridge) {
    await bridge.stop();
    bridge = null;
  }
  process.exit(0);
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

function printHelp(): void {
  console.log(`mqtt-midi-bridge — MQTT ↔ system MIDI

Subscribes to {prefix}/in/... and publishes {prefix}/out/... (device bridge role).

Usage:
  mqtt-midi-bridge --url <mqtt-url> --prefix <prefix>
  mqtt-midi-bridge --config <path.json>

On macOS and Linux, a virtual MIDI port is created automatically (like Max or Protokol)
unless you set --midi-in/--midi-out or --virtual.

Options:
  -u, --url <url>           MQTT broker URL (e.g. mqtt://localhost:1883)
  -p, --prefix <prefix>     Topic prefix (same as web clients)
  -c, --config <path>       JSON config file (see mqtt-midi-bridge.config.example.json)
      --midi-in <name>      MIDI input port name (MIDI → MQTT out)
      --midi-out <name>     MIDI output port name (MQTT in → MIDI)
      --virtual <name>      Virtual port name (default on macOS/Linux: mqtt-midi-bridge)
      --list-ports          List available MIDI port names
  -h, --help                Show this help

CLI flags override values from the config file.

Config file (JSON):
  {
    "url": "mqtt://localhost:1883",
    "prefix": "remote",
    "virtual": "My App MIDI",
    "mqttOptions": { }
  }

Use either virtual or midiIn/midiOut, not both. Omit both on macOS/Linux for the default virtual port.

On Windows, set midiIn and midiOut (e.g. loopMIDI); virtual ports are not auto-created.
`);
}
