// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title PrivacyCommitReveal
/// @notice Commit-reveal scheme for strategy intents to prevent front-running
/// @dev Agents commit a hash of their trade before execution, reveal after settlement
contract PrivacyCommitReveal is Ownable {
    uint256 public constant REVEAL_WINDOW = 10; // blocks
    uint256 public constant MAX_COMMIT_AGE = 100; // blocks before commit expires

    struct Commitment {
        bytes32 commitHash;
        address agent;
        uint256 commitBlock;
        bool revealed;
        bool executed;
    }

    mapping(bytes32 => Commitment) public commitments;
    mapping(address => bytes32[]) public agentCommitments;

    event CommitmentStored(bytes32 indexed commitmentId, address indexed agent, bytes32 commitHash, uint256 blockNumber);
    event TradeRevealed(bytes32 indexed commitmentId, address indexed agent, bytes32 tradeData);
    event CommitmentExpired(bytes32 indexed commitmentId);

    constructor() Ownable(msg.sender) {}

    /// @notice Submit a commitment hash before executing a trade
    /// @param commitHash keccak256(abi.encodePacked(tradeData, salt))
    /// @return commitmentId identifier for the commitment
    function commit(bytes32 commitHash) external returns (bytes32 commitmentId) {
        commitmentId = keccak256(abi.encodePacked(msg.sender, commitHash, block.number));
        require(commitments[commitmentId].commitBlock == 0, "Commitment already exists");

        commitments[commitmentId] = Commitment({
            commitHash: commitHash,
            agent: msg.sender,
            commitBlock: block.number,
            revealed: false,
            executed: false
        });

        agentCommitments[msg.sender].push(commitmentId);

        emit CommitmentStored(commitmentId, msg.sender, commitHash, block.number);
    }

    /// @notice Reveal trade data after execution to prove the trade was planned
    /// @param commitmentId the commitment identifier
    /// @param tradeData the actual trade parameters
    /// @param salt the salt used in the commit hash
    function reveal(bytes32 commitmentId, bytes calldata tradeData, bytes32 salt) external {
        Commitment storage c = commitments[commitmentId];
        require(c.commitBlock != 0, "Commitment does not exist");
        require(c.agent == msg.sender, "Not the committing agent");
        require(!c.revealed, "Already revealed");
        require(block.number <= c.commitBlock + MAX_COMMIT_AGE, "Commitment expired");

        bytes32 expectedHash = keccak256(abi.encodePacked(tradeData, salt));
        require(expectedHash == c.commitHash, "Hash mismatch - trade data does not match commitment");

        c.revealed = true;

        emit TradeRevealed(commitmentId, msg.sender, keccak256(tradeData));
    }

    /// @notice Mark commitment as executed after successful trade
    /// @param commitmentId the commitment identifier
    function markExecuted(bytes32 commitmentId) external {
        Commitment storage c = commitments[commitmentId];
        require(c.agent == msg.sender, "Not the committing agent");
        require(c.revealed, "Must reveal first");
        require(!c.executed, "Already executed");
        c.executed = true;
    }

    /// @notice Verify a commitment is valid for a given trade
    /// @param commitmentId the commitment identifier
    /// @param tradeData the trade parameters to verify
    /// @param salt the salt used in commit
    /// @return valid whether the commitment is valid
    function verifyCommitment(bytes32 commitmentId, bytes calldata tradeData, bytes32 salt) external view returns (bool valid) {
        Commitment storage c = commitments[commitmentId];
        if (c.commitBlock == 0) return false;
        if (c.revealed) return true;
        bytes32 expectedHash = keccak256(abi.encodePacked(tradeData, salt));
        return expectedHash == c.commitHash && block.number <= c.commitBlock + MAX_COMMIT_AGE;
    }

    /// @notice Get all commitment IDs for an agent
    function getAgentCommitments(address agent) external view returns (bytes32[] memory) {
        return agentCommitments[agent];
    }

    /// @notice Clean up expired commitments
    function expireCommitment(bytes32 commitmentId) external {
        Commitment storage c = commitments[commitmentId];
        require(c.commitBlock != 0, "Does not exist");
        require(!c.revealed, "Already revealed");
        require(block.number > c.commitBlock + MAX_COMMIT_AGE, "Not yet expired");
        c.commitHash = bytes32(0);
        emit CommitmentExpired(commitmentId);
    }
}
