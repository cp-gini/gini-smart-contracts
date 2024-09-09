import { deployGiniToken } from "./exported-functions/deployGiniToken";
import { addDec } from "../../../test/helpers";

async function main() {
    const name = "Gini"; // The name of the token
    const symbol = "GINI"; // The symbol of the token
    const totalSupply = addDec(100_000_000); // The total supply of the token
    const tokenSaleContract = "0x01B24DC9Dcd1a471fF7987570f11456C19D40c55"; // The address of the token sale contract
    const tokenVestingContract = "0xA6990EB2249Ac12C6ff1f0A670Ae93B88eAB0444"; // The address of the token vesting contract

    await deployGiniToken(name, symbol, totalSupply, tokenSaleContract, tokenVestingContract);
}

// This pattern is recommended to be able to use async/await everywhere and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
