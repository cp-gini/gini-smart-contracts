import { deployGiniToken } from "./exported-functions/deployGiniToken";
import { addDec } from "../../../test/helpers";

async function main() {
    const name = "Gini"; // The name of the token
    const symbol = "GINI"; // The symbol of the token
    const totalSupply = addDec(100_000_000); // The total supply of the token
    const tokenSaleContract = ""; // The address of the token sale contract
    const tokenVestingContract = ""; // The address of the token vesting contract

    await deployGiniToken(name, symbol, totalSupply, tokenSaleContract, tokenVestingContract);
}

// This pattern is recommended to be able to use async/await everywhere and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
