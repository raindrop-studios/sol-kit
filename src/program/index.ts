import { web3, Program as AnchorProgram, Provider, Wallet, Idl } from "@project-serum/anchor";
import { Keypair, TransactionInstruction } from "@solana/web3.js";
import log from "loglevel";

import { Instruction } from "../instruction";
import { getCluster } from "../connection";
import { sendTransactionWithRetry, sendAsyncSignedTransactionWithRetry } from "../transaction/send";

export * from "./objectWrapper";

export namespace Program {
  export interface ProgramConfig {
    asyncSigning: boolean;
    provider?: Provider;
    idl?: Idl | null;
    client?: AnchorProgram;
  }

  export abstract class Program {
    instruction: Instruction;
    asyncSigning: boolean = false;
    static PREFIX = "";

    protected PROGRAM_ID: web3.PublicKey;
    get id(): web3.PublicKey {
      return this.PROGRAM_ID;
    }

    private _client: AnchorProgram;
    get client(): AnchorProgram {
      return this._client;
    }
    set client(client: AnchorProgram) {
      this._client = client;
    }

    sendWithRetry(instructions: Array<TransactionInstruction>, signers: Array<Keypair> = []) {
      if (this.asyncSigning) {
        return sendAsyncSignedTransactionWithRetry(
          this.client.provider.connection,
          this.client.provider.wallet,
          instructions,
          signers,
        );
      }

      return sendTransactionWithRetry(
        this.client.provider.connection,
        this.client.provider.wallet,
        instructions,
        signers,
      );
    }

    sendWithAsyncSigningAndRetry(instructions: Array<TransactionInstruction>, signers: Array<Keypair> = []) {
      return sendAsyncSignedTransactionWithRetry(
        this.client.provider.connection,
        this.client.provider.wallet,
        instructions,
        signers,
      );
    }

    static getProgramWithConfig<T extends Program>(
      type: { new(): T ;},
      config: ProgramConfig,
    ): Promise<T> {
      return ProgramHelpers.getProgramWithConfig(type, config);
    }

    static getProgram<T extends Program>(
      type: { new(): T ;},
      anchorWallet: Wallet | web3.Keypair,
      env: string,
      customRpcUrl: string,
    ): Promise<T> {
      return ProgramHelpers.getProgram(type, anchorWallet, env, customRpcUrl);
    }
  }
}

export namespace ProgramHelpers {
  export async function getProgramWithConfig<T extends Program.Program>(
    type: { new(): T ;},
    config: Program.ProgramConfig,
  ): Promise<T> {
    let { client, provider, idl } = config;
    const instance = new type();
    instance.asyncSigning = config.asyncSigning;

    if (client) {
      instance.client = client;
      return instance;
    }

    if (provider && !idl) {
      idl = await AnchorProgram.fetchIdl(instance.id, provider);
    }

    if (provider && idl) {
      const client = new AnchorProgram(idl, instance.id, provider);
      instance.client = client;
      return instance;
    }

    return Promise.resolve(instance);
  }

  export function getProgram<T extends Program.Program>(
    type: { new(): T ;},
    anchorWallet: Wallet | web3.Keypair,
    env: string,
    customRpcUrl: string,
  ): Promise<T> {
    if (customRpcUrl) log.debug("USING CUSTOM RPC URL:", customRpcUrl);

    const solConnection = new web3.Connection(customRpcUrl || getCluster(env));

    if (anchorWallet instanceof web3.Keypair) {
      anchorWallet = new Wallet(anchorWallet);
    }

    const provider = new Provider(solConnection, anchorWallet, {
      preflightCommitment: "recent",
    });

    const config = {
      asyncSigning: false,
      provider,
    } as Program.ProgramConfig;

    return this.getProgramWithConfig(type, config);
  }
}
