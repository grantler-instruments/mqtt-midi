import type { Direction } from "./types.js";

export function isDirection(value: unknown): value is Direction {
  return value === "in" || value === "out";
}

export interface NoteOnSend {
  channel: number;
  note: number;
  velocity: number;
  direction: Direction;
}

export interface NoteOffSend {
  channel: number;
  note: number;
  velocity: number;
  direction: Direction;
}

export interface ControlChangeSend {
  channel: number;
  controller: number;
  value: number;
  direction: Direction;
}

export interface ProgramChangeSend {
  channel: number;
  program: number;
  direction: Direction;
}

export interface PitchBendSend {
  channel: number;
  value: number;
  direction: Direction;
}

export interface SysexSend {
  data: number[];
  direction: Direction;
}

export function parseNoteOnSend(
  channel: number,
  note: number,
  velocity: number,
  direction?: Direction,
): NoteOnSend {
  return {
    channel,
    note,
    velocity,
    direction: isDirection(direction) ? direction : "in",
  };
}

export function parseNoteOffSend(
  channel: number,
  note: number,
  velocityOrDirection?: number | Direction,
  direction?: Direction,
): NoteOffSend {
  if (isDirection(velocityOrDirection)) {
    return { channel, note, velocity: 0, direction: velocityOrDirection };
  }
  return {
    channel,
    note,
    velocity: typeof velocityOrDirection === "number" ? velocityOrDirection : 0,
    direction: isDirection(direction) ? direction : "in",
  };
}

export function parseControlChangeSend(
  channel: number,
  controller: number,
  value: number,
  direction?: Direction,
): ControlChangeSend {
  return {
    channel,
    controller,
    value,
    direction: isDirection(direction) ? direction : "in",
  };
}

export function parseProgramChangeSend(
  channel: number,
  program: number,
  direction?: Direction,
): ProgramChangeSend {
  return {
    channel,
    program,
    direction: isDirection(direction) ? direction : "in",
  };
}

export function parsePitchBendSend(
  channel: number,
  value: number,
  direction?: Direction,
): PitchBendSend {
  return {
    channel,
    value,
    direction: isDirection(direction) ? direction : "in",
  };
}

export function parseSysexSend(data: number[], direction?: Direction): SysexSend {
  return { data, direction: isDirection(direction) ? direction : "in" };
}
