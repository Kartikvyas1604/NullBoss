// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IPositionLedger {
    event TradeRecorded(
        bytes32 indexed tradeId,
        uint256 indexed agentId,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee,
        bytes32 x402receipt
    );
    event PositionUpdated(address indexed token, uint256 amount);

    function recordTrade(
        bytes32 tradeId,
        uint256 agentId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee,
        bytes32 x402receipt
    ) external;

    function setPosition(address token, uint256 amount) external;
    function getPosition(address token) external view returns (uint256);
    function getTotalValue() external view returns (uint256);
}
