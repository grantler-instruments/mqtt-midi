export { MqttMidi, MqttMidiChannel } from "./MqttMidi.js";
export type {
  ControlChangeMessage,
  Direction,
  MidiMessageMeta,
  MqttMidiEvent,
  MqttMidiEvents,
  MqttMidiListener,
  MqttMidiOptions,
  NoteOffMessage,
  NoteOnMessage,
  ParsedMidiMessage,
  ParsedTopicStub,
  PitchBendMessage,
  ProgramChangeMessage,
  SysexMessage,
  SystemMessage,
  SystemMessageType,
} from "./types.js";

export type { MqttMidiCore, MidiListenerRegistration } from "./MqttMidiChannel.js";
export type { ListenOptions, MidiListenEvent } from "./listen.js";

export {
  buildControlChangeTopic,
  buildNoteOffTopic,
  buildNoteOnTopic,
  buildPitchBendTopic,
  buildProgramChangeTopic,
  buildSysexTopic,
  buildSystemTopic,
  buildTopic,
  parseTopic,
} from "./topics.js";

export { listenTopicPattern, isMidiListenEvent, isLifecycleEvent } from "./listen.js";

export {
  decodePitchBend,
  decodeSevenBit,
  decodeSysexJson,
  encodeEmptyPayload,
  encodePitchBend,
  encodeSevenBit,
  encodeSysexJson,
  payloadToBytes,
  toPayload,
} from "./codec.js";
export type { SysexPayload } from "./codec.js";

import { MqttMidi } from "./MqttMidi.js";
import type { MqttMidiOptions } from "./types.js";

/** Create a connected {@link MqttMidi} instance. */
export async function connect(options: MqttMidiOptions): Promise<MqttMidi> {
  const client = new MqttMidi(options);
  await client.connect();
  return client;
}
