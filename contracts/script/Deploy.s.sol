// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/PositionLedger.sol";
import "../src/FundVault.sol";
import "../src/AgentRegistry.sol";
import "../src/FeeRouter.sol";
import "../src/StrategyExecutor.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address usdcAddress = vm.envAddress("USDC_TOKEN_ADDRESS");
        address treasuryAddress = vm.envAddress("TREASURY_ADDRESS");
        address emergencyGuardian = vm.envAddress("EMERGENCY_GUARDIAN");
        address orchestratorAgent = vm.envAddress("ORCHESTRATOR_AGENT_ADDRESS");

        console.log("=== NULLBOSS Protocol Deployment ===");
        console.log("Deployer:", deployer);
        console.log("USDC:", usdcAddress);
        console.log("Treasury:", treasuryAddress);
        console.log("Guardian:", emergencyGuardian);
        console.log("Orchestrator:", orchestratorAgent);
        console.log("Chain ID:", block.chainid);
        console.log("Block:", block.number);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy PositionLedger
        PositionLedger positionLedger = new PositionLedger();
        console.log("PositionLedger deployed:", address(positionLedger));

        // 2. Deploy FundVault
        FundVault fundVault = new FundVault(
            usdcAddress,
            address(positionLedger),
            treasuryAddress,
            deployer,
            emergencyGuardian
        );
        console.log("FundVault deployed:", address(fundVault));

        // 3. Grant LEDGER_OPERATOR_ROLE to FundVault and StrategyExecutor
        positionLedger.grantRole(positionLedger.LEDGER_OPERATOR_ROLE(), address(fundVault));
        console.log("PositionLedger operator role granted to FundVault");

        // 4. Deploy AgentRegistry
        AgentRegistry agentRegistry = new AgentRegistry();
        console.log("AgentRegistry deployed:", address(agentRegistry));

        // 5. Deploy FeeRouter (30% parent, 30% sub-agent, 40% treasury)
        FeeRouter feeRouter = new FeeRouter(
            usdcAddress,
            address(agentRegistry),
            treasuryAddress,
            3000, // 30% parent
            3000, // 30% sub-agent
            4000  // 40% treasury
        );
        console.log("FeeRouter deployed:", address(feeRouter));

        // 6. Deploy StrategyExecutor
        StrategyExecutor strategyExecutor = new StrategyExecutor(
            address(agentRegistry),
            address(positionLedger),
            deployer
        );
        console.log("StrategyExecutor deployed:", address(strategyExecutor));

        // 7. Configure FundVault
        fundVault.setTreasury(treasuryAddress);

        // 8. Grant EXECUTOR_ROLE to StrategyExecutor
        strategyExecutor.grantRole(strategyExecutor.EXECUTOR_ROLE(), address(strategyExecutor));
        console.log("Granted EXECUTOR_ROLE to StrategyExecutor");

        // 8b. Grant LEDGER_OPERATOR_ROLE to StrategyExecutor
        positionLedger.grantRole(positionLedger.LEDGER_OPERATOR_ROLE(), address(strategyExecutor));
        console.log("Granted LEDGER_OPERATOR_ROLE to StrategyExecutor");

        // 9. Register orchestrator agent (if address is valid)
        if (orchestratorAgent != address(0)) {
            vm.stopBroadcast();
            vm.startBroadcast(orchestratorAgent);
            uint256 agentId = agentRegistry.registerAgent(
                "https://nullboss.io/agents/orchestrator.json",
                0
            );
            console.log("Orchestrator Agent registered, ID:", agentId);
            vm.stopBroadcast();
            vm.startBroadcast(deployerPrivateKey);
        }

        // 10. Transfer DEFAULT_ADMIN_ROLE of FundVault to treasury for safety
        if (treasuryAddress != deployer) {
            fundVault.revokeRole(fundVault.DEFAULT_ADMIN_ROLE(), deployer);
            fundVault.grantRole(fundVault.DEFAULT_ADMIN_ROLE(), treasuryAddress);
            console.log("Admin role transferred to treasury:", treasuryAddress);
        } else {
            console.log("Skipping admin transfer (treasury == deployer)");
        }

        // 11. Transfer DEFAULT_ADMIN_ROLE of StrategyExecutor to treasury
        if (treasuryAddress != deployer) {
            strategyExecutor.revokeRole(strategyExecutor.DEFAULT_ADMIN_ROLE(), deployer);
            strategyExecutor.grantRole(strategyExecutor.DEFAULT_ADMIN_ROLE(), treasuryAddress);
            console.log("StrategyExecutor admin transferred to treasury");
        } else {
            console.log("Skipping StrategyExecutor admin transfer (treasury == deployer)");
        }

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("PositionLedger:", address(positionLedger));
        console.log("FundVault:", address(fundVault));
        console.log("AgentRegistry:", address(agentRegistry));
        console.log("FeeRouter:", address(feeRouter));
        console.log("StrategyExecutor:", address(strategyExecutor));
    }
}
