/**
 * Types related to payments
 */

/**
 * Result of a payment process
 */
export interface PaymentResult {
  /**
   * Transaction hash from the payment transaction
   */
  txHash: string;

  /**
   * The complete payment header string for HTTP 402 usage
   */
  paymentHeader: string;

  /**
   * Whether the payment was successful
   */
  success: boolean;

  /**
   * Optional error message if payment failed
   */
  errorMessage?: string;
}

/**
 * Payment details structure for h402 payment protocol
 */
export interface PaymentDetails {
  /**
   * Pricing parameters
   */
  pricingParams: {
    /**
     * Amount required for the payment
     */
    amountRequired: number;

    /**
     * Currency denomination (e.g., "SOL", "USDC")
     */
    denomination: string;
  };

  /**
   * Receiver parameters
   */
  receiverParams: {
    /**
     * Map of currency addresses
     */
    currencyAddresses: {
      [key: string]: string;
    };
  };

  /**
   * Resource identifier (usually unique per request)
   */
  resource: string;

  /**
   * Time-to-live in seconds
   */
  ttl: string;

  /**
   * Optional memo for the transaction
   */
  memo: string;
}

/**
 * Type for network options
 */
export interface NetworkOption {
  id: string;
  name: string;
  icon: string;
  coins: CoinOption[];
}

/**
 * Type for coin/token options
 */
export interface CoinOption {
  id: string;
  name: string;
  icon: string;
}
