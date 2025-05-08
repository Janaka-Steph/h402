"use client";

import { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { EVM_WALLET_OPTIONS } from "@/config/walletOptions";

// Define supported networks and coins
interface NetworkOption {
  id: string;
  name: string;
  icon: string;
  coins: CoinOption[];
}

interface CoinOption {
  id: string;
  name: string;
  icon: string;
}

interface WalletOption {
  id: string;
  name: string;
  icon: string;
}

interface WalletPaymentUIProps {
  amount: string;
  onWalletSelect: (walletId: string, networkId: string, coinId: string) => Promise<void>;
  isProcessing: boolean;
}

const NETWORKS: NetworkOption[] = [
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

// Define wallet options based on the selected network
const getWalletOptions = (networkId: string): WalletOption[] => {
  // For Solana network, show Solana wallets
  if (networkId === 'solana') {
    return [
      {
        id: "phantom",
        name: "Phantom",
        icon: "/assets/wallets/phantom.svg",
      },
      {
        id: "solflare",
        name: "Solflare",
        icon: "/assets/wallets/phantom.svg", // Replace with actual Solflare icon
      }
    ];
  }
  
  // For EVM networks, show EVM wallets from config
  return EVM_WALLET_OPTIONS.map(option => ({
    id: option.id,
    name: option.label,
    icon: option.icon.src,
  }));
};

const WalletPaymentUI: React.FC<WalletPaymentUIProps> = ({ amount, onWalletSelect, isProcessing }) => {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkOption>(NETWORKS[0]);
  const [selectedCoin, setSelectedCoin] = useState<CoinOption>(NETWORKS[0].coins[0]);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [showCoinDropdown, setShowCoinDropdown] = useState(false);
  
  // Get wallet options based on the selected network
  const walletOptions = useMemo(() => {
    return getWalletOptions(selectedNetwork.id);
  }, [selectedNetwork.id]);

  const handleNetworkSelect = useCallback((network: NetworkOption) => {
    setSelectedNetwork(network);
    setSelectedCoin(network.coins[0]);
  }, []);

  const handleCoinSelect = useCallback((coin: CoinOption) => {
    setSelectedCoin(coin);
  }, []);

  const handleConnectWallet = useCallback(() => {
    setShowWalletOptions(true);
  }, []);

  const handleWalletSelect = useCallback(
    async (wallet: WalletOption) => {
      setShowWalletOptions(false);
      await onWalletSelect(wallet.id, selectedNetwork.id, selectedCoin.id);
    },
    [onWalletSelect, selectedNetwork.id, selectedCoin.id]
  );

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-sm">
      <h2 className="text-xl font-semibold mb-6">Pay from your Wallet</h2>

      {/* Network Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Network
        </label>
        <div className="relative">
          <button
            className="w-full flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => setShowNetworkDropdown(prev => !prev)}
            disabled={isProcessing}
          >
            <div className="flex items-center">
              <div className="w-6 h-6 mr-2 flex-shrink-0">
                <Image 
                  src={selectedNetwork.icon} 
                  alt={selectedNetwork.name} 
                  className="w-full h-full object-contain"
                  width={24}
                  height={24}
                />
              </div>
              <span>{selectedNetwork.name}</span>
            </div>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </button>
          {showNetworkDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
              {NETWORKS.map((network) => (
                <button
                  key={network.id}
                  className="w-full flex items-center px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-600 text-left"
                  onClick={() => {
                    handleNetworkSelect(network);
                    setShowNetworkDropdown(false);
                  }}
                >
                  <div className="w-6 h-6 mr-2 flex-shrink-0">
                    <Image
                      src={network.icon}
                      alt={network.name}
                      className="w-full h-full object-contain"
                      width={24}
                      height={24}
                    />
                  </div>
                  <span>{network.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Coin Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Coin
        </label>
        <div className="relative">
          <button
            className="w-full flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => setShowCoinDropdown(prev => !prev)}
            disabled={isProcessing}
          >
            <div className="flex items-center">
              <div className="w-6 h-6 mr-2 flex-shrink-0">
                <Image 
                  src={selectedCoin.icon} 
                  alt={selectedCoin.name} 
                  className="w-full h-full object-contain"
                  width={24}
                  height={24}
                />
              </div>
              <span>{selectedCoin.name}</span>
            </div>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </button>
          {showCoinDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
              {selectedNetwork.coins.map((coin) => (
                <button
                  key={coin.id}
                  className="w-full flex items-center px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-600 text-left"
                  onClick={() => {
                    handleCoinSelect(coin);
                    setShowCoinDropdown(false);
                  }}
                >
                  <div className="w-6 h-6 mr-2 flex-shrink-0">
                    <Image
                      src={coin.icon}
                      alt={coin.name}
                      className="w-full h-full object-contain"
                      width={24}
                      height={24}
                    />
                  </div>
                  <span>{coin.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Connect Wallet Button */}
      {!showWalletOptions ? (
        <button
          onClick={handleConnectWallet}
          disabled={isProcessing}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            <span className="flex items-center">
              Connect Wallet to Pay - {amount} 
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </span>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select a wallet:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {walletOptions.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleWalletSelect(wallet)}
                className="w-full flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 rounded-lg px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <div className="flex items-center">
                  <div className="w-6 h-6 mr-3 flex-shrink-0">
                    <Image 
                      src={wallet.icon} 
                      alt={wallet.name} 
                      className="w-full h-full object-contain"
                      width={24}
                      height={24}
                    />
                  </div>
                  <span className="font-medium">{wallet.name}</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowWalletOptions(false)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mt-2 underline"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletPaymentUI;
