import React, { useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  AccountInfo,
  Connection,
  ParsedAccountData,
  PublicKey,
  RpcResponseAndContext,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

type AccountResponse = RpcResponseAndContext<
  Array<{
    pubkey: PublicKey;
    account: AccountInfo<ParsedAccountData>;
  }>
>;

const getAccounts = (
  connection: Connection,
  publicKey: PublicKey,
): Promise<AccountResponse> =>
  connection.getParsedTokenAccountsByOwner(publicKey, {
    programId: TOKEN_PROGRAM_ID,
  });

const fetchTokenInfoFromAccounts = async (
  connection: Connection,
  publicKey: PublicKey,
  callback: Function,
) => {
  const accounts = await getAccounts(connection, publicKey);
  callback(collateTokenInfoFromAccounts(accounts));
};

const collateTokenInfoFromAccounts = (accounts: AccountResponse): TokenInfo[] =>
  accounts.value
    .map(({ account: { data } }) => ({
      mintAddr: data?.parsed?.info?.mint,
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
