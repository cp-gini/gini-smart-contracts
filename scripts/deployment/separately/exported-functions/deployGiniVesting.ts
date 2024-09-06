// This script contains the function for deployment and verification of the `contracts/PositiveEvenSetter.sol`.
import hre from "hardhat";

import { GiniVesting } from "../../../../typechain-types";

const ethers = hre.ethers;

async function deployGiniVesting(totalSupply: bigint): Promise<GiniVesting> {
    /*
     * Hardhat always runs the compile task when running scripts with its command line interface.
     *
     * If this script is run directly using `node`, then it should be called compile manually
     * to make sure everything is compiled.
     */
    // await hre.run("compile");

    const [deployer] = await ethers.getSigners();

    // Deployment.
    const giniVesting = await ethers.deployContract("GiniVesting", [totalSupply], deployer);
    await giniVesting.waitForDeployment();

    console.log(`\`Gini Vesting\` is deployed to ${giniVesting.target}.`);

    // Verification of the deployed contract.
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("Sleeping before verification...");
        await new Promise((resolve) => setTimeout(resolve, 60000)); // 60 seconds.

        await hre.run("verify:verify", {
            address: giniVesting.target,
            constructorArguments: [totalSupply]
        });
    }

    return giniVesting;
}

export { deployGiniVesting };
