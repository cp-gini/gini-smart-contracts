// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract GiniTokenSale is AccessControl {
    // _______________ Libraries _______________

    /*
     * Adding the methods from the OpenZeppelin's library which wraps around ERC20 operations that
     * throw on failure to implement their safety.
     */
    using SafeERC20 for ERC20;

    // _______________ Structs _______________

    /**
     * @notice Stores the start and end timestamps of the sale.
     *
     * It provides the value:
     * - start: the start timestamp of the sale
     * - end: the end timestamp of the sale
     */
    struct SalePhase {
        uint256 start;
        uint256 end;
    }

    // _______________ Storage _______________

    /// @notice Stores the start and end timestamps of the sale.
    SalePhase public salePhase;

    /// @notice Stores the price of the Gini token.
    uint256 public giniPrice;

    /// @notice Stores the maximum amount of Gini tokens that can be purchased per user.
    // uint256 public maxCapPerUser;

    /// @notice Stores the amount of token decimals of the purchase token.
    uint256 public purchaseTokenDecimals;

    /// @notice Stores the total remaining amount of Gini tokens that can be purchased.
    uint256 public totalSupply;

    /// @notice Stores the purchase token.
    ERC20 public purchaseToken;

    /// @notice Stores the Gini token.
    ERC20 public gini;

    /// @notice Stores the amount of Gini tokens purchased by each user.
    /// address of the user => amount of purchased Gini tokens
    mapping(address => uint256) public purchaseAmount;

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

    error TotalSupplyReached();

    error OnlyUser();

    // _______________ Events _______________

    event SalePhaseSet(uint256 start, uint256 end);

    // event SetMaxCapPerUser(uint256 value);

    event SetGiniPrice(uint256 value);

    event Withdraw(address token, address recepient, uint256 value);

    event SetGiniToken(address gini);

    event Purchase(address user, uint256 amount);

    event SetTotalSupply(uint256 value);

    event SetPurchaseToken(address token);

    // _______________ Modifiers _______________

    // modifier callerIsUser() {
    //     if (tx.origin != _msgSender()) revert OnlyUser();
    //     _;
    // }

    // _______________ Constructor _______________

    /**
     * @notice Initializes the contract with the given parameters.
     *
     * @param _giniPrice - the price of the Gini token
     * @param _saleStart - the start timestamp of the sale
     * @param _saleEnd - the end timestamp of the sale
     * @param _purchaseToken - the address of the purchase token
     * @param _totalSupply - the total remaining amount of Gini tokens that can be purchased
     */
    constructor(
        uint256 _giniPrice,
        uint256 _saleStart,
        uint256 _saleEnd,
        address _purchaseToken,
        uint256 _totalSupply
    ) {
        _setGiniPrice(_giniPrice);
        _setSalePhase(_saleStart, _saleEnd);
        _setPurchaseToken(_purchaseToken);
        _setTotalSupply(_totalSupply);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // _______________ External Functions _______________

    /**
     * @notice Allows the user to purchase Gini tokens.
     *
     * @param _value - the amount of stablecoins to send to the contract
     */
    function purchase(uint256 _value) external {
        if (_value == 0) revert CannotBuyZeroTokens();

        if (salePhase.start > block.timestamp || salePhase.end < block.timestamp) revert OnlyWhileSalePhase();

        address buyer = _msgSender();
        uint256 amountToReceive = _calcAmountToReceive(_value);

        if (totalSupply < amountToReceive) revert TotalSupplyReached();

        purchaseAmount[buyer] += amountToReceive;
        totalSupply -= amountToReceive;

        emit Purchase(buyer, amountToReceive);

        purchaseToken.safeTransferFrom(buyer, address(this), _value);
        gini.safeTransfer(buyer, amountToReceive);
    }

    /**
     * @notice Allows admin to withdraw the remaining ERC20 or native token.
     *
     * @param _token - the address of the token
     *               if token is zero address, it will withdraw native token
     *               else it will withdraw the given token
     * @param _recipient - the address of the recipient
     */
    function withdrawRemainingTokens(address _token, address _recipient) external payable onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_recipient == address(0)) revert ZeroAddress();
        if (salePhase.start < block.timestamp && block.timestamp < salePhase.end) revert WithdrawingDuringSale();

        uint256 value;

        if (_token == address(0)) {
            value = address(this).balance;
            Address.sendValue(payable(_recipient), value);
        } else {
            value = ERC20(_token).balanceOf(address(this));
            ERC20(_token).safeTransfer(_recipient, value);
        }

        emit Withdraw(_token, _recipient, value);
    }

    /// @notice Allows the contract to receive ETH
    receive() external payable {}

    /**
     * @notice Allows admin to set the address of the Gini token.
     *
     * @param _token - the address of the Gini token
     */
    function setGiniToken(address _token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_token == address(0)) revert ZeroAddress();
        if (salePhase.start < block.timestamp && salePhase.end > block.timestamp) revert NotAllowedDuringSale();

        gini = ERC20(_token);

        emit SetGiniToken(_token);
    }

    /**
     *
     * @param _purchaseAmount - calculate the amount to receive of Gini tokens
     */
    function getReceivedAmount(uint256 _purchaseAmount) external view returns (uint256) {
        return _calcAmountToReceive(_purchaseAmount);
    }

    /**
     *
     * @return the start and end time of the sale
     */
    function getSaleTime() external view returns (uint256, uint256) {
        return (salePhase.start, salePhase.end);
    }

    // _______________ Internal Functions _______________

    function _setTotalSupply(uint256 _value) internal {
        if (_value == 0) revert InsufficientValue();

        totalSupply = _value;

        emit SetTotalSupply(_value);
    }

    function _setSalePhase(uint256 _start, uint256 _end) internal {
        if (_start < block.timestamp || _start > _end) revert InvalidPhaseParams(_start, _end);

        salePhase.start = _start;
        salePhase.end = _end;

        emit SalePhaseSet(_start, _end);
    }

    function _setGiniPrice(uint256 _price) internal {
        if (_price == 0) revert InsufficientValue();

        giniPrice = _price;

        emit SetGiniPrice(_price);
    }

    function _setPurchaseToken(address _token) internal {
        if (_token == address(0)) revert ZeroAddress();

        purchaseToken = ERC20(_token);
        purchaseTokenDecimals = ERC20(_token).decimals();

        emit SetPurchaseToken(_token);
    }

    function _calcAmountToReceive(uint256 _value) internal view returns (uint256) {
        return (giniPrice * _value) / 10 ** purchaseTokenDecimals;
    }
}
