# Plinko Crypto Game - Project Context

## Project Overview
- **Name**: Plinko (crypto-based Plinko game)
- **Purpose**: A blockchain-based Plinko game where each ball drop is an on-chain transaction
- **Blockchain**: Abstract Chain (Ethereum L2 built on ZK stack)
- **Wallet Integration**: Abstract Global Wallet with Session Keys feature
- **UX Strategy**: Server-controlled randomness with cryptographic signatures for provably fair gaming

## Technology Stack
- **Framework**: Next.js with TypeScript
- **Package Manager**: pnpm
- **UI Library**: ShadCN UI
- **Styling**: Tailwind CSS
- **Fonts**: Inter (body), CalSans-SemiBold (headings)
- **Smart Contracts**: Solidity with Foundry framework
- **Authentication**: Privy for server wallet management
- **Session Management**: Abstract Global Wallet Session Keys

## Development Workflow
- **Main Scripts**: 
  - `pnpm dev` - Development server
  - `pnpm build` - Production build
- **Contract Development**: Foundry for smart contract compilation, testing, and deployment
- **Testing**: Comprehensive smart contract tests with Foundry
- **Linting**: No specific rules enforced
- **CI/CD**: Not implemented

## Smart Contract Architecture
- **Contract**: `PlinkoGame.sol` - Core game logic with server-signed randomness
- **Features**:
  - Server-signed random outcomes for provable fairness
  - 17 payout multipliers: 110x, 42x, 10x, 5x, 3x, 1.5x, 1x, 0.5x, 0.3x, 0.5x, 1x, 1.5x, 3x, 5x, 10x, 42x, 110x
  - Player balance system with withdraw functionality
  - House edge of 2% (configurable by owner)
  - Bet limits: 0.001 ETH to 1 ETH (configurable)
  - Nonce system to prevent replay attacks
- **Security**: Server signature validation ensures randomness authenticity
- **Deployment**: Forge scripts for automated deployment

## Backend API Architecture
- **Randomness Generation**: Server-controlled with cryptographic signatures
- **Transaction Flow**: 
  1. Server generates random seed and outcome
  2. Server signs the randomness data
  3. Transaction submitted via AGW Session Keys
  4. Smart contract validates server signature
- **Authentication**: Iron Session with SIWE (Sign-In With Ethereum)
- **Session Keys**: AGW client integration for gasless transactions

## Code Style Preferences
- **Language**: TypeScript preferred
- **Architecture**: Functional components over class-based
- **Code Quality**: Readable, clean, and elegant
- **Component Library**: ShadCN UI components

## Abstract Integration Details
- **Wallet**: Abstract Global Wallet
- **Session Keys**: Utilized for gasless user transactions
- **Transaction Handling**: Server-controlled randomness with instant UI feedback
- **Network**: Abstract (Ethereum L2)

## Implemented Features
- ✅ Complete smart contract system with server-signed randomness
- ✅ Comprehensive test suite for all contract functions
- ✅ API endpoint for playing rounds with session key integration
- ✅ React hook for game interaction (`usePlinkoPlayRound`)
- ✅ Session key serialization utilities
- ✅ Contract configuration and ABI exports

## File Structure
- **Smart Contracts**: `/contracts/src/` - Solidity contracts
- **Contract Scripts**: `/contracts/script/` - Foundry deployment scripts
- **Contract Tests**: `/contracts/test/` - Foundry test files
- **API Routes**: `/src/app/api/` - Next.js API endpoints
- **React Hooks**: `/src/hooks/` - Custom hooks for game interaction
- **UI Components**: `/src/components/` - React components
- **Configuration**: `/src/config/` - Contract addresses and ABIs
- **Utilities**: `/src/lib/` - Helper functions and session storage