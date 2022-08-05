import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import React, { useContext, useMemo } from 'react';

const NetworkContext = React.createContext<WalletAdapterNetwork>(
  WalletAdapterNetwork.Testnet,
);

export const NetworkProvider = NetworkContext.Provider;

export default () => {
  const network = useContext(NetworkContext);
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  return { network, endpoint };
};
