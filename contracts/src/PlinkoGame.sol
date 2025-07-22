// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract PlinkoGame {
    struct GameRound {
        address player;
        uint256 betAmount;
        uint256 randomSeed;
        uint256 multiplier;
        uint256 payout;
        uint256 nonce;
        uint256 timestamp;
        bool claimed;
    }

    // Plinko multipliers: [110x, 42x, 10x, 5x, 3x, 1.5x, 1x, 0.5x, 0.3x, 0.5x, 1x, 1.5x, 3x, 5x, 10x, 42x, 110x]
    uint256[17] public MULTIPLIERS = [
        11000, 4200, 1000, 500, 300, 150, 100, 50, 30, 50, 100, 150, 300, 500, 1000, 4200, 11000
    ];

    mapping(bytes32 => GameRound) public rounds;
    mapping(address => uint256) public playerNonces;
    mapping(address => uint256) public playerBalances;

    address public serverSigner;
    address public owner;
    uint256 public minBet = 0.001 ether;
    uint256 public maxBet = 1 ether;
    uint256 public houseEdge = 200; // 2% (basis points)

    event RoundPlayed(
        bytes32 indexed roundId,
        address indexed player,
        uint256 betAmount,
        uint256 randomSeed,
        uint256 multiplier,
        uint256 payout
    );

    event Withdrawal(address indexed player, uint256 amount);
    event Deposit(address indexed player, uint256 amount);

    error InvalidSignature();
    error InvalidBetAmount();
    error InvalidNonce();
    error InvalidMultiplier();
    error RoundAlreadyExists();
    error InsufficientContractBalance();
    error TransferFailed();

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _serverSigner) {
        owner = msg.sender;
        serverSigner = _serverSigner;
    }

    function playRound(
        uint256 randomSeed,
        uint256 multiplier,
        uint256 nonce,
        bytes calldata serverSignature
    ) external payable {
        if (msg.value < minBet || msg.value > maxBet) {
            revert InvalidBetAmount();
        }

        if (nonce != playerNonces[msg.sender]) {
            revert InvalidNonce();
        }

        // Verify multiplier is valid
        bool validMultiplier = false;
        for (uint i = 0; i < MULTIPLIERS.length; i++) {
            if (multiplier == MULTIPLIERS[i]) {
                validMultiplier = true;
                break;
            }
        }
        if (!validMultiplier) {
            revert InvalidMultiplier();
        }

        // Create message hash for signature verification
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(
                    msg.sender,
                    msg.value,
                    randomSeed,
                    multiplier,
                    nonce
                ))
            )
        );

        // Verify server signature
        address recoveredSigner = _recoverSigner(messageHash, serverSignature);
        if (recoveredSigner != serverSigner) {
            revert InvalidSignature();
        }

        // Generate unique round ID
        bytes32 roundId = keccak256(abi.encodePacked(
            msg.sender,
            randomSeed,
            nonce,
            block.timestamp
        ));

        if (rounds[roundId].player != address(0)) {
            revert RoundAlreadyExists();
        }

        // Calculate payout (apply house edge)
        uint256 grossPayout = (msg.value * multiplier) / 100;
        uint256 houseEdgeAmount = (grossPayout * houseEdge) / 10000;
        uint256 netPayout = grossPayout - houseEdgeAmount;

        // Check contract has enough balance for payout
        if (netPayout > address(this).balance) {
            revert InsufficientContractBalance();
        }

        // Store round data
        rounds[roundId] = GameRound({
            player: msg.sender,
            betAmount: msg.value,
            randomSeed: randomSeed,
            multiplier: multiplier,
            payout: netPayout,
            nonce: nonce,
            timestamp: block.timestamp,
            claimed: false
        });

        // Increment player nonce
        playerNonces[msg.sender]++;

        // Add payout to player balance
        playerBalances[msg.sender] += netPayout;

        emit RoundPlayed(roundId, msg.sender, msg.value, randomSeed, multiplier, netPayout);
    }

    function withdraw() external {
        uint256 balance = playerBalances[msg.sender];
        require(balance > 0, "No balance to withdraw");

        playerBalances[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: balance}("");
        if (!success) {
            revert TransferFailed();
        }

        emit Withdrawal(msg.sender, balance);
    }

    function withdrawPartial(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        require(playerBalances[msg.sender] >= amount, "Insufficient balance");

        playerBalances[msg.sender] -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert TransferFailed();
        }

        emit Withdrawal(msg.sender, amount);
    }

    function deposit() external payable {
        require(msg.value > 0, "Invalid deposit amount");
        emit Deposit(msg.sender, msg.value);
    }

    // Admin functions
    function setServerSigner(address _serverSigner) external onlyOwner {
        serverSigner = _serverSigner;
    }

    function setBetLimits(uint256 _minBet, uint256 _maxBet) external onlyOwner {
        minBet = _minBet;
        maxBet = _maxBet;
    }

    function setHouseEdge(uint256 _houseEdge) external onlyOwner {
        require(_houseEdge <= 1000, "House edge too high"); // Max 10%
        houseEdge = _houseEdge;
    }

    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = payable(owner).call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }

    // Internal functions
    function _recoverSigner(bytes32 messageHash, bytes memory signature) internal pure returns (address) {
        if (signature.length != 65) {
            return address(0);
        }

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) {
            return address(0);
        }

        return ecrecover(messageHash, v, r, s);
    }

    // View functions
    function getRound(bytes32 roundId) external view returns (GameRound memory) {
        return rounds[roundId];
    }

    function getPlayerBalance(address player) external view returns (uint256) {
        return playerBalances[player];
    }

    function getPlayerNonce(address player) external view returns (uint256) {
        return playerNonces[player];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }
}