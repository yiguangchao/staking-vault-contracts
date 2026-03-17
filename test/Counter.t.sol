// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "remix_tests.sol";
import {Counter} from "../src/Counter.sol";

contract CounterTest {
    Counter internal counter;

    function setUp() public {
        counter = new Counter();
    }

    function test_InitialNumberIsZero() public {
        Assert.equal(counter.number(), 0, "Initial number should be 0");
    }

    function test_SetNumber() public {
        counter.setNumber(7);
        Assert.equal(counter.number(), 7, "Number should be set to 7");
    }

    function test_Increment() public {
        counter.increment();
        Assert.equal(counter.number(), 1, "Number should be 1 after increment");
    }

    function testFuzz_SetNumber(uint256 x) public {
        counter.setNumber(x);
        Assert.equal(counter.number(), x, "Number should be set to x");
    }
}
