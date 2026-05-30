import { Input, Output } from "@julusian/midi";

export interface PortLists {
  inputs: string[];
  outputs: string[];
}

export function listMidiPorts(): PortLists {
  const input = new Input();
  const output = new Output();
  try {
    return {
      inputs: portNames(input),
      outputs: portNames(output),
    };
  } finally {
    input.destroy();
    output.destroy();
  }
}

function portNames(device: Input | Output): string[] {
  const count = device.getPortCount();
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    names.push(device.getPortName(i));
  }
  return names;
}

export type MidiEndpoint =
  | { mode: "name"; name: string }
  | { mode: "virtual"; name: string };

export function openMidiInput(endpoint: MidiEndpoint): Input {
  const input = new Input();
  input.ignoreTypes(false, false, false);
  if (endpoint.mode === "virtual") {
    input.openVirtualPort(endpoint.name);
  } else {
    input.openPortByName(endpoint.name);
  }
  return input;
}

export function openMidiOutput(endpoint: MidiEndpoint): Output {
  const output = new Output();
  if (endpoint.mode === "virtual") {
    output.openVirtualPort(endpoint.name);
  } else {
    output.openPortByName(endpoint.name);
  }
  return output;
}
