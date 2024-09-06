import { deployGiniVesting } from "./exported-functions/deployGiniVesting";
import { addDec } from "../../../test/helpers";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

async function main() {
    const totalSupply = addDec(10_000); // The total supply for the all vestings

    await deployGiniVesting(totalSupply);
}

// This pattern is recommended to be able to use async/await everywhere and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
