// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { BootcampToken } from "../src/BootcampToken.sol";
import { IAccessControl } from "@openzeppelin/contracts/access/IAccessControl.sol";

contract BootcampTokenTest is Test {
    BootcampToken internal token;

    address internal admin = address(0xA11CE);
    address internal alice = address(0xB0B);
    address internal bob = address(0xCAFE);

    uint256 internal constant INITIAL_SUPPLY = 1_000_000 ether;

    function setUp() public {
        token = new BootcampToken(admin, INITIAL_SUPPLY);
    }

    function test_InitialState() public {
        assertEq(token.name(), "Bootcamp Token");
        assertEq(token.symbol(), "BCT");
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
        assertEq(token.balanceOf(admin), INITIAL_SUPPLY);

        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(token.hasRole(token.MINTER_ROLE(), admin));
    }

    function test_AdminCanMint() public {
        vm.prank(admin);
        token.mint(alice, 100 ether);

        assertEq(token.balanceOf(alice), 100 ether);
        assertEq(token.totalSupply(), INITIAL_SUPPLY + 100 ether);
    }

    function test_NonMinterCannotMint() public {
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, alice, token.MINTER_ROLE())
        );
        vm.prank(alice);
        token.mint(alice, 100 ether);
    }

    function test_Transfer() public {
        vm.prank(admin);
        token.transfer(alice, 250 ether);

        assertEq(token.balanceOf(alice), 250 ether);
        assertEq(token.balanceOf(admin), INITIAL_SUPPLY - 250 ether);
    }

    function test_ApproveAndTransferFrom() public {
        vm.prank(admin);
        token.approve(alice, 300 ether);

        vm.prank(alice);
        token.transferFrom(admin, bob, 180 ether);

        assertEq(token.balanceOf(bob), 180 ether);
        assertEq(token.allowance(admin, alice), 120 ether);
    }

    function testFuzz_Transfer(uint256 amount) public {
        amount = bound(amount, 1, INITIAL_SUPPLY);

        vm.prank(admin);
        token.transfer(alice, amount);

        assertEq(token.balanceOf(alice), amount);
        assertEq(token.balanceOf(admin), INITIAL_SUPPLY - amount);
    }

    function test_HolderCanBurnOwnTokens() public {
        vm.prank(admin);
        token.transfer(alice, 200 ether);

        vm.prank(alice);
        token.burn(50 ether);

        assertEq(token.balanceOf(alice), 150 ether);
    }

    function test_PauseStopsTransfers() public {
        vm.prank(admin);
        token.pause();

        vm.prank(admin);
        vm.expectRevert();
        token.transfer(alice, 1 ether);
    }

    function test_UnpauseRestoresTransfers() public {
        vm.startPrank(admin);
        token.pause();
        token.unpause();
        token.transfer(alice, 1 ether);
        vm.stopPrank();

        assertEq(token.balanceOf(alice), 1 ether);
    }
}
