import { web3, Program } from "@project-serum/anchor";

export abstract class Instruction {
  id: web3.PublicKey;
  program: Program;

  constructor(args: { id: web3.PublicKey; program: Program }) {
    this.id = args.id;
    this.program = args.program;
  }
}

export * as InstructionUtils from "./utils";