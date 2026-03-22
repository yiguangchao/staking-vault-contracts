// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { BootcampToken } from "../src/BootcampToken.sol";
import { SimpleStaking } from "../src/SimpleStaking.sol";

contract SimpleStakingTest is Test {
    BootcampToken internal token;
    SimpleStaking internal staking;

    address internal admin = makeAddr("admin");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);

    function setUp() public {
        token = new BootcampToken(admin);
        staking = new SimpleStaking(token);

        vm.startPrank(admin);
        token.mint(alice, 100 ether);
        token.mint(bob, 100 ether);
        vm.stopPrank();
    }

    function test_ApproveOverwritesAllowance() public {
        vm.startPrank(alice);
        token.approve(address(staking), 100 ether);
        token.approve(address(staking), 200 ether);
        vm.stopPrank();

        assertEq(token.allowance(alice, address(staking)), 200 ether);
    }

    function test_ApproveAllowanceAndStake() public {
        vm.prank(alice);
        token.approve(address(staking), 60 ether);

        assertEq(token.allowance(alice, address(staking)), 60 ether);

        vm.expectEmit(address(staking));
        emit Staked(alice, 40 ether);

        vm.prank(alice);
        staking.stake(40 ether);

        assertEq(staking.balances(alice), 40 ether);
        assertEq(staking.totalStaked(), 40 ether);

        assertEq(token.balanceOf(alice), 60 ether);
        assertEq(token.balanceOf(address(staking)), 40 ether);

        assertEq(token.allowance(alice, address(staking)), 20 ether);
    }

    function test_Unstake() public {
        vm.startPrank(alice);
        token.approve(address(staking), 50 ether);
        staking.stake(50 ether);

        vm.expectEmit(address(staking));
        emit Unstaked(alice, 20 ether);

        staking.unstake(20 ether);
        vm.stopPrank();

        assertEq(staking.balances(alice), 30 ether);
        assertEq(staking.totalStaked(), 30 ether);

        assertEq(token.balanceOf(alice), 70 ether);
        assertEq(token.balanceOf(address(staking)), 30 ether);
    }

    function test_RevertWhen_StakeZero() public {
        vm.prank(alice);

        vm.expectRevert(SimpleStaking.ZeroAmount.selector);
        staking.stake(0);
    }

    function test_RevertWhen_StakeWithoutApprove() public {
        vm.prank(alice);

        vm.expectRevert();
        staking.stake(1 ether);
    }

    function test_RevertWhen_UnstakeMoreThanStaked() public {
        vm.startPrank(alice);
        token.approve(address(staking), 10 ether);
        staking.stake(10 ether);

        vm.expectRevert(abi.encodeWithSelector(SimpleStaking.InsufficientStake.selector, 10 ether, 11 ether));
        staking.unstake(11 ether);
        vm.stopPrank();
    }

    function test_BobCannotUnstakeAliceStake() public {
        vm.startPrank(alice);
        token.approve(address(staking), 10 ether);
        staking.stake(10 ether);
        vm.stopPrank();

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(SimpleStaking.InsufficientStake.selector, 0, 1 ether));
        staking.unstake(1 ether);
    }

    function test_MaxApprovalIsNotDecremented() public {
        vm.prank(alice);
        token.approve(address(staking), type(uint256).max);

        vm.prank(alice);
        staking.stake(10 ether);

        assertEq(token.allowance(alice, address(staking)), type(uint256).max);
    }
}
