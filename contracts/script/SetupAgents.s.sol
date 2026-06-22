// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";
import "../src/StrategyExecutor.sol";
import "../src/FundVault.sol";

contract SetupAgents is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 orchestratorPrivateKey = vm.envUint("ORCHESTRATOR_PRIVATE_KEY");
        address agentAddress = vm.addr(orchestratorPrivateKey);
        address registryAddress = vm.envAddress("REGISTRY_ADDRESS");
        address executorAddress = vm.envAddress("EXECUTOR_ADDRESS");
        address mockAdapter = vm.envAddress("MOCK_ADAPTER_ADDRESS");
        address usdcAddress = vm.envAddress("USDC_TOKEN_ADDRESS");
        address payable vaultAddress = payable(vm.envAddress("VAULT_ADDRESS"));
        address treasuryAddress = vm.envAddress("TREASURY_ADDRESS");

        console.log("=== Agent Setup ===");
        console.log("Agent address:", agentAddress);
        console.log("Registry:", registryAddress);
        console.log("Executor:", executorAddress);

        // Step 1: Fund agent with AVAX from deployer
        vm.startBroadcast(deployerPrivateKey);
        address payable agentPayable = payable(agentAddress);
        uint256 agentBal = agentAddress.balance;
        console.log("Agent current balance:", agentBal);
        if (agentBal < 0.1 ether) {
            uint256 sendAmount = 0.2 ether - agentBal;
            (bool sent, ) = agentPayable.call{value: sendAmount}("");
            require(sent, "Transfer failed");
            console.log("Sent", sendAmount, "wei to agent");
        }
        vm.stopBroadcast();

        // Step 2: Register sub-agents (agent must be signer)
        vm.startBroadcast(orchestratorPrivateKey);

        AgentRegistry registry = AgentRegistry(registryAddress);

        // Check if agents already registered
        bool agent2Registered = false;
        bool agent3Registered = false;
        bool agent4Registered = false;
        try this.checkAgent(registry, 2) { agent2Registered = true; } catch {}
        try this.checkAgent(registry, 3) { agent3Registered = true; } catch {}
        try this.checkAgent(registry, 4) { agent4Registered = true; } catch {}

        if (!agent2Registered) {
            uint256 id2 = registry.registerAgent("https://nullboss.io/agents/arbitrage.json", 1);
            console.log("Registered Arbitrage agent, ID:", id2);
        } else {
            console.log("Arbitrage agent already registered");
        }

        if (!agent3Registered) {
            uint256 id3 = registry.registerAgent("https://nullboss.io/agents/trend.json", 1);
            console.log("Registered Trend agent, ID:", id3);
        } else {
            console.log("Trend agent already registered");
        }

        if (!agent4Registered) {
            uint256 id4 = registry.registerAgent("https://nullboss.io/agents/liquidation.json", 1);
            console.log("Registered Liquidation agent, ID:", id4);
        } else {
            console.log("Liquidation agent already registered");
        }

        vm.stopBroadcast();

        // Step 3: Whitelist adapter and grant EXECUTOR_ROLE
        vm.startBroadcast(deployerPrivateKey);

        StrategyExecutor executor = StrategyExecutor(payable(executorAddress));

        executor.setAdapterWhitelist(mockAdapter, true);
        console.log("MockAdapter whitelisted:", mockAdapter);

        bytes32 executorRole = executor.EXECUTOR_ROLE();
        if (!executor.hasRole(executorRole, agentAddress)) {
            executor.grantRole(executorRole, agentAddress);
            console.log("EXECUTOR_ROLE granted to agent");
        } else {
            console.log("Agent already has EXECUTOR_ROLE");
        }

        console.log("");
        console.log("=== Setup Complete ===");
        console.log("Agent address:", agentAddress);
        console.log("Agent AVAX balance:", agentAddress.balance);

        vm.stopBroadcast();
    }

    function checkAgent(AgentRegistry registry, uint256 agentId) external view {
        registry.getAgent(agentId);
    }
}
