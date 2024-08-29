// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract GiniTokenSale is AccessControl {
    // _______________ Structs _______________

    struct SalePhase {
        uint256 start;
        uint256 end;
    }

    // _______________ Constants _______________

    uint256 public constant USD_PRICE_DECIMALS = 1E8;

    // _______________ Storage _______________
    uint256 public tokenPrice;

    SalePhase public salePhase;

    // _______________ Errors _______________

    error InvalidPhaseParams(uint256 start, uint256 end);

    error PriceFeedEqZeroAddr(address priceFeed);

    // _______________ Events _______________

    event SalePhaseSet(uint256 start, uint256 end);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function purchaseGini() external {}

    function withdrawRemainingTokens() external onlyRole(DEFAULT_ADMIN_ROLE) {}

    function setSalePhase(uint256 _start, uint256 _end) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_start < block.timestamp || _start > _end) revert InvalidPhaseParams(_start, _end);

        salePhase{start: _start, end: _end};

        emit SalePhaseSet(_start, _end);
    }

    function setGiniPrice(uint256 _price) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenPrice = _price;
    }

    // prettier-ignore
    function setPriceFeed(
        address _token,
        address _priceFeed,
        int256 _lowerPriceLimit
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_priceFeed == address(0))
            revert PriceFeedEqZeroAddr(_priceFeed);
        AggregatorV3Interface priceFeed = AggregatorV3Interface(_priceFeed);
        if (10 ** priceFeed.decimals() != USD_PRICE_DECIMALS)
            revert OnlyUSDPriceFeed(_priceFeed);

        if (_token != address(0)) {
            uint256 decimals = 10 ** uint256(IERC20MetadataUpgradeable(_token).decimals());
            if (decimals > RDGX_TOKEN_DECIMALS || decimals == 1)
                revert TooManyOrZeroDecimals(_token, decimals);

            tokenDecimals[_token] = decimals;
        }

        validateNSetLowerPriceLimit(_token, priceFeed, _lowerPriceLimit);

        priceFeeds[_token] = _priceFeed;
        emit PriceFeedSet(_token, _priceFeed, _lowerPriceLimit);
    }
}
