# Solidity API

## GiniToken

### denylist

```solidity
mapping(address => bool) denylist
```

Stores `true` for addresses for which all token transfers are denied.

An address => is denied for all token transfers?

### ZeroAddress

```solidity
error ZeroAddress()
```

Reverted when public sale or vesting contract addresses are zero during contract creation.

### DeniedAddress

```solidity
error DeniedAddress(address _addr)
```

Reverted when token transfer from or to a denied address.

It provides the value:

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _addr | address | The denied address, from or to which a token transfer is attempted. |

### AlreadyDenied

```solidity
error AlreadyDenied(address _addr)
```

Reverted when re-denying a denied address.

It provides the value:

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _addr | address | The denied address attempted to be denied again. |

### NotDenied

```solidity
error NotDenied(address _addr)
```

Reverted when allowing an address that is not denied.

It provides the value:

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _addr | address | The address that is not denied, but has been attempted to be allowed. |

### Denied

```solidity
event Denied(address _addr)
```

Emitted when all token transfers are denied for an address `_addr`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _addr | address | The address for which all token transfers are denied. |

### Allowed

```solidity
event Allowed(address _addr)
```

Emitted when token transfers are allowed for a denied address `_addr`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _addr | address | The address for which token transfers are allowed. |

### constructor

```solidity
constructor(string _name, string _symbol, uint256 _totalSupply, address _publicSaleContract, address _vestingContract) public
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _name | string | The name of the token |
| _symbol | string | The symbol of the token |
| _totalSupply | uint256 | The total supply of the token |
| _publicSaleContract | address | The address of the public sale contract |
| _vestingContract | address | The address of the vesting contract |

### deny

```solidity
function deny(address _addr) external
```

Denies all token transfers for an address `_addr`.

Emits a `Denied` event.

Requirements:
- The caller should have the role `DENIER_ROLE`.
- The address `_addr` should not be denied.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _addr | address | An address to be denied. |

### allow

```solidity
function allow(address _addr) external
```

Allows token transfers for a denied address `_addr`.

Emits an `Allowed` event.

Requirements:
- The caller should have the role `DENIER_ROLE`.
- The address `_addr` should be denied.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _addr | address | A denied address to be allowed. |

### _update

```solidity
function _update(address from, address to, uint256 value) internal
```

Hook that is called before any transfer of tokens.

It is overridden to be extended with the following requirements:
- `_from` should not be denied (`denylist`).
- `_to` should not be denied (`denylist`).

It also includes the condition of `Pauseable`:
- The contract should not be paused.

See `Pauseable` and `ERC20` for details.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | An address from which tokens are transferred. Only in the first transaction, it is zero address, when the total supply is minted to the owner address during contract creation. |
| to | address | An address to which tokens are transferred. |
| value | uint256 | Amount of tokens to be transferred. |

