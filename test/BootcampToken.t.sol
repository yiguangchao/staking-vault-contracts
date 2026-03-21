// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { IAccessControl } from "@openzeppelin/contracts/access/IAccessControl.sol";
import { BootcampToken } from "../src/BootcampToken.sol";

contract BootcampTokenTest is Test {
    BootcampToken internal token;

    address internal admin = makeAddr("admin");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Minted(address indexed operator, address indexed to, uint256 amount);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event MinterGranted(address indexed account, address indexed admin);

    function setUp() public {
        token = new BootcampToken(admin);
    }

    function test_Metadata() public {
        assertEq(token.name(), "Bootcamp Token");
        assertEq(token.symbol(), "BCT");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 0);
    }

    function test_AdminHasInitialRoles() public {
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(token.hasRole(token.MINTER_ROLE(), admin));
    }

    function test_AdminCanMint_AndEmitEvents() public {
        vm.startPrank(admin);

        vm.expectEmit(address(token));
        emit Transfer(address(0), alice, 100 ether);

        vm.expectEmit(address(token));
        emit Minted(admin, alice, 100 ether);

        token.mint(alice, 100 ether);

        vm.stopPrank();

        assertEq(token.balanceOf(alice), 100 ether);
        assertEq(token.totalSupply(), 100 ether);
    }

    function test_AdminCanGrantMinter_AndEmitEvents() public {
        vm.startPrank(admin);

        vm.expectEmit(address(token));
        emit RoleGranted(token.MINTER_ROLE(), alice, admin);

        vm.expectEmit(address(token));
        emit MinterGranted(alice, admin);

        token.grantMinter(alice);

        vm.stopPrank();

        assertTrue(token.hasRole(token.MINTER_ROLE(), alice));
    }

    function test_GrantedMinterCanMint() public {
        vm.prank(admin);
        token.grantMinter(alice);

        vm.prank(alice);
        token.mint(bob, 25 ether);

        assertEq(token.balanceOf(bob), 25 ether);
        assertEq(token.totalSupply(), 25 ether);
    }

    function test_RevertWhen_NonMinterCallsMint() public {
        vm.prank(alice);

        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, alice, token.MINTER_ROLE())
        );

        token.mint(bob, 1 ether);
    }

    function test_RevertWhen_NonAdminGrantsMinter() public {
        vm.prank(alice);

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, alice, token.DEFAULT_ADMIN_ROLE()
            )
        );

        token.grantMinter(bob);
    }
}
