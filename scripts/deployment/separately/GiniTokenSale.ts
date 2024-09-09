import { deployGiniTokenSale } from "./exported-functions/deployGiniTokenSale";
import { addDec } from "../../../test/helpers";

async function main() {
    const giniPrice = addDec(0.5); // equal to 0.5 stable coin
    const saleStart = 1725917296; // Means that the sale will start after 1000 seconds of running the script
    const saleEnd = 1725918296; // Means that the sale will end after 1 year
    const purchaseToken = "0x134bd58282Fe7c8EbBD6dEd8b30e0E02861F5c95"; // The address of the stable coin
    const totalSupply = addDec(30_000); // Total supply for the sale

    await deployGiniTokenSale(giniPrice, saleStart, saleEnd, purchaseToken, totalSupply);
}

// This pattern is recommended to be able to use async/await everywhere and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
