// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/IERC4626.sol";
import "./interfaces/IPositionLedger.sol";

contract FundVault is ERC20, ReentrancyGuard, Pausable, AccessControl, IERC4626 {
    using SafeERC20 for IERC20;

    bytes32 public constant EMERGENCY_GUARDIAN_ROLE = keccak256("EMERGENCY_GUARDIAN");

    IERC20 private immutable _assetToken;
    IPositionLedger public positionLedger;

    uint256 public constant MANAGEMENT_FEE_BPS = 200;
    uint256 public constant PERF_FEE_BPS = 2000;
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant BLOCKS_PER_YEAR = 15_768_000;
    uint256 public constant TIMELOCK_DELAY = 2 days;
    uint256 public constant INITIAL_SHARE_PRICE = 10 ** 6;

    uint256 public lastBlockAccrued;
    uint256 public highWaterMark;
    uint256 public pauseInitiatedAt;
    address public treasury;

    error InsufficientBalance();
    error ExceedsMax();
    error NotInEmergency();
    error TimelockNotMet();
    error ZeroAddress();
    error ZeroAmount();
    error NotReady();

    event ManagementFeeAccrued(uint256 feeAmount, uint256 feeShares);
    event PerformanceFeeCharged(uint256 feeAmount, uint256 feeShares);
    event HighWaterMarkUpdated(uint256 newHighWaterMark);
    event EmergencyPauseInitiated(uint256 pauseAvailableAt);

    function asset() external view returns (address) {
        return address(_assetToken);
    }

    constructor(
        address _asset,
        address _positionLedger,
        address _treasury,
        address _admin,
        address _guardian
    ) ERC20("NullBoss Intelligence Share", "NBIS") {
        if (_asset == address(0) || _positionLedger == address(0) || _treasury == address(0) || _admin == address(0)) {
            revert ZeroAddress();
        }

        _assetToken = IERC20(_asset);
        positionLedger = IPositionLedger(_positionLedger);
        treasury = _treasury;
        highWaterMark = INITIAL_SHARE_PRICE;
        lastBlockAccrued = block.number;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(EMERGENCY_GUARDIAN_ROLE, _guardian);
    }

    function _totalAssets() internal view returns (uint256) {
        return positionLedger.getPosition(address(_assetToken));
    }

    function totalAssets() public view returns (uint256) {
        return _totalAssets();
    }

    function _decimalsOffset() internal pure returns (uint8) {
        return 12;
    }

    function decimals() public pure override(ERC20) returns (uint8) {
        return 18;
    }

    function convertToShares(uint256 assetsAmount) public view returns (uint256) {
        return _convertToShares(assetsAmount, Math.Rounding.Floor);
    }

    function convertToAssets(uint256 sharesAmount) public view returns (uint256) {
        return _convertToAssets(sharesAmount, Math.Rounding.Floor);
    }

    function _convertToShares(uint256 assetsAmount, Math.Rounding rounding) internal view returns (uint256) {
        if (assetsAmount == 0) return 0;
        return Math.mulDiv(assetsAmount, totalSupply() + 10 ** _decimalsOffset(), _totalAssets() + 1, rounding);
    }

    function _convertToAssets(uint256 sharesAmount, Math.Rounding rounding) internal view returns (uint256) {
        if (sharesAmount == 0) return 0;
        return Math.mulDiv(sharesAmount, _totalAssets() + 1, totalSupply() + 10 ** _decimalsOffset(), rounding);
    }

    function maxDeposit(address) public pure returns (uint256) {
        return type(uint256).max;
    }

    function maxMint(address) public pure returns (uint256) {
        return type(uint256).max;
    }

    function maxWithdraw(address owner) public view returns (uint256) {
        return _convertToAssets(balanceOf(owner), Math.Rounding.Floor);
    }

    function maxRedeem(address owner) public view returns (uint256) {
        return balanceOf(owner);
    }

    function previewDeposit(uint256 assetsAmount) public view returns (uint256) {
        return _convertToShares(assetsAmount, Math.Rounding.Floor);
    }

    function previewMint(uint256 sharesAmount) public view returns (uint256) {
        return _convertToAssets(sharesAmount, Math.Rounding.Ceil);
    }

    function previewWithdraw(uint256 assetsAmount) public view returns (uint256) {
        return _convertToShares(assetsAmount, Math.Rounding.Ceil);
    }

    function previewRedeem(uint256 sharesAmount) public view returns (uint256) {
        return _convertToAssets(sharesAmount, Math.Rounding.Floor);
    }

    function deposit(uint256 assetsAmount, address receiver) external nonReentrant whenNotPaused returns (uint256) {
        if (assetsAmount == 0) revert ZeroAmount();
        if (receiver == address(0)) revert ZeroAddress();

        _accrueManagementFee();

        uint256 shares = _convertToShares(assetsAmount, Math.Rounding.Floor);
        _mint(receiver, shares);

        _assetToken.safeTransferFrom(msg.sender, address(this), assetsAmount);
        _updatePosition();

        emit Deposit(msg.sender, receiver, assetsAmount, shares);
        return shares;
    }

    function mint(uint256 sharesAmount, address receiver) external nonReentrant whenNotPaused returns (uint256) {
        if (sharesAmount == 0) revert ZeroAmount();
        if (receiver == address(0)) revert ZeroAddress();

        _accrueManagementFee();

        uint256 assets = _convertToAssets(sharesAmount, Math.Rounding.Ceil);
        _mint(receiver, sharesAmount);

        _assetToken.safeTransferFrom(msg.sender, address(this), assets);
        _updatePosition();

        emit Deposit(msg.sender, receiver, assets, sharesAmount);
        return assets;
    }

    function withdraw(uint256 assetsAmount, address receiver, address owner)
        external
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        if (assetsAmount == 0) revert ZeroAmount();
        if (receiver == address(0)) revert ZeroAddress();

        uint256 maxAssets = maxWithdraw(owner);
        if (assetsAmount > maxAssets) revert ExceedsMax();

        _accrueManagementFee();

        uint256 shares = _convertToShares(assetsAmount, Math.Rounding.Ceil);
        _burnShares(owner, shares);

        _assetToken.safeTransfer(receiver, assetsAmount);
        _updatePosition();

        emit Withdraw(msg.sender, receiver, owner, assetsAmount, shares);
        return shares;
    }

    function redeem(uint256 sharesAmount, address receiver, address owner)
        external
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        if (sharesAmount == 0) revert ZeroAmount();
        if (receiver == address(0)) revert ZeroAddress();

        uint256 maxShareAmount = maxRedeem(owner);
        if (sharesAmount > maxShareAmount) revert ExceedsMax();

        _accrueManagementFee();

        uint256 assets = _convertToAssets(sharesAmount, Math.Rounding.Floor);
        _burnShares(owner, sharesAmount);

        _assetToken.safeTransfer(receiver, assets);
        _updatePosition();

        emit Withdraw(msg.sender, receiver, owner, assets, sharesAmount);
        return assets;
    }

    function _burnShares(address owner, uint256 sharesAmount) internal {
        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, sharesAmount);
        }
        _burn(owner, sharesAmount);
    }

    function _updatePosition() internal {
        positionLedger.setPosition(address(_assetToken), _assetToken.balanceOf(address(this)));
    }

    function _accrueManagementFee() internal {
        uint256 shares = totalSupply();
        if (shares == 0) {
            lastBlockAccrued = block.number;
            return;
        }

        uint256 blocksSinceLast = block.number - lastBlockAccrued;
        if (blocksSinceLast == 0) return;

        uint256 currentAssets = _totalAssets();
        if (currentAssets == 0) {
            lastBlockAccrued = block.number;
            return;
        }

        uint256 feeAssets = currentAssets * MANAGEMENT_FEE_BPS * blocksSinceLast / (BPS_DENOMINATOR * BLOCKS_PER_YEAR);
        if (feeAssets == 0) {
            lastBlockAccrued = block.number;
            return;
        }

        uint256 feeShares = _convertToShares(feeAssets, Math.Rounding.Floor);
        if (feeShares > 0) {
            _mint(treasury, feeShares);
            emit ManagementFeeAccrued(feeAssets, feeShares);
        }

        lastBlockAccrued = block.number;
    }

    function harvest() external nonReentrant {
        _accrueManagementFee();

        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) revert NotReady();

        uint256 currentAssets = _totalAssets();
        uint256 currentSharePrice = currentAssets * 1e18 / _totalSupply;

        if (currentSharePrice > highWaterMark) {
            uint256 oldHWM = highWaterMark;
            uint256 assetsAtHWM = oldHWM * _totalSupply / 1e18;
            uint256 gainAssets = currentAssets > assetsAtHWM ? currentAssets - assetsAtHWM : 0;

            if (gainAssets > 0) {
                uint256 perfFeeAssets = gainAssets * PERF_FEE_BPS / BPS_DENOMINATOR;
                uint256 feeShares = _convertToShares(perfFeeAssets, Math.Rounding.Floor);

                if (feeShares > 0) {
                    _mint(treasury, feeShares);
                    emit PerformanceFeeCharged(perfFeeAssets, feeShares);
                }
            }

            uint256 newTotalSupply = totalSupply();
            highWaterMark = _totalAssets() * 1e18 / newTotalSupply;
            emit HighWaterMarkUpdated(highWaterMark);
        }
    }

    function setTreasury(address _newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_newTreasury == address(0)) revert ZeroAddress();
        treasury = _newTreasury;
    }

    function setPositionLedger(address _newLedger) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_newLedger == address(0)) revert ZeroAddress();
        positionLedger = IPositionLedger(_newLedger);
    }

    function pause() external onlyRole(EMERGENCY_GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        pauseInitiatedAt = 0;
        _unpause();
    }

    function initiateEmergencyPause() external onlyRole(EMERGENCY_GUARDIAN_ROLE) whenNotPaused {
        if (pauseInitiatedAt != 0) revert NotInEmergency();
        pauseInitiatedAt = block.timestamp;
        emit EmergencyPauseInitiated(block.timestamp + TIMELOCK_DELAY);
    }

    function executeEmergencyPause() external onlyRole(EMERGENCY_GUARDIAN_ROLE) whenNotPaused {
        if (pauseInitiatedAt == 0) revert NotInEmergency();
        if (block.timestamp < pauseInitiatedAt + TIMELOCK_DELAY) revert TimelockNotMet();
        pauseInitiatedAt = 0;
        _pause();
    }
}
