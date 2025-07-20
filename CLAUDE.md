# Plinko Crypto Game - Project Context

## Project Overview
- **Name**: Plinko (crypto-based Plinko game)
- **Purpose**: A blockchain-based Plinko game where each ball drop is an on-chain transaction
- **Blockchain**: Abstract Chain (Ethereum L2 built on ZK stack)
- **Wallet Integration**: Abstract Global Wallet with Session Keys feature
- **UX Strategy**: Optimistic transactions with hidden endpoints for instant user feedback

## Technology Stack
- **Framework**: Next.js with TypeScript
- **Package Manager**: pnpm
- **UI Library**: ShadCN UI
- **Styling**: Tailwind CSS
- **Fonts**: Inter (body), CalSans-SemiBold (headings)

## Development Workflow
- **Main Scripts**: 
  - `pnpm dev` - Development server
  - `pnpm build` - Production build
- **Testing**: No frontend tests typically written
- **Linting**: No specific rules enforced
- **CI/CD**: Not implemented

## Code Style Preferences
- **Language**: TypeScript preferred
- **Architecture**: Functional components over class-based
- **Code Quality**: Readable, clean, and elegant
- **Component Library**: ShadCN UI components

## Abstract Integration Details
- **Wallet**: Abstract Global Wallet
- **Session Keys**: Utilized for improved UX
- **Transaction Handling**: Optimistic updates for instant feedback
- **Network**: Abstract (Ethereum L2)

## Key Features to Implement
- Plinko game mechanics
- On-chain transaction per ball drop
- Instant UI feedback via optimistic transactions
- Abstract Wallet integration
- Session key management

## File Structure Notes
- UI components in `/src/components/`
- Wallet logic in `/src/components/wallet/`
- Global styles in `/src/app/globals.css`
- Font assets in `/assets/fonts/`