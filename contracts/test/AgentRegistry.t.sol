// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry registry;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address charlie = makeAddr("charlie");

    string constant META_URI = "https://nullboss.io/agents/alice.json";
    string constant META_URI2 = "https://nullboss.io/agents/bob.json";

    function setUp() public {
        registry = new AgentRegistry();
    }

    // ===================== REGISTER =====================

    function testRegisterAgent() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent(META_URI, 0);

        assertEq(agentId, 1, "first agent should be id 1");

        IERC8004.Agent memory agent = registry.getAgent(agentId);
        assertEq(agent.agentId, 1);
        assertEq(agent.owner, alice);
        assertEq(agent.parentAgentId, 0);
        assertEq(agent.metadataUri, META_URI);
        assertTrue(agent.registered);
        assertEq(agent.revokedAt, 0);
    }

    function testRegisterMultipleAgents() public {
        vm.prank(alice);
        uint256 id1 = registry.registerAgent(META_URI, 0);

        vm.prank(bob);
        uint256 id2 = registry.registerAgent(META_URI2, 0);

        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    function testRegisterAgentEmitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit IERC8004.AgentRegistered(1, alice, 0, META_URI);

        vm.prank(alice);
        registry.registerAgent(META_URI, 0);
    }

    // ===================== SUB-AGENT =====================

    function testRegisterSubAgent() public {
        vm.prank(alice);
        uint256 parentId = registry.registerAgent(META_URI, 0);

        vm.prank(bob);
        uint256 subId = registry.registerAgent(META_URI2, parentId);

        IERC8004.Agent memory sub = registry.getAgent(subId);
        assertEq(sub.parentAgentId, parentId);
        assertEq(sub.owner, bob);
    }

    function testRegisterSubAgentRevertIfParentNotRegistered() public {
        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.NotRegistered.selector));
        vm.prank(bob);
        registry.registerAgent(META_URI2, 999);
    }

    function testRegisterSubAgentRevertIfParentRevoked() public {
        vm.prank(alice);
        uint256 parentId = registry.registerAgent(META_URI, 0);

        vm.prank(alice);
        registry.revokeAgent(parentId);

        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.NotRegistered.selector));
        vm.prank(bob);
        registry.registerAgent(META_URI2, parentId);
    }

    // ===================== UPDATE METADATA =====================

    function testUpdateMetadata() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent(META_URI, 0);

        string memory newUri = "https://nullboss.io/agents/alice-v2.json";

        vm.prank(alice);
        registry.updateMetadata(agentId, newUri);

        IERC8004.Agent memory agent = registry.getAgent(agentId);
        assertEq(agent.metadataUri, newUri);
    }

    function testUpdateMetadataRevertNotOwner() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent(META_URI, 0);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.NotOwner.selector));
        registry.updateMetadata(agentId, "https://evil.com/hacked.json");
    }

    function testUpdateMetadataRevertNotRegistered() public {
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.NotOwner.selector));
        registry.updateMetadata(999, "https://null.json");
    }

    // ===================== REVOKE =====================

    function testRevokeAgent() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent(META_URI, 0);

        vm.prank(alice);
        registry.revokeAgent(agentId);

        IERC8004.Agent memory ag = registry.getAgent(agentId);
        uint256 revokedAt = ag.revokedAt;
        assertGt(revokedAt, 0, "revokedAt should be set");
        assertFalse(registry.isAgentActive(agentId));
    }

    function testRevokeAgentEmitsEvent() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent(META_URI, 0);

        vm.expectEmit(true, true, true, true);
        emit IERC8004.AgentRevoked(agentId, block.timestamp);

        vm.prank(alice);
        registry.revokeAgent(agentId);
    }

    function testRevokeSubAgentByParent() public {
        vm.prank(alice);
        uint256 parentId = registry.registerAgent(META_URI, 0);

        vm.prank(bob);
        uint256 subId = registry.registerAgent(META_URI2, parentId);

        vm.prank(alice);
        registry.revokeAgent(subId);

        assertFalse(registry.isAgentActive(subId));
    }

    function testRevokeSubAgentRevertNonParent() public {
        vm.prank(alice);
        uint256 parentId = registry.registerAgent(META_URI, 0);

        vm.prank(bob);
        uint256 subId = registry.registerAgent(META_URI2, parentId);

        vm.prank(charlie);
        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.NotParent.selector));
        registry.revokeAgent(subId);
    }

    function testRevokeAlreadyRevokedReverts() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent(META_URI, 0);

        vm.prank(alice);
        registry.revokeAgent(agentId);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.AlreadyRevoked.selector));
        registry.revokeAgent(agentId);
    }

    // ===================== VALIDATE ACTION =====================

    function testValidateActionForRegisteredAgent() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent(META_URI, 0);

        bytes32 actionHash = keccak256("execute_trade_001");

        bool valid = registry.validateAgentAction(agentId, actionHash);
        assertTrue(valid);
    }

    function testValidateActionEmitsEvent() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent(META_URI, 0);

        bytes32 actionHash = keccak256("action_001");

        vm.expectEmit(true, true, true, true);
        emit IERC8004.ActionValidated(agentId, actionHash, address(this));

        registry.validateAgentAction(agentId, actionHash);
    }

    function testValidateActionFailsForRevokedAgent() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent(META_URI, 0);

        vm.prank(alice);
        registry.revokeAgent(agentId);

        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.NotRegistered.selector));
        registry.validateAgentAction(agentId, keccak256("action"));
    }

    function testValidateActionFailsForNonexistentAgent() public {
        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.NotRegistered.selector));
        registry.validateAgentAction(999, keccak256("action"));
    }

    // ===================== REPUTATION =====================

    function testRecordTradeOutcome() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent(META_URI, 0);

        bytes32 outcomeHash = keccak256("trade_outcome_001");

        vm.expectEmit(true, true, true, true);
        emit AgentRegistry.TradeOutcomeRecorded(agentId, outcomeHash, true);

        registry.recordTradeOutcome(agentId, outcomeHash, true);

        (uint256 total, uint256 successful) = registry.getReputation(agentId);
        assertEq(total, 1);
        assertEq(successful, 1);
    }

    function testReputationMultipleOutcomes() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent(META_URI, 0);

        registry.recordTradeOutcome(agentId, keccak256("outcome_1"), true);
        registry.recordTradeOutcome(agentId, keccak256("outcome_2"), false);
        registry.recordTradeOutcome(agentId, keccak256("outcome_3"), true);
        registry.recordTradeOutcome(agentId, keccak256("outcome_4"), true);

        (uint256 total, uint256 successful) = registry.getReputation(agentId);
        assertEq(total, 4);
        assertEq(successful, 3);
    }

    function testRecordTradeOutcomeRevertNonExistentAgent() public {
        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.NotRegistered.selector));
        registry.recordTradeOutcome(999, keccak256("outcome"), true);
    }

    function testGetReputationNoTrades() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent(META_URI, 0);

        (uint256 total, uint256 successful) = registry.getReputation(agentId);
        assertEq(total, 0);
        assertEq(successful, 0);
    }

    function testGetReputationHistory() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent(META_URI, 0);

        registry.recordTradeOutcome(agentId, keccak256("o1"), true);
        registry.recordTradeOutcome(agentId, keccak256("o2"), false);

        AgentRegistry.ReputationEntry[] memory entries = registry.getReputationHistory(agentId, 0, 10);
        assertEq(entries.length, 2);
        assertTrue(entries[0].success);
        assertFalse(entries[1].success);
    }

    // ===================== UTILITY =====================

    function testGetNextAgentId() public {
        assertEq(registry.getNextAgentId(), 1);

        vm.prank(alice);
        registry.registerAgent(META_URI, 0);

        assertEq(registry.getNextAgentId(), 2);
    }

    function testAgentExists() public {
        assertFalse(registry.agentExists(1));

        vm.prank(alice);
        registry.registerAgent(META_URI, 0);

        assertTrue(registry.agentExists(1));
    }

    function testIsAgentActive() public {
        vm.prank(alice);
        uint256 agentId = registry.registerAgent(META_URI, 0);

        assertTrue(registry.isAgentActive(agentId));

        vm.prank(alice);
        registry.revokeAgent(agentId);

        assertFalse(registry.isAgentActive(agentId));
    }
}
