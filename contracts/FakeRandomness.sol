//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract FakeRandomness {
    
    uint256 public randomResult;

    constructor() {
        randomResult = 0;
    }

    function getRandomNumber() public {
        randomResult = uint256(block.timestamp);
    }

    // Getting multiple random numbers
    function expand(uint256 randomValue, uint256 n) public pure returns (uint256[] memory expandedValues) {
        expandedValues = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            expandedValues[i] = uint256(keccak256(abi.encode(randomValue, i)));
        }
        return expandedValues;
    }
}
