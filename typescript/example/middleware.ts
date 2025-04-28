import { h402Middleware } from "@bit-gpt/h402/next";
import { paymentDetails } from "./config/paymentDetails";
import { NextResponse } from "next/server";

export const middleware = h402Middleware({
  routes: ["/api/create-image"],
  paywallRoute: "/",
  paymentDetails,
  facilitatorUrl: process.env.FACILITATOR_URL!,
  onError: (error, request) => {
    console.log("error", error);
    return NextResponse.rewrite(request.nextUrl.origin, { status: 402 });
  },
  onSuccess: async (request, facilitatorResponse) => {
    console.log("facilitatorResponse", facilitatorResponse);

    const prompt = request.nextUrl.searchParams.get("prompt");
    const txHash = facilitatorResponse.data?.txHash;
    const baseUrl = request.nextUrl.origin;

    const errorRedirectUrl = new URL("/", baseUrl);

    if (!prompt) {
      return NextResponse.redirect(errorRedirectUrl, { status: 400 });
    }

    if (prompt.length > 30) {
      return NextResponse.redirect(errorRedirectUrl, { status: 400 });
    }

    if (!txHash) {
      return NextResponse.redirect(errorRedirectUrl, { status: 400 });
    }

    const saveTxResponse = await fetch(baseUrl + "/api/handle-tx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txHash }),
    });

    if (!saveTxResponse.ok) {
      return NextResponse.redirect(errorRedirectUrl, { status: 400 });
    }

    const url = new URL(`/api/create-image?prompt=${prompt}`, baseUrl);

    return NextResponse.redirect(url, { status: 302 });
  },
});

export const config = {
  matcher: "/api/create-image",
};
