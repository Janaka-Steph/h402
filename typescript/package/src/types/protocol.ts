type PaymentDetails = {
  // Scheme of the payment protocol to use
  scheme: string;
  // Namespace for the receiving blockchain network
  namespace: string | null;
  // Network of the blockchain to send payment on
  networkId: string;
  // Amount required to access the resource in smallest units
  amountRequired: number | bigint;
  // Format of the amount required
  amountRequiredFormat: "smallestUnit" | "humanReadable";
  // Address to pay for accessing the resource
  payToAddress: string;
  // Token contract
  tokenAddress: string;
  // Identifier of what the user pays for
  resource: string;
  // Description of the resource
  description: string;
  // Mime type of the rescource response
  mimeType: string;
  // Output schema of the resource response
  outputSchema: object | null;
  // Time in seconds it may be before the payment can be settaled
  estimatedProcessingTime: number;
  // Extra informations about the payment for the scheme
  extra: Record<string, any> | null;
  // Maximum amount required to access the resource in amount ** 10 ** decimals
  maxAmountRequired?: bigint | null;
  // Time in seconds it may be before the payment can be settaled
  requiredDeadlineSeconds?: number | null;
};

type PaymentRequired = {
  // Version of the h402 payment protocol
  version: number;
  // List of payment details that the resource server accepts (A resource server may accept multiple tokens/chains)
  accepts: PaymentDetails[];
  // Message for error(s) that occured while processing payment
  error: string | null;
  // Version of the h402 payment protocol
  h402Version?: number | null;
};

type PaymentPayload<T> = {
  // Version of the h402 payment protocol
  version: number;
  // Scheme of the payment protocol to use
  scheme: string;
  // Namespace for the receiving blockchain network
  namespace: string;
  // Netowrk of the blockchain to send payment on
  networkId: string;
  // Payload of the payment protocol
  payload: T;
  // Identifier of what the user pays for
  resource: string;
};

export { PaymentDetails, PaymentRequired, PaymentPayload };
