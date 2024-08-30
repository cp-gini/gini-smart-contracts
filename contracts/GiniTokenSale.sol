// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

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

    uint256 public maxCapPerUser;

    SalePhase public salePhase;

    IERC20 public purchaseToken;

    IERC20 public gini;

    uint256 totalSupply;

    mapping(address => uint256) purchaseAmount;

    // _______________ Errors _______________

    error InvalidPhaseParams(uint256 start, uint256 end);

    error PriceFeedEqZeroAddr(address priceFeed);

    error ZeroAddress();

    error InsufficientValue();

    error WithdrawingDuringSale();

    error CannotBuyZeroTokens();

    error OnlyWhileSalePhase();

    error PurchaseLimitReached(address user, uint256 maxCapPerUser, uint256 userPurchaseAmount);

    error NotAllowedDuringSale();

    // _______________ Events _______________

    event SalePhaseSet(uint256 start, uint256 end);

    event SetMaxCapPerUser(uint256 value);

    event SetGiniPrice(uint256 value);

    event Withdraw(address token, address recepient, uint256 value);

    event SetGiniToken(address gini);

    event Purchase(address user, uint256 amount);

    event SetTotalSupply(uint256 value);

    receive() external payable {}

    constructor(
        uint256 _giniPrice,
        uint256 _saleStart,
        uint256 _saleEnd,
        address _purchaseToken,
        uint256 _maxCapPerUser
    ) {
        _setGiniPrice(_giniPrice);
        _setSalePhase(_saleStart, _saleEnd);
        _setPurchaseToken(_purchaseToken);
        _setMaxCapPerUser(_maxCapPerUser);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function purchase(uint256 _value) external {
        if (_value == 0) revert CannotBuyZeroTokens();

        if (salePhase.start > block.timestamp || salePhase.end < block.timestamp) revert OnlyWhileSalePhase();

        address buyer = _msgSender();
        uint256 userPurchase = purchaseAmount[buyer];
        uint256 amountToReceive = _calcAmountToReceive(_value);

        if (userPurchase + amountToReceive > maxCapPerUser)
            revert PurchaseLimitReached(buyer, maxCapPerUser, userPurchase + amountToReceive);

        if (totalSupply < amountToReceive) revert InsufficientValue();

        purchaseAmount[buyer] += amountToReceive;
        totalSupply -= amountToReceive;

        emit Purchase(buyer, amountToReceive);

        purchaseToken.transferFrom(buyer, address(this), _value);
        gini.transfer(buyer, amountToReceive);
    }

    function withdrawRemainingTokens(address _token, address _recepient) external payable onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_recepient == address(0)) revert ZeroAddress();
        if (salePhase.start > block.timestamp && block.timestamp < salePhase.end) revert WithdrawingDuringSale();

        uint256 value;

        if (_token == address(0)) {
            value = address(this).balance;
            Address.sendValue(payable(_recepient), value);
        } else {
            value = IERC20(_token).balanceOf(address(this));
            IERC20(_token).transfer(_recepient, value);
        }

        emit Withdraw(_token, _recepient, value);
    }

    function setGiniToken(address _token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_token == address(0)) revert ZeroAddress();
        if (salePhase.start < block.timestamp || salePhase.end > block.timestamp) revert NotAllowedDuringSale();

        gini = IERC20(_token);

        emit SetGiniToken(_token);
    }

    function setTotalSupply(uint256 _value) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_value == 0) revert InsufficientValue();
        if (salePhase.start < block.timestamp || salePhase.end > block.timestamp) revert NotAllowedDuringSale();

        totalSupply = _value;

        emit SetTotalSupply(_value);
    }

    function getReceivedAmount(uint256 _purchaseAmount) external view returns (uint256) {
        return _calcAmountToReceive(_purchaseAmount);
    }

    function _setMaxCapPerUser(uint256 _value) internal {
        if (_value == 0) revert InsufficientValue();

        maxCapPerUser = _value;

        emit SetMaxCapPerUser(_value);
    }

    function _setSalePhase(uint256 _start, uint256 _end) internal {
        if (_start < block.timestamp || _start > _end) revert InvalidPhaseParams(_start, _end);

        salePhase.start = _start;
        salePhase.end = _end;

        emit SalePhaseSet(_start, _end);
    }

    function _setGiniPrice(uint256 _price) internal {
        if (_price == 0) revert InsufficientValue();

        tokenPrice = _price;

        emit SetGiniPrice(_price);
    }

    function _setPurchaseToken(address _token) internal {
        if (_token == address(0)) revert ZeroAddress();

        purchaseToken = IERC20(_token);
    }

    function _calcAmountToReceive(uint256 _value) internal pure returns (uint256) {}
}
