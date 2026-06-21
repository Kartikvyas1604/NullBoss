// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFeeRouter.sol";
import "./interfaces/IERC8004.sol";

contract FeeRouter is IFeeRouter, Ownable2Step {
    using SafeERC20 for IERC20;

    uint256 public parentPercent;
    uint256 public subAgentPercent;
    uint256 public treasuryPercent;
    uint256 public constant BPS_DENOMINATOR = 10000;

    IERC20 public immutable feeToken;
    IERC8004 public immutable agentRegistry;
    address public treasury;

    error InvalidSplit();
    error ZeroAddress();
    error ZeroAmount();

    constructor(
        address _feeToken,
        address _agentRegistry,
        address _treasury,
        uint256 _parentPercent,
        uint256 _subAgentPercent,
        uint256 _treasuryPercent
    ) Ownable(msg.sender) {
        if (_feeToken == address(0) || _agentRegistry == address(0) || _treasury == address(0)) revert ZeroAddress();

        if (_parentPercent + _subAgentPercent + _treasuryPercent != BPS_DENOMINATOR) revert InvalidSplit();

        feeToken = IERC20(_feeToken);
        agentRegistry = IERC8004(_agentRegistry);
        treasury = _treasury;
        parentPercent = _parentPercent;
        subAgentPercent = _subAgentPercent;
        treasuryPercent = _treasuryPercent;

        emit FeeSplitUpdated(_parentPercent, _subAgentPercent, _treasuryPercent);
    }

    function setFeeSplit(uint256 _parentPercent, uint256 _subAgentPercent, uint256 _treasuryPercent)
        external
        onlyOwner
    {
        if (_parentPercent + _subAgentPercent + _treasuryPercent != BPS_DENOMINATOR) revert InvalidSplit();
        parentPercent = _parentPercent;
        subAgentPercent = _subAgentPercent;
        treasuryPercent = _treasuryPercent;
        emit FeeSplitUpdated(_parentPercent, _subAgentPercent, _treasuryPercent);
    }

    function setTreasury(address _newTreasury) external onlyOwner {
        if (_newTreasury == address(0)) revert ZeroAddress();
        treasury = _newTreasury;
    }

    function distributeManagementFee(uint256 agentId, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        _distribute(agentId, amount);
        emit ManagementFeeDistributed(agentId, amount, address(0));
    }

    function distributePerformanceFee(uint256 agentId, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        _distribute(agentId, amount);
        emit PerformanceFeeDistributed(agentId, amount, address(0));
    }

    function _distribute(uint256 agentId, uint256 amount) internal {
        IERC8004.Agent memory agent = agentRegistry.getAgent(agentId);

        if (parentPercent > 0 && agent.parentAgentId != 0) {
            IERC8004.Agent memory parent = agentRegistry.getAgent(agent.parentAgentId);
            uint256 parentAmount = amount * parentPercent / BPS_DENOMINATOR;
            if (parentAmount > 0) {
                feeToken.safeTransfer(parent.owner, parentAmount);
            }
        }

        if (subAgentPercent > 0) {
            uint256 subAgentAmount = amount * subAgentPercent / BPS_DENOMINATOR;
            if (subAgentAmount > 0) {
                feeToken.safeTransfer(agent.owner, subAgentAmount);
            }
        }

        if (treasuryPercent > 0) {
            uint256 treasuryAmount = amount * treasuryPercent / BPS_DENOMINATOR;
            if (treasuryAmount > 0) {
                feeToken.safeTransfer(treasury, treasuryAmount);
            }
        }
    }
}
