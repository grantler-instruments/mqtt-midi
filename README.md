# mqtt-midi

Monorepo for MIDI over MQTT: a browser/Node **library** and a Node **bridge** to hardware or virtual MIDI ports.

## Packages

| Package | Description |
|---------|-------------|
| [`@grantler-instruments/mqtt-midi`](./packages/mqtt-midi) | Send and receive MIDI over MQTT (browser or Node) |
| [`@grantler-instruments/mqtt-midi-bridge`](./packages/mqtt-midi-bridge) | CLI daemon: MQTT ↔ system MIDI |

## Development

```bash
npm install
npm run build
npm test
```

## Publish to npm

Log in with `npm login`. Bump `version` in `packages/mqtt-midi-bridge/package.json` before each bridge release (npm will not overwrite an existing version). If `0.1.0` was published without a working CLI, publish `0.1.1` (or newer).

**Bridge only** (library already on npm):

```bash
npm run publish:bridge
```

Preview: `npm run publish:bridge:dry-run`.

**Library + bridge** — bump both package versions, then:

```bash
npm run publish:packages
```

Preview: `npm run publish:packages:dry-run`.

## Install (apps)

**Library only** (web UI, Node client):

```bash
npm install @grantler-instruments/mqtt-midi mqtt
```

**Bridge** — no global install required if you use `npx` (see below).

## Using the bridge

The bridge connects **MQTT** (same topic layout as the library) to **MIDI** on your machine. A typical setup:

1. Run an MQTT broker (e.g. Mosquitto on `mqtt://localhost:1883`).
2. Start the bridge with the same `prefix` your web app uses (e.g. `remote`).
3. In your DAW or MIDI app, select the **`mqtt-midi-bridge`** virtual port (macOS/Linux default), or the loopMIDI / IAC ports you configured.
4. Your browser app uses `@grantler-instruments/mqtt-midi` to send on `{prefix}/in/...` and listen on `{prefix}/out/...`.

**Quick start with npx** (Node 18+, no `npm install -g`):

```bash
# Help and list system MIDI ports
npx @grantler-instruments/mqtt-midi-bridge --help
npx @grantler-instruments/mqtt-midi-bridge --list-ports

# macOS / Linux: creates virtual port "mqtt-midi-bridge"
npx @grantler-instruments/mqtt-midi-bridge \
  --url mqtt://localhost:1883 \
  --prefix remote

# Config file (copy packages/mqtt-midi-bridge/mqtt-midi-bridge.config.example.json)
npx @grantler-instruments/mqtt-midi-bridge --config ./mqtt-midi-bridge.config.json
```

**Global install** (same CLI, shorter command):

```bash
npm install -g @grantler-instruments/mqtt-midi-bridge
mqtt-midi-bridge --url mqtt://localhost:1883 --prefix remote
```

**Windows** — virtual ports are not auto-created; use loopMIDI, then:

```bash
npx @grantler-instruments/mqtt-midi-bridge --list-ports
npx @grantler-instruments/mqtt-midi-bridge \
  --url mqtt://localhost:1883 \
  --prefix remote \
  --midi-in "loopMIDI Port" \
  --midi-out "loopMIDI Port"
```

More detail: [packages/mqtt-midi-bridge/README.md](./packages/mqtt-midi-bridge). Library docs: [packages/mqtt-midi/README.md](./packages/mqtt-midi).

## License

MIT — see [LICENSE](LICENSE).

Copyright © 2026 Grantler Instruments.
