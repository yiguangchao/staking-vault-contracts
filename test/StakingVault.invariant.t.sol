// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { StdInvariant } from "forge-std/StdInvariant.sol";
import { Test } from "forge-std/Test.sol";

import { BootcampToken } from "../src/BootcampToken.sol";
import { StakingVault } from "../src/StakingVault.sol";

contract StakingVaultHandler is Test {
    BootcampToken internal immutable stakeToken;
    BootcampToken internal immutable rewardToken;
    StakingVault internal immutable vault;

    address internal immutable admin;
    address[] internal actors;

    uint256 internal constant INITIAL_USER_BALANCE = 1_000 ether;
    uint256 internal constant REWARD_FUND = 10_000 ether;

    constructor(
        BootcampToken _stakeToken,
        BootcampToken _rewardToken,
        StakingVault _vault,
        address _admin,
        address[] memory _actors
    ) {
        stakeToken = _stakeToken;
        rewardToken = _rewardToken;
        vault = _vault;
        admin = _admin;
        actors = _actors;
    }

    function actorCount() external view returns (uint256) {
        return actors.length;
    }

    function actorAt(uint256 index) external view returns (address) {
        return actors[index];
    }

    function stake(uint256 actorSeed, uint256 amountSeed) external {
        address actor = _actor(actorSeed);
        uint256 walletBalance = stakeToken.balanceOf(actor);
        if (walletBalance == 0 || vault.paused()) return;

        uint256 amount = bound(amountSeed, 1, walletBalance);

        vm.startPrank(actor);
        try vault.stake(amount) { } catch { }
        vm.stopPrank();
    }

    function withdraw(uint256 actorSeed, uint256 amountSeed) external {
        address actor = _actor(actorSeed);
        uint256 stakedBalance = vault.balanceOf(actor);
        if (stakedBalance == 0) return;

        uint256 amount = bound(amountSeed, 1, stakedBalance);

        vm.prank(actor);
        try vault.withdraw(amount) { } catch { }
    }

    function claimRewards(uint256 actorSeed) external {
        address actor = _actor(actorSeed);
        if (vault.paused()) return;
        if (vault.earned(actor) == 0) return;

        vm.prank(actor);
        try vault.claimRewards() { } catch { }
    }

    function setRewardRate(uint256 newRateSeed) external {
        uint256 newRate = bound(newRateSeed, 0, 5 ether);

        vm.prank(admin);
        try vault.setRewardRate(newRate) { } catch { }
    }

    function pause() external {
        vm.prank(admin);
        try vault.pause() { } catch { }
    }

    function unpause() external {
        vm.prank(admin);
        try vault.unpause() { } catch { }
    }

    function warp(uint256 timeSeed) external {
        uint256 delta = bound(timeSeed, 1, 30 days);
        vm.warp(block.timestamp + delta);
    }

    function rewardPoolTopUp(uint256 amountSeed) external {
        uint256 adminBalance = rewardToken.balanceOf(admin);
        if (adminBalance == 0) return;

        uint256 amount = bound(amountSeed, 1, adminBalance);

        vm.startPrank(admin);
        rewardToken.approve(address(vault), amount);
        try vault.fundRewardPool(amount) { } catch { }
        vm.stopPrank();
    }

    function rewardPoolWithdraw(uint256 amountSeed) external {
        uint256 poolBalance = vault.rewardPoolBalance();
        if (poolBalance == 0) return;

        uint256 amount = bound(amountSeed, 1, poolBalance);

        vm.prank(admin);
        try vault.withdrawRewardPool(amount, admin) { } catch { }
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[bound(seed, 0, actors.length - 1)];
    }
}

contract StakingVaultInvariantTest is StdInvariant, Test {
    BootcampToken internal stakeToken;
    BootcampToken internal rewardToken;
    StakingVault internal vault;
    StakingVaultHandler internal handler;

    address internal admin = address(0xA11CE);
    address internal alice = address(0xB0B);
    address internal bob = address(0xCAFE);
    address internal carol = address(0xD00D);

    uint256 internal constant INITIAL_USER_BALANCE = 1_000 ether;
    uint256 internal constant REWARD_FUND = 10_000 ether;
    uint256 internal constant REWARD_RATE = 1 ether;

    function setUp() public {
        stakeToken = new BootcampToken(admin, 0);
        rewardToken = new BootcampToken(admin, 0);
        vault = new StakingVault(admin, address(stakeToken), address(rewardToken));

        address[] memory actors = new address[](3);
        actors[0] = alice;
        actors[1] = bob;
        actors[2] = carol;

        vm.startPrank(admin);
        stakeToken.mint(alice, INITIAL_USER_BALANCE);
        stakeToken.mint(bob, INITIAL_USER_BALANCE);
        stakeToken.mint(carol, INITIAL_USER_BALANCE);

        rewardToken.mint(admin, REWARD_FUND * 2);
        rewardToken.approve(address(vault), REWARD_FUND);
        vault.fundRewardPool(REWARD_FUND);
        vault.setRewardRate(REWARD_RATE);
        vm.stopPrank();

        for (uint256 i = 0; i < actors.length; i++) {
            vm.prank(actors[i]);
            stakeToken.approve(address(vault), type(uint256).max);
        }

        handler = new StakingVaultHandler(stakeToken, rewardToken, vault, admin, actors);
        targetContract(address(handler));
    }

    function invariant_TotalStakedMatchesTrackedBalances() public view {
        uint256 actorLength = handler.actorCount();
        uint256 totalTracked;

        for (uint256 i = 0; i < actorLength; i++) {
            totalTracked += vault.balanceOf(handler.actorAt(i));
        }

        assertEq(vault.totalStaked(), totalTracked, "vault totalStaked must equal the sum of user balances");
    }

    function invariant_VaultStakeTokenBalanceCoversTotalStaked() public view {
        assertGe(
            stakeToken.balanceOf(address(vault)),
            vault.totalStaked(),
            "vault stake token balance must always cover totalStaked"
        );
    }
}
