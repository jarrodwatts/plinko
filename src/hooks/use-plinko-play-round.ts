"use client";

import { useMutation } from '@tanstack/react-query';
import { useAbstractSession } from '@/hooks/use-abstract-session';
import { serializeWithBigInt } from '@/lib/session-keys/session-storage';

interface PlayRoundParams {
  betAmount: number;
}

interface PlayRoundResponse {
  hash: string;
  randomSeed: number;
  multiplier: number;
  targetBucket: number;
  nonce: number;
}

interface UsePlinkoPlayRoundOptions {
  onSuccess?: (data: PlayRoundResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for playing Plinko rounds with server-controlled randomness and session keys
 * Handles randomness generation, signing, and transaction submission in one call
 */
export function usePlinkoPlayRound(options?: UsePlinkoPlayRoundOptions) {
  const { data: session } = useAbstractSession();

  return useMutation({
    mutationFn: async ({ betAmount }: PlayRoundParams): Promise<PlayRoundResponse> => {
      if (!session) {
        throw new Error('No active session found');
      }

      const response = await fetch('/api/plinko/play-round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          betAmount,
          sessionConfig: serializeWithBigInt(session),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transaction failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('Plinko round successful:', data);
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      console.error('Plinko round failed:', error);
      options?.onError?.(error);
    },
  });
}