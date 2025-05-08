"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  UiWallet,
  UiWalletAccount,
  useWallets,
  useConnect,
} from "@wallet-standard/react";

interface SolanaWalletContextType {
  wallets: UiWallet[];
  selectedWallet: UiWallet | null;
  selectedAccount: UiWalletAccount | null;
  isConnecting: boolean;
  statusMessage: string;
  connectWallet: (walletName: string) => Promise<UiWalletAccount | null>;
  disconnectWallet: () => Promise<void>;
  setStatusMessage: (message: string) => void;
}

const SolanaWalletContext = createContext<SolanaWalletContextType>({
  wallets: [],
  selectedWallet: null,
  selectedAccount: null,
  isConnecting: false,
  statusMessage: "",
  connectWallet: async () => null,
  disconnectWallet: async () => {},
  setStatusMessage: () => {},
});

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const availableWallets = useWallets();
  const [selectedWallet, setSelectedWallet] = useState<UiWallet | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<UiWalletAccount | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Filter wallets to only include those that support Solana
  const solanaWallets = availableWallets.filter((wallet) =>
    wallet.chains.some((chain) => chain.startsWith("solana:"))
  );

  // Connect to a wallet by name
  const connectWallet = useCallback(
    async (walletName: string): Promise<UiWalletAccount | null> => {
      try {
        setIsConnecting(true);
        setStatusMessage("Connecting to wallet...");

        // Find the wallet by name
        const wallet = solanaWallets.find((w) => w.name === walletName);
        if (!wallet) {
          throw new Error(`Wallet ${walletName} not found`);
        }

        // Get the connect function
        const connect = wallet.connect;
        if (!connect) {
          throw new Error(`Wallet ${walletName} does not support connect`);
        }

        // Connect to the wallet
        const accounts = await connect();
        if (!accounts || accounts.length === 0) {
          throw new Error(`No accounts available in ${walletName}`);
        }

        // Set the selected wallet and account
        setSelectedWallet(wallet);
        setSelectedAccount(accounts[0]);
        setStatusMessage("");

        return accounts[0];
      } catch (error) {
        console.error("Error connecting to wallet:", error);
        setStatusMessage(
          error instanceof Error ? error.message : "Failed to connect wallet"
        );
        return null;
      } finally {
        setIsConnecting(false);
      }
    },
    [solanaWallets]
  );

  // Disconnect the current wallet
  const disconnectWallet = useCallback(async (): Promise<void> => {
    try {
      setSelectedWallet(null);
      setSelectedAccount(null);
      setStatusMessage("");
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to disconnect wallet"
      );
    }
  }, []);

  // Context value
  const contextValue: SolanaWalletContextType = {
    wallets: solanaWallets,
    selectedWallet,
    selectedAccount,
    isConnecting,
    statusMessage,
    connectWallet,
    disconnectWallet,
    setStatusMessage,
  };

  return (
    <SolanaWalletContext.Provider value={contextValue}>
      {children}
    </SolanaWalletContext.Provider>
  );
}

// Custom hook to use the Solana wallet context
export function useSolanaWallet() {
  return useContext(SolanaWalletContext);
}
