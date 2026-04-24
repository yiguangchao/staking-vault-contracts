// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { BootcampToken } from "../src/BootcampToken.sol";
import { StakingVault } from "../src/StakingVault.sol";
import { IAccessControl } from "@openzeppelin/contracts/access/IAccessControl.sol";

contract StakingVaultTest is Test {
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 newRewardRate);
    event RewardPoolFunded(address indexed funder, uint256 amount);
    event RewardPoolWithdrawn(address indexed recipient, uint256 amount);

    BootcampToken internal stakeToken;
    BootcampToken internal rewardToken;
    StakingVault internal vault;

    address internal admin = address(0xA11CE);
    address internal alice = address(0xB0B);
    address internal bob = address(0xCAFE);

    uint256 internal constant INITIAL_USER_BALANCE = 1000 ether;
    uint256 internal constant REWARD_FUND = 10_000 ether;
    uint256 internal constant REWARD_RATE = 1 ether; // 1 reward token / second

    function setUp() public {
        stakeToken = new BootcampToken(admin, 0);
        rewardToken = new BootcampToken(admin, 0);

        vault = new StakingVault(admin, address(stakeToken), address(rewardToken));

        vm.startPrank(admin);
        stakeToken.mint(alice, INITIAL_USER_BALANCE);
        stakeToken.mint(bob, INITIAL_USER_BALANCE);

        rewardToken.mint(admin, REWARD_FUND);
        rewardToken.transfer(address(vault), REWARD_FUND);

        vm.warp(1000);
        vault.setRewardRate(REWARD_RATE);
        vm.stopPrank();

        vm.prank(alice);
        stakeToken.approve(address(vault), type(uint256).max);

        vm.prank(bob);
        stakeToken.approve(address(vault), type(uint256).max);
    }

    function test_InitialState() public {
        assertEq(address(vault.stakingToken()), address(stakeToken));
        assertEq(address(vault.rewardToken()), address(rewardToken));
        assertEq(vault.rewardRate(), REWARD_RATE);
        assertEq(vault.totalStaked(), 0);
        assertEq(vault.rewardPoolBalance(), REWARD_FUND);

        assertTrue(vault.hasRole(vault.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(vault.hasRole(vault.PAUSER_ROLE(), admin));
    }

    function test_ConstructorRevertsWhenTokenPairIsIdentical() public {
        vm.expectRevert(StakingVault.InvalidTokenPair.selector);
        new StakingVault(admin, address(stakeToken), address(stakeToken));
    }

    function test_AdminCanFundRewardPool() public {
        uint256 extraFunding = 250 ether;

        vm.startPrank(admin);
        rewardToken.mint(admin, extraFunding);
        rewardToken.approve(address(vault), extraFunding);
        vault.fundRewardPool(extraFunding);
        vm.stopPrank();

        assertEq(vault.rewardPoolBalance(), REWARD_FUND + extraFunding);
    }

    function test_FundRewardPoolEmitsEvent() public {
        uint256 extraFunding = 250 ether;

        vm.startPrank(admin);
        rewardToken.mint(admin, extraFunding);
        rewardToken.approve(address(vault), extraFunding);
        vm.expectEmit(true, false, false, true, address(vault));
        emit RewardPoolFunded(admin, extraFunding);
        vault.fundRewardPool(extraFunding);
        vm.stopPrank();
    }

    function test_NonAdminCannotFundRewardPool() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, alice, vault.DEFAULT_ADMIN_ROLE()
            )
        );
        vm.prank(alice);
        vault.fundRewardPool(1 ether);
    }

    function test_FundRewardPoolRevertsOnZeroAmount() public {
        vm.expectRevert(StakingVault.ZeroAmount.selector);
        vm.prank(admin);
        vault.fundRewardPool(0);
    }

    function test_AdminCanWithdrawRewardPool() public {
        uint256 withdrawalAmount = 125 ether;

        vm.prank(admin);
        vault.withdrawRewardPool(withdrawalAmount, admin);

        assertEq(vault.rewardPoolBalance(), REWARD_FUND - withdrawalAmount);
        assertEq(rewardToken.balanceOf(admin), withdrawalAmount);
    }

    function test_WithdrawRewardPoolEmitsEvent() public {
        uint256 withdrawalAmount = 125 ether;

        vm.expectEmit(true, false, false, true, address(vault));
        emit RewardPoolWithdrawn(admin, withdrawalAmount);
        vm.prank(admin);
        vault.withdrawRewardPool(withdrawalAmount, admin);
    }

    function test_WithdrawRewardPoolRevertsWhenAmountExceedsBalance() public {
        vm.expectRevert(
            abi.encodeWithSelector(StakingVault.InsufficientRewardPool.selector, REWARD_FUND, REWARD_FUND + 1)
        );
        vm.prank(admin);
        vault.withdrawRewardPool(REWARD_FUND + 1, admin);
    }

    function test_WithdrawRewardPoolRevertsOnZeroAmount() public {
        vm.expectRevert(StakingVault.ZeroAmount.selector);
        vm.prank(admin);
        vault.withdrawRewardPool(0, admin);
    }

    function test_WithdrawRewardPoolRevertsOnZeroRecipient() public {
        vm.expectRevert(StakingVault.ZeroAddress.selector);
        vm.prank(admin);
        vault.withdrawRewardPool(1 ether, address(0));
    }

    function test_Stake() public {
        vm.prank(alice);
        vault.stake(100 ether);

        assertEq(vault.balanceOf(alice), 100 ether);
        assertEq(vault.totalStaked(), 100 ether);
        assertEq(stakeToken.balanceOf(address(vault)), 100 ether);
        assertEq(stakeToken.balanceOf(alice), INITIAL_USER_BALANCE - 100 ether);
    }

    function test_StakeEmitsEvent() public {
        vm.expectEmit(true, false, false, true, address(vault));
        emit Staked(alice, 100 ether);

        vm.prank(alice);
        vault.stake(100 ether);
    }

    function test_StakeRevertsOnZeroAmount() public {
        vm.expectRevert(StakingVault.ZeroAmount.selector);
        vm.prank(alice);
        vault.stake(0);
    }

    function test_Withdraw() public {
        vm.prank(alice);
        vault.stake(100 ether);

        vm.prank(alice);
        vault.withdraw(40 ether);

        assertEq(vault.balanceOf(alice), 60 ether);
        assertEq(vault.totalStaked(), 60 ether);
        assertEq(stakeToken.balanceOf(alice), INITIAL_USER_BALANCE - 60 ether);
    }

    function test_WithdrawEmitsEvent() public {
        vm.prank(alice);
        vault.stake(100 ether);

        vm.expectEmit(true, false, false, true, address(vault));
        emit Withdrawn(alice, 40 ether);

        vm.prank(alice);
        vault.withdraw(40 ether);
    }

    function test_WithdrawRevertsOnZeroAmount() public {
        vm.expectRevert(StakingVault.ZeroAmount.selector);
        vm.prank(alice);
        vault.withdraw(0);
    }

    function test_EarnedAfter10Seconds() public {
        vm.prank(alice);
        vault.stake(100 ether);

        vm.warp(block.timestamp + 10);

        assertEq(vault.earned(alice), 10 ether);
    }

    function test_ClaimRewards() public {
        vm.prank(alice);
        vault.stake(100 ether);

        vm.warp(block.timestamp + 10);

        vm.prank(alice);
        vault.claimRewards();

        assertEq(rewardToken.balanceOf(alice), 10 ether);
        assertEq(vault.rewards(alice), 0);
    }

    function test_ClaimRewardsEmitsEvent() public {
        vm.prank(alice);
        vault.stake(100 ether);

        vm.warp(block.timestamp + 10);

        vm.expectEmit(true, false, false, true, address(vault));
        emit RewardPaid(alice, 10 ether);

        vm.prank(alice);
        vault.claimRewards();
    }

    function test_ClaimRewardsRevertsWhenNoRewardsAvailable() public {
        vm.expectRevert(StakingVault.NoRewards.selector);
        vm.prank(alice);
        vault.claimRewards();
    }

    function test_PauseStopsClaimRewards() public {
        vm.prank(alice);
        vault.stake(100 ether);

        vm.warp(block.timestamp + 10);

        vm.prank(admin);
        vault.pause();

        vm.prank(alice);
        vm.expectRevert();
        vault.claimRewards();
    }

    function test_ClaimRewardsRevertsWhenRewardPoolIsInsufficient() public {
        vm.prank(address(vault));
        rewardToken.transfer(address(0xdead), REWARD_FUND - 5 ether);

        vm.prank(alice);
        vault.stake(100 ether);

        vm.warp(block.timestamp + 10);

        vm.expectRevert(abi.encodeWithSelector(StakingVault.InsufficientRewardPool.selector, 5 ether, 10 ether));
        vm.prank(alice);
        vault.claimRewards();
    }

    function test_RewardSplitBetweenTwoStakers() public {
        vm.prank(alice);
        vault.stake(100 ether);

        vm.warp(block.timestamp + 10);

        vm.prank(bob);
        vault.stake(100 ether);

        vm.warp(block.timestamp + 10);

        assertEq(vault.earned(alice), 15 ether);
        assertEq(vault.earned(bob), 5 ether);
    }

    function test_SetRewardRatePreservesPreviouslyAccruedRewards() public {
        vm.prank(alice);
        vault.stake(100 ether);

        vm.warp(block.timestamp + 10);

        vm.prank(admin);
        vault.setRewardRate(2 ether);

        vm.warp(block.timestamp + 10);

        assertEq(vault.earned(alice), 30 ether);
    }

    function test_ClaimRewardsResetsOnlyPaidPortionAndFutureRewardsKeepAccruing() public {
        vm.prank(alice);
        vault.stake(100 ether);

        vm.warp(block.timestamp + 10);

        vm.prank(alice);
        vault.claimRewards();

        vm.warp(block.timestamp + 5);

        assertEq(rewardToken.balanceOf(alice), 10 ether);
        assertEq(vault.earned(alice), 5 ether);
    }

    function test_AdminCanSetRewardRate() public {
        vm.prank(admin);
        vault.setRewardRate(2 ether);

        assertEq(vault.rewardRate(), 2 ether);
    }

    function test_SetRewardRateEmitsEvent() public {
        vm.expectEmit(false, false, false, true, address(vault));
        emit RewardRateUpdated(2 ether);

        vm.prank(admin);
        vault.setRewardRate(2 ether);
    }

    function test_NonAdminCannotSetRewardRate() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, alice, vault.DEFAULT_ADMIN_ROLE()
            )
        );
        vm.prank(alice);
        vault.setRewardRate(123);
    }

    function test_PauseStopsStake() public {
        vm.prank(admin);
        vault.pause();

        vm.prank(alice);
        vm.expectRevert();
        vault.stake(1 ether);
    }

    function test_PausedUsersCanStillWithdraw() public {
        vm.prank(alice);
        vault.stake(100 ether);

        vm.prank(admin);
        vault.pause();

        vm.prank(alice);
        vault.withdraw(40 ether);

        assertEq(vault.balanceOf(alice), 60 ether);
        assertEq(stakeToken.balanceOf(alice), INITIAL_USER_BALANCE - 60 ether);
    }

    function test_WithdrawRevertsWhenAmountExceedsStakedBalance() public {
        vm.prank(alice);
        vault.stake(100 ether);

        vm.expectRevert(StakingVault.InsufficientBalance.selector);
        vm.prank(alice);
        vault.withdraw(101 ether);
    }

    function testFuzz_Stake(uint256 amount) public {
        amount = bound(amount, 1, INITIAL_USER_BALANCE);

        vm.prank(alice);
        vault.stake(amount);

        assertEq(vault.balanceOf(alice), amount);
        assertEq(vault.totalStaked(), amount);
    }
}
