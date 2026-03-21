// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

contract BootcampToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    event Minted(address indexed operator, address indexed to, uint256 amount);
    event MinterGranted(address indexed account, address indexed admin);
    event MinterRevoked(address indexed account, address indexed admin);

    constructor(address admin) ERC20("Bootcamp Token", "BCT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
        emit Minted(msg.sender, to, amount);
    }

    function grantMinter(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MINTER_ROLE, account);
        emit MinterGranted(account, msg.sender);
    }

    function revokeMinter(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(MINTER_ROLE, account);
        emit MinterRevoked(account, msg.sender);
    }
}
