"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PaymentUI from "@/components/PaymentUI";
import {
  SelectedWalletAccountContextProvider
} from "@/solana/context/SelectedWalletAccountContextProvider";

export default function PaywallPage() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const paymentDetailsParam = searchParams.get("paymentDetails");
  const promptParam = searchParams.get("prompt");

  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  // Parse payment details from URL parameter if available
  useEffect(() => {
    if (paymentDetailsParam) {
      try {
        const decodedDetails = JSON.parse(decodeURIComponent(paymentDetailsParam));
        setPaymentDetails(decodedDetails);
      } catch (error) {
        console.error("Error parsing payment details:", error);
      }
    }
  }, [paymentDetailsParam]);

  return (
    <SelectedWalletAccountContextProvider>
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-[800px] mx-auto p-8">
          <h1 className="text-2xl font-semibold mb-2">
            Complete Payment to Continue
          </h1>

          <p className="text-gray-500 dark:text-gray-400 text-base mb-8">
            Connect your wallet and pay a small fee to generate your AI image.
          </p>

          <PaymentUI
            prompt={promptParam || ""}
            returnUrl={returnUrl || ""}
            paymentDetails={paymentDetails}
          />
        </div>
      </div>
    </SelectedWalletAccountContextProvider>
  );
}
