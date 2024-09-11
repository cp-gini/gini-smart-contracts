import { deployGiniTokenSale } from "./exported-functions/deployGiniTokenSale";
import { addDec } from "../../../test/helpers";
import settings from "../../../settings.json";

async function main() {
    const giniPrice = addDec(settings.giniPricePerUSDT); // If price is 0.5, then for 1 USDT you will get 0.5 Gini
    const saleStart = settings.saleStartTimestamp;
    const saleEnd = settings.saleEndTimestamp;
    const purchaseToken = settings.addresses.USDT; // The address of the stable coin that will be used for purchasing Gini

    await deployGiniTokenSale(giniPrice, saleStart, saleEnd, purchaseToken);
}

// This pattern is recommended to be able to use async/await everywhere and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
