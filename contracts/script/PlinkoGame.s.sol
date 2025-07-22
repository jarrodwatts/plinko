// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {PlinkoGame} from "../src/PlinkoGame.sol";

contract PlinkoGameScript is Script {
    PlinkoGame public plinkoGame;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // You'll need to set the server signer address
        // This should be your Privy server wallet address
        address serverSigner = vm.envAddress("SERVER_SIGNER_ADDRESS");
        
        console.log("Deploying PlinkoGame with server signer:", serverSigner);
        
        plinkoGame = new PlinkoGame(serverSigner);
        
        console.log("PlinkoGame deployed at:", address(plinkoGame));
        console.log("Owner:", plinkoGame.owner());
        console.log("Server Signer:", plinkoGame.serverSigner());
        console.log("Min Bet:", plinkoGame.minBet());
        console.log("Max Bet:", plinkoGame.maxBet());
        console.log("House Edge:", plinkoGame.houseEdge());

        // Optional: Fund the contract with initial liquidity
        uint256 initialFunding = vm.envOr("INITIAL_FUNDING", uint256(0));
        if (initialFunding > 0) {
            console.log("Funding contract with:", initialFunding);
            plinkoGame.deposit{value: initialFunding}();
        }

        vm.stopBroadcast();
    }
}