# @grantler-instruments/mqtt-midi

Send and receive MIDI over MQTT from the browser (or Node). Standard MIDI messages use **compact binary payloads**; channel and message type live in the **topic**. SysEx uses **JSON** only.


## Install

```bash
npm install @grantler-instruments/mqtt-midi mqtt
```

Package: [npmjs.com/package/@grantler-instruments/mqtt-midi](https://www.npmjs.com/package/@grantler-instruments/mqtt-midi)

`mqtt` (MQTT.js v5+) is a **peer dependency** — your app installs and bundles it once.

**Alternatives:**

```bash
# From GitHub (runs prepare → builds on install)
npm install github:grantler-instruments/mqtt-midi mqtt

# Local path (development)
npm install ../mqtt-midi mqtt
```

## Example: controller in the browser

Two apps (or tabs) share a **`prefix`** on the same broker. One sends on `{prefix}/in/...`, the other listens on `{prefix}/out/...`. In a single app that both sends and receives, register listeners for `out` and send on `in` (defaults).

```ts
import { MqttMidi } from "@grantler-instruments/mqtt-midi";

const mqttMidi = new MqttMidi({
  url: import.meta.env.VITE_MQTT_BROKER_URL, // e.g. wss://broker.example.com/mqtt
  prefix: "remote",
});

// Lifecycle
mqttMidi.on("connect", () => console.log("connected"));
mqttMidi.on("error", (err) => console.error("mqtt error", err));

// Listen to all note-ons on the bus
mqttMidi.on("noteOn", ({ channel, note, velocity }) => {
  console.log(`note on  ch=${channel}  note=${note}  vel=${velocity}`);
});

// Only channel 1, volume fader (CC 7)
mqttMidi.channel(1).on("controlChange", { controller: 7 }, ({ value }) => {
  console.log(`volume: ${value}`);
});

// SysEx (JSON payload on the wire)
mqttMidi.on("sysex", ({ data }) => {
  console.log("sysex", data.map((b) => b.toString(16)).join(" "));
});

await mqttMidi.connect();

// Send MIDI toward the remote side (publishes to {prefix}/in/...)
mqttMidi.sendNoteOn(1, 60, 100);
mqttMidi.sendNoteOff(1, 60);
mqttMidi.sendControlChange(1, 7, 127);
mqttMidi.sendSysex([0xf0, 0x7d, 0x09, 0xf7]);

// Later
await mqttMidi.disconnect();
```

**Minimal send-only** (no listeners):

```ts
import { connect } from "@grantler-instruments/mqtt-midi";

const mqttMidi = await connect({
  url: "wss://broker.example.com/mqtt",
  prefix: "remote",
});

mqttMidi.sendControlChange(1, 1, 64);
```

**Two tabs on the same broker:** use the same `prefix`. Tab A calls `sendNoteOn(...)` → publishes `remote/in/noteon/1/60`. Tab B with `on("noteOn", ...)` subscribed to `remote/out/noteon/#` receives it only if something republishes or mirrors `in` → `out` on the remote side. Typically the **instrument/firmware bridge** publishes `out`; the **web UI** sends `in`.

## Subscriptions

There is **no broad `{prefix}/out/#` subscription** on connect. MQTT topics are subscribed when you register listeners (ref-counted).

| API | MQTT subscription (default direction `out`) |
|-----|---------------------------------------------|
| `on("noteOn", fn)` | `{prefix}/out/noteon/#` |
| `channel(1).on("noteOn", fn)` | `{prefix}/out/noteon/1/#` |
| `channel(1).on("controlChange", { controller: 7 }, fn)` | `{prefix}/out/cc/1/7` |
| `on("clock", fn)` | `{prefix}/out/clock` |
| `subscribe("custom/topic/#")` | raw MQTT topic (low-level) |

- **`on` / `off` / `channel(n).on` / `channel(n).off`** — MIDI events + broker subscribe
- **`subscribe` / `unsubscribe`** — raw MQTT only
- **`on("connect")` / `on("error")`** — lifecycle only, no MQTT topic
- **`defaultDirection`** option — `"out"` (default) or `"in"` for listener topic paths

## Topic layout

| Message | Topic | Payload |
|---------|-------|---------|
| Control change | `{prefix}/in/cc/{channel}/{controller}` | 1 byte: value |
| Note on | `{prefix}/in/noteon/{channel}/{note}` | 1 byte: velocity |
| Note off | `{prefix}/in/noteoff/{channel}/{note}` | 1 byte: velocity |
| Program change | `{prefix}/in/program/{channel}` | 1 byte: program |
| Pitch bend | `{prefix}/in/pitchbend/{channel}` | 2 bytes: lsb, msb |
| Clock / start / stop / continue | `{prefix}/in/{type}` | empty |
| SysEx | `{prefix}/in/sysex` | JSON: `{ "data": [...] }` |

`send*` methods default to `{prefix}/in/...`. Listeners default to `{prefix}/out/...`.

MIDI channels are **1–16** in the API.

## Send API

**Channel messages** — positional numbers only (binary on the wire):

```ts
mqttMidi.sendNoteOn(channel, note, velocity);
mqttMidi.sendNoteOff(channel, note);              // velocity 0
mqttMidi.sendNoteOff(channel, note, velocity);
mqttMidi.sendNoteOff(channel, note, "out");     // direction as 3rd arg
mqttMidi.sendControlChange(channel, controller, value);
mqttMidi.sendProgramChange(channel, program);
mqttMidi.sendPitchBend(channel, value);
```

Optional last arg: `"in"` | `"out"` (default `"in"`).

**SysEx** — byte array in the API; **JSON on the wire**:

```ts
mqttMidi.sendSysex([0xf0, 0x7d, 0x09, 0xf7]);
```

## Browser bundlers

MQTT.js may require Node polyfills in some Vite setups. See the [MQTT.js README](https://github.com/mqttjs/MQTT.js).

## Support

If you find this library useful, you can support development:

[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://buymeacoffee.com/thomasgeissl)

## License

MIT License — see [LICENSE](LICENSE).

Copyright © 2026 Grantler Instruments.
