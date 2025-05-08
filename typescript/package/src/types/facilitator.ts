import { PaymentDetails } from "./protocol";

type FacilitatorRequest = {
  paymentHeader: string;
  paymentDetails: PaymentDetails;
};

type FacilitatorResponse<T> = {
  data: T;
  error?: string;
};

type SettleResponse = {
  success: boolean;
  error?: string | undefined;
  txHash?: string | undefined;
  chainId?: string | undefined;
  transaction?: string | undefined;
  network?: string | undefined;
  payer?: string | undefined;
};

type VerifyResponse = {
  isValid: boolean;
  type?: "payload" | "transaction";
  txHash?: string;
  errorMessage?: string | undefined;
};

export {
  FacilitatorRequest,
  FacilitatorResponse,
  SettleResponse,
  VerifyResponse,
};
