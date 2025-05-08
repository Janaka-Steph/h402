import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { utils } from "../index.js";
import { getPaywallHtml } from "../../shared/paywall.js";
import {
  FacilitatorResponse,
  PaymentDetails,
  VerifyResponse,
  SettleResponse,
} from "../../types/index.js";
import {
  configureSolanaClusters,
  ClusterConfig,
} from "../../shared/solana/clusterEndpoints.js";

type OnSuccessHandler = (
  request: NextRequest,
  response: FacilitatorResponse<VerifyResponse | SettleResponse>
) => Promise<NextResponse>;

/**
 * Money type for price specification
 * Can be a string with currency symbol (e.g. "$0.01") or a number
 */
export type Money = string | number;

/**
 * Network identifier for blockchain networks
 */
export type Network = 'base' | 'bsc' | 'solana' | string;

/**
 * Token type for payments
 */
export type TokenType = 'USDC' | 'USDT' | 'ETH' | 'SOL' | string;

/**
 * Token configuration
 */
export interface TokenConfig {
  /** Token type/symbol */
  type: TokenType;
  /** Token address on the blockchain (if applicable) */
  address?: string;
  /** Number of decimals for the token */
  decimals?: number;
}

/**
 * Configuration for a specific route
 */
export interface RouteConfig {
  /** The price required for access (can be a string with currency symbol or a number) */
  price: Money;
  /** The network to use for payment (e.g., 'base', 'base-sepolia', 'ethereum', etc.) */
  network: Network;
  /** The token to accept for payment */
  token?: TokenConfig;
  /** The blockchain namespace (e.g., 'evm', 'solana') */
  namespace?: 'evm' | 'solana' | string;
  /** Additional configuration options */
  config?: {
    /** Description of what is being purchased */
    description?: string;
    /** Custom MIME type for the response */
    mimeType?: string;
    /** Maximum timeout in seconds */
    maxTimeoutSeconds?: number;
    /** Payment scheme to use (e.g., 'exact') */
    scheme?: string;
    /** Resource identifier */
    resource?: string;
  };
}

/**
 * Routes configuration mapping route patterns to payment requirements
 * Can be a simple Money value or a full RouteConfig
 */
export type RoutesConfig = Record<string, Money | RouteConfig>;

/**
 * Configuration for the payment facilitator service
 */
export interface FacilitatorConfig {
  /** URL of the facilitator service */
  url: string;
  /** Optional function to create authentication headers */
  createAuthHeaders?: () => Record<string, string>;
}

/**
 * Configuration options for the h402 middleware
 * @interface H402Config
 */
interface H402Config {
  /** Address to receive payments */
  payTo: string;
  /** 
   * The routes configuration mapping route patterns to payment requirements 
   * Each key is a route pattern, and the value is either a price (Money) or a RouteConfig
   */
  routes: RoutesConfig;
  /**
   * Optional route to a custom paywall (like a React component)
   * If provided, browser requests will be redirected here instead of showing the inline HTML
   */
  paywallRoute?: string;
  /** The facilitator configuration */
  facilitator?: FacilitatorConfig;
  /** The error handler to use for the middleware */
  onError?: (error: string, request: NextRequest) => NextResponse;
  /** The success handler to use for the middleware */
  onSuccess?: OnSuccessHandler;
  /** Solana cluster configuration */
  solanaConfig?: Partial<Record<string, ClusterConfig>>;
  /** Custom paywall HTML (only used if paywallRoute is not provided) */
  customPaywallHtml?: string;
}

/**
 * Creates a middleware for h402 payment verification and settlement
 *
 * @param {H402Config} config - Configuration options for the middleware
 * @returns {(request: NextRequest) => Promise<NextResponse>} Middleware handler function
 *
 * @example
 * ```ts
 * // middleware.ts
 * import { h402Middleware } from '@bit-gpt/h402/next'
 *
 * export const middleware = h402Middleware({
 *   payTo: '0x1234567890123456789012345678901234567890',
 *   routes: {
 *     '/paywalled_route': {
 *       price: '$0.01',
 *       network: 'base',
 *       config: {
 *         description: 'Access to premium content'
 *       }
 *     },
 *     '/api/premium/*': 0.05 // Simple price format
 *   },
 *   paywallRoute: '/paywall', // Optional redirect route
 *   facilitator: {
 *     url: 'http://localhost:3000/api/facilitator'
 *   }
 * })
 *
 * export const config = {
 *   matcher: ['/paywalled_route', '/api/premium/*']
 * }
 * ```
 */
