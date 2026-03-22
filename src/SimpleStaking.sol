// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SimpleStaking is ReentrancyGuard {
    using SafeERC20 for IERC20;

    error ZeroAmount();
    error InsufficientStake(uint256 available, uint256 requested);

    IERC20 public immutable stakingToken;

    mapping(address => uint256) public balances;
    uint256 public totalStaked;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);

    constructor(IERC20 _stakingToken) {
        stakingToken = _stakingToken;
    }

    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        balances[msg.sender] += amount;
        totalStaked += amount;

        assert(stakingToken.balanceOf(address(this)) >= totalStaked);

        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        uint256 staked = balances[msg.sender];
        if (staked < amount) {
            revert InsufficientStake(staked, amount);
        }

        balances[msg.sender] = staked - amount;
        totalStaked -= amount;

        stakingToken.safeTransfer(msg.sender, amount);

        assert(stakingToken.balanceOf(address(this)) >= totalStaked);

        emit Unstaked(msg.sender, amount);
    }

    function stakedBalanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
}
