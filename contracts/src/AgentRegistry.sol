// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IERC8004.sol";

contract AgentRegistry is IERC8004, Ownable {
    struct ReputationEntry {
        bytes32 outcomeHash;
        bool success;
        uint256 timestamp;
    }

    uint256 private _nextAgentId;
    mapping(uint256 => Agent) private _agents;
    mapping(uint256 => ReputationEntry[]) private _reputation;
    mapping(uint256 => uint256) private _successCount;

    error NotOwner();
    error NotParent();
    error AlreadyRegistered();
    error NotRegistered();
    error AlreadyRevoked();
    error SameMetadata();
    error ZeroAddress();

    event TradeOutcomeRecorded(uint256 indexed agentId, bytes32 indexed outcomeHash, bool success);

    constructor() Ownable(msg.sender) {
        _nextAgentId = 1;
    }

    function registerAgent(string calldata metadataUri, uint256 parentAgentId) external returns (uint256 agentId) {
        if (parentAgentId != 0) {
            Agent storage parent = _agents[parentAgentId];
            if (!parent.registered || parent.revokedAt != 0) revert NotRegistered();
        }

        agentId = _nextAgentId;
        _nextAgentId++;

        _agents[agentId] = Agent({
            agentId: agentId,
            owner: msg.sender,
            parentAgentId: parentAgentId,
            metadataUri: metadataUri,
            registered: true,
            revokedAt: 0
        });

        emit AgentRegistered(agentId, msg.sender, parentAgentId, metadataUri);
    }

    function updateMetadata(uint256 agentId, string calldata newMetadataUri) external {
        Agent storage agent = _agents[agentId];
        if (agent.owner != msg.sender) revert NotOwner();
        if (!agent.registered || agent.revokedAt != 0) revert NotRegistered();

        agent.metadataUri = newMetadataUri;
        emit AgentMetadataUpdated(agentId, newMetadataUri);
    }

    function revokeAgent(uint256 agentId) external {
        Agent storage agent = _agents[agentId];
        if (agent.revokedAt != 0) revert AlreadyRevoked();

        if (agent.parentAgentId != 0) {
            Agent storage parent = _agents[agent.parentAgentId];
            if (parent.owner != msg.sender) revert NotParent();
        } else {
            if (agent.owner != msg.sender) revert NotOwner();
        }

        agent.revokedAt = block.timestamp;
        emit AgentRevoked(agentId, block.timestamp);
    }

    function validateAgentAction(uint256 agentId, bytes32 actionHash) external returns (bool) {
        Agent storage agent = _agents[agentId];
        if (!agent.registered || agent.revokedAt != 0) revert NotRegistered();

        emit ActionValidated(agentId, actionHash, msg.sender);
        return true;
    }

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        Agent memory agent = _agents[agentId];
        if (!agent.registered && agent.agentId == 0 && agentId != 0) revert NotRegistered();
        return agent;
    }

    function agentExists(uint256 agentId) external view returns (bool) {
        return _agents[agentId].registered;
    }

    function isAgentActive(uint256 agentId) external view returns (bool) {
        Agent storage agent = _agents[agentId];
        return agent.registered && agent.revokedAt == 0;
    }

    function recordTradeOutcome(uint256 agentId, bytes32 outcomeHash, bool success) external {
        if (!_agents[agentId].registered) revert NotRegistered();

        _reputation[agentId].push(ReputationEntry({
            outcomeHash: outcomeHash,
            success: success,
            timestamp: block.timestamp
        }));

        if (success) {
            _successCount[agentId]++;
        }

        emit TradeOutcomeRecorded(agentId, outcomeHash, success);
    }

    function getReputation(uint256 agentId) external view returns (uint256 totalTrades, uint256 successfulTrades) {
        totalTrades = _reputation[agentId].length;
        successfulTrades = _successCount[agentId];
    }

    function getReputationHistory(uint256 agentId, uint256 offset, uint256 limit)
        external
        view
        returns (ReputationEntry[] memory entries)
    {
        ReputationEntry[] storage all = _reputation[agentId];
        uint256 end = offset + limit;
        if (end > all.length) end = all.length;
        if (offset >= all.length) return new ReputationEntry[](0);

        entries = new ReputationEntry[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            entries[i - offset] = all[i];
        }
    }

    function getNextAgentId() external view returns (uint256) {
        return _nextAgentId;
    }
}
