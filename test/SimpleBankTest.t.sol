// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { SimpleBank } from "../src/SimpleBank.sol";

contract ForceSend {
    constructor() payable { }

    function boom(address payable target) external {
        selfdestruct(target);
    }
}

contract SimpleBankTest is Test {
    SimpleBank internal bank;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        bank = new SimpleBank();

        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function test_Deposit() public {
        vm.prank(alice);
        bank.deposit{ value: 1 ether }();

        assertEq(bank.balanceOf(alice), 1 ether);
        assertEq(bank.totalTrackedBalance(), 1 ether);
        assertEq(address(bank).balance, 1 ether);
    }

    function test_ReceiveEtherDirectly() public {
        vm.prank(bob);
        (bool ok,) = address(bank).call{ value: 2 ether }("");
        assertTrue(ok);

        assertEq(bank.balanceOf(bob), 2 ether);
        assertEq(bank.totalTrackedBalance(), 2 ether);
        assertEq(address(bank).balance, 2 ether);
    }

    function test_Withdraw() public {
        vm.prank(alice);
        bank.deposit{ value: 1 ether }();

        vm.prank(alice);
        bank.withdraw(0.4 ether);

        assertEq(bank.balanceOf(alice), 0.6 ether);
        assertEq(bank.totalTrackedBalance(), 0.6 ether);
        assertEq(address(bank).balance, 0.6 ether);
        assertEq(alice.balance, 9.4 ether);
    }

    function test_RevertWhenDepositZero() public {
        vm.prank(alice);
        vm.expectRevert(SimpleBank.ZeroAmount.selector);
        bank.deposit{ value: 0 }();
    }

    function test_RevertWhenWithdrawZero() public {
        vm.prank(alice);
        bank.deposit{ value: 1 ether }();

        vm.prank(alice);
        vm.expectRevert(SimpleBank.ZeroAmount.selector);
        bank.withdraw(0);
    }

    function test_RevertWhenWithdrawTooMuch() public {
        vm.prank(alice);
        bank.deposit{ value: 1 ether }();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SimpleBank.InsufficientBalance.selector, 2 ether, 1 ether));
        bank.withdraw(2 ether);
    }

    function test_AssertInvariantBreaksAfterForcedEther() public {
        ForceSend force = new ForceSend{ value: 1 ether }();
        force.boom(payable(address(bank)));

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("Panic(uint256)", 0x01));
        bank.deposit{ value: 1 ether }();
    }
}
