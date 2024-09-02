// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDC is ERC20 {
    constructor(uint256 _totalSupply) ERC20("USDC", "USDC") {
        _mint(msg.sender, _totalSupply);
    }

    function mint(uint256 _amount) external {
        _mint(msg.sender, _amount);
    }

    function mintFor(address _recepient, uint256 _amount) external {
        _mint(_recepient, _amount);
    }
}
