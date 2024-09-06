import { addDec } from "../../../test/helpers";
import { ethers } from "hardhat";
import hre from "hardhat";
async function main() {
    // This script contains the function for deployment and verification of the `contracts/USDC.sol`.

    const [deployer] = await ethers.getSigners();

    // Data for the USDC
    const totalSupply = addDec(100_000_00);

    const usdc = await ethers.deployContract("USDC", [totalSupply], deployer);
    await usdc.waitForDeployment();

    console.log(`\`USDC\` is deployed to ${usdc.target}.`);

    // Verification of the deployed contract.
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("Sleeping before verification...");
        await new Promise((resolve) => setTimeout(resolve, 60000)); // 60 seconds.

        await hre.run("verify:verify", {
            address: usdc.target,
            constructorArguments: [totalSupply]
        });
    }
}

// This pattern is recommended to be able to use async/await everywhere and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
