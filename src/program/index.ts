import { web3, Program as AnchorProgram, AnchorProvider, Wallet, Idl } from "@project-serum/anchor";
import { Keypair, TransactionInstruction } from "@solana/web3.js";
import log from "loglevel";

import { Instruction } from "../instruction";
import { getCluster } from "../connection";
import { sendTransactionWithRetry, sendAsyncSignedTransactionWithRetry } from "../transaction/send";

export * from "./objectWrapper";

export namespace Program {
  export interface ProgramConfig {
    asyncSigning: boolean;
    provider?: AnchorProvider;
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

    sendWithRetry(
      instructions: Array<TransactionInstruction>,
      signers: Array<Keypair> = [],
      options: { commitment: web3.Commitment, timeout?: number } = { commitment: "confirmed" }
    ) {
      if (this.asyncSigning) {
        return sendAsyncSignedTransactionWithRetry(
          this.client.provider.connection,
          (this.client.provider as AnchorProvider).wallet,
          instructions,
          signers,
          options.commitment,
          options.timeout,
        );
      }

      return sendTransactionWithRetry(
        this.client.provider.connection,
        (this.client.provider as AnchorProvider).wallet,
        instructions,
        signers,
        options.commitment,
        options.timeout,
      );
    }

    sendWithAsyncSigningAndRetry(
      instructions: Array<TransactionInstruction>,
      signers: Array<Keypair> = [],
      options: { commitment: web3.Commitment, timeout?: number } = { commitment: "confirmed" }
    ) {
      return sendAsyncSignedTransactionWithRetry(
        this.client.provider.connection,
        (this.client.provider as AnchorProvider).wallet,
        instructions,
        signers,
        options.commitment,
        options.timeout,
      );
    }

    static getProgramWithConfig<T extends Program>(
      type: { new(): T ;},
      config: ProgramConfig,
    ): Promise<T> {
      return ProgramHelpers.getProgramWithConfig(type, config);
    }


    static getProgramWithWallet<T extends Program>(
      type: { new(): T ;},
      wallet: Wallet,
      env: string,
      customRpcUrl: string | undefined,
    ): Promise<T> {
      return ProgramHelpers.getProgram(type, wallet, env, customRpcUrl);
    }

    static getProgramWithWalletKeyPair<T extends Program>(
      type: { new(): T ;},
      walletKeyPair: web3.Keypair,
      env: string,
      customRpcUrl?: string,
    ): Promise<T> {
      return ProgramHelpers.getProgram(type, null, env, customRpcUrl, walletKeyPair);
    }

    static getProgram<T extends Program>(
      type: { new(): T ;},
      anchorWallet: Wallet | null,
      env: string,
      customRpcUrl: string | undefined,
      walletKeyPair?: web3.Keypair,
    ): Promise<T> {
      return ProgramHelpers.getProgram(type, anchorWallet, env, customRpcUrl, walletKeyPair);
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
    wallet: Wallet | null,
    env: string,
    customRpcUrl: string | undefined,
    walletKeyPair?: web3.Keypair,
  ): Promise<T> {
    if (customRpcUrl) log.debug("USING CUSTOM RPC URL:", customRpcUrl);

    const solConnection = new web3.Connection(customRpcUrl || getCluster(env));

    let providerWallet;
    if (wallet) {
      providerWallet = wallet;
    } else if (walletKeyPair) {
      providerWallet = new Wallet(walletKeyPair);
    } else if(!walletKeyPair) {
      throw new Error("Wallet nor a keypair was passed into Program.getProgram");
    }

    const provider = new AnchorProvider(solConnection, providerWallet, {
      preflightCommitment: "recent",
    });

    const config = {
      asyncSigning: false,
      provider,
    } as Program.ProgramConfig;

    return this.getProgramWithConfig(type, config);
  }
}