export function h402Middleware(config: H402Config) {
  const {
    payTo,
    routes,
    paywallRoute,
    facilitator,
    onError,
    onSuccess,
    solanaConfig,
    customPaywallHtml,
  } = config;
  
  const facilitatorUrl = facilitator?.url ?? "https://facilitator.bitgpt.xyz";
  const { verify, settle } = utils.useFacilitator(facilitatorUrl);

  if (solanaConfig) {
    configureSolanaClusters(solanaConfig);
  }

  // Version identifier for API responses
  const h402Version = 1;
  
  // Convert routes config to route patterns for matching
  const routePatterns = Object.entries(routes).map(([pattern, config]) => {
    // If config is just a price (Money), convert to full RouteConfig
    const routeConfig: RouteConfig = typeof config === 'object'
      ? config as RouteConfig
      : {
          price: config,
          network: 'base',
          namespace: 'evm',
          token: {
            type: 'USDC',
            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC address
            decimals: 6
          },
          config: {
            description: 'Access to premium content'
          }
        };
    
    return {
      pattern,
      config: routeConfig
    };
  });

  const defaultErrorHandler = (error: string, request: NextRequest, matchedRoute?: { pattern: string, config: RouteConfig }) => {
    // Check if request is from a browser and accepts HTML
    const accept = request.headers.get("Accept");
    const userAgent = request.headers.get("User-Agent");
    
    // Determine payment requirements based on matched route
    const routeConfig = matchedRoute?.config || {
      price: 0.01,
      network: 'base',
      namespace: 'evm',
      token: {
        type: 'USDC',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC address
        decimals: 6
      },
      config: {
        description: 'Access to premium content',
        scheme: 'exact'
      }
    };
    
    // Convert price to a numeric value for calculations
    const priceValue = typeof routeConfig.price === 'string' 
      ? parseFloat(routeConfig.price.replace(/[^0-9.]/g, '')) 
      : routeConfig.price;
    
    // Get token decimals (default to 6 for USDC/USDT)
    const tokenDecimals = routeConfig.token?.decimals || 6;
    const tokenMultiplier = Math.pow(10, tokenDecimals);
    
    // Create payment details object from route config
    const routePaymentDetails: PaymentDetails = {
      scheme: routeConfig.config?.scheme || 'exact',
      namespace: routeConfig.namespace || 'evm',
      networkId: routeConfig.network,
      amountRequired: priceValue * tokenMultiplier, // Convert to smallest unit based on token decimals
      amountRequiredFormat: 'smallestUnit',
      payToAddress: payTo,
      tokenAddress: routeConfig.token?.address || '',
      resource: routeConfig.config?.resource || request.url,
      description: routeConfig.config?.description || 'Access to premium content',
      mimeType: routeConfig.config?.mimeType || 'text/html',
      outputSchema: null,
      estimatedProcessingTime: 30,
      extra: null
    };

    if (accept?.includes("text/html") && userAgent?.includes("Mozilla")) {
      // If a custom paywall route is defined, redirect to it with payment details as query params
      if (paywallRoute) {
        const redirectUrl = new URL(paywallRoute, request.url);

        // Add payment details as query parameters for the React paywall to use
        redirectUrl.searchParams.set("returnUrl", request.url);

        // Add any other necessary info (safely encoded)
        redirectUrl.searchParams.set(
          "paymentDetails",
          encodeURIComponent(JSON.stringify(routePaymentDetails))
        );

        return NextResponse.redirect(redirectUrl, { status: 302 });
      }

      // Otherwise use the inline HTML paywall
      // Convert price to a numeric value for display
      const amount =
        typeof routeConfig.price === "number"
          ? routeConfig.price
          : typeof routeConfig.price === "string"
            ? parseFloat(routeConfig.price.replace(/[^0-9.]/g, ""))
            : 0.01;

      const html =
        customPaywallHtml ??
        getPaywallHtml({
          amount,
          paymentRequirements: [routePaymentDetails],
          currentUrl: request.url,
          testnet:
            routeConfig.network?.includes("testnet") ||
            routeConfig.network?.includes("devnet") ||
            routeConfig.network?.includes("sepolia"),
        });

      return new NextResponse(html, {
        status: 402,
        headers: { "Content-Type": "text/html" },
      });
    }

    // For API or non-browser requests, return JSON with payment details
    return new NextResponse(
      JSON.stringify({
        h402Version,
        error: error || "Payment Required",
        accepts: [routePaymentDetails],
      }),
      {
        status: 402,
        headers: { "Content-Type": "application/json" },
      }
    );
  };

  return async function handler(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    
    // Find matching route pattern
    const matchedRoute = routePatterns.find(route => {
      // Simple prefix matching
      if (route.pattern.endsWith('*')) {
        const prefix = route.pattern.slice(0, -1);
        return pathname.startsWith(prefix);
      }
      // Exact matching
      return pathname === route.pattern;
    });

    if (!matchedRoute) {
      return NextResponse.next();
    }
    
    // Get route-specific payment details
    const routeConfig = matchedRoute.config;
    
    // Convert price to a numeric value for calculations
    const priceValue = typeof routeConfig.price === 'string' 
      ? parseFloat(routeConfig.price.replace(/[^0-9.]/g, '')) 
      : routeConfig.price;
    
    // Get token decimals (default to 6 for USDC/USDT)
    const tokenDecimals = routeConfig.token?.decimals || 6;
    const tokenMultiplier = Math.pow(10, tokenDecimals);
    
    // Create payment details object from route config
    const routePaymentDetails: PaymentDetails = {
      scheme: routeConfig.config?.scheme || 'exact',
      namespace: routeConfig.namespace || 'evm',
      networkId: routeConfig.network,
      amountRequired: priceValue * tokenMultiplier, // Convert to smallest unit based on token decimals
      amountRequiredFormat: 'smallestUnit',
      payToAddress: payTo,
      tokenAddress: routeConfig.token?.address || '',
      resource: routeConfig.config?.resource || request.url,
      description: routeConfig.config?.description || 'Access to premium content',
      mimeType: routeConfig.config?.mimeType || 'text/html',
      outputSchema: null,
      estimatedProcessingTime: 30,
      extra: null
    };

    // Check for X-PAYMENT header as the primary method
    const paymentHeader = request.headers.get("X-PAYMENT");

    // Also check POST body for X-PAYMENT (for browser form submissions)
    let paymentFormData = null;
    if (!paymentHeader && request.method === "POST") {
      try {
        const formData = await request.formData();
        paymentFormData = formData.get("X-PAYMENT") as string;
      } catch (e) {
        // Ignore form data parsing errors
      }
    }

    const payment = paymentHeader || paymentFormData;

    if (!payment) {
      return onError
        ? onError("Payment Required", request)
        : defaultErrorHandler("Payment Required", request, matchedRoute);
    }

    const verifyResponse = await verify(payment, routePaymentDetails);

    if (verifyResponse.error) {
      return onError
        ? onError(verifyResponse.error, request)
        : defaultErrorHandler(verifyResponse.error, request, matchedRoute);
    }

    const paymentType = verifyResponse.data?.type;

    if (paymentType === "payload") {
      const settleResponse = await settle(payment, routePaymentDetails);

      if (settleResponse.error) {
        return onError
          ? onError(settleResponse.error, request)
          : defaultErrorHandler(settleResponse.error, request, matchedRoute);
      }

      // Create a response with payment verification header
      const response = NextResponse.next();

      if (settleResponse.data) {
        response.headers.set(
          "X-PAYMENT-RESPONSE",
          JSON.stringify({
            success: true,
            transaction: settleResponse.data.transaction,
            network: settleResponse.data.network,
            payer: settleResponse.data.payer,
          })
        );
      }

      if (onSuccess) {
        return await onSuccess(request, settleResponse);
      }

      return response;
    } else if (onSuccess) {
      return await onSuccess(request, verifyResponse);
    }

    return NextResponse.next();
  };
}
