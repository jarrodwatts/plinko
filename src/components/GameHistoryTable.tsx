"use client";

import { GameResult, GameStatus } from '@/hooks/use-game-history';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface GameHistoryTableProps {
  gameHistory: GameResult[];
  isLoading: boolean;
  height?: number;
  ballsLanded: Set<string>;
}

export function GameHistoryTable({ gameHistory, isLoading, height, ballsLanded }: GameHistoryTableProps) {
  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(4)} ETH`;
  };

  const formatProfitLoss = (amount: number) => {
    const formatted = formatCurrency(Math.abs(amount));
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const getStatusDisplay = (status: GameStatus) => {
    switch (status) {
      case 'dropping':
        return { icon: '🎯', text: 'Dropping' };
      case 'pending':
        return { icon: '🟡', text: 'Pending' };
      case 'submitted':
        return { icon: '🔵', text: 'Submitted' };
      case 'confirmed':
        return { icon: '🟢', text: 'Confirmed' };
      case 'failed':
        return { icon: '🔴', text: 'Failed' };
      default:
        return { icon: '⚪', text: 'Unknown' };
    }
  };

  const getRowGradient = (game: GameResult) => {
    if (!ballsLanded.has(game.gameId)) {
      // Ball hasn't landed yet - neutral/suspense gradient regardless of actual status
      return 'bg-gradient-to-r from-orange-500/10 via-orange-400/5 to-transparent';
    } else if (game.profitLoss > 0) {
      // Win - green gradient
      return 'bg-gradient-to-r from-green-500/10 via-green-400/5 to-transparent';
    } else if (game.profitLoss < 0) {
      // Loss - red gradient
      return 'bg-gradient-to-r from-red-500/10 via-red-400/5 to-transparent';
    } else {
      // Break even - neutral gradient
      return 'bg-gradient-to-r from-gray-500/10 via-gray-400/5 to-transparent';
    }
  };

  const getStatusColor = (status: GameStatus) => {
    switch (status) {
      case 'dropping':
        return 'text-orange-500';
      case 'pending':
        return 'text-yellow-500';
      case 'submitted':
        return 'text-blue-500';
      case 'confirmed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const cardStyle = height ? { height: `${height}px` } : {};
  const contentHeight = height ? height - 80 : 384; // Subtract header height (approximately 80px)

  if (isLoading) {
    return (
      <Card className="w-full flex flex-col" style={cardStyle}>
        <CardHeader>
          <CardTitle>Game History</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading history...</div>
        </CardContent>
      </Card>
    );
  }

  if (gameHistory.length === 0) {
    return (
      <Card className="w-full flex flex-col" style={cardStyle}>
        <CardHeader>
          <CardTitle>Game History</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">No games played yet</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full flex flex-col" style={cardStyle}>
      <CardHeader>
        <CardTitle>Game History</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div 
          className="overflow-y-auto game-history-scroll" 
          style={{ 
            height: `${contentHeight}px`,
            // Firefox scrollbar
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent',
          }}
        >
          <Table>
            <TableHeader>
              <TableRow className="border-b-0">
                <TableHead className="w-16">Bet</TableHead>
                <TableHead className="w-12">Multi</TableHead>
                <TableHead className="w-16">P/L</TableHead>
                <TableHead className="w-16">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {gameHistory.map((game, index) => {
                  // Show "dropping" status until ball has landed, then show actual status
                  const displayStatus = ballsLanded.has(game.gameId) ? game.status : 'dropping';
                  const statusDisplay = getStatusDisplay(displayStatus);
                  return (
                    <motion.tr
                      key={game.gameId}
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ 
                        opacity: 1, 
                        x: 0, 
                        scale: 1,
                        transition: {
                          duration: 0.3,
                          delay: index * 0.05,
                          ease: "easeOut"
                        }
                      }}
                      exit={{ 
                        opacity: 0, 
                        x: 20, 
                        scale: 0.95,
                        transition: { duration: 0.2 }
                      }}
                      layout
                      transition={{
                        layout: {
                          duration: 0.3,
                          ease: "easeInOut"
                        }
                      }}
                      className={cn(
                        "border-b-0 hover:bg-transparent transition-all duration-300",
                        getRowGradient(game),
                        "backdrop-blur-sm"
                      )}
                    >
                      <TableCell className="font-mono text-xs">
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 + index * 0.05, duration: 0.2 }}
                        >
                          {formatCurrency(game.betAmount)}
                        </motion.span>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium">
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.15 + index * 0.05, duration: 0.2 }}
                          className="inline-block"
                        >
                          {!ballsLanded.has(game.gameId) ? '??x' : `${game.multiplier}x`}
                        </motion.span>
                      </TableCell>
                      <TableCell className={cn(
                        "font-mono text-xs font-medium",
                        !ballsLanded.has(game.gameId)
                          ? "text-gray-500" 
                          : game.profitLoss >= 0 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-red-600 dark:text-red-400"
                      )}>
                        <motion.span
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + index * 0.05, duration: 0.2 }}
                          className="inline-block"
                        >
                          {!ballsLanded.has(game.gameId) ? '???' : formatProfitLoss(game.profitLoss)}
                        </motion.span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <motion.span 
                          className="flex items-center gap-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.25 + index * 0.05, duration: 0.2 }}
                        >
                          <motion.span
                            animate={{
                              rotate: displayStatus === 'pending' ? [0, 360] : 0,
                              scale: displayStatus === 'pending' ? [1, 1.1, 1] : 1,
                              y: displayStatus === 'dropping' ? [0, -3, 0] : 0
                            }}
                            transition={{
                              rotate: {
                                duration: 2,
                                repeat: displayStatus === 'pending' ? Infinity : 0,
                                ease: "linear"
                              },
                              scale: {
                                duration: 1,
                                repeat: displayStatus === 'pending' ? Infinity : 0,
                                repeatType: "reverse"
                              },
                              y: {
                                duration: 0.8,
                                repeat: displayStatus === 'dropping' ? Infinity : 0,
                                repeatType: "reverse",
                                ease: "easeInOut"
                              }
                            }}
                          >
                            {statusDisplay.icon}
                          </motion.span>
                          <span className={cn(
                            "text-xs transition-colors duration-200",
                            getStatusColor(displayStatus)
                          )}>
                            {statusDisplay.text}
                          </span>
                        </motion.span>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}