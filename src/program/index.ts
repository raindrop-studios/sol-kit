import { web3, Program as AnchorProgram, Provider, Wallet, Idl } from "@project-serum/anchor";
import { Keypair, TransactionInstruction } from "@solana/web3.js";
import log from "loglevel";

import { Instruction } from "../instruction";
import { getCluster } from "../connection";
import { sendTransactionWithRetry } from "../transaction/send";

export * from "./objectWrapper";

export abstract class Program {
  id: web3.PublicKey;
  program: AnchorProgram;
  instruction: Instruction;
  static PREFIX = "";
  static PROGRAM_ID: web3.PublicKey;

  static createWithProgram(
    program: AnchorProgram,
  ): Program {
    return new (Object.create(this.prototype)).constructor({ id: this.PROGRAM_ID, program });
  }

  static async getProgram(
    anchorWallet: Wallet | web3.Keypair,
    env: string,
    customRpcUrl: string,
  ): Promise<Program> {
    if (customRpcUrl) log.debug("USING CUSTOM RPC URL:", customRpcUrl);

    const solConnection = new web3.Connection(customRpcUrl || getCluster(env));

    if (anchorWallet instanceof web3.Keypair) {
      anchorWallet = new Wallet(anchorWallet);
    }

    const provider = new Provider(solConnection, anchorWallet, {
      preflightCommitment: "recent",
    });

    return this.getProgramWithProvider(provider);
  }

  static async getProgramWithProvider(
    provider: Provider,
  ): Promise<Program> {
    const idl = await AnchorProgram.fetchIdl(this.PROGRAM_ID, provider);
    return this.getProgramWithProviderAndIDL(provider, idl);
  }

  static async getProgramWithProviderAndIDL(
    provider: Provider,
    idl: Idl
  ): Promise<Program> {
    const program = new AnchorProgram(idl, this.PROGRAM_ID, provider);

    return new (Object.create(this.prototype)).constructor({ id: this.PROGRAM_ID, program });
  }

  constructor(args: { id: web3.PublicKey; program: AnchorProgram; }) {
    this.id = args.id;
    this.program = args.program;
  }

  async sendWithRetry(instructions: Array<TransactionInstruction>, signers: Array<Keypair> = []) {
    return sendTransactionWithRetry(
      this.program.provider.connection,
      this.program.provider.wallet,
      instructions,
      signers,
    );
  }
}
