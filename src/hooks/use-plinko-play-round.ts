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
  errorType?: 'INSUFFICIENT_BALANCE' | 'GAS_ESTIMATION_FAILED' | 'NONCE_ERROR' | 'NETWORK_ERROR' | 'CONTRACT_ERROR' | 'SESSION_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  userMessage?: string;
  retryable?: boolean;
  suggestions?: string[];
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

interface StructuredError extends Error {
  errorType?: string;
  userMessage?: string;
  retryable?: boolean;
  suggestions?: string[];
}

interface UsePlinkoPlayRoundOptions {
  onSuccess?: (data: PlayRoundOutcome) => void;
  onTransactionSubmitted?: (hash: string, gameId: string) => void;
  onTransactionConfirmed?: (receipt: ConfirmationChunk['receipt'], gameId: string) => void;
  onError?: (error: StructuredError) => void;
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

      const serializedSession = serializeWithBigInt(session);

      const requestBody = JSON.stringify({
        betAmount,
        walletNonce,
        sessionConfig: serializedSession,
      });

      const response = await fetch('/api/plinko/play-round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

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
                outcome = {
                  randomSeed: data.randomSeed,
                  multiplier: data.multiplier,
                  targetBucket: data.targetBucket,
                  gameId: data.gameId
                };
                // Call success immediately for ball drop
                options?.onSuccess?.(outcome);
              } else if (data.type === 'transaction_submitted') {
                hash = data.hash;
                options?.onTransactionSubmitted?.(hash!, data.gameId);
              } else if (data.type === 'transaction_confirmed') {
                receipt = data.receipt;
                options?.onTransactionConfirmed?.(receipt, data.gameId);
              } else if (data.type === 'error') {
                // Create structured error with enhanced information
                const structuredError = new Error(data.userMessage || data.message) as StructuredError;
                structuredError.errorType = data.errorType;
                structuredError.userMessage = data.userMessage;
                structuredError.retryable = data.retryable;
                structuredError.suggestions = data.suggestions;

                console.error('Structured error received - throwing error:', {
                  type: data.errorType,
                  message: data.message,
                  userMessage: data.userMessage,
                  retryable: data.retryable,
                  suggestions: data.suggestions
                });

                throw structuredError;
              }
            } catch (parseError) {
              // If the error thrown above is a StructuredError, re-throw it
              if (parseError instanceof Error && 'errorType' in parseError) {
                throw parseError;
              }

              console.error('Failed to parse chunk:', line, 'Error:', parseError);

              // Try to parse as regular JSON in case it's not using BigInt serialization
              try {
                const data = JSON.parse(line);
                if (data.type === 'error') {
                  // Handle the error even if it didn't use BigInt serialization
                  const structuredError = new Error(data.userMessage || data.message) as StructuredError;
                  structuredError.errorType = data.errorType;
                  structuredError.userMessage = data.userMessage;
                  structuredError.retryable = data.retryable;
                  structuredError.suggestions = data.suggestions;
                  console.error('Structured error from fallback JSON parse - throwing error:', data);
                  throw structuredError;
                }
              } catch {
                // Check if the unparseable chunk contains nonce error
                if (line.toLowerCase().includes('nonce too low')) {
                  console.error('🚨 Critical nonce error detected in unparseable chunk:', line);
                  // Create a synthetic structured error
                  const syntheticError = new Error('Transaction ordering issue detected') as StructuredError;
                  syntheticError.errorType = 'NONCE_ERROR';
                  syntheticError.userMessage = 'Transaction ordering issue detected';
                  syntheticError.retryable = true;
                  syntheticError.suggestions = ['Please refresh the page', 'Try again after refreshing'];
                  throw syntheticError;
                }
                console.warn('Failed to parse chunk as JSON:', line);
              }
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
    onError: (error: StructuredError) => {
      console.error('Plinko round failed:', error);

      // Check if it's a nonce-related error using structured error type
      if (error.errorType === 'NONCE_ERROR' ||
        error.message.toLowerCase().includes('nonce') ||
        error.message.toLowerCase().includes('replacement transaction underpriced')) {
        options?.onNonceError?.();
      }

      options?.onError?.(error);
    },
  });
}