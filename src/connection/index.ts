import { clusterApiUrl } from "@solana/web3.js";

type Cluster = {
  name: Clusters;
  url: string;
};

export enum Clusters {
  Mainnet = "mainnet-beta",
  Testnet = "testnet",
  Devnet = "devnet",
  Localnet = "localnet",
};

export const DEFAULT_CLUSTER = {
    name: Clusters.Devnet,
    url: clusterApiUrl("devnet"),
} as Cluster;

export const CLUSTERS: Cluster[] = [
  {
    name: Clusters.Mainnet,
    url: "https://api.metaplex.solana.com/",
  },
  {
    name: Clusters.Testnet,
    url: clusterApiUrl("testnet"),
  },
  DEFAULT_CLUSTER,
  {
    name: Clusters.Localnet,
    url: "http://127.0.0.1:8899",
  },
];

export function getClusterUrl(name: string): string {
  return getCluster(name);
};
export function getCluster(name: string): string {
  for (const cluster of CLUSTERS) {
    if (cluster.name === name) {
      return cluster.url;
    }
  }
  return DEFAULT_CLUSTER.url;
}