// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract PlinkoGame {
    // Player nonce to prevent replay attacks
    mapping(address => uint256) public playerNonces;

    // Server signer to verify server signatures
    address public serverSigner;

    // Owner of the contract
    address public owner;

    // Minimum and maximum bet amounts
    uint256 public minBet = 0.001 ether;
    uint256 public maxBet = 1 ether;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        CONSTRUCTOR                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    constructor(address _serverSigner) {
        owner = msg.sender;
        serverSigner = _serverSigner;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      PUBLIC FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function playRound(
        uint256 randomSeed,
        uint256 multiplier,
        uint256 nonce,
        bytes calldata serverSignature
    ) external payable {
        // Ensure bet amount is within bounds
        if (msg.value < minBet || msg.value > maxBet) {
            revert InvalidBetAmount();
        }

        // Ensure isn't replaying the same claim
        if (nonce != playerNonces[msg.sender]) {
            revert InvalidNonce();
        }

        // Create message hash for signature verification
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(
                    abi.encodePacked(
                        msg.sender,
                        msg.value,
                        randomSeed,
                        multiplier,
                        nonce
                    )
                )
            )
        );

        // Verify server signature
        address recoveredSigner = _recoverSigner(messageHash, serverSignature);
        if (recoveredSigner != serverSigner) {
            revert InvalidSignature();
        }

        // Calculate payout (house edge built into probability matrix)
        uint256 payout = (msg.value * multiplier) / 100;

        // Check contract has enough balance for payout
        if (payout > address(this).balance) {
            revert InsufficientContractBalance();
        }

        // Increment player nonce
        playerNonces[msg.sender]++;

        // Instant payout to player
        if (payout > 0) {
            (bool success, ) = payable(msg.sender).call{value: payout}("");
            if (!success) {
                revert TransferFailed();
            }
        }

        emit RoundPlayed(
            keccak256(
                abi.encodePacked(msg.sender, randomSeed, nonce, block.timestamp)
            ),
            msg.sender,
            msg.value,
            randomSeed,
            multiplier,
            payout
        );
    }

    function deposit() external payable {
        require(msg.value > 0, "Invalid deposit amount");
        emit Deposit(msg.sender, msg.value);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      ADMIN FUNCTIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function setServerSigner(address _serverSigner) external onlyOwner {
        serverSigner = _serverSigner;
    }

    function setBetLimits(uint256 _minBet, uint256 _maxBet) external onlyOwner {
        minBet = _minBet;
        maxBet = _maxBet;
    }

    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = payable(owner).call{value: address(this).balance}(
            ""
        );
        require(success, "Transfer failed");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     INTERNAL FUNCTIONS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _recoverSigner(
        bytes32 messageHash,
        bytes memory signature
    ) internal pure returns (address) {
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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       VIEW FUNCTIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function getPlayerNonce(address player) external view returns (uint256) {
        return playerNonces[player];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     RECEIVE / FALLBACK                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         MODIFIERS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          ERRORS                             */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error InvalidSignature();
    error InvalidBetAmount();
    error InvalidNonce();
    error InvalidMultiplier();
    error InsufficientContractBalance();
    error TransferFailed();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          EVENTS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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
}
