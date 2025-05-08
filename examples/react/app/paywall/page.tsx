"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Paywall from "@/components/Paywall";

export default function PaywallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const paymentDetailsParam = searchParams.get("paymentDetails");
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    // Parse payment details from URL parameter
    if (paymentDetailsParam) {
      try {
        const decodedDetails = JSON.parse(decodeURIComponent(paymentDetailsParam));
        setPaymentDetails(decodedDetails);
      } catch (error) {
        console.error("Error parsing payment details:", error);
      }
    }
  }, [paymentDetailsParam]);

  // Handle successful payment completion
  const handlePaymentComplete = (txHash: string) => {
    if (returnUrl) {
      // Add the payment information to the return URL
      const url = new URL(returnUrl, window.location.origin);
      url.searchParams.set("402base64", btoa(JSON.stringify({ txHash })));
      
      // Redirect back to the original URL with payment info
      router.push(url.toString());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-[800px] mx-auto p-8">
        {/* Render the Paywall component */}
        <Paywall />
        
        {/* Return link */}
        {returnUrl && (
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push(returnUrl)}
              className="text-blue-500 hover:text-blue-700 underline"
            >
              Cancel and return
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
