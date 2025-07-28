"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { publicClient } from '@/lib/viem/public-client';

export function useEthBalance() {
  const { address, isConnected } = useAccount();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceEth, setBalanceEth] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!address || !isConnected) {
      setBalance(null);
      setBalanceEth(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const bal = await publicClient.getBalance({ 
        address: address as `0x${string}` 
      });
      
      setBalance(bal);
      setBalanceEth(parseFloat(formatEther(bal)));
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  // Fetch balance on mount and when address/connection changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Refetch balance every 30 seconds
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance, isConnected]);

  return {
    balance,
    balanceEth,
    isLoading,
    error,
    refetch: fetchBalance
  };
}