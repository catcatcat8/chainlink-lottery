//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract LotteryToken is ERC20, AccessControl {

    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");  // allow lottery contract to burn user's tokens when they are buying tickets
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    constructor() ERC20("LotteryToken", "LT") {
        _mint(msg.sender, 1_000_000);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(BURNER_ROLE, ADMIN_ROLE);
    }

    function grantBurnerRole(address _account) public onlyRole(ADMIN_ROLE) {
        grantRole(BURNER_ROLE, _account);
    }

    function burn(address _account, uint256 _amount) public onlyRole(BURNER_ROLE) {
        _burn(_account, _amount);
    }
}