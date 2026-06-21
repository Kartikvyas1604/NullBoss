// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

library BlockTimestamp {
    uint256 public constant BLOCKS_PER_YEAR = 15_768_000;

    function getBlockNumber() internal view returns (uint256) {
        return block.number;
    }

    function getTimestamp() internal view returns (uint256) {
        return block.timestamp;
    }
}
