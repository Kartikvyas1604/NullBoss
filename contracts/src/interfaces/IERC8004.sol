// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IERC8004 {
    struct Agent {
        uint256 agentId;
        address owner;
        uint256 parentAgentId;
        string metadataUri;
        bool registered;
        uint256 revokedAt;
    }

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed owner,
        uint256 indexed parentAgentId,
        string metadataUri
    );
    event AgentMetadataUpdated(uint256 indexed agentId, string newMetadataUri);
    event AgentRevoked(uint256 indexed agentId, uint256 timestamp);
    event ActionValidated(uint256 indexed agentId, bytes32 indexed actionHash, address indexed executor);

    function registerAgent(string calldata metadataUri, uint256 parentAgentId) external returns (uint256 agentId);
    function updateMetadata(uint256 agentId, string calldata newMetadataUri) external;
    function revokeAgent(uint256 agentId) external;
    function validateAgentAction(uint256 agentId, bytes32 actionHash) external returns (bool);
    function getAgent(uint256 agentId) external view returns (Agent memory);
}
