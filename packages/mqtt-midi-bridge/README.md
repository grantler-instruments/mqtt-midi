# @grantler-instruments/mqtt-midi-bridge

Node daemon that bridges **system MIDI** (hardware or virtual ports) to **MQTT MIDI** topics using [`@grantler-instruments/mqtt-midi`](../mqtt-midi).

- Subscribes to `{prefix}/in/...` (commands from web UIs) → MIDI **out**
- Publishes `{prefix}/out/...` (events from your DAW/hardware) ← MIDI **in**

Requires Node 18+ and a working native build of `@julusian/midi` (RtMidi).

## Install

**Recommended — run with npx** (no global install):

```bash
npx @grantler-instruments/mqtt-midi-bridge --help
```

**Or install globally:**

```bash
npm install -g @grantler-instruments/mqtt-midi-bridge
mqtt-midi-bridge --help
```

All examples below use `mqtt-midi-bridge`; with npx, prefix the command:

```bash
npx @grantler-instruments/mqtt-midi-bridge --url mqtt://localhost:1883 --prefix remote
```

## Usage

### Config file

Copy [`mqtt-midi-bridge.config.example.json`](./mqtt-midi-bridge.config.example.json) and edit:

```json
{
  "url": "mqtt://localhost:1883",
  "prefix": "remote"
}
```

On **macOS** and **Linux**, if you omit `midiIn`, `midiOut`, and `virtual`, the bridge creates a virtual port named **`mqtt-midi-bridge`** (same idea as Max, Protokol, etc.). Point your DAW at that port. Override with `"virtual": "MyName"` or `--virtual`.

Run:

```bash
npx @grantler-instruments/mqtt-midi-bridge --config ./mqtt-midi-bridge.config.json
```

CLI flags override the file. Optional `mqttOptions` is passed through to MQTT.js (username, password, clientId, etc.).

**Windows:** virtual ports are not auto-created. Use loopMIDI (or similar), then set `midiIn` / `midiOut` to those port names, or use `--list-ports`.

### CLI only

List ports:

```bash
npx @grantler-instruments/mqtt-midi-bridge --list-ports
```

Minimal (macOS / Linux — auto virtual port):

```bash
npx @grantler-instruments/mqtt-midi-bridge \
  --url mqtt://localhost:1883 \
  --prefix remote
```

Your DAW sees **mqtt-midi-bridge** for MIDI in and out. Use the same `prefix` in your web app (`MqttMidi({ prefix: "remote", ... })`).

Custom virtual name or hardware / loopMIDI ports:

```bash
npx @grantler-instruments/mqtt-midi-bridge \
  --url mqtt://localhost:1883 --prefix remote --virtual my-midi-port

npx @grantler-instruments/mqtt-midi-bridge \
  --url mqtt://localhost:1883 --prefix remote \
  --midi-in "IAC Driver Bus 1" --midi-out "IAC Driver Bus 1"
```

## Programmatic API

```ts
import { startBridge } from "@grantler-instruments/mqtt-midi-bridge";

const bridge = await startBridge({
  url: "mqtt://localhost:1883",
  prefix: "remote",
  midiIn: { mode: "name", name: "IAC Driver Bus 1" },
  midiOut: { mode: "name", name: "IAC Driver Bus 1" },
});

await bridge.stop();
```

## License

MIT — see [LICENSE](LICENSE).
