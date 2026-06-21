// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/FundVault.sol";
import "../src/PositionLedger.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    uint8 private _decimals;

    constructor() ERC20("USD Coin", "USDC") {
        _decimals = 6;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract FundVaultTest is Test {
    MockUSDC usdc;
    PositionLedger ledger;
    FundVault vault;

    address admin = makeAddr("admin");
    address guardian = makeAddr("guardian");
    address treasury = makeAddr("treasury");
    address user = makeAddr("user");
    address attacker = makeAddr("attacker");
    address alice = makeAddr("alice");

    uint256 constant INITIAL_MINT = 100_000 * 10 ** 6;

    function setUp() public {
        usdc = new MockUSDC();
        ledger = new PositionLedger();

        vm.prank(admin);
        vault = new FundVault(address(usdc), address(ledger), treasury, admin, guardian);

        ledger.grantRole(ledger.LEDGER_OPERATOR_ROLE(), address(vault));

        usdc.mint(user, INITIAL_MINT);
        usdc.mint(alice, INITIAL_MINT);
    }

    function _deposit(address who, uint256 amount) internal returns (uint256 shares) {
        vm.startPrank(who);
        usdc.approve(address(vault), amount);
        shares = vault.deposit(amount, who);
        vm.stopPrank();
    }

    // ===================== DEPLOY =====================

    function testDeployCorrectParams() public {
        assertEq(address(vault.asset()), address(usdc));
        assertEq(address(vault.positionLedger()), address(ledger));
        assertEq(vault.treasury(), treasury);
        assertEq(vault.highWaterMark(), 10 ** 6);
        assertEq(vault.name(), "NullBoss Intelligence Share");
        assertEq(vault.symbol(), "NBIS");
        assertEq(vault.decimals(), 18);
    }

    function testDeployRevertZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(FundVault.ZeroAddress.selector));
        new FundVault(address(0), address(ledger), treasury, admin, guardian);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(FundVault.ZeroAddress.selector));
        new FundVault(address(usdc), address(0), treasury, admin, guardian);
    }

    function testRolesAssigned() public {
        assertTrue(vault.hasRole(vault.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(vault.hasRole(vault.EMERGENCY_GUARDIAN_ROLE(), guardian));
    }

    // ===================== DEPOSIT =====================

    function testDepositMintsCorrectShares() public {
        uint256 amount = 1000 * 10 ** 6;
        uint256 shares = _deposit(user, amount);

        assertEq(shares, amount * 10 ** 12, "shares should equal assets * 10^12");
        assertEq(vault.balanceOf(user), shares);
        assertEq(vault.totalAssets(), amount);
        assertEq(usdc.balanceOf(address(vault)), amount);
    }

    function testDepositRevertZeroAmount() public {
        vm.startPrank(user);
        usdc.approve(address(vault), 0);
        vm.expectRevert(abi.encodeWithSelector(FundVault.ZeroAmount.selector));
        vault.deposit(0, user);
        vm.stopPrank();
    }

    function testDepositRevertZeroReceiver() public {
        vm.startPrank(user);
        usdc.approve(address(vault), 100);
        vm.expectRevert(abi.encodeWithSelector(FundVault.ZeroAddress.selector));
        vault.deposit(100, address(0));
        vm.stopPrank();
    }

    function testMultipleDeposits() public {
        uint256 amount1 = 500 * 10 ** 6;
        uint256 amount2 = 300 * 10 ** 6;

        uint256 shares1 = _deposit(user, amount1);
        uint256 shares2 = _deposit(alice, amount2);

        assertEq(vault.totalSupply(), shares1 + shares2);
        assertEq(vault.totalAssets(), amount1 + amount2);
    }

    // ===================== MINT =====================

    function testMint() public {
        uint256 targetShares = 500 * 10 ** 18;
        uint256 assetsNeeded = vault.previewMint(targetShares);

        usdc.mint(user, assetsNeeded);
        vm.startPrank(user);
        usdc.approve(address(vault), assetsNeeded);
        uint256 assetsUsed = vault.mint(targetShares, user);
        vm.stopPrank();

        assertEq(assetsUsed, assetsNeeded);
        assertEq(vault.balanceOf(user), targetShares);
    }

    // ===================== WITHDRAW =====================

    function testWithdrawReturnsCorrectAssets() public {
        uint256 depositAmount = 1000 * 10 ** 6;
        _deposit(user, depositAmount);

        uint256 sharesToBurn = vault.previewWithdraw(depositAmount);

        vm.startPrank(user);
        uint256 burned = vault.withdraw(depositAmount, user, user);
        vm.stopPrank();

        assertEq(burned, sharesToBurn, "burned shares mismatch");
        assertEq(vault.balanceOf(user), 0);
        assertEq(usdc.balanceOf(user), INITIAL_MINT);
    }

    function testWithdrawRevertExceedsMax() public {
        _deposit(user, 100 * 10 ** 6);
        vm.startPrank(user);
        vm.expectRevert(abi.encodeWithSelector(FundVault.ExceedsMax.selector));
        vault.withdraw(200 * 10 ** 6, user, user);
        vm.stopPrank();
    }

    function testWithdrawWithAllowance() public {
        _deposit(user, 500 * 10 ** 6);

        vm.startPrank(user);
        vault.approve(alice, 500 * 10 ** 18);
        vm.stopPrank();

        vm.prank(alice);
        vault.withdraw(200 * 10 ** 6, alice, user);
    }

    // ===================== REDEEM =====================

    function testRedeem() public {
        uint256 depositAmount = 1000 * 10 ** 6;
        uint256 shares = _deposit(user, depositAmount);

        vm.startPrank(user);
        uint256 assets = vault.redeem(shares, user, user);
        vm.stopPrank();

        assertEq(assets, depositAmount);
        assertEq(vault.balanceOf(user), 0);
    }

    // ===================== MANAGEMENT FEE =====================

    function testManagementFeeAccruesOverBlocks() public {
        uint256 depositAmount = 100_000 * 10 ** 6;
        _deposit(user, depositAmount);

        // Mint additional USDC to user for the triggering deposit
        usdc.mint(user, 100);

        uint256 blocksToAdvance = 1_000_000;
        vm.roll(block.number + blocksToAdvance);

        uint256 supplyBefore = vault.totalSupply();
        vm.startPrank(user);
        usdc.approve(address(vault), 1);
        vault.deposit(1, user);
        vm.stopPrank();

        uint256 supplyAfter = vault.totalSupply();
        assertGt(supplyAfter, supplyBefore, "supply should increase from mgmt fee");
    }

    function testManagementFeeSkipsOnZeroSupply() public {
        vm.prank(user);
        vm.expectRevert();
        vault.harvest();
    }

    function testManagementFeeSkipsOnZeroBlockDelta() public {
        _deposit(user, 1000 * 10 ** 6);
        uint256 supplyBefore = vault.totalSupply();

        usdc.mint(user, 100);
        vm.startPrank(user);
        usdc.approve(address(vault), 1);
        vault.deposit(1, user);
        vm.stopPrank();

        assertEq(vault.totalSupply(), supplyBefore + 10 ** 12, "only deposit shares minted");
    }

    // ===================== PERFORMANCE FEE =====================

    function testPerformanceFeeOnHarvestAboveHWM() public {
        uint256 depositAmount = 100_000 * 10 ** 6;
        _deposit(user, depositAmount);

        uint256 profit = 10_000 * 10 ** 6;
        uint256 totalAssetsBefore = vault.totalAssets();

        deal(address(usdc), address(vault), totalAssetsBefore + profit);
        ledger.setPosition(address(usdc), totalAssetsBefore + profit);

        uint256 supplyBefore = vault.totalSupply();
        uint256 treasuryBefore = vault.balanceOf(treasury);

        vm.prank(user);
        vault.harvest();

        uint256 supplyAfter = vault.totalSupply();
        uint256 treasuryAfter = vault.balanceOf(treasury);

        assertGt(supplyAfter, supplyBefore, "supply should increase from perf fee");
        assertGt(treasuryAfter, treasuryBefore, "treasury should get perf fee shares");
        assertGt(vault.highWaterMark(), 10 ** 6, "HWM should increase");
    }

    function testPerformanceFeeNoFeeBelowHWM() public {
        _deposit(user, 100_000 * 10 ** 6);

        uint256 supplyBefore = vault.totalSupply();
        uint256 treasuryBefore = vault.balanceOf(treasury);

        vm.prank(user);
        vault.harvest();

        assertEq(vault.totalSupply(), supplyBefore, "no perf fee when no gain");
        assertEq(vault.balanceOf(treasury), treasuryBefore);
    }

    // ===================== HIGH WATER MARK =====================

    function testHighWaterMarkUpdatesOnHarvest() public {
        _deposit(user, 100_000 * 10 ** 6);

        uint256 initialHWM = vault.highWaterMark();
        assertEq(initialHWM, 10 ** 6);

        uint256 profit = 20_000 * 10 ** 6;
        uint256 tv = vault.totalAssets();
        deal(address(usdc), address(vault), tv + profit);
        ledger.setPosition(address(usdc), tv + profit);

        vm.prank(user);
        vault.harvest();

        assertGt(vault.highWaterMark(), initialHWM, "HWM should increase after harvest");
    }

    // ===================== REENTRANCY =====================

    function testNonReentrantWithdrawSucceeds() public {
        uint256 depositAmount = 1000 * 10 ** 6;
        _deposit(user, depositAmount);

        // Normal withdraw succeeds (no reentrancy possible with standard ERC20)
        vm.startPrank(user);
        uint256 shares = vault.withdraw(100, user, user);
        vm.stopPrank();

        assertTrue(shares > 0);
        assertEq(vault.balanceOf(user), depositAmount * 10 ** 12 - shares);
    }

    // ===================== EMERGENCY PAUSE =====================

    function testOnlyGuardianCanPause() public {
        vm.prank(user);
        vm.expectRevert();
        vault.pause();

        vm.prank(guardian);
        vault.pause();
        assertTrue(vault.paused());
    }

    function testTimelockDelayEnforced() public {
        vm.prank(guardian);
        vault.initiateEmergencyPause();

        assertEq(vault.pauseInitiatedAt(), block.timestamp);

        vm.expectRevert(abi.encodeWithSelector(FundVault.TimelockNotMet.selector));
        vm.prank(guardian);
        vault.executeEmergencyPause();

        vm.warp(block.timestamp + vault.TIMELOCK_DELAY() + 1);

        vm.prank(guardian);
        vault.executeEmergencyPause();
        assertTrue(vault.paused());
    }

    function testOnlyAdminCanUnpause() public {
        vm.prank(guardian);
        vault.pause();
        assertTrue(vault.paused());

        vm.prank(user);
        vm.expectRevert();
        vault.unpause();

        vm.prank(admin);
        vault.unpause();
        assertFalse(vault.paused());
    }

    function testPausedPreventsDeposit() public {
        _deposit(user, 1000 * 10 ** 6);

        vm.prank(guardian);
        vault.pause();

        vm.startPrank(alice);
        usdc.approve(address(vault), 100);
        vm.expectRevert();
        vault.deposit(100, alice);
        vm.stopPrank();
    }

    function testPausedPreventsWithdraw() public {
        _deposit(user, 1000 * 10 ** 6);

        vm.prank(guardian);
        vault.pause();

        vm.prank(user);
        vm.expectRevert();
        vault.withdraw(100, user, user);
    }

    // ===================== CONVERSION =====================

    function testConvertToSharesZeroSupply() public {
        uint256 assets = 1000 * 10 ** 6;
        uint256 shares = vault.convertToShares(assets);

        assertEq(shares, assets * 10 ** 12, "initial conversion rate should be 10^12 shares per asset");
    }

    function testConvertRoundTrip() public {
        _deposit(user, 1000 * 10 ** 6);

        uint256 shares = vault.balanceOf(user);
        uint256 assets = vault.convertToAssets(shares);

        assertApproxEqAbs(assets, 1000 * 10 ** 6, 1);
    }

    // ===================== TREASURY =====================

    function testSetTreasury() public {
        address newTreasury = makeAddr("newTreasury");

        vm.prank(admin);
        vault.setTreasury(newTreasury);

        assertEq(vault.treasury(), newTreasury);
    }

    function testSetTreasuryRevertNonAdmin() public {
        vm.prank(user);
        vm.expectRevert();
        vault.setTreasury(address(0x123));
    }

    // ===================== INITIATE EMERGENCY PAUSE GUARD =====================

    function testInitiateEmergencyPauseRevertNonGuardian() public {
        vm.prank(user);
        vm.expectRevert();
        vault.initiateEmergencyPause();
    }

    function testInitiateEmergencyPauseEmitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit FundVault.EmergencyPauseInitiated(block.timestamp + vault.TIMELOCK_DELAY());

        vm.prank(guardian);
        vault.initiateEmergencyPause();
    }
}
