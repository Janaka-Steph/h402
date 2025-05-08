import { createPayment } from "@bit-gpt/h402";
import { solanaPaymentDetails } from "@/config/paymentDetails";
import { createProxiedSolanaRpc } from "./proxiedSolanaRpc";
import { PaymentClient } from "@bit-gpt/h402/types";
import { SignatureBytes } from "@solana/kit";
// Import bs58 for encoding/decoding base58 strings
import bs58 from "bs58";

// Define types for wallet and account to avoid React hook dependencies
interface WalletAccount {
  address: string;
  wallet: {
    name: string;
    features: Record<string, unknown>;
  };
}

// Define types for transaction signing
interface SignAndSendTransactionParams {
  account: WalletAccount;
  transaction: any;
  options: { preflightCommitment: string };
}

interface SignAndSendTransactionResult {
  signature: string;
}

/**
 * Utility functions for Solana payments
 * This is a non-React utility that doesn't use hooks
 */
export const SolanaPaymentUtils = {
  /**
   * Process a payment with a connected wallet account
   * @param account The connected wallet account
   * @param prompt The prompt for the image generation
   * @returns The payment header string
   */
  async processPayment(
    account: WalletAccount,
    signAndSendTransaction: (
      params: SignAndSendTransactionParams
    ) => Promise<SignAndSendTransactionResult>
  ): Promise<string> {
    try {
      // Create dynamic payment details with a unique resource ID
      const dynamicSolanaPaymentDetails = {
        ...solanaPaymentDetails,
        resource: `solana-image-${Date.now()}`,
      };

      // Create the proxied Solana RPC client
      const proxiedRpc = createProxiedSolanaRpc();

      // Create the payment client
      const paymentClient: PaymentClient = {
        solanaClient: {
          publicKey: account.address,
          rpc: proxiedRpc,
          signAndSendTransaction: async (transactions) => {
            // Process each transaction and collect signatures
            const signatures: SignatureBytes[] = [];
            for (const transaction of transactions) {
              const { signature } = await signAndSendTransaction({
                account,
                transaction,
                options: { preflightCommitment: "confirmed" },
              });
              // Convert the signature string directly to bytes using bs58 decode
              // This matches how the project converts between signature formats in the examples
              // from the Solana Kit documentation
              const signatureBytes = new Uint8Array(bs58.decode(signature)) as SignatureBytes;
              signatures.push(signatureBytes);
            }
            return signatures as readonly SignatureBytes[];
          },
        },
      };

      // Create the payment
      const paymentHeader = await createPayment(
        dynamicSolanaPaymentDetails,
        paymentClient
      );

      return paymentHeader;
    } catch (error) {
      console.error("Error processing Solana payment:", error);
      throw error;
    }
  },
};

export default SolanaPaymentUtils;
