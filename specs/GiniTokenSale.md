## Documentation for [`GiniTokenSale`](../contracts/GiniTokenSale.sol) Contract

#### Overview

The [`GiniTokenSale`](../contracts/GiniTokenSale.sol) contract is a token sale contract for the Gini token. It allows users to purchase Gini tokens using a specified purchase token (USDT). The contract includes features such as setting the sale phase, setting the Gini token price, and withdrawing tokens.

#### Libraries

-   **SafeERC20**: Provides safe wrappers around ERC20 operations that throw on failure.

#### Structs

-   **SalePhase**: Stores the start and end timestamps of the sale.
    -   `uint256 start`: The start timestamp of the sale.
    -   `uint256 end`: The end timestamp of the sale.

#### Storage Variables

-   **salePhase**: Stores the start and end timestamps of the sale.
    -   `SalePhase public salePhase`
-   **giniPricePerUsdt**: Stores the price of the Gini token per USDT.
    -   `uint256 public giniPricePerUsdt`
-   **purchaseTokenDecimals**: Stores the amount of token decimals of the purchase token.
    -   `uint256 public purchaseTokenDecimals`
-   **totalSupply**: Stores the total remaining amount of Gini tokens that can be purchased.
    -   `uint256 public totalSupply`
-   **totalRaised**: Stores the total raised amount of the purchase token.
    -   `uint256 public totalRaised`
-   **purchaseToken**: Stores the purchase token.
    -   `ERC20 public purchaseToken`
-   **gini**: Stores the Gini token.
    -   `ERC20 public gini`
-   **purchaseAmount**: Stores the amount of Gini tokens purchased by each user.
    -   `mapping(address => uint256) public purchaseAmount`

#### Errors

-   **InvalidPhaseParams(uint256 start, uint256 end)**: Reverted if invalid phase parameters are passed.
-   **ZeroAddress()**: Reverted if a zero address is passed.
-   **InsufficientValue()**: Reverted if an insufficient value is passed.
-   **WithdrawingDuringSale()**: Reverted if withdrawing during the sale.
-   **CannotBuyZeroTokens()**: Reverted if attempting to buy zero tokens.
-   **OnlyWhileSalePhase()**: Reverted if the purchase is not during the sale time.
-   **NotAllowedDuringSale()**: Reverted if an action is not allowed during the sale.
-   **TotalSupplyReached()**: Reverted if the total supply is reached.
-   **TokenNotSet()**: Reverted if the purchase token is not set.
-   **TokenAlreadySet()**: Reverted if the Gini token is already set.
-   **NotAllowedToken(address token)**: Reverted when rescuing Gini tokens.
-   **SaleAlreadyEnded()**: Reverted when the sale has already ended.

#### Events

-   **SalePhaseSet(uint256 start, uint256 end)**: Emitted when the sale phase is set.
    -   `uint256 start`: The start timestamp of the sale.
    -   `uint256 end`: The end timestamp of the sale.
-   **SetGiniPrice(uint256 value)**: Emitted when the Gini price is set.
    -   `uint256 value`: The price of the Gini token.
-   **SetPurchaseToken(address token)**: Emitted when the purchase token is set.
    -   `address token`: The address of the purchase token.
-   **Withdraw(address token, address recipient, uint256 value)**: Emitted when withdrawing ERC20 tokens or native tokens.
    -   `address token`: The address of the token.
    -   `address recipient`: The address of the recipient.
    -   `uint256 value`: The amount of tokens sent.
-   **SetGiniToken(address gini)**: Emitted when the Gini token is set.
    -   `address gini`: The address of the Gini token.
-   **Purchase(address user, uint256 amount)**: Emitted when a purchase is made.
    -   `address user`: The address of the user.
    -   `uint256 amount`: The amount of purchase tokens sent.
-   **SetTotalSupply(uint256 value)**: Emitted when the total supply is set.
    -   `uint256 value`: The total remaining amount of Gini tokens that can be purchased.

#### Initializer

Initializes the contract with the given parameters:

```solidity
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
```

-   **\_giniPrice**: The price of the Gini token per USDT.
-   **\_saleStart**: The start timestamp of the sale.
-   **\_saleEnd**: The end timestamp of the sale.
-   **\_purchaseToken**: The address of the purchase token.

#### External Functions

-   **purchase(uint256 \_value)**: Allows the user to purchase Gini tokens.

    -   `uint256 _value`: The amount of stablecoins to send to the contract.
    -   Example:

        ```solidity
        function purchase(uint256 _value) external {
            if (_value == 0) revert CannotBuyZeroTokens();
            if (address(gini) == address(0)) revert TokenNotSet();

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
        ```

-   **withdrawRemainingTokens(address \_recipient)**: Allows admin to withdraw the remaining Gini tokens.

    -   `address _recipient`: The address of the recipient.
    -   Example:

        ```solidity
        function withdrawRemainingTokens(address _recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
            if (_recipient == address(0)) revert ZeroAddress();
            if (salePhase.start < block.timestamp && block.timestamp < salePhase.end) revert WithdrawingDuringSale();

            uint256 value;

            value = gini.balanceOf(address(this));
            gini.safeTransfer(_recipient, value);

            emit Withdraw(address(gini), _recipient, value);
        }
        ```

