import { deployGiniToken } from "./exported-functions/deployGiniToken";

import settings from "../../../settings.json";

async function main() {
    const tokenSaleContract = settings.addresses.GiniTokenSale; // The address of the token sale contract
    const tokenVestingContract = settings.addresses.GiniVesting; // The address of the token vesting contract

    await deployGiniToken(tokenSaleContract, tokenVestingContract);
}

// This pattern is recommended to be able to use async/await everywhere and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
