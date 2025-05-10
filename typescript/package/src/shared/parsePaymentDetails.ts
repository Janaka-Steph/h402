import { PaymentDetails } from "../types/index.js";
import { evm, solana } from "./index.js";
import { PublicActions } from "viem";
import { Hex } from "../types/index.js";
import { createSolanaRpc } from "@solana/kit";

const ERC20_ABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function parsePaymentDetailsForAmount(
  paymentDetails: PaymentDetails,
  client?: PublicActions | any
): Promise<PaymentDetails> {
  // Handle backward compatibility with x402: if maxAmountRequired is present, use it for amountRequired
  const details = {
    ...paymentDetails,
    amountRequired:
      paymentDetails.maxAmountRequired !== undefined &&
      paymentDetails.maxAmountRequired !== null
        ? paymentDetails.maxAmountRequired
        : paymentDetails.amountRequired,
  };

  if (details.amountRequiredFormat === "smallestUnit") {
    return details;
  }

  // Handle Solana tokens
  if (details.namespace === "solana") {
    try {
      // For native SOL
      if (
        !details.tokenAddress ||
        details.tokenAddress === "11111111111111111111111111111111"
      ) {
        return {
          ...details,
          amountRequired: BigInt(
            Math.floor(
              Number(details.amountRequired) * 10 ** solana.NATIVE_SOL_DECIMALS
            )
          ),
        };
      }

      // For SPL tokens
      const decimals = await solana.getTokenDecimals(
        details.tokenAddress,
        details.networkId
      );

      return {
        ...details,
        amountRequired: BigInt(
          Math.floor(Number(details.amountRequired) * 10 ** decimals)
        ),
      };
    } catch (error) {
      throw new Error(
        `Failed to parse Solana token decimals: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Handle EVM tokens
  if (
    details.namespace === "evm" &&
    details.amountRequiredFormat === "humanReadable" &&
    details.tokenAddress.toLowerCase() === evm.ZERO_ADDRESS.toLowerCase()
  ) {
    const decimals = evm.chains[details.networkId].nativeTokenDecimals;

    return {
      ...details,
      amountRequired: BigInt(
        Math.floor(Number(details.amountRequired) * 10 ** decimals)
      ),
    };
  }

  try {
    // Skip ERC20 token check if client is not provided or doesn't have readContract method
    if (!client || !("readContract" in client)) {
      throw new Error("EVM client required for ERC20 token decimals");
    }

    const decimals = (await client.readContract({
      address: details.tokenAddress as Hex,
      abi: ERC20_ABI,
      functionName: "decimals",
    })) as number;

    return {
      ...details,
      amountRequired: BigInt(
        Math.floor(Number(details.amountRequired) * 10 ** decimals)
      ),
    };
  } catch (error) {
    throw new Error(
      `Token at address ${details.tokenAddress} is not ERC20 compliant: missing decimals function`
    );
  }
}
