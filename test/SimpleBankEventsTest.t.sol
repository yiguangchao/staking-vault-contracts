// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { SimpleBank } from "../src/SimpleBank.sol";

contract SimpleBankEventsTest is Test {
    SimpleBank internal bank;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed user, uint256 amount, uint256 newBalance);

    function setUp() public {
        bank = new SimpleBank();

        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function test_Deposit_EmitsDepositedEvent() public {
        vm.expectEmit(address(bank));
        emit Deposited(alice, 1 ether, 1 ether);

        vm.prank(alice);
        bank.deposit{ value: 1 ether }();

        assertEq(bank.balanceOf(alice), 1 ether);
        assertEq(address(bank).balance, 1 ether);
    }

    function test_Withdraw_EmitsWithdrawnEvent() public {
        vm.prank(alice);
        bank.deposit{ value: 1 ether }();

        vm.expectEmit(address(bank));
        emit Withdrawn(alice, 0.4 ether, 0.6 ether);

        vm.prank(alice);
        bank.withdraw(0.4 ether);

        assertEq(bank.balanceOf(alice), 0.6 ether);
        assertEq(address(bank).balance, 0.6 ether);
    }

    function test_Receive_EmitsDepositedEvent() public {
        vm.expectEmit(address(bank));
        emit Deposited(bob, 2 ether, 2 ether);

        vm.prank(bob);
        (bool ok,) = address(bank).call{ value: 2 ether }("");
        assertTrue(ok);

        assertEq(bank.balanceOf(bob), 2 ether);
        assertEq(address(bank).balance, 2 ether);
    }

    function test_Deposit_PartialEventCheck_OnlyTopic1AndData() public {
        vm.expectEmit(true, false, false, true, address(bank));
        emit Deposited(alice, 1.5 ether, 1.5 ether);

        vm.prank(alice);
        bank.deposit{ value: 1.5 ether }();
    }

    function test_Prank_SimulatesDifferentUsers() public {
        vm.prank(alice);
        bank.deposit{ value: 1 ether }();

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(SimpleBank.InsufficientBalance.selector, 1 ether, 0));
        bank.withdraw(1 ether);
    }

    function test_Deal_SetsEthBalanceForTestAccounts() public {
        address carol = makeAddr("carol");

        assertEq(carol.balance, 0);

        vm.deal(carol, 3 ether);
        assertEq(carol.balance, 3 ether);

        vm.prank(carol);
        bank.deposit{ value: 1 ether }();

        assertEq(carol.balance, 2 ether);
        assertEq(bank.balanceOf(carol), 1 ether);
    }
}
