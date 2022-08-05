import React, { useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  AccountInfo,
  Connection,
  ParsedAccountData,
  PublicKey,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

type AccountResponse = {
  pubkey: PublicKey;
  account: AccountInfo<ParsedAccountData | Buffer>;
};

const getAccounts = (
  connection: Connection,
  publicKey: PublicKey,
): Promise<AccountResponse[]> =>
  connection.getParsedProgramAccounts(TOKEN_PROGRAM_ID, {
    filters: [
      {
        dataSize: 165, // number of bytes
      },
      {
        memcmp: {
          offset: 32, // number of bytes
          bytes: publicKey.toString(), // base58 encoded string
        },
      },
    ],
  });

const fetchTokenInfoFromAccounts = async (
  connection: Connection,
  publicKey: PublicKey,
  callback: Function,
) => {
  const accounts = await getAccounts(connection, publicKey);
  callback(collateTokenInfoFromAccounts(accounts));
};

const collateTokenInfoFromAccounts = (
  accounts: AccountResponse[],
): TokenInfo[] =>
  accounts
    .filter(({ account: { data } }) => 'parsed' in data)
    .map(({ account: { data } }) => ({
      // @ts-ignore
      mintAddr: data?.parsed?.info?.mint,
      // @ts-ignore
      qty: data?.parsed?.info?.tokenAmount?.uiAmount,
    }))
    .filter(({ mintAddr, qty }) => !!(mintAddr && qty));

export type TokenInfo = {
  mintAddr: string;
  qty: number;
};

export default () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [tokenInfo, setTokenInfo] = React.useState<TokenInfo[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  useEffect(() => {
    if (wallet.publicKey) {
      setLoading(true);
      fetchTokenInfoFromAccounts(
        connection,
        wallet.publicKey,
        (tokenInfo: TokenInfo[]) => {
          setTokenInfo(tokenInfo);
          setLoading(false);
        },
      );
    } else {
      setTokenInfo([]);
      setLoading(false);
    }
  }, [connection, wallet.publicKey]);
  return { loading, tokens: tokenInfo };
};
