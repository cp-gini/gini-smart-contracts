// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGiniTokenSale {
    function purchase(uint256 _value) external;
}

contract MockOriginSender {
    function attack(uint256 _value, IERC20 _token, address _tokenSaleContract) external {
        _token.transferFrom(msg.sender, address(this), _value);

        _token.approve(_tokenSaleContract, _value);

        IGiniTokenSale(_tokenSaleContract).purchase(_value);
    }
}
