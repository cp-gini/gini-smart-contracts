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

## Smart contracts documentation

Documentation for all smart contracts can be found by the following links:

-   [`GiniToken`](./specs/GiniToken.md): documentation for the GINI token.
-   [`GiniTokenSale`](./specs/GiniTokenSale.md): documentation for the token sale.
-   [`GiniVesting`](./specs/GiniVesting.md): documentation for the vesting contract.

### Documentation for deployment scripts and how to run it

#### Setup preparation

All necessary settings for the deployment can be found [`here`](./settings.json). This JSON file contains configuration settings for the Gini token ecosystem, including addresses for various contracts and timestamps for vesting and token sale events.

```json
{
    "addresses": {
        "GiniToken": "",
        "GiniTokenSale": "",
        "GiniVesting": "",
        "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7" // USDT address on Ethereum mainnet
    },
    "vestingStartTimestamp": 1727136000, // Tuesday, September 24, 2024 12:00:00 AM (GMT)
    "giniPricePerUSDT": 1,
    "saleStartTimestamp": 0,
    "saleEndTimestamp": 0
}
```

#### Fields

-   **addresses**: An object containing the addresses of various contracts and tokens.

    -   **GiniToken**: The address of the Gini token contract. This field is currently empty and should be populated with the actual contract address after deploy.
    -   **GiniTokenSale**: The address of the Gini token sale contract. This field is currently empty and should be populated with the actual contract address after deploy.
    -   **GiniVesting**: The address of the Gini vesting contract. This field is currently empty and should be populated with the actual contract address after deploy.
    -   **USDT**: The address of the USDT (Tether) token on the Ethereum mainnet. This is set to `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

-   **vestingStartTimestamp**: The start timestamp for the vesting period, set to `1727136000`, which corresponds to Tuesday, September 24, 2024, 12:00:00 AM (GMT).

-   **giniPricePerUSDT**: The price of one Gini token in terms of USDT. This is set to `1`, indicating that 1 Gini token costs 1 USDT. In case when 1 USDT token is equal to 2 GINI tokens, price must be set to `2`

-   **saleStartTimestamp**: The start timestamp for the token sale. This field is currently set to `0` and should be updated with the actual start timestamp.

-   **saleEndTimestamp**: The end timestamp for the token sale. This field is currently set to `0` and should be updated with the actual end timestamp. The token sale contract also has option to prolong sale end.

### Query of the deployment

1. Token sale contract
2. Token vesting contract
3. Token contract

### Documentation for [`GiniTokenSale.ts`](./scripts/deployment/separately/GiniTokenSale.ts)

This TypeScript file is responsible for deploying the Gini token sale by utilizing the [`deployGiniTokenSale`](./scripts/deployment/separately/exported-functions/deployGiniTokenSale.ts) function and configuration settings from a JSON file.

#### Imports

-   **deployGiniTokenSale**: A function imported from `./exported-functions/deployGiniTokenSale` that handles the deployment of the Gini token sale.
-   **addDec**: A helper function imported from `../../../test/helpers` that adjusts the decimal places for the Gini price.
-   **settings**: Configuration settings imported from `../../../settings.json`, which includes addresses for various contracts and other parameters.

#### Main Function

The `main` function is an asynchronous function that performs the following steps:

1. **Retrieve and Adjust Gini Price**:

    - `giniPrice`: The price of Gini tokens in terms of USDT, adjusted using the `addDec` helper function.

    ❌Make sure you read block about settings and how to set the price properly❌

2. **Retrieve Sale Timestamps**:
    - `saleStart`: The start timestamp for the token sale, retrieved from `settings.saleStartTimestamp`.
    - `saleEnd`: The end timestamp for the token sale, retrieved from `settings.saleEndTimestamp`.
3. **Retrieve Purchase Token Address**:

    - `purchaseToken`: The address of the stable coin (USDT) that will be used for purchasing Gini tokens, retrieved from `settings.addresses.USDT`.

4. **Deploy Gini Token Sale**: Calls the `deployGiniTokenSale` function with the retrieved and adjusted parameters as arguments.

#### Verification on the Etherscan

The script will automatically verify smart contract on the etherscan, make sure you set the `ETHERSCAN_API_KEY` in `.env` file.

#### Running the Script

To run this script, use the following command in your terminal:

```bash
npx hardhat run scripts/deployment/separately/GiniTokenSale.ts --network mainnet
```

### Documentation for [`GiniVesting.ts`](/scripts/deployment/separately/GiniVesting.ts)

This TypeScript file is responsible for deploying the Gini vesting contract by utilizing the [`deployGiniVesting`](./scripts/deployment/separately/exported-functions/deployGiniVesting.ts) function and configuration settings from a JSON file.

❌Make sure you read block about settings and set the correct start timestamp properly❌

#### Imports

-   **deployGiniVesting**: A function imported from `./exported-functions/deployGiniVesting` that handles the deployment of the Gini vesting contract.
-   **settings**: Configuration settings imported from `../../../settings.json`, which includes addresses for various contracts and other parameters.

#### Main Function

The `main` function is an asynchronous function that performs the following steps:

1. **Retrieve Vesting Start Timestamp**:

    - `startTimestamp`: The timestamp when the vestings will start, retrieved from `settings.vestingStartTimestamp`.

2. **Deploy Gini Vesting**: Calls the `deployGiniVesting` function with the retrieved start timestamp as an argument.

#### Verification on the Etherscan

The script will automatically verify smart contract on the etherscan, make sure you set the `ETHERSCAN_API_KEY` in `.env` file.

#### Running the Script

To run this script, use the following command in your terminal:

```bash
npx hardhat run scripts/deployment/separately/GiniVesting.ts --network mainnet
```

### Documentation for [`GiniToken.ts`](/scripts/deployment/separately/GiniToken.ts)

This TypeScript file is responsible for deploying the Gini token by utilizing the [`deployGiniToken`](./scripts/deployment/separately/exported-functions/deployGiniToken.ts) function and configuration settings from a JSON file.

❌Make sure you read block about settings and set the addresses of the `GiniTokenSale` and `GiniVesting` contracts that you already deployed❌

#### Imports

-   **deployGiniToken**: A function imported from `./exported-functions/deployGiniToken` that handles the deployment of the Gini token.
-   **settings**: Configuration settings imported from `../../../settings.json`, which includes addresses for various contracts.

#### Main Function

The `main` function is an asynchronous function that performs the following steps:

1. **Retrieve Contract Addresses**:
    - `tokenSaleContract`: The address of the token sale contract, retrieved from `settings.addresses.GiniTokenSale`.
    - `tokenVestingContract`: The address of the token vesting contract, retrieved from `settings.addresses.GiniVesting`.
2. **Deploy Gini Token**: Calls the `deployGiniToken`function with the retrieved contract addresses as arguments.

#### Verification on the Etherscan

The script will automatically verify smart contract on the etherscan, make sure you set the `ETHERSCAN_API_KEY` in `.env` file.

#### Running the Script

To run this script, use the following command in your terminal:

```bash
npx hardhat run scripts/deployment/separately/GiniToken.ts --network mainnet
```
