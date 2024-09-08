## Installation

Prerequisites: `NodeJS` version 16 or higher, `npm` version 7 or higher.

📝 _`NodeJS` version **`v22.5.1`** and `npm` version **`10.8.3`** were used for development_.

Run the command `$ npm install` in [the root of the project directory](./) to install all the dependencies specified in [`package.json`](./package.json), compile contracts ([`contracts/`](./contracts/)), prepare an ABI ([`abi/`](./abi/)), documentation ([`docs/`](./docs/)) for the contracts in [the NatSpec format](https://docs.soliditylang.org/en/latest/natspec-format.html) and [Husky hooks](#husky-hooks).

## Guide to Set Up `.env` Environments

#### Steps

1. **Create a `.env` File**

    - In the root directory of your project, create a file named `.env`.

2. **Define Environment Variables**

    - Open the [`.env.example`](./.env.example) file and copy all variables and then paste them into `.env` file and set the values

## Testing

Run `$ npm run dev:coverage` to examine how well the developed tests cover the functionality of contracts. The results can also be viewed in a web browser by opening a file [`coverage/index.html`](./coverage/index.html) created by the script.

Perform tests with `$ npm test` to run all tests from the [`test/`](./test/) directory.

Use `$ npm run test-t` to see events and calls when running tests, or `$ npm run test-ft` to also see the storage operations.

📝 _Each test case (`it()`) of [`tests/`](./test/) is independent due to isolation using [a fixture](https://hardhat.org/hardhat-network-helpers/docs/reference#fixtures), [a snapshot](https://hardhat.org/hardhat-network-helpers/docs/reference#snapshots) or `beforeEach()`, so the entire specific flow is contained in `it()` and a set of `before()` and `beforeEach()` before it._

### Test coverage results

| File              | % Stmts | % Branch | % Funcs | % Lines |
| ----------------- | ------- | -------- | ------- | ------- |
| GiniToken.sol     | 100     | 100      | 100     | 100     |
| GiniTokenSale.sol | 100     | 100      | 100     | 100     |
| GiniVesting.sol   | 100     | 98.39    | 100     | 100     |

## Utilities

-   `$ npm run dev:docs` to generate a documentation for contracts. _The documentation is generated for all contracts in the directory [`contracts/`](./contracts/) to the directory [`docs/`](./docs/) using [the NatSpec format](https://docs.soliditylang.org/en/latest/natspec-format.html). It uses the OpenZeppelin's documentation generation library [solidity-docgen](https://github.com/OpenZeppelin/solidity-docgen)._

## Troubleshooting

Use `$ npm run clean` and try again.

## Documentation

### Documentation for [`GiniToken`](./contracts/GiniToken.sol) Contract

#### Overview

The [`GiniToken`](./contracts/GiniToken.sol) contract is an ERC20-compliant token contract with additional features such as access control, permit functionality, and a denylist mechanism. It leverages OpenZeppelin's libraries to ensure security and standard compliance.

#### Libraries

-   **ERC20**: Provides the standard implementation of the ERC20 token.
-   **ERC20Permit**: Adds permit functionality to the ERC20 token, allowing approvals via signatures.
-   **AccessControl**: Provides role-based access control mechanisms.

#### Storage Variables

-   **denylist**: A mapping that stores `true`) for addresses for which all token transfers are denied.
    -   `mapping(address => bool) public denylist`: Maps an address to a boolean indicating if the address is denied for all token transfers.

#### Errors

-   **ZeroAddress()**: Reverted when public sale or vesting contract addresses are zero during contract creation.
-   **DeniedAddress(address \_addr)**: Reverted when a token transfer is attempted from or to a denied address.
    -   `_addr`: The denied address from or to which a token transfer is attempted.
-   **AlreadyDenied(address \_addr)**: Reverted when re-denying a denied address.
    -   `_addr`: The denied address attempted to be denied again.

#### Constructor

Initializes the contract with the given parameters:

```solidity
constructor(
    string memory name,
    string memory symbol,
    address publicSaleAddress,
    address vestingContractAddress
)
```

-   `name`: The name of the token.
-   `symbol`: The symbol of the token.
-   `publicSaleAddress`: The address of the public sale contract.
-   `vestingContractAddress`: The address of the vesting contract.

#### External Functions

-   **denyAddress(address \_addr)**: Adds an address to the denylist.

    -   `_addr`: The address to be denied.

-   **allowAddress(address \_addr)**: Removes an address from the denylist.

    -   `_addr`: The address to be allowed.

-   **permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)**: Allows approvals via signatures.
    -   `owner`: The address of the token owner.
    -   `spender`: The address which will spend the tokens.
    -   `value`: The amount of tokens to be spent.
    -   `deadline`: The time until which the permit is valid.
    -   `v`, `r`, `s`: The components of the signature.

#### Events

-   **AddressDenied(address indexed \_addr)**: Emitted when an address is added to the denylist.

    -   `_addr`: The address that was denied.

-   **AddressAllowed(address indexed \_addr)**: Emitted when an address is removed from the denylist.
    -   `_addr`: The address that was allowed.

#### Functions

-   **transfer(address recipient, uint256 amount)**: Transfers tokens to a specified address.

    -   `recipient`: The address to which the tokens will be transferred.
    -   `amount`: The amount of tokens to transfer.

-   **approve(address spender, uint256 amount)**: Approves a specified address to spend a certain amount of tokens on behalf of the caller.

    -   `spender`: The address which will spend the tokens.
    -   `amount`: The amount of tokens to be spent.

-   **transferFrom(address sender, address recipient, uint256 amount)**: Transfers tokens from one address to another using an allowance mechanism.

    -   `sender`: The address from which the tokens will be transferred.
    -   `recipient`: The address to which the tokens will be transferred.
    -   `amount`: The amount of tokens to transfer.

-   **allowance(address owner, address spender)**: Returns the remaining number of tokens that `spender` will be allowed to spend on behalf of `owner`.

    -   `owner`: The address which owns the tokens.
    -   `spender`: The address which will spend the tokens.

-   **balanceOf(address account)**: Returns the balance of tokens for a specified address.
    -   `account`: The address to query the balance of.

### [`GiniTokenSale`](./contracts/GiniTokenSale.sol) Contract

#### Overview

The [`GiniTokenSale`](./contracts/GiniTokenSale.sol) contract is a smart contract designed to facilitate the sale of Gini tokens. It allows users to purchase Gini tokens using a specified purchase token (e.g., stablecoins) during a defined sale phase. The contract includes various safety checks and administrative functions to manage the sale process.

#### Libraries

-   **SafeERC20**: This library from OpenZeppelin is used to wrap around ERC20 operations that throw on failure, ensuring safety in token transfers.

#### Structs

-   **SalePhase**: Stores the start and end timestamps of the sale.
    -   `uint256 start`: The start timestamp of the sale.
    -   `uint256 end`: The end timestamp of the sale.

#### Storage Variables

-   **salePhase**: Stores the start and end timestamps of the sale.
-   **giniPrice**: Stores the price of the Gini token.
-   **purchaseTokenDecimals**: Stores the amount of token decimals of the purchase token.
-   **totalSupply**: Stores the total remaining amount of Gini tokens that can be purchased.
-   **purchaseToken**: Stores the purchase token.
-   **gini**: Stores the Gini token.
-   **purchaseAmount**: Maps the address of the user to the amount of purchased Gini tokens.

#### Errors

-   **InvalidPhaseParams(uint256 start, uint256 end)**: Reverts if invalid phase parameters are passed.
-   **ZeroAddress()**: Reverts if a zero address is passed.
-   **InsufficientValue()**: Reverts if an insufficient value is passed.
-   **WithdrawingDuringSale()**: Reverts if withdrawing during the sale.
-   **CannotBuyZeroTokens()**: Reverts if attempting to buy zero tokens.
-   **OnlyWhileSalePhase()**: Reverts if the purchase is not during the sale time.
-   **NotAllowedDuringSale()**: Reverts if an action is not allowed during the sale.
-   **TotalSupplyReached()**: Reverts if the total supply is reached.

#### Events

-   **SalePhaseSet(uint256 start, uint256 end)**: Emitted when the sale phase is set.
-   **SetGiniPrice(uint256 value)**: Emitted when the Gini price is set.
-   **SetPurchaseToken(address token)**: Emitted when the purchase token is set.
-   **Withdraw(address token, address recipient, uint256 value)**: Emitted when withdrawing ERC20 tokens or native tokens.
-   **SetGiniToken(address gini)**: Emitted when the Gini token is set.
-   **Purchase(address user, uint256 amount)**: Emitted when a purchase is made.
-   **SetTotalSupply(uint256 value)**: Emitted when the total supply is set.

#### Constructor

Initializes the contract with the given parameters:

```solidity
constructor(
    uint256 _giniPrice,
    uint256 _saleStart,
    uint256 _saleEnd,
    address _purchaseToken,
    uint256 _totalSupply
)
```

-   `_giniPrice`: The price of the Gini token.
-   `_saleStart`: The start timestamp of the sale.
-   `_saleEnd`: The end timestamp of the sale.
-   `_purchaseToken`: The address of the purchase token.
-   `_totalSupply`: The total remaining amount of Gini tokens that can be purchased.

#### External Functions

-   **purchase(uint256 \_value)**: Allows the user to purchase Gini tokens.

    -   `_value`: The amount of stablecoins to send to the contract.

-   **withdrawRemainingTokens(address \_token, address \_recipient)**: Allows admin to withdraw the remaining ERC20 or native token.

    -   `_token`: The address of the token. If zero address, it will withdraw native token.
    -   `_recipient`: The address of the recipient.

-   **receive() external payable**: Allows the contract to receive ETH.

-   **setGiniToken(address \_token)**: Allows admin to set the address of the Gini token.

    -   `_token`: The address of the Gini token.

-   **getReceivedAmount(uint256 \_purchaseAmount) external view returns (uint256)**: Calculates the amount to receive of Gini tokens.

    -   `_purchaseAmount`: The amount of purchase token.

-   **getSaleTime() external view returns (uint256, uint256)**: Returns the start and end time of the sale.

#### Internal Functions

-   **\_setTotalSupply(uint256 \_value)**: Sets the total supply of Gini tokens.

    -   `_value`: The total remaining amount of Gini tokens that can be purchased.

-   **\_setSalePhase(uint256 \_start, uint256 \_end)**: Sets the sale phase.

    -   `_start`: The start timestamp of the sale.
    -   `_end`: The end timestamp of the sale.

-   **\_setGiniPrice(uint256 \_price)**: Sets the price of the Gini token.

    -   `_price`: The price of the Gini token.

-   **\_setPurchaseToken(address \_token)**: Sets the purchase token.

    -   `_token`: The address of the purchase token.

-   **\_calcAmountToReceive(uint256 \_value) internal view returns (uint256)**: Calculates the amount of Gini tokens to receive based on the purchase value.
    -   `_value`: The amount of stablecoins sent to the contract.

### Documentation for [`GiniVesting`](./contracts/GiniVesting.sol) Contract

#### Overview

The [`GiniVesting`](./contracts/GiniVesting.sol) contract is designed to manage the vesting of Gini tokens. It allows tokens to be released to beneficiaries over a specified vesting schedule. The contract ensures that tokens are released gradually and only after the vesting cliff has passed.

#### Libraries

-   **SafeERC20**: This library from OpenZeppelin is used to wrap around ERC20 operations that throw on failure, ensuring safety in token transfers.

#### Structs

-   **Beneficiary**: Stores the vesting information for a beneficiary.

    -   `uint256 totalAllocations`: The total amount that the beneficiary is allowed to claim.
    -   `uint256 claimedAmount`: The amount that the beneficiary has already claimed.
    -   `bool areTotallyClaimed`: Indicates if the beneficiary has already claimed all tokens.

-   **VestingPeriod**: Defines the design of a vesting period.
    -   `uint256 cliffStartTimestamp`: The start timestamp of the cliff period.
    -   `uint256 startTimestamp`: The start timestamp of the vesting period.
    -   `uint256 endTimestamp`: The end timestamp of the vesting period.
    -   `uint256 duration`: The duration of the vesting period.

#### Storage Variables

-   **CLAIM_INTERVAL**: The interval at which claims can be made.

    -   `uint256 public CLAIM_INTERVAL = 30 days`: The claim interval in days.

-   **vestingPeriods**: A mapping that stores the vesting periods for each vesting ID.

    -   `mapping(uint256 => VestingPeriod) public vestingPeriods`: Maps a vesting ID to its vesting period.

-   **commonAllocations**: A mapping that stores the total allocations for all accounts for each vesting ID.

    -   `mapping(uint256 => uint256) public commonAllocations`: Maps a vesting ID to its total allocations.

-   **totalClaims**: A mapping that stores the total claims for all accounts for each vesting ID.

    -   `mapping(uint256 => uint256) public totalClaims`: Maps a vesting ID to its total claims.

-   **userVestings**: A mapping that stores all vesting IDs for each user.

    -   `mapping(address => uint256[]) public userVestings`: Maps a user address to an array of vesting IDs.

-   **beneficiaries**: A mapping that stores the beneficiary information for each vesting ID.

    -   `mapping(uint256 => mapping(address => Beneficiary)) public beneficiaries`: Maps a vesting ID and beneficiary address to their beneficiary information.

-   **gini**: The ERC20 token being vested.

    -   `IERC20 public gini`: The ERC20 token contract.

-   **totalSupply**: The total supply of the vesting token.

    -   `uint256 public totalSupply`: The total supply of the vesting token.

-   **totalClaimsForAll**: The total amount of claims from all users and vestings.
    -   `uint256 public totalClaimsForAll`: The total amount of claims from all users and vestings.

#### Errors

-   **ZeroAddress()**: Reverted when a zero address is provided where a valid address is required.
-   **ArraysLengthMismatch(uint256 length1, uint256 length2)**: Reverted when the lengths of two arrays do not match.
-   **NoBeneficiaries()**: Reverted when there are no beneficiaries.
-   **ZeroVestingAmount(address \_beneficiary)**: Reverted when a zero vesting amount is passed.
-   **BeneficiaryAlreadyExists(address \_beneficiary)**: Reverted when a beneficiary already exists.
-   **InvalidVestingParams(uint256 \_cliffStartTimestamp, uint256 \_startTimestamp, uint256 \_endTimestamp)**: Reverted when vesting parameters are invalid.
-   **AlreadyInitialized()**: Reverted when the vesting is already initialized.
-   **CannotBeZero()**: Reverted when the total supply is zero.
-   **TotalSupplyReached()**: Reverted when the total supply is reached.
-   **VestingTokenRescue(address token)**: Reverted when the vesting token rescue fails.
-   **NothingToClaim()**: Reverted when there is nothing to claim.
-   **OnlyAfterVestingStart(uint256 vestingID)**: Reverted when the vesting is not started yet.
-   **ClaimAmountExceedsVestingAmount(uint256 \_vestingID, address \_beneficiary, uint256 \_claimAmount, uint256 \_totalAllocations)**: Reverted when the claim amount exceeds the vesting amount.

#### Events

-   **Claim(address indexed \_user, uint256 \_vestingID, uint256 indexed \_amount)**: Emitted when a claim is successful.

    -   `_user`: The address of the user.
    -   `_vestingID`: The ID of the vesting.
    -   `_amount`: The amount of the claim.

-   **VestingInitialized(uint256 indexed vestingID, uint256 cliffStartTimestamp, uint256 startTimestamp, uint256 endTimestamp)**: Emitted when the vesting is initialized.

    -   `vestingID`: The ID of the vesting.
    -   `cliffStartTimestamp`: The start timestamp of the cliff period.
    -   `startTimestamp`: The start timestamp of the vesting.
    -   `endTimestamp`: The end timestamp of the vesting.

-   **SetGiniToken(address token)**: Emitted when the token for the vesting is set.

    -   `token`: The address of the token.

-   **ERC20Rescued(address indexed \_token, address indexed \_to, uint256 indexed \_amount)**: Emitted when ERC20 tokens are rescued.
    -   `_token`: The address of the token.
    -   `_to`: The address to send tokens to.
    -   `_amount`: The amount of tokens rescued.

#### Modifiers

-   **notZeroAddress(address \_address)**: Ensures that the provided address is not zero.
    -   `_address`: The address to check.

#### Constructor

Initializes the contract with the given parameters:

```solidity
constructor(uint256 _totalSupply)
```

-   `_totalSupply`: The total amount of tokens that can be allocated.

#### External Functions

-   **initVesting(uint256 \_vestingID, uint256 \_cliffStartTimestamp, uint256 \_startTimestamp, uint256 \_endTimestamp, address[] calldata \_beneficiaries, uint256[] calldata \_amounts)**: Initializes a new vesting schedule.

    -   `_vestingID`: The ID of the vesting.
    -   `_cliffStartTimestamp`: The start timestamp of the cliff period.
    -   `_startTimestamp`: The start timestamp of the vesting.
    -   `_endTimestamp`: The end timestamp of the vesting.
    -   `_beneficiaries`: An array of beneficiary addresses.
    -   `_amounts`: An array of amounts corresponding to each beneficiary.

-   **claim(uint256 \_vestingID)**: Claims tokens from the specified vesting.

    -   `_vestingID`: The ID of the vesting.

-   **claimAll()**: Claims all available tokens from all vestings of the caller.

-   **rescueERC20(IERC20 \_token, address \_to)**: Rescues ERC20 tokens from the contract.

    -   `_token`: The address of the token to rescue.
    -   `_to`: The address to send tokens to.

-   **setGiniToken(address \_token)**: Sets the Gini token that will be used for vesting.
    -   `_token`: The address of the token.

#### Public Functions

-   **calculateClaimAmount(address \_beneficiary, uint256 \_vestingID)**: Calculates the claim amount for the beneficiary.

    -   `_beneficiary`: The address of the beneficiary.
    -   `_vestingID`: The ID of the vesting.
    -   Returns: The amount of tokens that can be claimed by the beneficiary.

-   **getVestingData(uint256 \_vestingID)**: Returns all vesting data.

    -   `_vestingID`: The ID of the vesting.
    -   Returns: The vesting period, total allocations, and claimed amount.

-   **getClaimsAmountForAllVestings(address \_beneficiary)**: Returns all info about available claim amount for all vestings of the user.

    -   `_beneficiary`: The address of the beneficiary.
    -   Returns: The total amount, user vestings, and amounts.

-   **getVestingsDuration(address \_beneficiary)**: Returns all vestings duration of the beneficiary.

    -   `_beneficiary`: The address of the beneficiary.
    -   Returns: The user vestings and vestings duration.

-   **getAllocationsForAllVestings(address \_beneficiary)**: Returns total allocations amount for each vesting ID of the beneficiary.

    -   `_beneficiary`: The address of the beneficiary.
    -   Returns: The user vestings and total allocations.

-   **getTotalClaims(address \_beneficiary)**: Returns total claims from all vestings of the beneficiary.

    -   `_beneficiary`: The address of the beneficiary.
    -   Returns: The user vestings and total claimed amount.

-   **getUserVestings(address \_beneficiary)**: Returns an array of all user vestings.
    -   `_beneficiary`: The address of the beneficiary.
    -   Returns: The user vestings.

#### Internal Functions

-   **\_addBeneficiary(uint256 \_vestingID, address \_beneficiary, uint256 \_amount)**: Adds a beneficiary to the vesting.

    -   `_vestingID`: The ID of the vesting.
    -   `_beneficiary`: The address of the beneficiary.
    -   `_amount`: The amount of tokens to be vested.

-   **\_validateNSetVesting(uint256 \_vestingID, uint256 \_cliffStartTimestamp, uint256 \_startTimestamp, uint256 \_endTimestamp)**: Validates and sets the vesting parameters.

    -   `_vestingID`: The ID of the vesting.
    -   `_cliffStartTimestamp`: The start timestamp of the cliff period.
    -   `_startTimestamp`: The start timestamp of the vesting.
    -   `_endTimestamp`: The end timestamp of the vesting.

-   **\_calcClaimableAmount(uint256 \_timestamp, uint256 \_totalAllocations, uint256 \_startTimestamp, uint256 \_duration)**: Calculates the amount that the beneficiary is allowed to claim.

    -   `_timestamp`: The current timestamp.
    -   `_totalAllocations`: The total amount that the beneficiary is allowed to claim.
    -   `_startTimestamp`: The start timestamp of the vesting.
    -   `_duration`: The duration of the vesting.
    -   Returns: The claimable amount.

-   **\_secondsToMonth(uint256 \_seconds)**: Converts seconds to months.
    -   `_seconds`: The number of seconds.
    -   Returns: The number of months.

### Documentation for [`deploy.ts`](./scripts/deployment/deploy.ts) and how to run it

#### Description

This script is used for the deployment and automatic verification of all the contracts located in the [`contracts/`](./contracts/) directory. The script ensures that the contracts are deployed in the correct order and that their interdependencies are properly configured.

#### Detailed Steps

1. **Import Statements**

    - The script imports necessary modules and functions, including deployment functions for each contract and helper functions for time manipulation and decimal adjustments.

    ```typescript
    import { addDec } from "../../test/helpers";
    import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
    import { deployGiniTokenSale } from "./separately/exported-functions/deployGiniTokenSale";
    import { deployGiniVesting } from "./separately/exported-functions/deployGiniVesting";
    import { deployGiniToken } from "./separately/exported-functions/deployGiniToken";
    ```

2. **Main Function**

    - The `main` function is the core of the script, where the deployment process is defined.

    ```typescript
    async function main() {
    ```

3. **Deployment and Verification of `GiniTokenSale`**

    - Sets up the data required for deploying the `GiniTokenSale` contract, including the token price, start and end times, purchase token address, and total supply.

    ```typescript
    const giniPrice = addDec(0.5); // equal to 0.5 stable coin
    const saleStart = (await time.latest()) + 1000; // Means that the sale will start after 1000 seconds of running the script
    const saleEnd = saleStart + time.duration.years(1); // Means that the sale will end after 1 year
    const purchaseToken = ""; // The address of the stable coin
    const totalSupply = addDec(30_000); // Total supply for the sale

    const giniTokenSale = await deployGiniTokenSale(giniPrice, saleStart, saleEnd, purchaseToken, totalSupply);
    ```

4. **Deployment and Verification of `GiniVesting`**

    - Sets up the data required for deploying the `GiniVesting` contract, including the total supply for vesting.

    ```typescript
    const totalSupplyForVesting = addDec(10_000); // The total supply for the all vestings
    const giniVesting = await deployGiniVesting(totalSupplyForVesting);
    ```

5. **Deployment and Verification of `GiniToken`**

    - Sets up the data required for deploying the `GiniToken` contract, including the token's name, symbol, total supply, and the addresses of the previously deployed `GiniTokenSale` and `GiniVesting` contracts.

    ```typescript
    const name = "Gini"; // The name of the token
    const symbol = "GINI"; // The symbol of the token
    const tokenTotalSupply = addDec(100_000_000); // The total supply of the token
    const tokenSaleContract = giniTokenSale.target.toString(); // The address of the token sale contract
    const tokenVestingContract = giniVesting.target.toString(); // The address of the token vesting contract

    const gini = await deployGiniToken(name, symbol, tokenTotalSupply, tokenSaleContract, tokenVestingContract);
    ```

6. **Linking Contracts**

    - Sets the `GiniToken` address on both the `GiniTokenSale` and `GiniVesting` contracts.

    ```typescript
    await giniTokenSale.setGiniToken(gini);
    await giniVesting.setGiniToken(gini);
    ```

#### How to Run the Script

To run the deployment script, use the following command in your terminal:

```bash
npx hardhat run scripts/deployment/deploy.ts --network <network-name>
```

Replace `<network-name>` with the name of the network you want to deploy to (e.g., `mainnet`, `sepolia`, etc.).

### How to Run and deploy contracts separately

In the folder [`separately`](./scripts/deployment/separately/) there are 3 scripts for separately deployment

They have same settings as for the combined deployment.

The order for the separately deployment:

1. `Gini Token Sale` (after deployment save the address of the token sale contract).
2. `Gini Vesting` (after deployment save the address of the token vesting contract).
3. `Gini Token` (Set nearly deploy contracts required for the constructor).
