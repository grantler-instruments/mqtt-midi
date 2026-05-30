import type { IClientOptions } from "mqtt";

export type Direction = "in" | "out";

export type SystemMessageType = "clock" | "start" | "stop" | "continue";

export interface MqttMidiOptions {
  /** MQTT broker URL, e.g. wss://broker.example.com/mqtt */
  url: string;
  /** Topic root namespace, e.g. remote */
  prefix: string;
  /** Default MQTT direction for `on()` topic subscriptions (default: `out`) */
  defaultDirection?: Direction;
  /** MQTT.js client options */
  mqttOptions?: IClientOptions;
}

export interface MidiMessageMeta {
  direction: Direction;
}

export interface ControlChangeMessage extends MidiMessageMeta {
  channel: number;
  controller: number;
  value: number;
}

export interface NoteOnMessage extends MidiMessageMeta {
  channel: number;
  note: number;
  velocity: number;
}

export interface NoteOffMessage extends MidiMessageMeta {
  channel: number;
  note: number;
  velocity: number;
}

export interface ProgramChangeMessage extends MidiMessageMeta {
  channel: number;
  program: number;
}

export interface PitchBendMessage extends MidiMessageMeta {
  channel: number;
  value: number;
}

export interface SysexMessage extends MidiMessageMeta {
  data: number[];
}

export interface SystemMessage extends MidiMessageMeta {
  type: SystemMessageType;
}

export type ParsedMidiMessage =
  | ControlChangeMessage
  | NoteOnMessage
  | NoteOffMessage
  | ProgramChangeMessage
  | PitchBendMessage
  | SysexMessage
  | SystemMessage;

export type ParsedTopicStub =
  | (Omit<ControlChangeMessage, "value"> & { kind: "controlChange" })
  | (Omit<NoteOnMessage, "velocity"> & { kind: "noteOn" })
  | (Omit<NoteOffMessage, "velocity"> & { kind: "noteOff" })
  | (Omit<ProgramChangeMessage, "program"> & { kind: "programChange" })
  | (Omit<PitchBendMessage, "value"> & { kind: "pitchBend" })
  | (Omit<SysexMessage, "data"> & { kind: "sysex" })
  | (SystemMessage & { kind: "system" });

export interface MqttMidiEvents {
  connect: void;
  disconnect: void;
  error: Error;
  controlChange: ControlChangeMessage;
  noteOn: NoteOnMessage;
  noteOff: NoteOffMessage;
  programChange: ProgramChangeMessage;
  pitchBend: PitchBendMessage;
  sysex: SysexMessage;
  clock: SystemMessage;
  start: SystemMessage;
  stop: SystemMessage;
  continue: SystemMessage;
}

export type MqttMidiEvent = keyof MqttMidiEvents;

export type MqttMidiListener<E extends MqttMidiEvent> = MqttMidiEvents[E] extends void
  ? () => void
  : (message: MqttMidiEvents[E]) => void;
