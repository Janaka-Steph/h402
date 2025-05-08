"use client";

import { useState, useCallback, useMemo, useContext, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useEvmWallet } from "@/evm/context/EvmWalletContext";
import { useWallets } from "@wallet-standard/react";
import { SelectedWalletAccountContext } from "@/solana/context/SelectedWalletAccountContext";
import { paymentDetails } from "@/config/paymentDetails";
import { createPayment } from "@bit-gpt/h402";
import { createPublicClient, http } from "viem";
import { bsc } from "viem/chains";
import TransactionStatus from "@/components/TransactionStatus";
import SolanaWalletConnector from "@/solana/components/SolanaWalletConnector";
import SolanaPaymentProcessor from "@/solana/components/SolanaPaymentProcessor";

// Add these interfaces at the top of your component, before the Paywall function
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

const MIN_PROMPT_LENGTH = 3;

export default function Paywall() {
  // Get returnUrl from URL parameters to extract the original prompt
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");

  // State to store the image prompt
  const [imagePrompt, setImagePrompt] = useState("");
  
  // Extract prompt from the returnUrl if available - only on client side
  useEffect(() => {
    if (returnUrl) {
      try {
        const returnUrlObj = new URL(returnUrl, window.location.origin);
        const promptParam = returnUrlObj.searchParams.get("prompt");
        if (promptParam) {
          setImagePrompt(decodeURIComponent(promptParam));
        }
      } catch (error) {
        console.error("Error parsing returnUrl:", error);
      }
    }
  }, [returnUrl]);

  // Payment state
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>("idle");
  const [txHash, setTxHash] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Get wallet contexts
  const { walletClient, connectWallet } = useEvmWallet();

  // Get Solana wallets using wallet-standard directly
  const wallets = useWallets();
  const solanaWallets = wallets.filter((wallet) =>
    wallet.chains.some((chain) => chain.startsWith("solana:"))
  );

  // Get the selected wallet account from context
  const [selectedSolanaAccount] = useContext(SelectedWalletAccountContext);

  // Create refs for the Solana components
  const solanaWalletConnectorRef = useRef<HTMLDivElement>(null);
  const solanaPaymentProcessorRef = useRef<HTMLButtonElement>(null);

  // Track Solana wallet connection state
  const [isSolanaWalletConnected, setIsSolanaWalletConnected] = useState(false);

  // Handle Solana wallet connection state changes
  const handleSolanaWalletConnectionChange = useCallback(
    (isConnected: boolean) => {
      console.log("Solana wallet connection changed:", isConnected);
      setIsSolanaWalletConnected(isConnected);
      
      // Reset error message when wallet is connected
      if (isConnected) {
        setErrorMessage("");
      }
    },
    []
  );

  // Check if prompt is valid
  const isPromptValid = useCallback(() => {
    return imagePrompt.trim().length >= MIN_PROMPT_LENGTH;
  }, [imagePrompt]);
  // Network options
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

  // State for network and coin selection
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkOption>(
    NETWORKS[0]
  );
  const [selectedCoin, setSelectedCoin] = useState<CoinOption>(
    NETWORKS[0].coins[0]
  );
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [showCoinDropdown, setShowCoinDropdown] = useState(false);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  
  // Effect to handle Solana network selection
  useEffect(() => {
    // When Solana network is selected, check if wallet is connected
    if (selectedNetwork.id === 'solana' && !isSolanaWalletConnected && !selectedSolanaAccount) {
      console.log("Solana network selected, but wallet not connected");
      // We don't show an error immediately to give the user a chance to connect
    }
  }, [selectedNetwork.id, isSolanaWalletConnected, selectedSolanaAccount]);

  // Get wallet options based on the selected network
  const walletOptions = useMemo(() => {
    // For Solana network, use the available Solana wallets
    if (selectedNetwork.id === "solana") {
      return solanaWallets.map((wallet) => ({
        id: wallet.name.toLowerCase(),
        name: wallet.name,
        icon: "/assets/wallets/phantom.svg", // Default icon, should be replaced with actual wallet icons
      }));
    }

    // For EVM networks (like BSC), return predefined wallet options
    return [
      {
        id: "metamask",
        name: "MetaMask",
        icon: "/assets/wallets/metamask.svg",
      },
      {
        id: "walletconnect",
        name: "WalletConnect",
        icon: "/assets/wallets/walletconnect.svg",
      },
      {
        id: "trustwallet",
        name: "Trust Wallet",
        icon: "/assets/wallets/trustwallet.svg",
      },
    ];
  }, [selectedNetwork.id, solanaWallets]);

  // Handle network selection
  const handleNetworkSelect = useCallback((network: NetworkOption) => {
    setSelectedNetwork(network);
    setSelectedCoin(network.coins[0]);
    setShowWalletOptions(false);
    
    // Reset payment status when switching networks
    setPaymentStatus("idle");
    setErrorMessage("");
  }, []);

  // Handle coin selection
  const handleCoinSelect = useCallback((coin: CoinOption) => {
    setSelectedCoin(coin);
  }, []);

  // Handle wallet connection button click
  const handleConnectWalletClick = useCallback(() => {
    setShowWalletOptions(true);
  }, []);

  // Handle wallet selection and payment
  const handleWalletSelect = useCallback(
    async (walletId: string, networkId: string) => {
      if (isProcessing || !isPromptValid()) return;

      setIsProcessing(true);
      setPaymentStatus("awaiting_approval");
      setErrorMessage("");

      try {
        // Handle EVM wallets
        if (networkId === "bsc") {
          // Connect the wallet first if not connected
          if (!walletClient) {
            await connectWallet(walletId as any); // Type assertion to bypass type error
          }

          const publicClient = createPublicClient({
            chain: bsc,
            transport: http(),
          });

          // Validate chain
          const chainId = await walletClient?.chain?.id;
          if (chainId !== bsc.id) {
            throw new Error("Please switch to BSC network");
          }

          // Validate address
          const [address] = (await walletClient?.getAddresses()) ?? [];
          if (!address) {
            throw new Error("Cannot access wallet account");
          }

          // Check balance
          const balance = await publicClient.getBalance({ address });
          if (balance === BigInt(0)) {
            throw new Error("Insufficient balance for transaction");
          }

          setPaymentStatus("processing");

          // Create payment
          const paymentHeader = await createPayment(paymentDetails, {
            evmClient: walletClient || undefined,
          });

          // Set transaction hash if available from the payment process
          if (
            paymentHeader &&
            typeof paymentHeader === "string" &&
            paymentHeader.includes(":")
          ) {
            const hashPart = paymentHeader.split(":").pop();
            if (hashPart) {
              setTxHash(hashPart);
            }
          }

          setPaymentStatus("paid");
          console.log(
            "Payment successful! Redirecting directly to image generation..."
          );

          // Redirect directly to the image generation API endpoint
          window.location.href = `/api/generate-image?prompt=${encodeURIComponent(imagePrompt.trim())}&402base64=${encodeURIComponent(
            paymentHeader
          )}`;
        }
        // Handle Solana wallets
        else if (networkId === "solana") {
          setPaymentStatus("awaiting_wallet");

          // First make sure the Solana network is selected
          setSelectedNetwork(NETWORKS.find(n => n.id === 'solana') || NETWORKS[0]);
          
          // If no Solana account is selected, we need to connect first
          if (!selectedSolanaAccount) {
            setIsProcessing(false); // Reset processing state to allow user to connect wallet
            setShowWalletOptions(false); // Hide wallet options to show the connector
            // Don't throw an error, just show a message
            setErrorMessage("Please connect your Solana wallet using the connector above");
            return;
          }
          
          // Ensure we have a valid wallet account before proceeding
          if (!selectedSolanaAccount.address) {
            throw new Error("Invalid Solana wallet account");
          }
          
          // Use the SolanaPaymentProcessor component to handle the payment
          // It will be triggered via its ref when the user clicks the payment button
          if (solanaPaymentProcessorRef.current) {
            solanaPaymentProcessorRef.current.click();
          } else {
            throw new Error("Payment processor not initialized. Please try again.");
          }
        }
      
      } catch (error) {
        console.error("Payment failed:", error);
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setPaymentStatus("failed");
        setIsProcessing(false);
      }
    },
    [
      walletClient,
      connectWallet,
      selectedSolanaAccount,
      solanaWallets,
      isPromptValid,
      imagePrompt,
      isProcessing,
    ]
  );

  // Handle wallet selection from wallet options
  const handleWalletOptionSelect = useCallback(
    async (wallet: WalletOption) => {
      setShowWalletOptions(false);
      await handleWalletSelect(wallet.id, selectedNetwork.id);
    },
    [handleWalletSelect, selectedNetwork.id]
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-full">
      <div className="w-full max-w-[800px] mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-2">
          Complete Payment to Continue
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-base mb-8">
          Connect your wallet and pay a small fee to generate your AI image
          using the HTTP 402 payment protocol.
        </p>

        {/* Solana Wallet Connector - shown when Solana network is selected */}
        <div className={`mb-6 ${selectedNetwork.id === 'solana' ? '' : 'hidden'}`}>
          <SolanaWalletConnector
            ref={solanaWalletConnectorRef}
            onWalletConnectionChange={handleSolanaWalletConnectionChange}
          />
        </div>

        {/* Solana Payment Processor - only rendered when wallet is connected */}
        <div className="hidden">
          {selectedSolanaAccount && (
            <SolanaPaymentProcessor
              ref={solanaPaymentProcessorRef}
              isPromptValid={isPromptValid}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
              prompt={imagePrompt}
            />
          )}
        </div>

        {imagePrompt && (
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your prompt:
            </h2>
            <p className="text-gray-800 dark:text-gray-200 italic">
              &quot;{imagePrompt}&quot;
            </p>
          </div>
        )}

        {/* Payment UI with simplified UX flow */}
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
                onClick={() => setShowNetworkDropdown((prev) => !prev)}
                disabled={isProcessing}
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
                      onClick={() => {
                        handleNetworkSelect(network);
                        setShowNetworkDropdown(false);
                      }}
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
                onClick={() => setShowCoinDropdown((prev) => !prev)}
                disabled={isProcessing}
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
                      onClick={() => {
                        handleCoinSelect(coin);
                        setShowCoinDropdown(false);
                      }}
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

          {/* Connect Wallet Button */}
          {!showWalletOptions ? (
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
              onClick={handleConnectWalletClick}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  Connect Wallet to Pay - {`$${paymentDetails.amountRequired}`}
                </>
              )}
            </button>
          ) : (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select a wallet
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {walletOptions.map((wallet) => (
                  <button
                    key={wallet.id}
                    className="flex items-center justify-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => handleWalletOptionSelect(wallet)}
                    disabled={isProcessing}
                  >
                    <div className="w-6 h-6 mr-2">
                      <img
                        src={wallet.icon}
                        alt={wallet.name}
                        className="w-full h-full object-contain"
                        width={24}
                        height={24}
                      />
                    </div>
                    <span>{wallet.name}</span>
                  </button>
                ))}
              </div>
              <button
                className="w-full mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                onClick={() => setShowWalletOptions(false)}
                disabled={isProcessing}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Transaction Status */}
        {paymentStatus !== "idle" && (
          <div className="mt-6">
            <TransactionStatus txHash={txHash} status={paymentStatus} />
            {errorMessage && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
                {errorMessage}
              </div>
            )}
          </div>
        )}

        {/* Return link */}
        {returnUrl && (
          <div className="mt-6 text-center">
            <button
              onClick={() => (window.location.href = returnUrl)}
              className="text-blue-500 hover:text-blue-700 underline"
              disabled={isProcessing}
            >
              Cancel and return
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
