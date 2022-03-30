import { web3 } from "@project-serum/anchor";

export interface ObjectWrapper<T, V> {
  program: V;
  key: web3.PublicKey;
  object: T;
  data: Buffer;
}