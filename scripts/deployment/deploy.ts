// This is a script for deployment and automatically verification of all the contracts (`contracts/`).
import hre from "hardhat";
import { deployGiniTokenSale } from "./separately/exported-functions/deployGiniTokenSale";
import { addDec } from "../../test/helpers";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployGiniVesting } from "./separately/exported-functions/deployGiniVesting";
import { deployGiniToken } from "./separately/exported-functions/deployGiniToken";

const ethers = hre.ethers;

async function main() {
    // Deployment and verification of the `contracts/GiniTokenSale.sol`.
    // Data for the GiniTokenSale
    const giniPrice = addDec(0.5); // equal to 0.5 stable coin
    const saleStart = (await time.latest()) + 1000; // Means that the sale will start after 1000 seconds of running the script
    const saleEnd = saleStart + time.duration.years(1); // Means that the sale will end after 1 year
    const purchaseToken = ""; // The address of the stable coin
    const totalSupply = addDec(30_000); // Total supply for the sale

    const giniTokenSale = await deployGiniTokenSale(giniPrice, saleStart, saleEnd, purchaseToken, totalSupply);

    // Deployment and verification of the `contracts/GiniVesting.sol`.
    const totalSupplyForVesting = addDec(10_000); // The total supply for the all vestings
    const giniVesting = await deployGiniVesting(totalSupplyForVesting);

    // Deployment and verification of the `contracts/GiniToken.sol`.
    // Data for the GiniToken
    const name = "Gini"; // The name of the token
    const symbol = "GINI"; // The symbol of the token
    const tokenTotalSupply = addDec(100_000_000); // The total supply of the token
    const tokenSaleContract = giniTokenSale.target.toString(); // The address of the token sale contract
    const tokenVestingContract = giniVesting.target.toString(); // The address of the token vesting contract

    const gini = await deployGiniToken(name, symbol, tokenTotalSupply, tokenSaleContract, tokenVestingContract);

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
