# Solidity API

## GiniVesting

### Beneficiary

The information of a beneficiary.
1. `totalAllocations` is the total amount that the beneficiary is allowed to claim.
2. `claimedAmount` is the amount that the beneficiary has already claimed.
3. `areTotallyClaimed` is true if the beneficiary has already claimed all tokens.

```solidity
struct Beneficiary {
  uint256 totalAllocations;
  uint256 claimedAmount;
  bool areTotallyClaimed;
}
```

### VestingPeriod

The design of a vesting period:
1. From `cliffStart` to `start` timestamps, there is an inactivity period during which no token transfers occur.
   All relevant vesting parameters are defined while vesting initialization.
2. From `start` to `end` timestamps , there is a vesting period during or after which accounts, that are to be vested, can claim tokens using the function `claim()` or `claimAll()`.
3. Describes whether vesting was created for counselors.
4. Initial unlock percentage defines how much tokens will be available from the start of the vesting. (10000 = 100%)

```solidity
struct VestingPeriod {
  uint256 cliffStartTimestamp;
  uint256 startTimestamp;
  uint256 endTimestamp;
  uint256 duration;
}
```

### CLAIM_INTERVAL

```solidity
uint256 CLAIM_INTERVAL
```

### vestingPeriods

```solidity
mapping(uint256 => struct GiniVesting.VestingPeriod) vestingPeriods
```

Vesting ID => Vesting Period.

### commonAllocations

```solidity
mapping(uint256 => uint256) commonAllocations
```

Vesting ID => The total allocations for all accounts.

### totalClaims

```solidity
mapping(uint256 => uint256) totalClaims
```

Vesting ID => The total claims for all accounts.

### userVestings

```solidity
mapping(address => uint256[]) userVestings
```

User => All vesting IDs of the user.

### beneficiaries

```solidity
mapping(uint256 => mapping(address => struct GiniVesting.Beneficiary)) beneficiaries
```

Vesting ID => Beneficiary => Beneficiary info.

### gini

```solidity
contract IERC20 gini
```

The vesting token.

### totalSupply

```solidity
uint256 totalSupply
```

The total supply of the vesting token.

### totalClaimsForAll

```solidity
uint256 totalClaimsForAll
```

The total amount of claims from all users and vestings.

### ZeroAddress

```solidity
error ZeroAddress()
```

_Revert if zero address is passed._

### ArraysLengthMismatch

```solidity
error ArraysLengthMismatch(uint256 length1, uint256 length2)
```

_Revert if arrays lengths are not equal._

### NoBeneficiaries

```solidity
error NoBeneficiaries()
```

_Revert if there are no beneficiaries._

### ZeroVestingAmount

```solidity
error ZeroVestingAmount(address _beneficiary)
```

_Revert if zero vesting amount is passed._

### BeneficiaryAlreadyExists

```solidity
error BeneficiaryAlreadyExists(address _beneficiary)
```

_Revert if beneficiary already exists._

### InvalidVestingParams

```solidity
error InvalidVestingParams(uint256 _cliffStartTimestamp, uint256 _startTimestamp, uint256 _endTimestamp)
```

_Revert if vesting params are invalid._

### AlreadyInitialized

```solidity
error AlreadyInitialized()
```

_Revert if vesting is already initialized._

### CannotBeZero

```solidity
error CannotBeZero()
```

_Revert if total supply is zero._

### TotalSupplyReached

```solidity
error TotalSupplyReached()
```

_Revert if total supply is reached._

### VestingTokenRescue

```solidity
error VestingTokenRescue(address token)
```

_Revert if vesting token rescue failed._

### NothingToClaim

```solidity
error NothingToClaim()
```

_Revert if nothing to claim._

### OnlyAfterVestingStart

```solidity
error OnlyAfterVestingStart(uint256 vestingID)
```

_Revert if vesting is not started yet._

### ClaimAmountExceedsVestingAmount

```solidity
error ClaimAmountExceedsVestingAmount(uint256 _vestingID, address _beneficiary, uint256 _claimAmount, uint256 _totalAllocations)
```

_Revert if claim amount exceeds vesting amount._

### Claim

```solidity
event Claim(address _user, uint256 _vestingID, uint256 _amount)
```

_Emitted when the claim is successful._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | Address of the user. |
| _vestingID | uint256 |  |
| _amount | uint256 | Amount of the claim. |

### VestingInitialized

```solidity
event VestingInitialized(uint256 vestingID, uint256 cliffStartTimestamp, uint256 startTimestamp, uint256 endTimestamp)
```

_Emitted when the vesting is initialized._

### SetGiniToken

```solidity
event SetGiniToken(address token)
```

_Emitted when the token for the vesting is set._

### ERC20Rescued

```solidity
event ERC20Rescued(address _token, address _to, uint256 _amount)
```

_Emitted when ERC20 tokens are rescued._

### notZeroAddress

```solidity
modifier notZeroAddress(address _address)
```

### constructor

