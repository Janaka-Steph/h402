"use client";

import {useState, useCallback, useContext, useMemo} from "react";
import { useWalletAccountTransactionSendingSigner } from "@solana/react";
import { useConnect, UiWalletAccount } from "@wallet-standard/react";
import { createPayment } from "@bit-gpt/h402";
import { createProxiedSolanaRpc } from "@/solana/lib/proxiedSolanaRpc";
import { SelectedWalletAccountContext } from "@/solana/context/SelectedWalletAccountContext";

interface IntegratedPaymentButtonProps {
  /**
   * Amount to display on the button
   */
  amount: string;

  /**
   * The wallet to connect to
   */
  wallet: any;

  /**
   * The prompt for image generation
   */
  prompt: string;

  /**
   * Custom payment details if needed
   */
  paymentDetails?: any;

  /**
   * Callback for successful payment
   */
  onSuccess?: (paymentHeader: string, txHash: string) => void;

  /**
   * Callback for payment errors
   */
  onError?: (error: Error) => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * A button that connects wallet if needed and processes payment
 * Following the Anza React example app patterns
 */
export default function IntegratedPaymentButton({
                                                  amount,
                                                  wallet,
                                                  prompt,
                                                  paymentDetails,
                                                  onSuccess,
                                                  onError,
                                                  className = "",
                                                }: IntegratedPaymentButtonProps) {
  // Get the selected account from context
  const [selectedAccount, setSelectedAccount] = useContext(SelectedWalletAccountContext);

  // State for tracking payment process
  const [status, setStatus] = useState<"idle" | "connecting" | "approving" | "processing" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Get the wallet connection hook
  const [isConnecting, connect] = useConnect(wallet);

  // Create a dummy account for when no account is selected
  const dummyAccount = useMemo(() => ({
    address: "",
    publicKey: new Uint8Array(),
    chains: ["solana:mainnet"],
  } as unknown as UiWalletAccount), []);

// Always call the hook unconditionally
  const transactionSendingSigner = useWalletAccountTransactionSendingSigner(
    selectedAccount || dummyAccount,
    "solana:mainnet"
  );

  // Handle the button click
  const handleClick = useCallback(async () => {
    setError(null);

    try {
      // Step 1: Connect wallet if needed
      if (!selectedAccount) {
        setStatus("connecting");

        // Check if wallet already has accounts
        if (wallet.accounts.length > 0) {
          setSelectedAccount(wallet.accounts[0]);
        } else {
          // Connect the wallet to get accounts
          const accounts = await connect();

          if (!accounts || accounts.length === 0) {
            throw new Error("No accounts available");
          }

          // Select the first account
          setSelectedAccount(accounts[0]);
        }
      }

      // Ensure we have an account and a transaction signer
      if (!selectedAccount || !transactionSendingSigner) {
        throw new Error("Wallet not properly connected");
      }

      // Step 2: Process payment
      setStatus("approving");

      // Create payment details
      const baseDetails = paymentDetails || {
        pricingParams: {
          amountRequired: 0.001,
          denomination: "SOL",
        },
        receiverParams: {
          currencyAddresses: {
            SOL: "YOUR_RECEIVER_ADDRESS", // Replace with actual address
          },
        },
        ttl: "3600",
        memo: "Image generation payment",
      };

      const finalPaymentDetails = {
        ...baseDetails,
        resource: `image-gen-${Date.now()}`,
      };

      // Create proxied RPC client
      const proxiedRpc = createProxiedSolanaRpc();

      // Set processing status
      setStatus("processing");

      // Create payment using the Solana payment library
      const paymentHeader = await createPayment(
        finalPaymentDetails,
        {
          solanaClient: {
            publicKey: selectedAccount.address,
            rpc: proxiedRpc,
            signAndSendTransaction: transactionSendingSigner?.signAndSendTransactions,
          },
        }
      );

      // Extract transaction hash from payment header
      let txHash = "";

      if (paymentHeader && typeof paymentHeader === "string" && paymentHeader.includes(":")) {
        const hashPart = paymentHeader.split(":").pop();
        if (hashPart) {
          txHash = hashPart;
        }
      }

      // Set success status
      setStatus("success");

      // Call success callback
      if (onSuccess) {
        onSuccess(paymentHeader, txHash);
      }
    } catch (err) {
      console.error("Payment error:", err);

      // Set error status and message
      setStatus("error");
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);

      // Call error callback
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    }
  }, [selectedAccount, setSelectedAccount, wallet, connect, transactionSendingSigner, paymentDetails, prompt, onSuccess, onError]);

  // Determine button state
  const isProcessing = status === "connecting" || status === "approving" || status === "processing" || isConnecting;
  const isDisabled = isProcessing;

  // Determine button text based on status
  const getButtonText = () => {
    if (isConnecting || status === "connecting") return "Connecting Wallet...";
    if (status === "approving") return "Approve in Wallet...";
    if (status === "processing") return "Processing Payment...";

    return selectedAccount
      ? `Pay - ${amount}`
      : `Connect Wallet to Pay - ${amount}`;
  };

  return (
    <div className="flex flex-col space-y-2">
      <button
        className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors ${isDisabled ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
        onClick={handleClick}
        disabled={isDisabled}
        type="button"
      >
        {isProcessing && (
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
        )}
        <span>{getButtonText()}</span>
        {!isProcessing && <span className="ml-2">→</span>}
      </button>

      {/* Error message display */}
      {error && (
        <div className="text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Success message display */}
      {status === "success" && (
        <div className="text-green-500 text-sm">
          Payment successful!
        </div>
      )}
    </div>
  );
}
