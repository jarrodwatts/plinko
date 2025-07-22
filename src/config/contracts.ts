import { IS_PRODUCTION } from "./environment";

export const PLINKO_CONTRACT_ADDRESS: `0x${string}` = IS_PRODUCTION
    ? "0x1be4858d192d99712A99DBB81C12cAEF173b5B04"
    : "0x1be4858d192d99712A99DBB81C12cAEF173b5B04";

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
        "name": "MULTIPLIERS",
        "inputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
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
        "name": "getPlayerBalance",
        "inputs": [
            {
                "name": "player",
                "type": "address",
                "internalType": "address"
            }
        ],
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
        "name": "getPlayerNonce",
        "inputs": [
            {
                "name": "player",
                "type": "address",
                "internalType": "address"
            }
        ],
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
        "name": "getRound",
        "inputs": [
            {
                "name": "roundId",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "internalType": "struct PlinkoGame.GameRound",
                "components": [
                    {
                        "name": "player",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "betAmount",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
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
                        "name": "payout",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "nonce",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "timestamp",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "claimed",
                        "type": "bool",
                        "internalType": "bool"
                    }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "houseEdge",
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
                "name": "nonce",
                "type": "uint256",
                "internalType": "uint256"
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
        "name": "playerBalances",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
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
        "name": "playerNonces",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
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
        "name": "rounds",
        "inputs": [
            {
                "name": "",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "outputs": [
            {
                "name": "player",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "betAmount",
                "type": "uint256",
                "internalType": "uint256"
            },
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
                "name": "payout",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "nonce",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "timestamp",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "claimed",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
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
        "name": "setHouseEdge",
        "inputs": [
            {
                "name": "_houseEdge",
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
        "name": "withdraw",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "withdrawPartial",
        "inputs": [
            {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
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
                "name": "roundId",
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
        "name": "InvalidMultiplier",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidNonce",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidSignature",
        "inputs": []
    },
    {
        "type": "error",
        "name": "RoundAlreadyExists",
        "inputs": []
    },
    {
        "type": "error",
        "name": "TransferFailed",
        "inputs": []
    }
] as const;