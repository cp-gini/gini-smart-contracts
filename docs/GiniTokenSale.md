# Solidity API

## GiniTokenSale

### SalePhase

Stores the start and end timestamps of the sale.

It provides the value:
- start: the start timestamp of the sale
- end: the end timestamp of the sale

```solidity
struct SalePhase {
  uint256 start;
  uint256 end;
}
```

### salePhase

```solidity
struct GiniTokenSale.SalePhase salePhase
```

Stores the start and end timestamps of the sale.

### giniPrice

```solidity
uint256 giniPrice
```

Stores the price of the Gini token.

### purchaseTokenDecimals

```solidity
uint256 purchaseTokenDecimals
```

Stores the amount of token decimals of the purchase token.

### totalSupply

```solidity
uint256 totalSupply
```

Stores the total remaining amount of Gini tokens that can be purchased.

### purchaseToken

```solidity
contract ERC20 purchaseToken
```

Stores the purchase token.

### gini

```solidity
contract ERC20 gini
```

Stores the Gini token.

### purchaseAmount

```solidity
mapping(address => uint256) purchaseAmount
```

Stores the amount of Gini tokens purchased by each user.
address of the user => amount of purchased Gini tokens

### InvalidPhaseParams

```solidity
error InvalidPhaseParams(uint256 start, uint256 end)
```

_Revert if invalid phase params are passed._

### ZeroAddress

```solidity
error ZeroAddress()
```

_Revert if zero address is passed._

### InsufficientValue

```solidity
error InsufficientValue()
```

_Revert if insufficient value is passed._

### WithdrawingDuringSale

```solidity
error WithdrawingDuringSale()
```

_Revert if withdrawing during sale._

### CannotBuyZeroTokens

```solidity
error CannotBuyZeroTokens()
```

_Revert if cannot buy zero tokens._

### OnlyWhileSalePhase

```solidity
error OnlyWhileSalePhase()
```

_Revert if purchase is not during sale time._

### NotAllowedDuringSale

```solidity
error NotAllowedDuringSale()
```

_Revert if not allowed during sale._

### TotalSupplyReached

```solidity
error TotalSupplyReached()
```

_Revert if total supply is reached._

### SalePhaseSet

```solidity
event SalePhaseSet(uint256 start, uint256 end)
```

_Emitted when the sale phase is set._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| start | uint256 | - the start timestamp of the sale |
| end | uint256 | - the end timestamp of the sale |

### SetGiniPrice

```solidity
event SetGiniPrice(uint256 value)
```

_Emitted when the Gini price is set._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | - the price of the Gini token |

### SetPurchaseToken

```solidity
event SetPurchaseToken(address token)
```

_Emitted when the purchase token is set._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address | - the address of the purchase token |

### Withdraw

```solidity
event Withdraw(address token, address recepient, uint256 value)
```

_Emitted when withdrawing ERC20 tokens or native token._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| token | address |  |
| recepient | address | - the address of the recepient |
| value | uint256 | - the amount of purchase token sent |

### SetGiniToken

```solidity
event SetGiniToken(address gini)
```

_Emitted when the Gini token is set._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| gini | address | - the address of the Gini token |

### Purchase

```solidity
event Purchase(address user, uint256 amount)
```

_Emitted when a purchase is made._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | - the address of the user |
| amount | uint256 | - the amount of purchase token sent |

### SetTotalSupply

```solidity
event SetTotalSupply(uint256 value)
```

_Emitted when the total supply is set._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | - the total remaining amount of Gini tokens that can be purchased |

### constructor

```solidity
constructor(uint256 _giniPrice, uint256 _saleStart, uint256 _saleEnd, address _purchaseToken, uint256 _totalSupply) public
```

Initializes the contract with the given parameters.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _giniPrice | uint256 | - the price of the Gini token |
| _saleStart | uint256 | - the start timestamp of the sale |
| _saleEnd | uint256 | - the end timestamp of the sale |
| _purchaseToken | address | - the address of the purchase token |
| _totalSupply | uint256 | - the total remaining amount of Gini tokens that can be purchased |

### purchase

```solidity
function purchase(uint256 _value) external
```

Allows the user to purchase Gini tokens.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _value | uint256 | - the amount of stablecoins to send to the contract |

### withdrawRemainingTokens

```solidity
function withdrawRemainingTokens(address _token, address _recipient) external payable
```

Allows admin to withdraw the remaining ERC20 or native token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | - the address of the token               if token is zero address, it will withdraw native token               else it will withdraw the given token |
| _recipient | address | - the address of the recipient |

### receive

```solidity
receive() external payable
```

Allows the contract to receive ETH

### setGiniToken

```solidity
function setGiniToken(address _token) external
```

Allows admin to set the address of the Gini token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | - the address of the Gini token |

### getReceivedAmount

```solidity
function getReceivedAmount(uint256 _purchaseAmount) external view returns (uint256)
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _purchaseAmount | uint256 | - calculate the amount to receive of Gini tokens |

### getSaleTime

```solidity
function getSaleTime() external view returns (uint256, uint256)
```

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | the start and end time of the sale |
| [1] | uint256 |  |

### _setTotalSupply

```solidity
function _setTotalSupply(uint256 _value) internal
```

### _setSalePhase

```solidity
function _setSalePhase(uint256 _start, uint256 _end) internal
```

### _setGiniPrice

```solidity
function _setGiniPrice(uint256 _price) internal
```

### _setPurchaseToken

```solidity
function _setPurchaseToken(address _token) internal
```

### _calcAmountToReceive

```solidity
function _calcAmountToReceive(uint256 _value) internal view returns (uint256)
```

