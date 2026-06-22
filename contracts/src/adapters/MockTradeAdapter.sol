// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IPositionLedger.sol";

interface ITradeAdapter {
    function execute(bytes calldata data) external returns (uint256 amountOut, address tokenOut);
}

contract MockTradeAdapter is ITradeAdapter {
    using SafeERC20 for IERC20;

    address public immutable usdc;
    uint256 public tradeCount;

    event MockTradeExecuted(address indexed tokenOut, uint256 amountOut);

    constructor(address _usdc) {
        usdc = _usdc;
    }

    function execute(bytes calldata data) external returns (uint256 amountOut, address tokenOut) {
        (amountOut) = abi.decode(data, (uint256));
        tokenOut = usdc;
        tradeCount++;

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), amountOut);

        emit MockTradeExecuted(tokenOut, amountOut);
    }
}
