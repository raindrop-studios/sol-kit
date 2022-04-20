import { web3, Program as AnchorProgram, Provider, Wallet, Idl } from "@project-serum/anchor";
import { Keypair, TransactionInstruction } from "@solana/web3.js";
import log from "loglevel";

import { Instruction } from "../instruction";
import { getCluster } from "../connection";
import { sendTransactionWithRetry, sendAsyncSignedTransactionWithRetry } from "../transaction/send";

export * from "./objectWrapper";

export abstract class Program {
  id: web3.PublicKey;
  program: AnchorProgram;
  instruction: Instruction;
  asyncSigning: boolean = false;
  static PREFIX = "";
  static PROGRAM_ID: web3.PublicKey;

  static createWithProgram(
    program: AnchorProgram,
  ): Program {
    return new ((Object.create(this.prototype)).constructor)({ id: this.PROGRAM_ID, program });
  }

  static async getProgram(
    anchorWallet: Wallet | web3.Keypair,
    env: string,
    customRpcUrl: string,
    constructorFn: any
  ): Promise<Program> {
    if (customRpcUrl) log.debug("USING CUSTOM RPC URL:", customRpcUrl);

    const solConnection = new web3.Connection(customRpcUrl || getCluster(env));

    if (anchorWallet instanceof web3.Keypair) {
      anchorWallet = new Wallet(anchorWallet);
    }

    const provider = new Provider(solConnection, anchorWallet, {
      preflightCommitment: "recent",
    });

    return this.getProgramWithProvider(provider, constructorFn);
  }

  static async getProgramWithAsyncSignerAndProvider(
    provider: Provider,
    constructorFn: any
  ): Promise<Program> {
    const idl = await AnchorProgram.fetchIdl(this.PROGRAM_ID, provider);
    const program = this.getProgramWithProviderAndIDL(provider, idl, constructorFn);
    program.asyncSigning = true;
    return program;
  }

  static async getProgramWithProvider(
    provider: Provider,
    constructorFn: any
  ): Promise<Program> {
    const idl = await AnchorProgram.fetchIdl(this.PROGRAM_ID, provider);
    return this.getProgramWithProviderAndIDL(provider, idl, constructorFn);
  }

  static getProgramWithProviderAndIDL(
    provider: Provider,
    idl: Idl,
    constructorFn: any
  ): Program {
    const program = new AnchorProgram(idl, this.PROGRAM_ID, provider);

    return constructorFn({ id: this.PROGRAM_ID, program });
    // return Object.create(this.prototype, { id: { value: this.PROGRAM_ID, writable: true }, program: { value: program, writable: true } });
    // return new Program({ id: this.PROGRAM_ID, program });
  }

  constructor(args: { id: web3.PublicKey; program: AnchorProgram; }) {
    this.id = args.id;
    this.program = args.program;
  }

  async sendWithRetry(instructions: Array<TransactionInstruction>, signers: Array<Keypair> = []) {
    if (this.asyncSigning) {
      return sendAsyncSignedTransactionWithRetry(
        this.program.provider.connection,
        this.program.provider.wallet,
        instructions,
        signers,
      );
    }

    return sendTransactionWithRetry(
      this.program.provider.connection,
      this.program.provider.wallet,
      instructions,
      signers,
    );
  }

  async sendWithAsyncSigningAndRetry(instructions: Array<TransactionInstruction>, signers: Array<Keypair> = []) {
    return sendAsyncSignedTransactionWithRetry(
      this.program.provider.connection,
      this.program.provider.wallet,
      instructions,
      signers,
    );
  }
}