-   **rescueTokens(address \_token, address \_recipient)**: Allows admin to withdraw the remaining ERC20 tokens or native tokens.

    -   `address _token`: The address of the token.
    -   `address _recipient`: The address of the recipient.
    -   Example:

        ```solidity
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
        ```

-   **setGiniToken(address \_token)**: Allows admin to set the address of the Gini token.

    -   `address _token`: The address of the Gini token.
    -   Example:

        ```solidity
        function setGiniToken(address _token) external onlyRole(DEFAULT_ADMIN_ROLE) {
            if (_token == address(0)) revert ZeroAddress();
            if (address(gini) != address(0)) revert TokenAlreadySet();

            gini = ERC20(_token);

            // Set total supply
            _setTotalSupply(gini.balanceOf(address(this)));

            emit SetGiniToken(_token);
        }
        ```

-   **prolongSale(uint256 \_end)**: Allows admin to prolong the sale.

    -   `uint256 _end`: The new end timestamp of the sale.
    -   Example:

        ```solidity
        function prolongSale(uint256 _end) external onlyRole(DEFAULT_ADMIN_ROLE) {
            if (salePhase.end < block.timestamp) revert SaleAlreadyEnded();
            if (salePhase.end > _end) revert InvalidPhaseParams(salePhase.end, _end);

            salePhase.end = _end;

            emit SalePhaseSet(salePhase.start, _end);
        }
        ```

-   **getReceivedAmount(uint256 \_purchaseAmount)**: Calculates the amount of Gini tokens to receive for a given purchase amount.

    -   `uint256 _purchaseAmount`: The amount of purchase tokens.
    -   Example:
        ```solidity
        function getReceivedAmount(uint256 _purchaseAmount) external view returns (uint256) {
            return _calcAmountToReceive(_purchaseAmount);
        }
        ```

-   **getSaleTime()**: Returns the start and end time of the sale.
    -   Example:
        ```solidity
        function getSaleTime() external view returns (uint256, uint256) {
            return (salePhase.start, salePhase.end);
        }
        ```

#### Internal Functions

-   **\_setTotalSupply(uint256 \_value)**: Sets the total supply of Gini tokens that can be purchased.

    -   `uint256 _value`: The total supply value.
    -   Example:

        ```solidity
        function _setTotalSupply(uint256 _value) internal {
            if (_value == 0) revert InsufficientValue();

            totalSupply = _value;

            emit SetTotalSupply(_value);
        }
        ```

-   **\_setSalePhase(uint256 \_start, uint256 \_end)**: Sets the sale phase with start and end timestamps.

    -   `uint256 _start`: The start timestamp of the sale.
    -   `uint256 _end`: The end timestamp of the sale.
    -   Example:

        ```solidity
        function _setSalePhase(uint256 _start, uint256 _end) internal {
            if (_start < block.timestamp || _start > _end) revert InvalidPhaseParams(_start, _end);

            salePhase.start = _start;
            salePhase.end = _end;

            emit SalePhaseSet(_start, _end);
        }
        ```

-   **\_setGiniPrice(uint256 \_price)**: Sets the price of the Gini token per USDT.

    -   `uint256 _price`: The price of the Gini token.
    -   Example:

        ```solidity
        function _setGiniPrice(uint256 _price) internal {
            if (_price == 0) revert InsufficientValue();

            giniPricePerUsdt = _price;

            emit SetGiniPrice(_price);
        }
        ```

-   **\_setPurchaseToken(address \_token)**: Sets the address of the purchase token.

    -   `address _token`: The address of the purchase token.
    -   Example:

        ```solidity
        function _setPurchaseToken(address _token) internal {
            if (_token == address(0)) revert ZeroAddress();

            purchaseToken = ERC20(_token);
            purchaseTokenDecimals = ERC20(_token).decimals();

            emit SetPurchaseToken(_token);
        }
        ```

-   **\_calcAmountToReceive(uint256 \_value)**: Calculates the amount of Gini tokens to receive for a given purchase amount.
    -   `uint256 _value`: The amount of purchase tokens.
    -   Example:
        ```solidity
        function _calcAmountToReceive(uint256 _value) internal view returns (uint256) {
            return (giniPricePerUsdt * _value) / 10 ** purchaseTokenDecimals;
        }
        ```

#### Summary

The [`GiniTokenSale`](../contracts/GiniTokenSale.sol) contract facilitates the sale of Gini tokens using a specified purchase token. It includes features such as setting the sale phase, setting the Gini token price, and withdrawing tokens. The contract leverages OpenZeppelin's SafeERC20 library for secure token operations and AccessControl for role-based access control. The initializer sets up the contract with the necessary parameters, and various functions allow for purchasing tokens, withdrawing tokens, and managing the sale phase.
