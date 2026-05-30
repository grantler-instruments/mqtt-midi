import { MqttMidi } from "@grantler-instruments/mqtt-midi";
import type { IClientOptions } from "mqtt";
import type { Input, Output } from "@julusian/midi";

import { type MidiEndpoint, openMidiInput, openMidiOutput } from "./midiPorts.js";
import { parseMidiMessage, toMidiBytes } from "./midiMessage.js";

const MQTT_OUT = "out" as const;

export interface MqttMidiBridgeOptions {
  url: string;
  prefix: string;
  mqttOptions?: IClientOptions;
  midiIn: MidiEndpoint;
  midiOut: MidiEndpoint;
}

export interface MqttMidiBridge {
  stop(): Promise<void>;
}

export async function startBridge(options: MqttMidiBridgeOptions): Promise<MqttMidiBridge> {
  const mqttMidi = new MqttMidi({
    url: options.url,
    prefix: options.prefix,
    defaultDirection: "in",
    mqttOptions: options.mqttOptions,
  });

  const midiInput = openMidiInput(options.midiIn);
  const midiOutput = openMidiOutput(options.midiOut);

  wireMqttToMidi(mqttMidi, midiOutput);
  wireMidiToMqtt(mqttMidi, midiInput);

  await mqttMidi.connect();

  return {
    async stop() {
      await mqttMidi.disconnect();
      midiInput.closePort();
      midiOutput.closePort();
      midiInput.destroy();
      midiOutput.destroy();
    },
  };
}

function wireMqttToMidi(mqttMidi: MqttMidi, midiOutput: Output): void {
  mqttMidi.on("noteOn", ({ channel, note, velocity }) => {
    midiOutput.sendMessage(toMidiBytes({ kind: "noteOn", channel, note, velocity }));
  });

  mqttMidi.on("noteOff", ({ channel, note, velocity }) => {
    midiOutput.sendMessage(toMidiBytes({ kind: "noteOff", channel, note, velocity }));
  });

  mqttMidi.on("controlChange", ({ channel, controller, value }) => {
    midiOutput.sendMessage(
      toMidiBytes({ kind: "controlChange", channel, controller, value }),
    );
  });

  mqttMidi.on("programChange", ({ channel, program }) => {
    midiOutput.sendMessage(toMidiBytes({ kind: "programChange", channel, program }));
  });

  mqttMidi.on("pitchBend", ({ channel, value }) => {
    midiOutput.sendMessage(toMidiBytes({ kind: "pitchBend", channel, value }));
  });

  mqttMidi.on("sysex", ({ data }) => {
    midiOutput.sendMessage(data);
  });

  mqttMidi.on("clock", () => {
    midiOutput.sendMessage([0xf8]);
  });

  mqttMidi.on("start", () => {
    midiOutput.sendMessage([0xfa]);
  });

  mqttMidi.on("stop", () => {
    midiOutput.sendMessage([0xfc]);
  });

  mqttMidi.on("continue", () => {
    midiOutput.sendMessage([0xfb]);
  });
}

function wireMidiToMqtt(mqttMidi: MqttMidi, midiInput: Input): void {
  midiInput.on("message", (_deltaTime, message) => {
    const parsed = parseMidiMessage(message);
    if (!parsed) {
      return;
    }

    switch (parsed.kind) {
      case "noteOn":
        mqttMidi.sendNoteOn(parsed.channel, parsed.note, parsed.velocity, MQTT_OUT);
        break;
      case "noteOff":
        mqttMidi.sendNoteOff(parsed.channel, parsed.note, parsed.velocity, MQTT_OUT);
        break;
      case "controlChange":
        mqttMidi.sendControlChange(
          parsed.channel,
          parsed.controller,
          parsed.value,
          MQTT_OUT,
        );
        break;
      case "programChange":
        mqttMidi.sendProgramChange(parsed.channel, parsed.program, MQTT_OUT);
        break;
      case "pitchBend":
        mqttMidi.sendPitchBend(parsed.channel, parsed.value, MQTT_OUT);
        break;
      case "sysex":
        mqttMidi.sendSysex(parsed.data, MQTT_OUT);
        break;
      case "system":
        mqttMidi.sendSystem(parsed.type, MQTT_OUT);
        break;
    }
  });
}
