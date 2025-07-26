"use client";

import { useMutation } from '@tanstack/react-query';
import { useAbstractSession } from '@/hooks/use-abstract-session';
import { serializeWithBigInt } from '@/lib/session-keys/session-storage';

// Streaming chunk types
interface StreamChunk {
  type: 'outcome' | 'transaction_submitted' | 'transaction_confirmed' | 'error';
}

interface OutcomeChunk extends StreamChunk {
  type: 'outcome';
  randomSeed: number;
  multiplier: number;
  targetBucket: number;
  gameId: string;
}

interface TransactionChunk extends StreamChunk {
  type: 'transaction_submitted';
  hash: string;
  gameId: string;
}

interface ConfirmationChunk extends StreamChunk {
  type: 'transaction_confirmed';
  gameId: string;
  receipt: {
    blockNumber: bigint;
    gasUsed: string;
    status: string;
  };
}

interface ErrorChunk extends StreamChunk {
  type: 'error';
  message: string;
}

type PlinkoStreamChunk = OutcomeChunk | TransactionChunk | ConfirmationChunk | ErrorChunk;

// Helper function to deserialize objects with BigInt support
function deserializeWithBigIntSupport(json: string): PlinkoStreamChunk {
  return JSON.parse(json, (_, value) => {
    if (typeof value === "string" && value.startsWith("__bigint__")) {
      return BigInt(value.substring("__bigint__".length));
    }
    return value;
  }) as PlinkoStreamChunk;
}

interface PlayRoundParams {
  betAmount: number;
  walletNonce?: number;
}

interface PlayRoundOutcome {
  randomSeed: number;
  multiplier: number;
  targetBucket: number;
  gameId: string;
}

interface PlayRoundResponse extends PlayRoundOutcome {
  hash?: string;
  receipt?: {
    blockNumber: bigint;
    gasUsed: string;
    status: string;
  };
}

interface UsePlinkoPlayRoundOptions {
  onSuccess?: (data: PlayRoundOutcome) => void;
  onTransactionSubmitted?: (hash: string, gameId: string) => void;
  onTransactionConfirmed?: (receipt: ConfirmationChunk['receipt'], gameId: string) => void;
  onError?: (error: Error) => void;
  onNonceError?: () => void;
}

/**
 * Hook for playing Plinko rounds with streaming response
 * Handles randomness generation (instant), transaction submission, and confirmation
 */
export function usePlinkoPlayRound(options?: UsePlinkoPlayRoundOptions) {
  const { data: session } = useAbstractSession();

  return useMutation({
    mutationFn: async ({ betAmount, walletNonce }: PlayRoundParams): Promise<PlayRoundResponse> => {
      if (!session) {
        throw new Error('No active session found');
      }

      const startTime = performance.now();
      console.log('⏱️  [CLIENT] Starting request...');

      // Timing: Serialize session config
      const serializeStart = performance.now();
      const serializedSession = serializeWithBigInt(session);
      const serializeTime = performance.now() - serializeStart;
      console.log(`⏱️  [CLIENT] Session serialization: ${serializeTime.toFixed(2)}ms`);

      // Timing: Create request body
      const bodyStart = performance.now();
      const requestBody = JSON.stringify({
        betAmount,
        walletNonce,
        sessionConfig: serializedSession,
      });
      const bodyTime = performance.now() - bodyStart;
      console.log(`⏱️  [CLIENT] Request body creation: ${bodyTime.toFixed(2)}ms`);

      // Timing: Actual fetch call
      const fetchStart = performance.now();
      const response = await fetch('/api/plinko/play-round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });
      const fetchTime = performance.now() - fetchStart;
      console.log(`⏱️  [CLIENT] Fetch call completed: ${fetchTime.toFixed(2)}ms`);

      const totalRequestTime = performance.now() - startTime;
      console.log(`⏱️  [CLIENT] Total request time: ${totalRequestTime.toFixed(2)}ms`);

      if (!response.ok) {
        throw new Error('Failed to start game round');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let outcome: PlayRoundOutcome | null = null;
      let hash: string | undefined;
      let receipt: ConfirmationChunk['receipt'] | undefined;
      let outcomeTime: number | null = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const data = deserializeWithBigIntSupport(line);
              
              if (data.type === 'outcome') {
                outcomeTime = performance.now() - startTime;
                outcome = {
                  randomSeed: data.randomSeed,
                  multiplier: data.multiplier,
                  targetBucket: data.targetBucket,
                  gameId: data.gameId
                };
                // Call success immediately for ball drop
                options?.onSuccess?.(outcome);
                console.log(`⏱️  [CLIENT] 🎯 RANDOM OUTCOME RECEIVED in ${outcomeTime.toFixed(2)}ms`);
                console.log('🚀 Outcome received:', outcome);
              } else if (data.type === 'transaction_submitted') {
                const transactionTime = performance.now() - startTime;
                hash = data.hash;
                options?.onTransactionSubmitted?.(hash!, data.gameId);
                console.log(`⏱️  [CLIENT] 📡 TRANSACTION SUBMITTED in ${transactionTime.toFixed(2)}ms`);
                console.log('🚀 Transaction submitted:', hash);
              } else if (data.type === 'transaction_confirmed') {
                const confirmationTime = performance.now() - startTime;
                receipt = data.receipt;
                options?.onTransactionConfirmed?.(receipt, data.gameId);
                console.log(`⏱️  [CLIENT] ✅ TRANSACTION CONFIRMED in ${confirmationTime.toFixed(2)}ms`);
                console.log('🚀 Transaction confirmed:', receipt);
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch {
              // Check if the unparseable chunk contains nonce error
              if (line.toLowerCase().includes('nonce too low')) {
                console.error('🚨 Critical nonce error detected in unparseable chunk:', line);
                // Create a synthetic error chunk to be handled by existing error flow
                const syntheticErrorChunk: ErrorChunk = {
                  type: 'error',
                  message: `Nonce too low: ${line}`
                };
                // Process it through the normal error handling
                throw new Error(syntheticErrorChunk.message);
              }
              console.warn('Failed to parse chunk:', line);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (!outcome) {
        throw new Error('No outcome received from server');
      }

      return {
        ...outcome,
        hash,
        receipt
      };
    },
    onError: (error: Error) => {
      console.error('Plinko round failed:', error);
      
      // Check if it's a nonce-related error
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('nonce') || errorMessage.includes('replacement transaction underpriced')) {
        console.log('🔄 Nonce error detected, triggering recovery...');
        options?.onNonceError?.();
      }
      
      options?.onError?.(error);
    },
  });
}