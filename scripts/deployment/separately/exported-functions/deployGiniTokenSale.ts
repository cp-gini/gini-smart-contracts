// This script contains the function for deployment and verification of the `contracts/PositiveEvenSetter.sol`.
import hre from "hardhat";

import { GiniTokenSale } from "../../../../typechain-types";

const ethers = hre.ethers;

async function deployGiniTokenSale(
    giniPrice: bigint,
    saleStart: number,
    saleEnd: number,
    purchaseToken: string,
    saleTotalSupply: bigint
): Promise<GiniTokenSale> {
    /*
     * Hardhat always runs the compile task when running scripts with its command line interface.
     *
     * If this script is run directly using `node`, then it should be called compile manually
     * to make sure everything is compiled.
     */
    // await hre.run("compile");

    const [deployer] = await ethers.getSigners();

    // Deployment.
    const giniTokenSale = await ethers.deployContract(
        "GiniTokenSale",
        [giniPrice, saleStart, saleEnd, purchaseToken, saleTotalSupply],
        deployer
    );
    await giniTokenSale.waitForDeployment();

    console.log(`\`Gini Token Sale\` is deployed to ${giniTokenSale.target}.`);

    // Verification of the deployed contract.
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("Sleeping before verification...");
        await new Promise((resolve) => setTimeout(resolve, 60000)); // 60 seconds.

        await hre.run("verify:verify", {
            address: giniTokenSale.target,
            constructorArguments: [giniPrice, saleStart, saleEnd, purchaseToken, saleTotalSupply]
        });
    }

    return giniTokenSale;
}

export { deployGiniTokenSale };
