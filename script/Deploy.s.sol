// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address admin = deployer;

        vm.startBroadcast(deployerPrivateKey);

        stakeToken = new BootcampToken(admin, INITIAL_STAKE_SUPPLY);
        rewardToken = new BootcampToken(admin, INITIAL_REWARD_SUPPLY);

        vault = new StakingVault(admin, address(stakeToken), address(rewardToken));

        // 给 vault 注入奖励池
        rewardToken.transfer(address(vault), REWARD_POOL_AMOUNT);

        // 设置奖励速率
        vault.setRewardRate(REWARD_RATE);

        vm.stopBroadcast();

        console2.log("Deployer/Admin:", admin);
        console2.log("StakeToken:", address(stakeToken));
        console2.log("RewardToken:", address(rewardToken));
        console2.log("Vault:", address(vault));
        console2.log("Reward pool funded:", REWARD_POOL_AMOUNT);
        console2.log("Reward rate:", REWARD_RATE);

        require(rewardToken.balanceOf(address(vault)) == REWARD_POOL_AMOUNT, "reward pool funding failed");
        require(vault.rewardRate() == REWARD_RATE, "reward rate not set");
    }
}

