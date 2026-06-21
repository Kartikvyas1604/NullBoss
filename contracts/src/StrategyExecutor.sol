// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IERC8004.sol";
import "./interfaces/IPositionLedger.sol";

interface IAgentRegistryExt is IERC8004 {
    function isAgentActive(uint256 agentId) external view returns (bool);
}

interface ITradeAdapter {
    function execute(bytes calldata data) external returns (uint256 amountOut, address tokenOut);
}

contract StrategyExecutor is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    IAgentRegistryExt public immutable agentRegistry;
    IPositionLedger public immutable positionLedger;

    mapping(address => bool) public whitelistedAdapters;

    uint256 public maxTradePercent = 500;
    uint256 public maxDrawdownBps = 2000;
    uint256 public constant BPS_DENOMINATOR = 10000;

    uint256 public peakTotalValue;
    uint256 public lastPeakUpdate;

    bytes32[] private _x402Receipts;
    mapping(bytes32 => bool) private _receiptExists;

    error AdapterNotWhitelisted();
    error AgentNotActive();
    error TradeTooLarge();
    error DrawdownExceeded();
    error SlippageExceeded();
    error ZeroAddress();
    error ZeroAmount();

    event TradeExecuted(
        bytes32 indexed tradeId,
        uint256 indexed agentId,
        address indexed adapter,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee,
        uint256 timestamp
    );
    event CircuitBreakerTriggered(uint256 indexed agentId, string reason);
    event AdapterWhitelisted(address indexed adapter, bool whitelisted);
    event MaxTradePercentUpdated(uint256 oldPercent, uint256 newPercent);
    event MaxDrawdownUpdated(uint256 oldDrawdown, uint256 newDrawdown);
    event X402ReceiptLogged(bytes32 indexed receipt);

    constructor(address _agentRegistry, address _positionLedger, address _admin) {
        if (_agentRegistry == address(0) || _positionLedger == address(0) || _admin == address(0)) revert ZeroAddress();

        agentRegistry = IAgentRegistryExt(_agentRegistry);
        positionLedger = IPositionLedger(_positionLedger);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(EXECUTOR_ROLE, _admin);
    }

    function executeTrade(
        uint256 agentId,
        address adapter,
        bytes calldata data,
        uint256 maxSlippageBps,
        uint256 expectedMinAmountOut,
        bytes32 x402Receipt
    ) external nonReentrant returns (uint256 amountOut) {
        if (!whitelistedAdapters[adapter]) revert AdapterNotWhitelisted();
        if (!agentRegistry.isAgentActive(agentId)) revert AgentNotActive();

        agentRegistry.validateAgentAction(agentId, keccak256(abi.encode(block.timestamp, adapter, data)));

        _checkCircuitBreakers(agentId, 0);

        ITradeAdapter tradeAdapter = ITradeAdapter(adapter);
        uint256 amountOutFromAdapter;
        address tokenOut;

        (amountOutFromAdapter, tokenOut) = tradeAdapter.execute(data);

        if (expectedMinAmountOut > 0 && amountOutFromAdapter < expectedMinAmountOut) revert SlippageExceeded();
        if (maxSlippageBps > 0) {
            uint256 maxSlippageAmount = expectedMinAmountOut * maxSlippageBps / BPS_DENOMINATOR;
            if (amountOutFromAdapter < expectedMinAmountOut - maxSlippageAmount) revert SlippageExceeded();
        }

        if (x402Receipt != bytes32(0)) {
            _logX402Receipt(x402Receipt);
        }

        bytes32 tradeId = keccak256(abi.encodePacked(agentId, adapter, block.timestamp, x402Receipt));
        positionLedger.recordTrade(tradeId, agentId, address(0), tokenOut, 0, amountOutFromAdapter, 0, x402Receipt);

        emit TradeExecuted(tradeId, agentId, adapter, address(0), tokenOut, 0, amountOutFromAdapter, 0, block.timestamp);

        return amountOutFromAdapter;
    }

    function executeTradeWithTokenIn(
        uint256 agentId,
        address adapter,
        address tokenIn,
        uint256 amountIn,
        bytes calldata data,
        uint256,
        uint256 expectedMinAmountOut,
        bytes32 x402Receipt
    ) external nonReentrant returns (uint256 amountOut) {
        if (!whitelistedAdapters[adapter]) revert AdapterNotWhitelisted();
        if (!agentRegistry.isAgentActive(agentId)) revert AgentNotActive();
        if (amountIn == 0) revert ZeroAmount();

        agentRegistry.validateAgentAction(agentId, keccak256(abi.encode(block.timestamp, adapter, data)));

        _checkCircuitBreakers(agentId, amountIn);

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).safeTransfer(adapter, amountIn);

        ITradeAdapter tradeAdapter = ITradeAdapter(adapter);
        address tokenOut;
        (amountOut, tokenOut) = tradeAdapter.execute(data);

        if (expectedMinAmountOut > 0 && amountOut < expectedMinAmountOut) revert SlippageExceeded();

        if (x402Receipt != bytes32(0)) {
            _logX402Receipt(x402Receipt);
        }

        bytes32 tradeId = keccak256(abi.encodePacked(agentId, adapter, block.timestamp, x402Receipt));
        positionLedger.recordTrade(tradeId, agentId, tokenIn, tokenOut, amountIn, amountOut, 0, x402Receipt);

        emit TradeExecuted(tradeId, agentId, adapter, tokenIn, tokenOut, amountIn, amountOut, 0, block.timestamp);

        return amountOut;
    }

    function _checkCircuitBreakers(uint256, uint256 tradeSize) internal view {
        uint256 totalValue = positionLedger.getTotalValue();
        if (totalValue > 0 && tradeSize > totalValue * maxTradePercent / BPS_DENOMINATOR) {
            revert TradeTooLarge();
        }
    }

    function _checkDrawdown(uint256 currentTotalValue) internal {
        if (currentTotalValue > peakTotalValue) {
            peakTotalValue = currentTotalValue;
            lastPeakUpdate = block.timestamp;
        }

        if (peakTotalValue > 0 && currentTotalValue < peakTotalValue) {
            uint256 drawdownBps = (peakTotalValue - currentTotalValue) * BPS_DENOMINATOR / peakTotalValue;
            if (drawdownBps > maxDrawdownBps) {
                revert DrawdownExceeded();
            }
        }
    }

    function _logX402Receipt(bytes32 receipt) internal {
        if (!_receiptExists[receipt]) {
            _receiptExists[receipt] = true;
            _x402Receipts.push(receipt);
            emit X402ReceiptLogged(receipt);
        }
    }

    function setAdapterWhitelist(address adapter, bool whitelisted) external onlyRole(DEFAULT_ADMIN_ROLE) {
        whitelistedAdapters[adapter] = whitelisted;
        emit AdapterWhitelisted(adapter, whitelisted);
    }

    function setMaxTradePercent(uint256 newPercent) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newPercent > BPS_DENOMINATOR) revert TradeTooLarge();
        uint256 oldPercent = maxTradePercent;
        maxTradePercent = newPercent;
        emit MaxTradePercentUpdated(oldPercent, newPercent);
    }

    function setMaxDrawdown(uint256 newDrawdown) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newDrawdown > BPS_DENOMINATOR) revert DrawdownExceeded();
        uint256 old = maxDrawdownBps;
        maxDrawdownBps = newDrawdown;
        emit MaxDrawdownUpdated(old, newDrawdown);
    }

    function resetPeak(uint256 currentTotalValue) external onlyRole(DEFAULT_ADMIN_ROLE) {
        peakTotalValue = currentTotalValue;
        lastPeakUpdate = block.timestamp;
    }

    function getX402ReceiptCount() external view returns (uint256) {
        return _x402Receipts.length;
    }

    function getX402Receipt(uint256 index) external view returns (bytes32) {
        return _x402Receipts[index];
    }

    function withdrawToVault(address token, uint256 amount) external onlyRole(EXECUTOR_ROLE) {
        if (amount == 0) revert ZeroAmount();
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    function sweepToken(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (amount == 0) revert ZeroAmount();
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    receive() external payable {}
}
