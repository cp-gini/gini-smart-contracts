// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract GiniTokenSale is Initializable, AccessControlUpgradeable {
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

    /**
     * @notice Stores the price of the Gini token.
     *
     * @dev Price must be set with 18 decimals.
     * @dev The amount of Gini tokens that can be purchased with 1 purchase token.
     *
     * @dev Example: price = 0.5 + 18 decimals => For 1 USDT you will receive 0.5 Gini tokens.
     * @dev If price = 2 + 18 decimals => For 1 USDT you will receive 2 Gini tokens.
     */
    uint256 public giniPricePerUsdt;

    /// @notice Stores the amount of token decimals of the purchase token.
    uint256 public purchaseTokenDecimals;

    /// @notice Stores the total remaining amount of Gini tokens that can be purchased.
    uint256 public totalSupply;

    /// @notice Stores the total raised amount of the purchase token.
    uint256 public totalRaised;

    /// @notice Stores the purchase token.
    ERC20 public purchaseToken;

    /// @notice Stores the Gini token.
    ERC20 public gini;

    /// @notice Stores the amount of Gini tokens purchased by each user.
    /// address of the user => amount of purchased Gini tokens
    mapping(address => uint256) public purchaseAmount;

    // _______________ Errors _______________

    /// @dev Revert if invalid phase params are passed.
    error InvalidPhaseParams(uint256 start, uint256 end);

    /// @dev Revert if zero address is passed.
    error ZeroAddress();

    /// @dev Revert if insufficient value is passed.
    error InsufficientValue();

    /// @dev Revert if withdrawing during sale.
    error WithdrawingDuringSale();

    /// @dev Revert if cannot buy zero tokens.
    error CannotBuyZeroTokens();

    /// @dev Revert if purchase is not during sale time.
    error OnlyWhileSalePhase();

    /// @dev Revert if not allowed during sale.
    error NotAllowedDuringSale();

    /// @dev Revert if total supply is reached.
    error TotalSupplyReached();

    /// @dev Revert if purchase token is not set.
    error TokenNotSet();

    /// @dev Revert if GINI token is already set.
    error TokenAlreadySet();

    /// @dev Revert when rescuing GINI tokens.
    error NotAllowedToken(address token);

    /// @dev Revert when sale has already ended.
    error SaleAlreadyEnded();

    // _______________ Events _______________

    /**
     * @dev Emitted when the sale phase is set.
     *
     * @param start - the start timestamp of the sale
     * @param end - the end timestamp of the sale
     */
    event SalePhaseSet(uint256 start, uint256 end);

    /**
     * @dev Emitted when the Gini price is set.
     *
     * @param value - the price of the Gini token
     */
    event SetGiniPrice(uint256 value);

    /**
     * @dev Emitted when the purchase token is set.
     *
     * @param token - the address of the purchase token
     */
    event SetPurchaseToken(address token);

    /**
     * @dev Emitted when withdrawing ERC20 tokens or native token.
     *
     * @param recepient - the address of the recepient
     * @param value - the amount of purchase token sent
     */
    event Withdraw(address token, address recepient, uint256 value);

    /**
     * @dev Emitted when the Gini token is set.
     *
     * @param gini - the address of the Gini token
     */
    event SetGiniToken(address gini);

    /**
     * @dev Emitted when a purchase is made.
     *
     * @param user - the address of the user
     * @param amount - the amount of purchase token sent
     */
    event Purchase(address user, uint256 amount);

    /**
     * @dev Emitted when the total supply is set.
     *
     * @param value - the total remaining amount of Gini tokens that can be purchased
     */
    event SetTotalSupply(uint256 value);

    // _______________ Initializer _______________

    /**
     * @notice Initializes the contract with the given parameters.
     *
     * @param _giniPrice - the price of the Gini token per USDT
     * @param _saleStart - the start timestamp of the sale
     * @param _saleEnd - the end timestamp of the sale
     * @param _purchaseToken - the address of the purchase token
     */
    function initialize(
        uint256 _giniPrice,
        uint256 _saleStart,
        uint256 _saleEnd,
        address _purchaseToken
    ) public initializer {
        __AccessControl_init();

        _setGiniPrice(_giniPrice);
        _setSalePhase(_saleStart, _saleEnd);
        _setPurchaseToken(_purchaseToken);

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
        if (address(purchaseToken) == address(0)) revert TokenNotSet();

        if (salePhase.start > block.timestamp || salePhase.end < block.timestamp) revert OnlyWhileSalePhase();

        address buyer = _msgSender();
        uint256 amountToReceive = _calcAmountToReceive(_value);

        if (totalSupply < amountToReceive) revert TotalSupplyReached();

        purchaseAmount[buyer] += amountToReceive;
        totalSupply -= amountToReceive;
        totalRaised += _value;

        emit Purchase(buyer, amountToReceive);

        purchaseToken.safeTransferFrom(buyer, address(this), _value);
        gini.safeTransfer(buyer, amountToReceive);
    }

    /**
     * @notice Allows admin to withdraw the remaining GINI tokens.
     *
     * @param _recipient - the address of the recipient
     */
    function withdrawRemainingTokens(address _recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_recipient == address(0)) revert ZeroAddress();
        if (salePhase.start < block.timestamp && block.timestamp < salePhase.end) revert WithdrawingDuringSale();

        uint256 value;

        value = gini.balanceOf(address(this));
        gini.safeTransfer(_recipient, value);

        emit Withdraw(address(gini), _recipient, value);
    }

    /**
     * @notice Allows admin to withdraw the remaining ERC20 tokens or native token.
     *
     * @param _recipient - the address of the recipient
     * @param _token - the address of the token
     *
     * @dev Revert if the token is the Gini token.
     */
    function rescueTokens(address _token, address _recipient) external payable onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_recipient == address(0)) revert ZeroAddress();
        if (_token == address(gini)) revert NotAllowedToken(_token);

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
        if (address(gini) != address(0)) revert TokenAlreadySet();

        gini = ERC20(_token);

        // Set total supply
        _setTotalSupply(gini.balanceOf(address(this)));

        emit SetGiniToken(_token);
    }

    /**
     * @notice Allows admin to prolong the sale.
     *
     * @param _end - the new end timestamp of the sale
     *
     * @dev Revert if the sale has already ended or the new end timestamp is less than the current end timestamp.
     */
    function prolongSale(uint256 _end) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (salePhase.end < block.timestamp) revert SaleAlreadyEnded();
        if (salePhase.end > _end) revert InvalidPhaseParams(salePhase.end, _end);

        salePhase.end = _end;

        emit SalePhaseSet(salePhase.start, _end);
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

        giniPricePerUsdt = _price;

        emit SetGiniPrice(_price);
    }

    function _setPurchaseToken(address _token) internal {
        if (_token == address(0)) revert ZeroAddress();

        purchaseToken = ERC20(_token);
        purchaseTokenDecimals = ERC20(_token).decimals();

        emit SetPurchaseToken(_token);
    }

    function _calcAmountToReceive(uint256 _value) internal view returns (uint256) {
        return (giniPricePerUsdt * _value) / 10 ** purchaseTokenDecimals;
    }
}
