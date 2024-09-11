// This is a script for deployment and automatically verification of all the contracts (`contracts/`).
import hre from "hardhat";
import { addDec } from "../../test/helpers";
import { deployGiniTokenSale } from "./separately/exported-functions/deployGiniTokenSale";
import { deployGiniVesting } from "./separately/exported-functions/deployGiniVesting";
import { deployGiniToken } from "./separately/exported-functions/deployGiniToken";

import settings from "../../settings.json";

async function main() {
    // Deployment and verification of the `contracts/GiniTokenSale.sol`.
    // Data for the GiniTokenSale
    const giniPrice = addDec(settings.giniPricePerUSDT); // If price is 0.5, then for 1 USDT you will get 0.5 Gini
    const saleStart = settings.saleStartTimestamp;
    const saleEnd = settings.saleEndTimestamp;
    const purchaseToken = settings.addresses.USDT; // The address of the stable coin that will be used for purchasing Gini

    const giniTokenSale = await deployGiniTokenSale(giniPrice, saleStart, saleEnd, purchaseToken);

    // Deployment and verification of the `contracts/GiniVesting.sol`.
    // Data for the GiniVesting
    const startTimestamp = settings.vestingStartTimestamp; // The timestamp when the vestings will start
    const giniVesting = await deployGiniVesting(startTimestamp);

    // Deployment and verification of the `contracts/GiniToken.sol`.
    const gini = await deployGiniToken(giniTokenSale.target.toString(), giniTokenSale.target.toString());

    // Set the Gini token on the token sale contract
    await giniTokenSale.setGiniToken(gini);

    // Set the Gini token on the token vesting contract
    await giniVesting.setGiniToken(gini);
}

// This pattern is recommended to be able to use async/await everywhere and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