```solidity
constructor(uint256 _totalSupply) public
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _totalSupply | uint256 | The total amount of tokens that can be allocated. |

### initVesting

```solidity
function initVesting(uint256 _vestingID, uint256 _cliffStartTimestamp, uint256 _startTimestamp, uint256 _endTimestamp, address[] _beneficiaries, uint256[] _amounts) external
```

_Initialize vesting._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _vestingID | uint256 | ID of the vesting. |
| _cliffStartTimestamp | uint256 | Start timestamp of the cliff period. |
| _startTimestamp | uint256 | Start timestamp of the vesting. |
| _endTimestamp | uint256 | End timestamp of the vesting. |
| _beneficiaries | address[] | Array of the beneficiaries addresses. |
| _amounts | uint256[] | Array of the amounts, each amount corresponds to the beneficiary by index. Emits a VestingInitialized event. |

### claim

```solidity
function claim(uint256 _vestingID) external
```

Claim tokens from the specified vesting.
        Emit a Claim event.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _vestingID | uint256 | The ID of the vesting. |

### claimAll

```solidity
function claimAll() external
```

Claim all available tokens from the all vestings of the caller.

Emits a `Claim` event on each vesting if there are tokens to claim.

### rescueERC20

```solidity
function rescueERC20(contract IERC20 _token, address _to) external
```

_Rescue ERC20 tokens from the contract. Token must be not vestingToken._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | contract IERC20 | Address of the token to rescue. |
| _to | address | Address to send tokens to. |

### setGiniToken

```solidity
function setGiniToken(address _token) external
```

Set Gini token that will be used for vesting.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _token | address | Address of the token. |

### calculateClaimAmount

```solidity
function calculateClaimAmount(address _beneficiary, uint256 _vestingID) public view returns (uint256 claimAmount)
```

If totalAllocations is 0, then reverts.

_Calculate claim amount for the beneficiary. It returns 0 if vesting is not active or beneficiary has already claimed all tokens._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _beneficiary | address | Address of the beneficiary. |
| _vestingID | uint256 | ID of the vesting. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| claimAmount | uint256 | Amount of tokens that can be claimed by the beneficiary. |

### getVestingData

```solidity
function getVestingData(uint256 _vestingID) external view returns (struct GiniVesting.VestingPeriod _vestingData, uint256 totalAllocations, uint256 claimedAmount)
```

_Returns all vesting data.

cliffStartTimestamp - timestamp of the cliff period.
startTimestamp - timestamp of the vesting start.
endTimestamp - timestamp of the vesting end.
duration - duration of the vesting.
initialUnlockPercentage- initial unlock percentage.
isAdvisors - true if the vesting is for advisors.

totalAllocations - total amount that the all beneficiaries is allowed to claim.

claimedAmount - amount that the all beneficiaries has already claimed._

### getClaimsAmountForAllVestings

```solidity
function getClaimsAmountForAllVestings(address _beneficiary) external view returns (uint256, uint256[], uint256[])
```

Return all info about available claim amount for all vestings of the user.

totalAmount - The total amount of available tokens from all vestings of the beneficiary.
userVestings[_beneficiary] - The array of all vesting IDs user participate in.
amounts-  The array of available tokens of the vesting by index.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _beneficiary | address | The address of the beneficiary. |

### getVestingsDuration

```solidity
function getVestingsDuration(address _beneficiary) external view returns (uint256[], uint256[])
```

Returns all vestings duration of the beneficiary.

allUserVestings - The array of all user vestings.
vestingsDuration - The array of vestings duration for each vesting ID by index.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _beneficiary | address | The address of the beneficiary. |

### getAllocationsForAllVestings

```solidity
function getAllocationsForAllVestings(address _beneficiary) external view returns (uint256[], uint256[])
```

Returns total allocations amount for each vesting ID of the beneficiary.

allUserVestings - The array of all user vestings.
totalAllocations - The array of total allocations amount for each vesting ID by index.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _beneficiary | address | The address of the beneficiary. |

### getTotalClaims

```solidity
function getTotalClaims(address _beneficiary) external view returns (uint256[], uint256[])
```

Returns total claims from all vestings of the beneficiary.

allUserVestings - The array of all user vestings.
totalClaimed - The array of total claimed amount for each vesting by index.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _beneficiary | address | The address of the beneficiary. |

### getUserVestings

```solidity
function getUserVestings(address _beneficiary) external view returns (uint256[])
```

Returns array of all user vestings.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _beneficiary | address | The address of the beneficiary. |

### _addBeneficiary

```solidity
function _addBeneficiary(uint256 _vestingID, address _beneficiary, uint256 _amount) internal
```

_Add beneficiary to the vesting._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _vestingID | uint256 | ID of the vesting. |
| _beneficiary | address | Address of the beneficiary. |
| _amount | uint256 | Amount of tokens to be vested. |

### _validateNSetVesting

```solidity
function _validateNSetVesting(uint256 _vestingID, uint256 _cliffStartTimestamp, uint256 _startTimestamp, uint256 _endTimestamp) internal
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _vestingID | uint256 | The ID of the vesting. |
| _cliffStartTimestamp | uint256 | The timestamp of the cliff period. |
| _startTimestamp | uint256 | The timestamp of the vesting start. |
| _endTimestamp | uint256 | The timestamp of the vesting end. |

### _calcClaimableAmount

```solidity
function _calcClaimableAmount(uint256 _timestamp, uint256 _totalAllocations, uint256 _startTimestamp, uint256 _duration) internal view returns (uint256 claimableAmount)
```

_Calculate the amount that the beneficiary is allowed to claim.

The vesting formula is a linear vesting curve. Thi returns amount that the beneficiary is allowed to claim from the start of the vesting depending on the current timestamp and initial unlock amount._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _timestamp | uint256 | The current timestamp. |
| _totalAllocations | uint256 | The total amount that the beneficiary is allowed to claim. |
| _startTimestamp | uint256 | The start timestamp of the vesting. |
| _duration | uint256 | The duration of the vesting. |

### _secondsToMonth

```solidity
function _secondsToMonth(uint256 _seconds) internal pure returns (uint256)
```

_Convert seconds to months._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _seconds | uint256 | The number of seconds. |

