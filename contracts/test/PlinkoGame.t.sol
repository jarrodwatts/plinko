// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {PlinkoGame} from "../src/PlinkoGame.sol";

// Helper contract to receive ether in tests
contract TestReceiver {
    receive() external payable {}
}

contract PlinkoGameTest is Test {
    PlinkoGame public plinkoGame;

    address public owner = address(0x1);
    address public serverSigner = address(0x2);
    TestReceiver public player1Contract;
    TestReceiver public player2Contract;
    address public player1;
    address public player2;

    uint256 public serverPrivateKey = 0x123456789;
    address public computedServerSigner;

    // Valid multipliers (matches frontend PlinkoGame.tsx)
    // Note: Values are scaled by 100 (e.g., 150 = 1.5x, 30 = 0.3x)
    uint256[17] public MULTIPLIERS = [
        11000,
        4200,
        1000,
        500,
        300,
        150,
        100,
        50,
        30,
        50,
        100,
        150,
        300,
        500,
        1000,
        4200,
        11000
    ];

    function setUp() public {
        // Derive server signer from private key for testing
        computedServerSigner = vm.addr(serverPrivateKey);

        // Create test receiver contracts for players
        player1Contract = new TestReceiver();
        player2Contract = new TestReceiver();
        player1 = address(player1Contract);
        player2 = address(player2Contract);

        vm.prank(owner);
        plinkoGame = new PlinkoGame(computedServerSigner);

        // Fund the contract for payouts
        vm.deal(address(plinkoGame), 10 ether);

        // Give players some ETH
        vm.deal(player1, 5 ether);
        vm.deal(player2, 5 ether);
    }

    function testConstructor() public {
        assertEq(plinkoGame.owner(), owner);
        assertEq(plinkoGame.serverSigner(), computedServerSigner);
        assertEq(plinkoGame.minBet(), 0.001 ether);
        assertEq(plinkoGame.maxBet(), 1 ether);
    }

    function testPlayRound() public {
        uint256 betAmount = 0.1 ether;
        uint256 randomSeed = 12345;
        uint256 multiplier = 300; // 3x
        bytes32 gameId = keccak256(abi.encodePacked("game1"));

        // Create signature
        bytes memory signature = _createSignature(
            player1,
            betAmount,
            randomSeed,
            multiplier,
            gameId
        );

        // Record initial player balance
        uint256 initialPlayerBalance = player1.balance;

        vm.prank(player1);
        plinkoGame.playRound{value: betAmount}(
            randomSeed,
            multiplier,
            gameId,
            signature
        );

        // Check gameId is marked as used
        assertTrue(plinkoGame.isGameIdUsed(player1, gameId));

        // Check instant payout (no house edge calculation, handled by probability matrix)
        uint256 expectedPayout = (betAmount * multiplier) / 100;
        uint256 expectedFinalBalance = initialPlayerBalance -
            betAmount +
            expectedPayout;
        assertEq(player1.balance, expectedFinalBalance);
    }

    function testPlayRoundInvalidBet() public {
        uint256 betAmount = 0.0001 ether; // Too small
        uint256 randomSeed = 12345;
        uint256 multiplier = 300;
        bytes32 gameId = keccak256(abi.encodePacked("game1"));

        bytes memory signature = _createSignature(
            player1,
            betAmount,
            randomSeed,
            multiplier,
            gameId
        );

        vm.prank(player1);
        vm.expectRevert(PlinkoGame.InvalidBetAmount.selector);
        plinkoGame.playRound{value: betAmount}(
            randomSeed,
            multiplier,
            gameId,
            signature
        );
    }

    function testPlayRoundGameAlreadyPlayed() public {
        uint256 betAmount = 0.1 ether;
        uint256 randomSeed = 12345;
        uint256 multiplier = 300;
        bytes32 gameId = keccak256(abi.encodePacked("game1"));

        bytes memory signature = _createSignature(
            player1,
            betAmount,
            randomSeed,
            multiplier,
            gameId
        );

        // Play the game once
        vm.prank(player1);
        plinkoGame.playRound{value: betAmount}(
            randomSeed,
            multiplier,
            gameId,
            signature
        );

        // Try to play the same game again
        vm.prank(player1);
        vm.expectRevert(PlinkoGame.GameAlreadyPlayed.selector);
        plinkoGame.playRound{value: betAmount}(
            randomSeed,
            multiplier,
            gameId,
            signature
        );
    }

    // Note: Invalid multiplier validation is now handled by server signature verification
    // The contract trusts the server to only sign valid multipliers

    function testPlayRoundInvalidSignature() public {
        uint256 betAmount = 0.1 ether;
        uint256 randomSeed = 12345;
        uint256 multiplier = 300;
        bytes32 gameId = keccak256(abi.encodePacked("game1"));

        // Create signature with wrong private key
        uint256 wrongPrivateKey = 0x987654321;
        bytes memory wrongSignature = _createSignatureWithKey(
            wrongPrivateKey,
            player1,
            betAmount,
            randomSeed,
            multiplier,
            gameId
        );

        vm.prank(player1);
        vm.expectRevert(PlinkoGame.InvalidSignature.selector);
        plinkoGame.playRound{value: betAmount}(
            randomSeed,
            multiplier,
            gameId,
            wrongSignature
        );
    }

    function testMultipleRounds() public {
        // Play multiple rounds with different gameIds
        for (uint256 i = 0; i < 3; i++) {
            uint256 betAmount = 0.05 ether;
            uint256 randomSeed = 12345 + i;
            uint256 multiplier = 150; // 1.5x
            bytes32 gameId = keccak256(abi.encodePacked("game", i));

            bytes memory signature = _createSignature(
                player1,
                betAmount,
                randomSeed,
                multiplier,
                gameId
            );

            vm.prank(player1);
            plinkoGame.playRound{value: betAmount}(
                randomSeed,
                multiplier,
                gameId,
                signature
            );

            // Check each gameId is marked as used
            assertTrue(plinkoGame.isGameIdUsed(player1, gameId));
        }
    }

    function testOwnerFunctions() public {
        // Test setServerSigner
        address newServerSigner = address(0x5);
        vm.prank(owner);
        plinkoGame.setServerSigner(newServerSigner);
        assertEq(plinkoGame.serverSigner(), newServerSigner);

        // Test setBetLimits
        vm.prank(owner);
        plinkoGame.setBetLimits(0.01 ether, 2 ether);
        assertEq(plinkoGame.minBet(), 0.01 ether);
        assertEq(plinkoGame.maxBet(), 2 ether);
    }

    function testNonOwnerCannotCallOwnerFunctions() public {
        vm.prank(player1);
        vm.expectRevert("Not owner");
        plinkoGame.setServerSigner(address(0x5));

        vm.prank(player1);
        vm.expectRevert("Not owner");
        plinkoGame.setBetLimits(0.01 ether, 2 ether);
    }

    function testDeposit() public {
        uint256 depositAmount = 1 ether;

        vm.prank(player1);
        plinkoGame.deposit{value: depositAmount}();

        assertEq(address(plinkoGame).balance, 10 ether + depositAmount);
    }

    function testReceive() public {
        uint256 sendAmount = 0.5 ether;

        vm.prank(player1);
        (bool success, ) = address(plinkoGame).call{value: sendAmount}("");
        assertTrue(success);

        assertEq(address(plinkoGame).balance, 10 ether + sendAmount);
    }

    function testFuzzPlayRound(
        uint256 betAmount,
        uint256 randomSeed,
        uint8 multiplierIndex
    ) public {
        // Bound inputs - use smaller bet amounts to avoid contract balance issues
        betAmount = bound(betAmount, 0.001 ether, 0.01 ether); // Reduced max bet for fuzz test
        multiplierIndex = uint8(bound(multiplierIndex, 0, 16));

        uint256 multiplier = MULTIPLIERS[multiplierIndex];
        bytes32 gameId = keccak256(abi.encodePacked(randomSeed, block.timestamp));

        // Calculate expected payout to ensure contract has enough balance
        uint256 expectedPayout = (betAmount * multiplier) / 100;

        // Skip if payout would exceed contract balance
        if (expectedPayout > address(plinkoGame).balance) {
            return;
        }

        bytes memory signature = _createSignature(
            player1,
            betAmount,
            randomSeed,
            multiplier,
            gameId
        );

        // Record initial balance
        uint256 initialBalance = player1.balance;

        vm.prank(player1);
        plinkoGame.playRound{value: betAmount}(
            randomSeed,
            multiplier,
            gameId,
            signature
        );

        // Verify gameId is marked as used
        assertTrue(plinkoGame.isGameIdUsed(player1, gameId));

        // Verify instant payout
        uint256 expectedFinalBalance = initialBalance -
            betAmount +
            expectedPayout;
        assertEq(player1.balance, expectedFinalBalance);
    }

    // Helper function to create valid signatures
    function _createSignature(
        address player,
        uint256 betAmount,
        uint256 randomSeed,
        uint256 multiplier,
        bytes32 gameId
    ) internal view returns (bytes memory) {
        return
            _createSignatureWithKey(
                serverPrivateKey,
                player,
                betAmount,
                randomSeed,
                multiplier,
                gameId
            );
    }

    function _createSignatureWithKey(
        uint256 privateKey,
        address player,
        uint256 betAmount,
        uint256 randomSeed,
        uint256 multiplier,
        bytes32 gameId
    ) internal pure returns (bytes memory) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(player, betAmount, randomSeed, multiplier, gameId)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            privateKey,
            ethSignedMessageHash
        );
        return abi.encodePacked(r, s, v);
    }
}
