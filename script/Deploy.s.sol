// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Deploys the staking system and funds the reward pool through the
/// vault entrypoint so deployment matches the operational flow used in the app.

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import { BootcampToken } from "../src/BootcampToken.sol";
import { StakingVault } from "../src/StakingVault.sol";

contract DeployScript is Script {
    uint256 internal constant INITIAL_STAKE_SUPPLY = 1_000_000 ether;
    uint256 internal constant INITIAL_REWARD_SUPPLY = 1_000_000 ether;
    uint256 internal constant REWARD_POOL_AMOUNT = 500_000 ether;
    uint256 internal constant REWARD_RATE = 1 ether;

    function run() external returns (BootcampToken stakeToken, BootcampToken rewardToken, StakingVault vault) {
        require(REWARD_POOL_AMOUNT <= INITIAL_REWARD_SUPPLY, "reward pool exceeds initial reward supply");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address admin = deployer;

        vm.startBroadcast(deployerPrivateKey);

        stakeToken = new BootcampToken(admin, INITIAL_STAKE_SUPPLY);
        rewardToken = new BootcampToken(admin, INITIAL_REWARD_SUPPLY);

        vault = new StakingVault(admin, address(stakeToken), address(rewardToken));

        // Approve and fund the reward pool through the vault's admin function.
        rewardToken.approve(address(vault), REWARD_POOL_AMOUNT);
        vault.fundRewardPool(REWARD_POOL_AMOUNT);

        // Configure the initial reward rate.
        vault.setRewardRate(REWARD_RATE);

        vm.stopBroadcast();

        console2.log("Deployer/Admin:", admin);
        console2.log("StakeToken:", address(stakeToken));
        console2.log("RewardToken:", address(rewardToken));
        console2.log("Vault:", address(vault));
        console2.log("Reward pool funded:", REWARD_POOL_AMOUNT);
        console2.log("Reward rate:", REWARD_RATE);
        console2.log("Reward pool balance:", rewardToken.balanceOf(address(vault)));

        require(address(stakeToken) != address(rewardToken), "stake/reward token addresses must differ");
        require(rewardToken.balanceOf(address(vault)) == REWARD_POOL_AMOUNT, "reward pool funding failed");
        require(vault.rewardPoolBalance() == REWARD_POOL_AMOUNT, "reward pool view mismatch");
        require(stakeToken.balanceOf(admin) == INITIAL_STAKE_SUPPLY, "stake token admin balance mismatch");
        require(
            rewardToken.balanceOf(admin) == INITIAL_REWARD_SUPPLY - REWARD_POOL_AMOUNT,
            "reward token admin balance mismatch"
        );
        require(vault.rewardRate() == REWARD_RATE, "reward rate not set");
    }
}


