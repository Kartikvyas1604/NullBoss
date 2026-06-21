// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/StrategyExecutor.sol";
import "../src/AgentRegistry.sol";
import "../src/PositionLedger.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    uint8 private _decimals;

    constructor(string memory name, string memory symbol, uint8 dec) ERC20(name, symbol) {
        _decimals = dec;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockAdapter {
    uint256 public constant SWAP_RETURN = 100 * 10 ** 6;
    address public tokenOut;

    constructor(address _tokenOut) {
        tokenOut = _tokenOut;
    }

    function execute(bytes calldata) external returns (uint256 amountOut, address outToken) {
        return (SWAP_RETURN, tokenOut);
    }

    function executeWithTransfer(address tokenIn, uint256 amountIn, address tokenOutAddr)
        external
        returns (uint256 amountOut, address outToken)
    {
        return (amountIn, tokenOutAddr);
    }
}

contract StrategyExecutorTest is Test {
    AgentRegistry registry;
    PositionLedger ledger;
    StrategyExecutor executor;
    MockToken usdc;
    MockAdapter adapter;

    address admin = makeAddr("admin");
    address agentOwner = makeAddr("agentOwner");
    address trader = makeAddr("trader");

    uint256 constant STARTING_USDC = 1_000_000 * 10 ** 6;

    function setUp() public {
        usdc = new MockToken("USD Coin", "USDC", 6);
        registry = new AgentRegistry();
        ledger = new PositionLedger();

        usdc.mint(address(this), STARTING_USDC);

        vm.prank(admin);
        executor = new StrategyExecutor(address(registry), address(ledger), admin);

        ledger.grantRole(ledger.LEDGER_OPERATOR_ROLE(), address(executor));

        ledger.setPosition(address(usdc), 100_000 * 10 ** 6);
        ledger.setPosition(address(0), 100_000 * 10 ** 6);

        adapter = new MockAdapter(address(usdc));
    }

    function _registerAgent() internal returns (uint256) {
        vm.prank(agentOwner);
        return registry.registerAgent("https://nullboss.io/agents/trader.json", 0);
    }

    function _whitelistAdapter() internal {
        vm.prank(admin);
        executor.setAdapterWhitelist(address(adapter), true);
    }

    // ===================== EXECUTE TRADE =====================

    function testExecuteTradeWithValidAgent() public {
        uint256 agentId = _registerAgent();
        _whitelistAdapter();

        bytes memory data = abi.encodeWithSignature("execute(bytes)", abi.encode("swap"));

        vm.prank(trader);
        uint256 amountOut = executor.executeTrade(agentId, address(adapter), data, 0, 0, bytes32(0));

        assertEq(amountOut, adapter.SWAP_RETURN());
    }

    function testExecuteTradeEmitsEvent() public {
        uint256 agentId = _registerAgent();
        _whitelistAdapter();

        bytes memory data = abi.encodeWithSignature("execute(bytes)", abi.encode("swap"));

        vm.expectEmit(true, true, true, true);
        emit StrategyExecutor.TradeExecuted(
            keccak256(abi.encodePacked(agentId, address(adapter), block.timestamp, bytes32(0))),
            agentId,
            address(adapter),
            address(0),
            address(usdc),
            0,
            adapter.SWAP_RETURN(),
            0,
            block.timestamp
        );

        vm.prank(trader);
        executor.executeTrade(agentId, address(adapter), data, 0, 0, bytes32(0));
    }

    // ===================== CIRCUIT BREAKER: MAX TRADE SIZE =====================

    function testCircuitBreakerMaxTradeSize() public {
        uint256 agentId = _registerAgent();
        _whitelistAdapter();

        uint256 largeAmount = 100_000_000 * 10 ** 6;

        bytes memory data = abi.encodeWithSignature("execute(bytes)", abi.encode("swap_large"));

        vm.prank(trader);
        vm.expectRevert(abi.encodeWithSelector(StrategyExecutor.TradeTooLarge.selector));
        executor.executeTradeWithTokenIn(agentId, address(adapter), address(usdc), largeAmount, data, 0, 0, bytes32(0));
    }

    function testMaxTradeSizeCanBeUpdated() public {
        uint256 oldPercent = executor.maxTradePercent();

        vm.prank(admin);
        executor.setMaxTradePercent(1000);

        assertEq(executor.maxTradePercent(), 1000);
        assertTrue(executor.maxTradePercent() != oldPercent);
    }

    function testMaxTradeSizeRevertNonAdmin() public {
        vm.prank(trader);
        vm.expectRevert();
        executor.setMaxTradePercent(1000);
    }

    // ===================== CIRCUIT BREAKER: MAX DRAWDOWN =====================

    function testSetMaxDrawdown() public {
        vm.prank(admin);
        executor.setMaxDrawdown(1500);

        assertEq(executor.maxDrawdownBps(), 1500);
    }

    function testSetMaxDrawdownRevertIfExceeds100() public {
        vm.startPrank(admin);
        vm.expectRevert(abi.encodeWithSelector(StrategyExecutor.DrawdownExceeded.selector));
        executor.setMaxDrawdown(10001);
        vm.stopPrank();
    }

    // ===================== ADAPTER WHITELIST =====================

    function testAdapterWhitelistCheck() public {
        uint256 agentId = _registerAgent();

        bytes memory data = abi.encodeWithSignature("execute(bytes)", abi.encode("swap"));

        vm.prank(trader);
        vm.expectRevert(abi.encodeWithSelector(StrategyExecutor.AdapterNotWhitelisted.selector));
        executor.executeTrade(agentId, address(adapter), data, 0, 0, bytes32(0));
    }

    function testWhitelistAdapter() public {
        assertFalse(executor.whitelistedAdapters(address(adapter)));

        vm.prank(admin);
        executor.setAdapterWhitelist(address(adapter), true);

        assertTrue(executor.whitelistedAdapters(address(adapter)));
    }

    function testUnwhitelistAdapter() public {
        _whitelistAdapter();

        vm.prank(admin);
        executor.setAdapterWhitelist(address(adapter), false);

        assertFalse(executor.whitelistedAdapters(address(adapter)));
    }

    // ===================== X402 RECEIPT =====================

    function testX402ReceiptLogging() public {
        uint256 agentId = _registerAgent();
        _whitelistAdapter();

        bytes32 receipt = keccak256("x402_receipt_001");

        bytes memory data = abi.encodeWithSignature("execute(bytes)", abi.encode("swap"));

        vm.prank(trader);
        executor.executeTrade(agentId, address(adapter), data, 0, 0, receipt);

        assertEq(executor.getX402ReceiptCount(), 1);
        assertEq(executor.getX402Receipt(0), receipt);
    }

    function testX402ReceiptEmitsEvent() public {
        uint256 agentId = _registerAgent();
        _whitelistAdapter();

        bytes32 receipt = keccak256("x402_receipt_002");

        vm.expectEmit(true, true, true, true);
        emit StrategyExecutor.X402ReceiptLogged(receipt);

        bytes memory data = abi.encodeWithSignature("execute(bytes)", abi.encode("swap"));

        vm.prank(trader);
        executor.executeTrade(agentId, address(adapter), data, 0, 0, receipt);
    }

    function testX402ReceiptDeduplication() public {
        uint256 agentId = _registerAgent();
        _whitelistAdapter();

        bytes32 receipt = keccak256("x402_receipt_003");

        bytes memory data = abi.encodeWithSignature("execute(bytes)", abi.encode("swap"));

        vm.prank(trader);
        executor.executeTrade(agentId, address(adapter), data, 0, 0, receipt);

        // Advance time so tradeId differs (uses block.timestamp)
        vm.warp(block.timestamp + 1);

        vm.prank(trader);
        executor.executeTrade(agentId, address(adapter), data, 0, 0, receipt);

        assertEq(executor.getX402ReceiptCount(), 1);
    }

    // ===================== SLIPPAGE =====================

    function testSlippageCheck() public {
        uint256 agentId = _registerAgent();
        _whitelistAdapter();

        bytes memory data = abi.encodeWithSignature("execute(bytes)", abi.encode("swap"));

        vm.prank(trader);
        vm.expectRevert(abi.encodeWithSelector(StrategyExecutor.SlippageExceeded.selector));
        // Adapter returns 100 * 10^6, request 100 * 10^6 + 1 to trigger slippage
        executor.executeTrade(agentId, address(adapter), data, 0, 100 * 10 ** 6 + 1, bytes32(0));
    }

    // ===================== WITHDRAW TO VAULT =====================

    function testWithdrawToVault() public {
        usdc.mint(address(executor), 5000 * 10 ** 6);

        vm.prank(admin);
        executor.withdrawToVault(address(usdc), 5000 * 10 ** 6);

        assertEq(usdc.balanceOf(admin), 5000 * 10 ** 6);
    }

    function testWithdrawToVaultRevertNonExecutor() public {
        usdc.mint(address(executor), 100 * 10 ** 6);

        vm.prank(trader);
        vm.expectRevert();
        executor.withdrawToVault(address(usdc), 100 * 10 ** 6);
    }

    // ===================== SWEEP =====================

    function testSweepToken() public {
        usdc.mint(address(executor), 100 * 10 ** 6);

        vm.prank(admin);
        executor.sweepToken(address(usdc), 100 * 10 ** 6);

        assertEq(usdc.balanceOf(admin), 100 * 10 ** 6);
    }

    // ===================== AGENT NOT ACTIVE =====================

    function testExecuteTradeRevertsInactiveAgent() public {
        _whitelistAdapter();

        bytes memory data = abi.encodeWithSignature("execute(bytes)", abi.encode("swap"));

        vm.prank(trader);
        vm.expectRevert(abi.encodeWithSelector(StrategyExecutor.AgentNotActive.selector));
        executor.executeTrade(1, address(adapter), data, 0, 0, bytes32(0));
    }

    function testExecuteTradeRevertsRevokedAgent() public {
        uint256 agentId = _registerAgent();
        _whitelistAdapter();

        vm.prank(agentOwner);
        registry.revokeAgent(agentId);

        bytes memory data = abi.encodeWithSignature("execute(bytes)", abi.encode("swap"));

        vm.prank(trader);
        vm.expectRevert(abi.encodeWithSelector(StrategyExecutor.AgentNotActive.selector));
        executor.executeTrade(agentId, address(adapter), data, 0, 0, bytes32(0));
    }

    // ===================== RESET PEAK =====================

    function testResetPeak() public {
        vm.prank(admin);
        executor.resetPeak(5000 * 10 ** 6);

        assertEq(executor.peakTotalValue(), 5000 * 10 ** 6);
    }

    function testResetPeakRevertNonAdmin() public {
        vm.prank(trader);
        vm.expectRevert();
        executor.resetPeak(1000);
    }
}
