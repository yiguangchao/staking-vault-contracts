// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SimpleBank {
    mapping(address => uint256) private balances;
    uint256 public totalTrackedBalance;

    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed user, uint256 amount, uint256 newBalance);

    error ZeroAmount();
    error InsufficientBalance(uint256 requested, uint256 available);

    receive() external payable {
        _deposit(msg.sender, msg.value);
    }

    function deposit() external payable {
        _deposit(msg.sender, msg.value);
    }

    function withdraw(
        uint256 amount
    ) external {
        if (amount == 0) revert ZeroAmount();

        uint256 userBalance = balances[msg.sender];
        if (amount > userBalance) {
            revert InsufficientBalance(amount, userBalance);
        }

        balances[msg.sender] = userBalance - amount;
        totalTrackedBalance -= amount;

        (bool ok,) = payable(msg.sender).call{ value: amount }("");
        require(ok, "ETH_TRANSFER_FAILED");

        emit Withdrawn(msg.sender, amount, balances[msg.sender]);

        assert(totalTrackedBalance == address(this).balance);
    }

    function balanceOf(
        address user
    ) external view returns (uint256) {
        return balances[user];
    }

    function bankBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function _deposit(
        address user,
        uint256 amount
    ) internal {
        if (amount == 0) revert ZeroAmount();

        balances[user] += amount;
        totalTrackedBalance += amount;

        emit Deposited(user, amount, balances[user]);

        assert(totalTrackedBalance == address(this).balance);
    }
}
