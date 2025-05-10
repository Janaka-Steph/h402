"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallets } from "@wallet-standard/react";
import IntegratedPaymentButton from "./IntegratedPaymentButton";

// Network options for the UI
const NETWORKS = [
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

interface PaymentUIProps {
  /**
   * Image generation prompt
   */
  prompt: string;

  /**
   * URL to redirect to after payment
   */
  returnUrl?: string;

  /**
   * Custom payment details
   */
  paymentDetails?: any;
}

/**
 * Payment UI component with network/coin selection
 * and integrated payment button
 */
export default function PaymentUI({
                                    prompt,
                                    returnUrl,
                                    paymentDetails
                                  }: PaymentUIProps) {
  const router = useRouter();

  // Get all available wallets
  const wallets = useWallets();

  // State for network and coin selection
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0]);
  const [selectedCoin, setSelectedCoin] = useState(NETWORKS[0].coins[0]);
  
  // Derive display amount from payment details
  const getDisplayAmount = () => {
    if (!paymentDetails) return "0.01 SOL"; // Default amount if no payment details
    
    if (paymentDetails.namespace === "solana") {
      // For Solana payments
      const amount = paymentDetails.amountRequired;
      const format = paymentDetails.amountRequiredFormat;
      
      if (format === "smallestUnit") {
        // Convert from lamports to SOL
        return `${(Number(amount) / 1000000000).toFixed(format === "smallestUnit" ? 9 : 2)} SOL`;
      } else {
        // Already in human readable format
        return `${Number(amount).toFixed(2)} SOL`;
      }
    } else if (paymentDetails.namespace === "evm") {
      // For EVM payments
      return `${Number(paymentDetails.amountRequired).toFixed(2)} ${selectedCoin?.id || 'USDT'}`;
    }
    
    return "0.01 SOL"; // Fallback
  };

  // Dropdown state
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [showCoinDropdown, setShowCoinDropdown] = useState(false);

  // Find the wallet to use based on the selected network
  const [selectedWallet, setSelectedWallet] = useState<any>(null);

  // When network changes, find appropriate wallet
  useEffect(() => {
    if (selectedNetwork.id === "solana") {
      // Find a Solana wallet (Phantom, Solflare, etc.)
      const solanaWallet = wallets.find(wallet =>
        wallet.chains.some(chain => chain.startsWith("solana:")) &&
        (wallet.name.toLowerCase().includes("phantom") ||
          wallet.name.toLowerCase().includes("solflare"))
      );

      setSelectedWallet(solanaWallet || wallets.find(wallet =>
        wallet.chains.some(chain => chain.startsWith("solana:"))
      ));
    } else if (selectedNetwork.id === "bsc") {
      // For BSC or other EVM networks - find an EVM compatible wallet (MetaMask, etc.)
      const evmWallet = wallets.find(wallet =>
        wallet.chains.some(chain => chain.startsWith("evm:")) &&
        (wallet.name.toLowerCase().includes("metamask") ||
         wallet.name.toLowerCase().includes("coinbase") ||
         wallet.name.toLowerCase().includes("wallet"))
      );

      setSelectedWallet(evmWallet || wallets.find(wallet =>
        wallet.chains.some(chain => chain.startsWith("evm:"))
      ));
    } else {
      // For other networks not yet supported
      setSelectedWallet(null);
    }
  }, [selectedNetwork, wallets]);

  // Handle successful payment
  const handlePaymentSuccess = (paymentHeader: string) => {
    console.log("Payment successful:", paymentHeader);

    // Redirect to return URL if provided
    if (returnUrl) {
      const redirectUrl = new URL(returnUrl, window.location.origin);
      redirectUrl.searchParams.set("402base64", paymentHeader);
      router.push(redirectUrl.toString());
    }
  };

  // Handle payment error
  const handlePaymentError = (error: Error) => {
    console.error("Payment failed:", error);
  };

  // Handle network selection
  const handleNetworkSelect = (network: typeof NETWORKS[0]) => {
    setSelectedNetwork(network);
    setSelectedCoin(network.coins[0]);
    setShowNetworkDropdown(false);
  };

  // Handle coin selection
  const handleCoinSelect = (coin: typeof NETWORKS[0]["coins"][0]) => {
    setSelectedCoin(coin);
    setShowCoinDropdown(false);
  };

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
            type="button"
          >
            <div className="flex items-center">
              <div className="w-6 h-6 mr-2 flex-shrink-0">
                <img
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
                  onClick={() => handleNetworkSelect(network)}
                >
                  <div className="w-6 h-6 mr-2 flex-shrink-0">
                    <img
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
            type="button"
          >
            <div className="flex items-center">
              <div className="w-6 h-6 mr-2 flex-shrink-0">
                <img
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
                  onClick={() => handleCoinSelect(coin)}
                >
                  <div className="w-6 h-6 mr-2 flex-shrink-0">
                    <img
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

      {/* Payment Button */}
      {selectedWallet ? (
        <IntegratedPaymentButton
          amount={getDisplayAmount()}
          wallet={selectedWallet}
          prompt={prompt}
          paymentDetails={paymentDetails}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      ) : (
        <div className="text-yellow-500 text-center p-4 border border-yellow-200 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-900/50">
          No compatible wallets found. Please install a {selectedNetwork.id === "solana" ? "Solana" : "EVM-compatible"} wallet extension.
        </div>
      )}

      {/* Return button */}
      {returnUrl && (
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push(returnUrl)}
            className="text-blue-500 hover:text-blue-700 underline"
            type="button"
          >
            Cancel and return
          </button>
        </div>
      )}
    </div>
  );
}
