// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

library MathUtils {
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    function sqrt(uint256 y) internal pure returns (uint256) {
        if (y == 0) return 0;

        uint256 x = y / 2 + 1;
        uint256 z = (x + y / x) / 2;
        while (z < x) {
            x = z;
            z = (x + y / x) / 2;
        }
        return x;
    }

    function pow10(uint8 exponent) internal pure returns (uint256) {
        unchecked {
            uint256 result = 1;
            for (uint8 i = 0; i < exponent; i++) {
                result *= 10;
            }
            return result;
        }
    }
}
