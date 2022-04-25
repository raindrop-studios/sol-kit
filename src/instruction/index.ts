import { Program } from "../program/index";

export abstract class Instruction {
  program: Program.Program;

  constructor(args: { program: Program.Program }) {
    this.program = args.program;
  }
}

export * as InstructionUtils from "./utils";