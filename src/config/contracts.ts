import { IS_PRODUCTION } from "./environment";

export const PLINKO_CONTRACT_ADDRESS: `0x${string}` = IS_PRODUCTION
    ? "0xeb71c509e4fa57Eb5ef81Bb5DdAb3C59Ee7Ecf09"
    : "0xeb71c509e4fa57Eb5ef81Bb5DdAb3C59Ee7Ecf09";

export const PLINKO_CONTRACT_ABI = [
    {
        "type": "constructor",
        "inputs": [
            {
                "name": "_serverSigner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "receive",
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "deposit",
        "inputs": [],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "emergencyWithdraw",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getContractBalance",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "isGameIdUsed",
        "inputs": [
            {
                "name": "player",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "gameId",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "maxBet",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "minBet",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "owner",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "playRound",
        "inputs": [
            {
                "name": "randomSeed",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "multiplier",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "gameId",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "serverSignature",
                "type": "bytes",
                "internalType": "bytes"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "serverSigner",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "setBetLimits",
        "inputs": [
            {
                "name": "_minBet",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_maxBet",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setServerSigner",
        "inputs": [
            {
                "name": "_serverSigner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "usedGameIds",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "event",
        "name": "Deposit",
        "inputs": [
            {
                "name": "player",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "RoundPlayed",
        "inputs": [
            {
                "name": "gameId",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            },
            {
                "name": "player",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "betAmount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "randomSeed",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "multiplier",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "payout",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Withdrawal",
        "inputs": [
            {
                "name": "player",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "GameAlreadyPlayed",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InsufficientContractBalance",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidBetAmount",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidSignature",
        "inputs": []
    },
    {
        "type": "error",
        "name": "TransferFailed",
        "inputs": []
    }
] as const;