"use client";

import { useState, useCallback, useEffect } from "react";
import { useWalletAccountTransactionSendingSigner } from "@solana/react";
import { useConnect, UiWalletAccount } from "@wallet-standard/react";
import { createPayment } from "@bit-gpt/h402";
import { createProxiedSolanaRpc } from "@/solana/lib/proxiedSolanaRpc";
import { useEvmWallet } from "@/evm/context/EvmWalletContext";
import {
  solanaPaymentDetails,
  evmPaymentDetails,
} from "@/config/paymentDetails";

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

  // Get the EVM wallet client to satisfy the createPayment requirement
  const { walletClient: evmWalletClient } = useEvmWallet();

  // Always call hooks at the top level - following Rule #1 of React Hooks
  const transactionSendingSigner = useWalletAccountTransactionSendingSigner(
    account,
    "solana:mainnet"
  );

  // Handle the button click
  const handleClick = useCallback(async () => {
    setErrorMessage(null);

    try {
      // Process payment
      setStatus("approving");

      // Determine if this is an EVM wallet or Solana wallet
      const isEvmWallet = !transactionSendingSigner && evmWalletClient;
      const isSolanaWallet = !!transactionSendingSigner;

      // Ensure we have the appropriate wallet client
      if (isEvmWallet && !evmWalletClient) {
        throw new Error("EVM wallet client not available");
      }

      if (isSolanaWallet && !transactionSendingSigner) {
        throw new Error("Solana transaction signer not available");
      }

      // Create payment details based on the wallet type and provided details
      let baseDetails;
      
      if (paymentDetails) {
        // If payment details are provided explicitly, use those
        baseDetails = paymentDetails;
      } else if (isSolanaWallet) {
        // For Solana wallets, use the predefined Solana payment details
        baseDetails = solanaPaymentDetails;
        console.log("Using Solana payment details:", solanaPaymentDetails);
      } else {
        // For EVM wallets, use the predefined EVM payment details
        baseDetails = evmPaymentDetails;
      }
      
      // Fallback if somehow no details were set
      if (!baseDetails) {
        baseDetails = {
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
      }

      // Set the appropriate namespace and networkId based on wallet type
      let finalPaymentDetails;
      
      if (isSolanaWallet) {
        // For Solana wallets, ensure we're using the correct Solana settings from solanaPaymentDetails
        finalPaymentDetails = {
          ...solanaPaymentDetails, // Start with the full solanaPaymentDetails to ensure all Solana-specific fields are set
          // Override only what needs to be customized
          namespace: "solana",
          networkId: "mainnet",
          scheme: "exact",
          // Use the exact amount from solanaPaymentDetails without overriding
          // Update the resource to be unique
          resource: baseDetails.resource ? `${baseDetails.resource}-${Date.now()}` : `payment-${Date.now()}`
        };
      } else {
        // For EVM wallets
        finalPaymentDetails = {
          ...baseDetails,
          namespace: "evm",
          networkId: "56",
          scheme: "exact",
          resource: baseDetails.resource ? `${baseDetails.resource}-${Date.now()}` : `payment-${Date.now()}`
        };
      }
      
      // Ensure these critical fields are set correctly for Solana
      if (isSolanaWallet) {
        console.log("Ensuring Solana payment details are correct");
        // Double-check that namespace and networkId are set correctly for Solana
        finalPaymentDetails.namespace = "solana";
        finalPaymentDetails.networkId = "mainnet";
        // Ensure we're using a valid Solana address format for payToAddress
        // Replace any EVM-style address with the Solana address from solanaPaymentDetails
        if (finalPaymentDetails.payToAddress && finalPaymentDetails.payToAddress.startsWith('0x')) {
          console.log("Replacing EVM address with Solana address");
          finalPaymentDetails.payToAddress = solanaPaymentDetails.payToAddress;
        }
      }
      
      console.log("Final payment details:", {
        namespace: finalPaymentDetails.namespace,
        networkId: finalPaymentDetails.networkId,
        scheme: finalPaymentDetails.scheme,
        tokenAddress: finalPaymentDetails.tokenAddress,
        amountRequired: finalPaymentDetails.amountRequired
      });

      // Set processing status
      setStatus("processing");

      // Create payment clients based on wallet type
      let paymentClients = {};

      if (isEvmWallet) {
        // For EVM wallets, use the evmWalletClient
        paymentClients = {
          evmClient: evmWalletClient,
        };
      } else if (isSolanaWallet) {
        // For Solana wallets, create proxied RPC client and use the transaction signer
        const proxiedRpc = createProxiedSolanaRpc();
        console.log("Solana transaction signer:", !!transactionSendingSigner);
        console.log("Solana wallet address:", account.address);
        
        // Ensure we have a valid signAndSendTransaction function
        const signAndSendTransactionFn = transactionSendingSigner?.signAndSendTransactions;
        if (!signAndSendTransactionFn) {
          console.warn("Warning: signAndSendTransaction function is missing");
        }
        
        paymentClients = {
          solanaClient: {
            publicKey: account.address,
            rpc: proxiedRpc,
            signAndSendTransaction: signAndSendTransactionFn,
          }
          // No longer need to provide evmClient for Solana payments after our fix
        };
        
        console.log("Solana client setup:", {
          hasPublicKey: !!account.address,
          hasRpc: !!proxiedRpc,
          hasSignAndSendTransaction: !!signAndSendTransactionFn
        });
      } else {
        throw new Error("No supported wallet available");
      }

      // Create payment using the h402 payment library
      const paymentHeader = await createPayment(
        finalPaymentDetails,
        paymentClients
      );

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
  }, [
    account,
    transactionSendingSigner,
    evmWalletClient,
    paymentDetails,
    onSuccess,
    onError,
  ]);

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
