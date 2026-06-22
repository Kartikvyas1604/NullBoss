// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ITradeAdapter {
    function execute(bytes calldata data) external returns (uint256 amountOut, address tokenOut);
}

interface AggregatorV3Interface {
    function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
    function decimals() external view returns (uint8);
}

contract MockTradeAdapter is ITradeAdapter {
    using SafeERC20 for IERC20;

    address public immutable usdc;
    address public immutable wavax;
    address public immutable priceFeed;
    uint256 public tradeCount;

    event MockTradeExecuted(address indexed tokenOut, uint256 amountOut, uint256 usdcAmount);

    constructor(address _usdc, address _wavax, address _priceFeed) {
        usdc = _usdc;
        wavax = _wavax;
        priceFeed = _priceFeed;
    }

    function execute(bytes calldata) external returns (uint256 amountOut, address tokenOut) {
        tradeCount++;
        tokenOut = wavax;

        uint256 usdcBalance = IERC20(usdc).balanceOf(address(this));
        if (usdcBalance == 0) return (0, address(0));

        (, int256 price, , , ) = AggregatorV3Interface(priceFeed).latestRoundData();
        if (price <= 0) return (0, address(0));

        uint256 wavaxAmount = (usdcBalance * 10**20) / uint256(price);
        uint256 wavaxBalance = IERC20(wavax).balanceOf(address(this));
        if (wavaxBalance < wavaxAmount) wavaxAmount = wavaxBalance;

        if (wavaxAmount > 0) {
            IERC20(wavax).safeTransfer(msg.sender, wavaxAmount);
            emit MockTradeExecuted(tokenOut, wavaxAmount, usdcBalance);
            return (wavaxAmount, wavax);
        }

        return (0, address(0));
    }

    function seedWavax(uint256 amount) external {
        IERC20(wavax).safeTransferFrom(msg.sender, address(this), amount);
    }

    function drainUsdc() external {
        uint256 balance = IERC20(usdc).balanceOf(address(this));
        if (balance > 0) {
            IERC20(usdc).safeTransfer(msg.sender, balance);
        }
    }
}
