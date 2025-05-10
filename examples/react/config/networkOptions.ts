// config/networkOptions.ts
import { NetworkOption } from "../types/payment";

/**
 * Available network options for payment
 */
export const NETWORKS: NetworkOption[] = [
  {
    id: "bsc",
    name: "Binance Smart Chain",
    icon: "/assets/networks/bsc.svg",
    coins: [
      {
        id: "usdt",
        name: "USDT",
        icon: "/assets/coins/usdt.svg",
      },
      {
        id: "bnb",
        name: "BNB",
        icon: "/assets/coins/bnb.svg",
      },
    ],
  },
  {
    id: "solana",
    name: "Solana",
    icon: "/assets/networks/solana.svg",
    coins: [
      {
        id: "sol",
        name: "SOL",
        icon: "/assets/coins/sol.svg",
      },
      {
        id: "usdc",
        name: "USDC",
        icon: "/assets/coins/usdc.svg",
      },
    ],
  },
];

/**
 * Get a network by ID
 */
export const getNetworkById = (id: string): NetworkOption | undefined => {
  return NETWORKS.find(network => network.id === id);
};

/**
 * Get a coin by ID within a network
 */
export const getCoinByIdInNetwork = (networkId: string, coinId: string) => {
  const network = getNetworkById(networkId);
  if (!network) return undefined;

  return network.coins.find(coin => coin.id === coinId);
};
