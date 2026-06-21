// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IFeeRouter {
    event FeeSplitUpdated(uint256 parentPercent, uint256 subAgentPercent, uint256 treasuryPercent);
    event ManagementFeeDistributed(uint256 indexed agentId, uint256 amount, address indexed recipient);
    event PerformanceFeeDistributed(uint256 indexed agentId, uint256 amount, address indexed recipient);

    function setFeeSplit(uint256 parentPercent, uint256 subAgentPercent, uint256 treasuryPercent) external;
    function distributeManagementFee(uint256 agentId, uint256 amount) external;
    function distributePerformanceFee(uint256 agentId, uint256 amount) external;
}
