import { deployGiniTokenSale } from "./exported-functions/deployGiniTokenSale";
import { addDec } from "../../../test/helpers";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

async function main() {
    const giniPrice = addDec(0.5); // equal to 0.5 stable coin
    const saleStart = (await time.latest()) + 1000; // Means that the sale will start after 1000 seconds of running the script
    const saleEnd = saleStart + time.duration.years(1); // Means that the sale will end after 1 year
    const purchaseToken = ""; // The address of the stable coin
    const totalSupply = addDec(30_000); // Total supply for the sale

    await deployGiniTokenSale(giniPrice, saleStart, saleEnd, purchaseToken, totalSupply);
}

// This pattern is recommended to be able to use async/await everywhere and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
