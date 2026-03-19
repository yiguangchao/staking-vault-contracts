// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract Counter {
    uint256 public number;

    event NumberSet(uint256 newNumber);

    function setNumber(
        uint256 newNumber
    ) external {
        number = newNumber;
        emit NumberSet(newNumber);
    }

    function increment() external {
        number += 1;
        emit NumberSet(number);
    }
}
