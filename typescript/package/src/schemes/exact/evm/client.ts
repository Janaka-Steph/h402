import { WalletClient, PublicActions } from "viem";
import {
  signAuthorization,
  signNativeTransfer,
  utils,
  signTokenTransfer,
} from "./index.js";
import { exact } from "../../../types/index.js";
import { evm } from "../../../shared/index.js";
import {
  PaymentRequirements,
  PaymentPayload,
  Hex,
} from "../../../types/index.js";
import { config } from "../../../index.js";

const TRANSFER_WITH_AUTHORIZATION_ABI = [
  {
    type: "function",
    name: "transferWithAuthorization",
    inputs: [...evm.authorizationTypes.TransferWithAuthorization],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

async function _createPayment(
  client: WalletClient & PublicActions,
  paymentRequirements: PaymentRequirements
): Promise<PaymentPayload<exact.evm.Payload>> {
  if (!client?.account?.address) {
    throw new Error("Client account is required");
  }

  const from = client.account.address as Hex;
  const to = paymentRequirements.payToAddress as Hex;
  const value = paymentRequirements.amountRequired as bigint;

  const basePayment = {
    version: config["h402Version"],
    scheme: paymentRequirements.scheme,
    namespace: paymentRequirements.namespace!,
    networkId: paymentRequirements.networkId,
    resource: paymentRequirements.resource,
  };

  if (paymentRequirements.tokenAddress === evm.ZERO_ADDRESS) {
    const result = await signNativeTransfer(
      client,
      { from, to, value },
      paymentRequirements
    );

    if (result.type === "fallback") {
      return {
        ...basePayment,
        payload: {
          type: "signAndSendTransaction",
          signedMessage: result.signature,
          transactionHash: result.txHash,
        },
      };
    }

    return {
      ...basePayment,
      payload: {
        type: "nativeTransfer",
        signature: result.signature,
        transaction: { from, to, value, nonce: result.nonce },
      },
    };
  }

  const hasTransferWithAuthorization = await client
    .readContract({
      address: paymentRequirements.tokenAddress as Hex,
      abi: TRANSFER_WITH_AUTHORIZATION_ABI,
      functionName: "transferWithAuthorization",
    })
    .then(() => true)
    .catch(() => false);

  if (hasTransferWithAuthorization) {
    const result = await signAuthorization(
      client,
      { from, to, value },
      paymentRequirements
    );

    if (result.type === "fallback") {
      return {
        ...basePayment,
        payload: {
          type: "signAndSendTransaction",
          signedMessage: result.signature,
          transactionHash: result.txHash,
        },
      };
    }

    return {
      ...basePayment,
      payload: {
        type: "authorization",
        signature: result.signature,
        authorization: {
          from,
          to,
          value,
          validAfter: result.validAfter,
          validBefore: result.validBefore,
          nonce: result.nonce,
          version: result.version,
        },
      },
    };
  }

  const result = await signTokenTransfer(
    client,
    { from, to, value },
    paymentRequirements
  );

  if (result.type === "fallback") {
    return {
      ...basePayment,
      payload: {
        type: "signAndSendTransaction",
        signedMessage: result.signature,
        transactionHash: result.txHash,
      },
    };
  }

  return {
    ...basePayment,
    payload: {
      type: "tokenTransfer",
      signature: result.signature,
      transaction: {
        from,
        to,
        value,
        nonce: result.nonce,
        data: result.data,
      },
    },
  };
}

async function createPayment(
  client: WalletClient & PublicActions,
  paymentRequirements: PaymentRequirements
): Promise<string> {
  const payment = await _createPayment(client, paymentRequirements);
  return utils.encodePaymentPayload(payment);
}

export { createPayment };
