// This script contains the function for deployment and verification of the `contracts/PositiveEvenSetter.sol`.
import hre from "hardhat";

import { GiniToken } from "../../../../typechain-types";

const ethers = hre.ethers;

async function deployGiniToken(
    name: string,
    symbol: string,
    totalSupply: bigint,
    tokenSale: string,
    tokenVesting: string
): Promise<GiniToken> {
    /*
     * Hardhat always runs the compile task when running scripts with its command line interface.
     *
     * If this script is run directly using `node`, then it should be called compile manually
     * to make sure everything is compiled.
     */
    // await hre.run("compile");

    const [deployer] = await ethers.getSigners();

    // Deployment.
    const gini = await ethers.deployContract(
        "GiniToken",
        [name, symbol, totalSupply, tokenSale, tokenVesting],
        deployer
    );
    await gini.waitForDeployment();

    console.log(`\`Gini Token \` is deployed to ${gini.target}.`);

    // Verification of the deployed contract.
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("Sleeping before verification...");
        await new Promise((resolve) => setTimeout(resolve, 60000)); // 60 seconds.

        await hre.run("verify:verify", {
            address: gini.target,
            constructorArguments: [name, symbol, totalSupply, tokenSale, tokenVesting]
        });
    }

    return gini;
}

export { deployGiniToken };
