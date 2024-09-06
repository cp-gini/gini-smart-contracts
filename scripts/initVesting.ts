// eslint-disable-next-line @typescript-eslint/unbound-method
import { time } from "@nomicfoundation/hardhat-network-helpers";

import hre from "hardhat";
import { addDec } from "../test/helpers";

const ethers = hre.ethers;
const duration = time.duration;

// Addresses
const VESTING = "";

async function initVesting() {
    // Get signer
    const [admin] = await ethers.getSigners();

    // Get vesting contract
    const vesting = await ethers.getContractAt("GiniVesting", VESTING);

    // Prepare data for the vesting
    const vestingID = 1; // ID of the vesting
    const cliffStartTimestamp = (await time.latest()) + 100; // Cliff start timestamp of the vesting
    const startTimestamp = cliffStartTimestamp + 1000; // Start timestamp of the vesting
    const endTimestamp = startTimestamp + 1000; // End timestamp of the vesting
    const beneficiaries = [admin.address];
    const amounts = [addDec(250)];

    // Initialize vesting
    await vesting.initVesting(vestingID, cliffStartTimestamp, startTimestamp, endTimestamp, beneficiaries, amounts);
}

initVesting().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
