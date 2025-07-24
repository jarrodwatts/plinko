"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useAuthSession } from '@/hooks/use-auth-session';
import { publicClient } from '@/lib/viem/public-client';

interface UseWalletNonceReturn {
  currentNonce: number | null;
  getNextNonce: () => number | null;
  refreshNonce: () => Promise<void>;
  resetNonce: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing wallet nonce on the frontend
 * Handles pre-loading, optimistic increment, and error recovery for rapid transactions
 */
export function useWalletNonce(): UseWalletNonceReturn {
  const [currentNonce, setCurrentNonce] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isConnected } = useAccount();
  const { data: authSession } = useAuthSession();
  
  const isAuthenticated = isConnected && authSession?.isAuthenticated;

  const { address } = useAccount();

  /**
   * Fetch current wallet nonce from blockchain
   */
  const fetchNonce = useCallback(async (): Promise<number | null> => {
    if (!isAuthenticated || !address) {
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch wallet transaction count (nonce) directly
      const nonce = await publicClient.getTransactionCount({
        address: address as `0x${string}`,
        blockTag: 'pending' // Use pending to get the most up-to-date nonce
      });

      return Number(nonce);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch wallet nonce';
      setError(errorMessage);
      console.error('Error fetching wallet nonce:', errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, address]);

  /**
   * Refresh nonce from blockchain (for error recovery)
   */
  const refreshNonce = useCallback(async (): Promise<void> => {
    console.log('🔄 Refreshing wallet nonce from blockchain...');
    const nonce = await fetchNonce();
    if (nonce !== null) {
      setCurrentNonce(nonce);
      console.log(`🔄 Wallet nonce refreshed: ${nonce}`);
    }
  }, [fetchNonce]);

  /**
   * Reset nonce after transaction failure (recovery)
   */
  const resetNonce = useCallback(async (): Promise<void> => {
    console.log('🔄 Resetting wallet nonce due to transaction error...');
    await refreshNonce();
  }, [refreshNonce]);

  /**
   * Get next nonce and increment local counter optimistically
   * This allows rapid transactions without waiting for confirmation
   */
  const getNextNonce = useCallback((): number | null => {
    if (currentNonce === null) {
      console.warn('Cannot get next wallet nonce: current nonce not loaded');
      return null;
    }

    const nextNonce = currentNonce;
    setCurrentNonce(prev => prev !== null ? prev + 1 : null);
    console.log(`⚡ Using wallet nonce: ${nextNonce}, next optimistic nonce: ${nextNonce + 1}`);
    
    return nextNonce;
  }, [currentNonce]);

  /**
   * Initialize wallet nonce on authentication
   */
  useEffect(() => {
    if (isAuthenticated && address && currentNonce === null) {
      console.log('🚀 Initializing wallet nonce...');
      refreshNonce();
    } else if (!isAuthenticated || !address) {
      // Clear nonce when user disconnects
      setCurrentNonce(null);
      setError(null);
    }
  }, [isAuthenticated, address, currentNonce, refreshNonce]);

  return {
    currentNonce,
    getNextNonce,
    refreshNonce,
    resetNonce,
    isLoading,
    error,
  };
}