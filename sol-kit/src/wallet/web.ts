import { web3, Wallet } from '@project-serum/anchor';
import { SendOptions } from '../program';

export class WebWallet implements Wallet {
  _signTransaction: (transaction: web3.Transaction) => Promise<web3.Transaction>;
  _signAllTransactions: (transaction: web3.Transaction[]) => Promise<web3.Transaction[]>;
  sendTransaction: (transaction: web3.Transaction, connection: web3.Connection, options?: SendOptions) => Promise<string>;
  _publicKey: web3.PublicKey;
  payer: web3.Keypair;

  static fakeWallet() {
    return new WebWallet(
      web3.PublicKey.default,
      (transaction: web3.Transaction = new web3.Transaction()) => { return Promise.resolve(transaction); },
      (transaction: web3.Transaction[] = [new web3.Transaction()]) => { return Promise.resolve(transaction); },
      () => {},
    );
  }

  constructor(
    publicKey: web3.PublicKey,
    signTransaction: (transaction: web3.Transaction) => Promise<web3.Transaction>,
    signAllTransactions: (transaction: web3.Transaction[]) => Promise<web3.Transaction[]>,
    sendTransaction: any,
  ) {
    this._publicKey = publicKey;
    this._signTransaction = signTransaction;
    this._signAllTransactions = signAllTransactions;
    this.sendTransaction = sendTransaction;
    this.payer = new web3.Keypair();
  }

  async signTransaction(tx: web3.Transaction): Promise<web3.Transaction> {
    return this._signTransaction(tx);
  }

  async signAllTransactions(txs: web3.Transaction[]): Promise<web3.Transaction[]> {
    return this._signAllTransactions(txs);
  }

  get publicKey(): web3.PublicKey {
    return this._publicKey;
  }
}
