// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IPositionLedger.sol";

contract PositionLedger is IPositionLedger, AccessControl {
    struct Trade {
        bytes32 tradeId;
        uint256 agentId;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 fee;
        bytes32 x402receipt;
        uint256 timestamp;
    }

    bytes32 public constant LEDGER_OPERATOR_ROLE = keccak256("LEDGER_OPERATOR_ROLE");

    mapping(address => uint256) private _positions;
    Trade[] private _trades;
    mapping(bytes32 => bool) private _tradeExists;

    error DuplicateTrade();
    error IndexOutOfBounds();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(LEDGER_OPERATOR_ROLE, msg.sender);
    }

    function recordTrade(
        bytes32 tradeId,
        uint256 agentId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee,
        bytes32 x402receipt
    ) external onlyRole(LEDGER_OPERATOR_ROLE) {
        if (_tradeExists[tradeId]) revert DuplicateTrade();
        _tradeExists[tradeId] = true;

        _trades.push(Trade({
            tradeId: tradeId,
            agentId: agentId,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountOut: amountOut,
            fee: fee,
            x402receipt: x402receipt,
            timestamp: block.timestamp
        }));

        emit TradeRecorded(tradeId, agentId, tokenIn, tokenOut, amountIn, amountOut, fee, x402receipt);
    }

    function setPosition(address token, uint256 amount) external onlyRole(LEDGER_OPERATOR_ROLE) {
        _positions[token] = amount;
        emit PositionUpdated(token, amount);
    }

    function getPosition(address token) external view returns (uint256) {
        return _positions[token];
    }

    function getTotalValue() external view returns (uint256) {
        return _positions[address(0)];
    }

    function getTradeCount() external view returns (uint256) {
        return _trades.length;
    }

    function getTrade(uint256 index) external view returns (Trade memory) {
        if (index >= _trades.length) revert IndexOutOfBounds();
        return _trades[index];
    }

    function getTrades(uint256 offset, uint256 limit) external view returns (Trade[] memory trades) {
        uint256 end = offset + limit;
        if (end > _trades.length) end = _trades.length;
        if (offset >= _trades.length) return new Trade[](0);

        trades = new Trade[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            trades[i - offset] = _trades[i];
        }
    }
}
