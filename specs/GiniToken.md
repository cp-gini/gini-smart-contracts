## Documentation for [`GiniToken`](../contracts/GiniToken.sol) Contract

#### Overview

The [`GiniToken`](../contracts/GiniToken.sol) contract is an ERC20-compliant token contract with additional features such as access control and a denylist mechanism. It leverages OpenZeppelin's libraries to ensure security and standard compliance.

#### Libraries

-   **ERC20**: Provides the standard implementation of the ERC20 token.
-   **AccessControl**: Provides role-based access control mechanisms.

#### Constants

-   **SALE_SUPPLY**: The total supply allocated for the public sale. (300 millions)
    -   `uint256 public constant SALE_SUPPLY = 300_000_000 * 1e18;`
-   **TOTAL_SUPPLY**: The total supply of the token. (2 billions)
    -   `uint256 public constant TOTAL_SUPPLY = 2_000_000_000 * 1e18;`

#### Storage Variables

-   **denylist**: A mapping that stores `true` for addresses for which all token transfers are denied.
    -   `mapping(address => bool) public denylist`: Maps an address to a boolean indicating if the address is denied for all token transfers.

#### Errors

-   **ZeroAddress()**: Reverted when public sale or vesting contract addresses are zero during contract creation.
-   **DeniedAddress(address \_addr)**: Reverted when a token transfer is attempted from or to a denied address.
    -   `_addr`: The denied address from or to which a token transfer is attempted.
-   **AlreadyDenied(address \_addr)**: Reverted when re-denying a denied address.
    -   `_addr`: The denied address attempted to be denied again.
-   **NotDenied(address \_addr)**: Reverted when allowing an address that is not denied.
    -   `_addr`: The address that is not denied, but has been attempted to be allowed.

#### Events

-   **Denied(address indexed \_addr)**: Emitted when all token transfers are denied for an address.
    -   `_addr`: The address for which all token transfers are denied.
-   **Allowed(address indexed \_addr)**: Emitted when token transfers are allowed for a denied address.
    -   `_addr`: The address for which token transfers are allowed.

#### Constructor

Initializes the contract with the given parameters:

```solidity
constructor(address _publicSaleContract, address _vestingContract) ERC20("Gini", "GINI") {
    uint256 vestingSupply = TOTAL_SUPPLY - SALE_SUPPLY;

    _mint(_publicSaleContract, SALE_SUPPLY);
    _mint(_vestingContract, vestingSupply);

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
}
```

The contract instantly mints supply for the Token Sale and Vesting contract.

-   **\_publicSaleContract**: The address of the public sale contract.
-   **\_vestingContract**: The address of the vesting contract.

#### External Functions

-   **deny(address \_addr)**: Denies all token transfers for an address.

    -   `_addr`: The address to be denied.
    -   Emits a `Denied` event.
    -   Requirements:
        -   The caller must have the role `DEFAULT_ADMIN_ROLE`.
        -   The address `_addr` should not be denied.
    -   Example:

        ```solidity
        function deny(address _addr) external onlyRole(DEFAULT_ADMIN_ROLE) {
            if (denylist[_addr]) revert AlreadyDenied(_addr);

            denylist[_addr] = true;

            emit Denied(_addr);
        }
        ```

-   **allow(address \_addr)**: Allows token transfers for a denied address.

    -   `_addr`: The address to be allowed.
    -   Emits an `Allowed` event.
    -   Requirements:
        -   The caller must have the role `DEFAULT_ADMIN_ROLE`.
        -   The address `_addr` should be denied.
    -   Example:

        ```solidity
        function allow(address _addr) external onlyRole(DEFAULT_ADMIN_ROLE) {
            if (!denylist[_addr]) revert NotDenied(_addr);

            denylist[_addr] = false;

            emit Allowed(_addr);
        }
        ```

#### Internal Functions

-   **\_update(address from, address to, uint256 value)**: Hook that is called before any transfer of tokens.

    -   `from`: The address sending the tokens.
    -   `to`: The address receiving the tokens.
    -   `value`: The amount of tokens being transferred.
    -   Requirements:
        -   `from` should not be denied (`denylist`).
        -   `to` should not be denied (`denylist`).
    -   Example:

        ```solidity
        function _update(address from, address to, uint256 value) internal override(ERC20) {
            if (denylist[from]) revert DeniedAddress(from);
            if (denylist[to]) revert DeniedAddress(to);

            super._update(from, to, value);
        }
        ```

#### Summary

The [`GiniToken`](../contracts/GiniToken.sol) contract is an ERC20 token with enhanced access control features. It includes a denylist mechanism to restrict token transfers for specific addresses, ensuring greater control over token distribution and usage. The contract leverages OpenZeppelin's robust libraries for ERC20 and AccessControl functionalities, providing a secure and standardized implementation. The constructor initializes the token with a total supply, allocates tokens for public sale and vesting, and sets up the default admin role.
