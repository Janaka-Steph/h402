"use client";

import React from "react";

interface TransactionStatusProps {
  status: string;
  txHash?: string;
  className?: string;
}

/**
 * A component to display the current status of a transaction
 */
const TransactionStatus: React.FC<TransactionStatusProps> = ({
                                                               status,
                                                               txHash,
                                                               className = "",
                                                             }) => {
  // Helper to get status icon and color
  const getStatusDetails = () => {
    switch (status) {
      case "wallet_connecting":
        return {
          icon: "🔄",
          title: "Connecting Wallet",
          color: "text-blue-600",
          bgColor: "bg-blue-100 dark:bg-blue-900/30",
        };
      case "awaiting_approval":
        return {
          icon: "⏳",
          title: "Awaiting Approval",
          description: "Please approve the transaction in your wallet",
          color: "text-yellow-600",
          bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
        };
      case "processing":
        return {
          icon: "⚙️",
          title: "Processing Transaction",
          description: "Your transaction is being processed",
          color: "text-blue-600",
          bgColor: "bg-blue-100 dark:bg-blue-900/30",
        };
      case "paid":
        return {
          icon: "✅",
          title: "Payment Complete",
          description: "Your transaction was successful",
          color: "text-green-600",
          bgColor: "bg-green-100 dark:bg-green-900/30",
        };
      case "failed":
        return {
          icon: "❌",
          title: "Transaction Failed",
          description: "There was an error processing your transaction",
          color: "text-red-600",
          bgColor: "bg-red-100 dark:bg-red-900/30",
        };
      default:
        return {
          icon: "ℹ️",
          title: status.charAt(0).toUpperCase() + status.slice(1),
          color: "text-gray-600",
          bgColor: "bg-gray-100 dark:bg-gray-800",
        };
    }
  };

  // Get status details based on current status
  const details = getStatusDetails();

  // Don't render anything for idle status
  if (status === "idle") return null;

  return (
    <div className={`p-4 rounded-lg ${details.bgColor} ${className}`}>
      <div className="flex items-start">
        <div className="text-2xl mr-3">{details.icon}</div>
        <div>
          <h3 className={`font-semibold ${details.color}`}>{details.title}</h3>
          {details.description && (
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">
              {details.description}
            </p>
          )}
          {txHash && status === "paid" && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <p>Transaction Hash:</p>
              <a
                href={`https://explorer.solana.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all underline hover:text-blue-500"
              >
                {txHash}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
