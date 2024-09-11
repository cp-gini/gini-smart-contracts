import { deployGiniVesting } from "./exported-functions/deployGiniVesting";
import settings from "../../../settings.json";

async function main() {
    const startTimestamp = settings.vestingStartTimestamp; // The timestamp when the vestings will start

    await deployGiniVesting(startTimestamp);
}

// This pattern is recommended to be able to use async/await everywhere and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
