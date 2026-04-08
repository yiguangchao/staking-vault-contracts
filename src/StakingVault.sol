// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract StakingVault is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 public constant PRECISION = 1e18;

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;

    uint256 public totalStaked;
    uint256 public rewardRate; // reward token wei per second

    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance();
    error NoRewards();
    error InsufficientRewardPool(uint256 available, uint256 required);

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 newRewardRate);
    event RewardPoolFunded(address indexed funder, uint256 amount);
    event RewardPoolWithdrawn(address indexed recipient, uint256 amount);

    constructor(address admin, address _stakingToken, address _rewardToken) {
        if (admin == address(0) || _stakingToken == address(0) || _rewardToken == address(0)) {
            revert ZeroAddress();
        }

        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;

        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }

        _;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }

        return rewardPerTokenStored + ((block.timestamp - lastUpdateTime) * rewardRate * PRECISION) / totalStaked;
    }

    function earned(address account) public view returns (uint256) {
        uint256 rpt = rewardPerToken();
        return rewards[account] + (balanceOf[account] * (rpt - userRewardPerTokenPaid[account])) / PRECISION;
    }

    function rewardPoolBalance() public view returns (uint256) {
        return rewardToken.balanceOf(address(this));
    }

    function fundRewardPool(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (amount == 0) revert ZeroAmount();

        rewardToken.safeTransferFrom(msg.sender, address(this), amount);

        emit RewardPoolFunded(msg.sender, amount);
    }

    function withdrawRewardPool(uint256 amount, address to) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 availableRewards = rewardPoolBalance();
        if (availableRewards < amount) revert InsufficientRewardPool(availableRewards, amount);

        rewardToken.safeTransfer(to, amount);

        emit RewardPoolWithdrawn(to, amount);
    }

    function stake(uint256 amount) external nonReentrant whenNotPaused updateReward(msg.sender) {
        if (amount == 0) revert ZeroAmount();

        totalStaked += amount;
        balanceOf[msg.sender] += amount;

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant updateReward(msg.sender) {
        if (amount == 0) revert ZeroAmount();
        if (amount > balanceOf[msg.sender]) revert InsufficientBalance();

        totalStaked -= amount;
        balanceOf[msg.sender] -= amount;

        stakingToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    function claimRewards() external nonReentrant whenNotPaused updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward == 0) revert NoRewards();
        uint256 availableRewards = rewardPoolBalance();
        if (availableRewards < reward) revert InsufficientRewardPool(availableRewards, reward);

        rewards[msg.sender] = 0;
        rewardToken.safeTransfer(msg.sender, reward);

        emit RewardPaid(msg.sender, reward);
    }

    function setRewardRate(uint256 newRewardRate) external onlyRole(DEFAULT_ADMIN_ROLE) updateReward(address(0)) {
        rewardRate = newRewardRate;
        emit RewardRateUpdated(newRewardRate);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
