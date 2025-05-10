"use client";

import { useState, useCallback, useEffect } from "react";
import { useWalletAccountTransactionSendingSigner } from "@solana/react";
import { useConnect, UiWalletAccount } from "@wallet-standard/react";
import { createPayment } from "@bit-gpt/h402";
import { createProxiedSolanaRpc } from "@/solana/lib/proxiedSolanaRpc";

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
 * Inner component that handles payment processing with a connected account
 */
function ConnectedPaymentButton({
  amount,
  account,
  paymentDetails,
  onSuccess,
  onError,
  className = "",
}: {
  amount: string;
  account: UiWalletAccount;
  paymentDetails?: any;
  onSuccess?: (paymentHeader: string, txHash: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}) {
  // State for tracking payment process
  const [status, setStatus] = useState<
    "idle" | "approving" | "processing" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Always call hooks at the top level - following Rule #1 of React Hooks
  const transactionSendingSigner = useWalletAccountTransactionSendingSigner(
    account,
    "solana:mainnet"
  );

  // Handle the button click
  const handleClick = useCallback(async () => {
    setErrorMessage(null);

    try {
      // Ensure we have a transaction signer
      if (!transactionSendingSigner) {
        throw new Error("Transaction signer not available");
      }

      // Process payment
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
        memo: "Payment",
      };

      const finalPaymentDetails = {
        ...baseDetails,
        resource: `payment-${Date.now()}`,
      };

      // Create proxied RPC client
      const proxiedRpc = createProxiedSolanaRpc();

      // Set processing status
      setStatus("processing");

      // Create payment using the Solana payment library
      const paymentHeader = await createPayment(finalPaymentDetails, {
        solanaClient: {
          publicKey: account.address,
          rpc: proxiedRpc,
          signAndSendTransaction:
            transactionSendingSigner?.signAndSendTransactions,
        },
      });

      // Extract transaction hash from payment header
      let txHash = "";

      if (
        paymentHeader &&
        typeof paymentHeader === "string" &&
        paymentHeader.includes(":")
      ) {
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
      const errMsg = err instanceof Error ? err.message : String(err);
      setErrorMessage(errMsg);

      // Call error callback
      if (onError) {
        onError(err instanceof Error ? err : new Error(errMsg));
      }
    }
  }, [account, transactionSendingSigner, paymentDetails, onSuccess, onError]);

  // Determine button state
  const isProcessing = status === "approving" || status === "processing";
  const isDisabled = isProcessing;

  // Determine button text based on status
  const getButtonText = () => {
    if (status === "approving") return "Approve in Wallet...";
    if (status === "processing") return "Processing Payment...";
    return `Pay - ${amount}`;
  };

  return (
    <button
      className={`btn btn-primary ${className} ${isProcessing ? "loading" : ""}`}
      onClick={handleClick}
      disabled={isDisabled}
    >
      {getButtonText()}
      {errorMessage && <div className="text-error mt-2">{errorMessage}</div>}
    </button>
  );
}

/**
 * Main component that handles wallet connection and renders the payment button when connected
 * Following the Anza React example app patterns
 */
export default function IntegratedPaymentButton({
  amount,
  wallet,
  paymentDetails,
  onSuccess,
  onError,
  className = "",
}: IntegratedPaymentButtonProps) {
  // State for tracking connection process
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] =
    useState<UiWalletAccount | null>(null);

  // Get the wallet connection hook - always called at the top level
  const [isConnecting, connect] = useConnect(wallet);

  // Effect to set the account when wallet accounts are available
  useEffect(() => {
    if (wallet?.accounts?.length > 0 && !selectedAccount) {
      setSelectedAccount(wallet.accounts[0]);
      setStatus("connected");
    }
  }, [wallet, selectedAccount]);

  // Handle the button click to connect wallet
  const handleConnectClick = useCallback(async () => {
    setErrorMessage(null);

    try {
      setStatus("connecting");

      // Check if wallet already has accounts
      if (wallet.accounts.length > 0) {
        setSelectedAccount(wallet.accounts[0]);
        setStatus("connected");
      } else {
        // Connect the wallet to get accounts
        const accounts = await connect();

        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts available");
        }

        // Select the first account
        setSelectedAccount(accounts[0]);
        setStatus("connected");
      }
    } catch (err) {
      console.error("Wallet connection error:", err);

      // Set error status and message
      setStatus("error");
      const errMsg = err instanceof Error ? err.message : String(err);
      setErrorMessage(errMsg);

      // Call error callback
      if (onError) {
        onError(err instanceof Error ? err : new Error(errMsg));
      }
    }
  }, [wallet, connect, onError]);

  // Determine button state
  const isProcessing = status === "connecting" || isConnecting;
  const isDisabled = isProcessing;

  // Determine button text based on status
  const getButtonText = () => {
    if (isConnecting || status === "connecting") return "Connecting Wallet...";
    return `Connect Wallet to Pay - ${amount}`;
  };

  // If we have a selected account, render the ConnectedPaymentButton
  if (selectedAccount) {
    return (
      <ConnectedPaymentButton
        amount={amount}
        account={selectedAccount}
        paymentDetails={paymentDetails}
        onSuccess={onSuccess}
        onError={onError}
        className={className}
      />
    );
  }

  // Otherwise render the connect button
  return (
    <button
      className={`btn btn-primary ${className} ${isProcessing ? "loading" : ""}`}
      onClick={handleConnectClick}
      disabled={isDisabled}
    >
      {getButtonText()}
      {errorMessage && <div className="text-error mt-2">{errorMessage}</div>}
    </button>
  );
}
