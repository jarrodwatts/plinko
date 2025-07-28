"use client";

import { useState, useCallback, useEffect } from 'react';

export type GameStatus = 'dropping' | 'pending' | 'submitted' | 'confirmed' | 'failed';

export interface GameError {
  errorType?: string;
  message: string;
  userMessage?: string;
  retryable?: boolean;
  suggestions?: string[];
}

export interface GameResult {
  gameId: string;
  betAmount: number;
  multiplier: number;
  payout: number;
  profitLoss: number;
  timestamp: Date;
  status: GameStatus;
  hash?: string;
  error?: GameError;
}

const STORAGE_KEY = 'plinko-game-history';
const MAX_HISTORY_SIZE = 100;

export function useGameHistory() {
  const [gameHistory, setGameHistory] = useState<GameResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects and ensure status field exists
        const historyWithDates = parsed.map((game: Omit<GameResult, 'timestamp'> & { timestamp: string }) => ({
          ...game,
          timestamp: new Date(game.timestamp),
          status: game.status || 'confirmed' // Default old entries to confirmed
        }));
        setGameHistory(historyWithDates);
      }
    } catch (error) {
      console.error('Failed to load game history from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage whenever history changes
  const saveToStorage = useCallback((history: GameResult[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save game history to localStorage:', error);
    }
  }, []);

  // Add a new game result
  const addGameResult = useCallback((result: Omit<GameResult, 'profitLoss' | 'timestamp'>) => {
    const newGame: GameResult = {
      ...result,
      profitLoss: result.payout - result.betAmount,
      timestamp: new Date()
    };

    setGameHistory(prev => {
      // Add new game to the beginning of the array
      let newHistory = [newGame, ...prev];

      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory = newHistory.slice(0, MAX_HISTORY_SIZE);
      }

      // Save to localStorage
      saveToStorage(newHistory);

      return newHistory;
    });
  }, [saveToStorage]);

  // Update game status by gameId with status progression validation
  const updateGameStatus = useCallback((gameId: string, status: GameStatus, hash?: string, error?: GameError) => {
    setGameHistory(prev => {
      const newHistory = prev.map(game => {
        if (game.gameId !== gameId) return game;

        // Define valid status progression to prevent regression
        const statusProgression: Record<GameStatus, GameStatus[]> = {
          'dropping': ['pending', 'submitted', 'confirmed', 'failed'], // Allow skipping intermediate states
          'pending': ['submitted', 'confirmed', 'failed'],
          'submitted': ['confirmed', 'failed'],
          'confirmed': [], // Final state - no transitions allowed
          'failed': [] // Final state - no transitions allowed
        };

        const currentStatus = game.status;
        const allowedTransitions = statusProgression[currentStatus] || [];

        // If trying to set the same status, ignore silently (no-op)
        if (currentStatus === status) {
          return game; // No change needed
        }

        // Only update if the transition is valid
        if (allowedTransitions.includes(status)) {
          return { 
            ...game, 
            status, 
            ...(hash && { hash }),
            ...(error && { error })
          };
        } else {
          console.warn(`Invalid status transition from ${currentStatus} to ${status} for game ${gameId}`);
          return game; // Keep current status
        }
      });

      // Save to localStorage
      saveToStorage(newHistory);

      return newHistory;
    });
  }, [saveToStorage]);

  // Reveal the ball result when it lands (change from 'dropping' to 'pending')
  const revealBallResult = useCallback((gameId: string, multiplier: number, payout: number) => {
    setGameHistory(prev => {
      const newHistory = prev.map(game => {
        if (game.gameId !== gameId) return game;

        // Only update if we're transitioning from 'dropping' to 'pending'
        if (game.status === 'dropping') {
          return {
            ...game,
            multiplier,
            payout,
            profitLoss: payout - game.betAmount,
            status: 'pending' as GameStatus
          };
        } else {
          // If already in pending or later state, just update the values without changing status
          return {
            ...game,
            multiplier,
            payout,
            profitLoss: payout - game.betAmount
          };
        }
      });

      // Save to localStorage
      saveToStorage(newHistory);

      return newHistory;
    });
  }, [saveToStorage]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setGameHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear game history from localStorage:', error);
    }
  }, []);

  // Get statistics
  const statistics = {
    totalGames: gameHistory.length,
    totalProfit: gameHistory.reduce((sum, game) => sum + game.profitLoss, 0),
    totalWagered: gameHistory.reduce((sum, game) => sum + game.betAmount, 0),
    winRate: gameHistory.length > 0
      ? (gameHistory.filter(game => game.profitLoss > 0).length / gameHistory.length) * 100
      : 0,
    bestWin: gameHistory.length > 0
      ? Math.max(...gameHistory.map(game => game.profitLoss))
      : 0,
    worstLoss: gameHistory.length > 0
      ? Math.min(...gameHistory.map(game => game.profitLoss))
      : 0
  };

  return {
    gameHistory,
    addGameResult,
    updateGameStatus,
    revealBallResult,
    clearHistory,
    statistics,
    isLoading
  };
}