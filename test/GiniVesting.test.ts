import type { SnapshotRestorer } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { takeSnapshot, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { expect } from "chai";
import { ethers } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

import { addDec, eth } from "./helpers";
import { GiniToken, GiniTokenSale, GiniVesting, USDC } from "../typechain-types";

describe("GiniVesting", function () {
    let snapshotA: SnapshotRestorer;

    let deployer: HardhatEthersSigner;
    let user1: HardhatEthersSigner;
    let user2: HardhatEthersSigner;
    let sale: HardhatEthersSigner;
    let otherAcc: HardhatEthersSigner;

    let gini: GiniToken;
    let vesting: GiniVesting;
    let usdc: USDC;

    // Constants
    const NAME = "Gini";
    const SYMBOL = "GINI";
    const TOTAL_SUPPLY = addDec(30_000);

    beforeEach(async () => {
        // Getting of signers
        [deployer, sale, otherAcc, user1, user2, otherAcc] = await ethers.getSigners();

        // Deploy purchase token
        usdc = await ethers.deployContract("USDC", [addDec(100_000)]);
        await usdc.waitForDeployment();

        // Deploy vesting contract
        vesting = await ethers.deployContract("GiniVesting", [addDec(10_000)], deployer);
        await vesting.waitForDeployment();

        // Deploy GINI token
        gini = await ethers.deployContract("GiniToken", [NAME, SYMBOL, TOTAL_SUPPLY, sale, vesting], deployer);
        await gini.waitForDeployment();

        // Set Gini token
        await vesting.setGiniToken(gini);

        snapshotA = await takeSnapshot();
    });

    afterEach(async () => await snapshotA.restore());

    describe("# Constructor", function () {
        it("Should set all values correctly", async () => {
            expect(await vesting.totalSupply()).to.equal(addDec(10_000));
            expect(await vesting.hasRole(await vesting.DEFAULT_ADMIN_ROLE(), deployer.address)).to.equal(true);
        });

        it("Should revert if total supply is zero", async () => {
            await expect(ethers.deployContract("GiniVesting", [0])).to.be.revertedWithCustomError(
                vesting,
                "CannotBeZero"
            );
        });
    });

    describe("# Vesting initialization", function () {
        it("Should allow to initialize new vesting", async () => {
            // Prepare data for the vesting
            const vestingID = 1;
            const cliffStartTimestamp = (await time.latest()) + 100;
            const startTimestamp = cliffStartTimestamp + 1000;
            const endTimestamp = startTimestamp + 1000;
            const beneficiaries = [user1, user2];
            const amounts = [addDec(250), addDec(100)];

            // Save data before initialization
            const totalSupply = await vesting.totalSupply();

            // Initialize vesting
            await expect(
                vesting.initVesting(
                    vestingID,
                    cliffStartTimestamp,
                    startTimestamp,
                    endTimestamp,
                    beneficiaries,
                    amounts
                )
            )
                .to.emit(vesting, "VestingInitialized")
                .withArgs(vestingID, cliffStartTimestamp, startTimestamp, endTimestamp);

            const user1Beneficiary = await vesting.beneficiaries(vestingID, user1);
            const user2Beneficiary = await vesting.beneficiaries(vestingID, user2);

            // Check
            expect(await vesting.totalSupply()).to.equal(totalSupply - addDec(250) - addDec(100));
            expect(await vesting.commonAllocations(vestingID)).to.equal(addDec(250) + addDec(100));
            expect(await vesting.vestingPeriods(vestingID)).to.deep.eq([
                cliffStartTimestamp,
                startTimestamp,
                endTimestamp,
                endTimestamp - startTimestamp
            ]);
            expect(await vesting.getUserVestings(user1)).to.deep.eq([vestingID]);
            expect(await vesting.getUserVestings(user2)).to.deep.eq([vestingID]);
            expect(user1Beneficiary).to.deep.eq([addDec(250), 0, false]);
            expect(user2Beneficiary).to.deep.eq([addDec(100), 0, false]);
        });

        it("Should revert if caller is not admin", async () => {
            await expect(vesting.connect(user1).initVesting(1, 0, 0, 0, [], [])).to.be.revertedWithCustomError(
                vesting,
                "AccessControlUnauthorizedAccount"
            );
        });

        it("Should revert if beneficiary is empty", async () => {
            await expect(vesting.initVesting(1, 0, 0, 0, [], [])).to.be.revertedWithCustomError(
                vesting,
                "NoBeneficiaries"
            );
        });

        it("Should revert if beneficiary and amounts have different length", async () => {
            await expect(
                vesting.initVesting(1, 0, 0, 0, [user1], [addDec(250), addDec(100)])
            ).to.be.revertedWithCustomError(vesting, "ArraysLengthMismatch");
        });

        it("Should revert if vesting already exists", async () => {
            // Prepare data for the vesting
            const vestingID = 1;
            const cliffStartTimestamp = (await time.latest()) + 100;
            const startTimestamp = cliffStartTimestamp + 1000;
            const endTimestamp = startTimestamp + 1000;
            const beneficiaries = [user1, user2];
            const amounts = [addDec(250), addDec(100)];

            // Initialize vesting
            await expect(
                vesting.initVesting(
                    vestingID,
                    cliffStartTimestamp,
                    startTimestamp,
                    endTimestamp,
                    beneficiaries,
                    amounts
                )
            )
                .to.emit(vesting, "VestingInitialized")
                .withArgs(vestingID, cliffStartTimestamp, startTimestamp, endTimestamp);

            // Try to initialize again
            await expect(
                vesting.initVesting(
                    vestingID,
                    cliffStartTimestamp,
                    startTimestamp,
                    endTimestamp,
                    beneficiaries,
                    amounts
                )
            ).to.be.revertedWithCustomError(vesting, "AlreadyInitialized");
        });

        it("Should revert if vesting params are invalid", async () => {
            // Prepare data for the vesting
            const vestingID = 1;
            const beneficiaries = [user1, user2];
            const amounts = [addDec(250), addDec(100)];

            const cliffStartTimestamp1 = (await time.latest()) - 1;
            const startTimestamp1 = cliffStartTimestamp1 + 1000;
            const endTimestamp1 = startTimestamp1 + 1000;

            await expect(
                vesting.initVesting(
                    vestingID,
                    cliffStartTimestamp1,
                    startTimestamp1,
                    endTimestamp1,
                    beneficiaries,
                    amounts
                )
            )
                .to.be.revertedWithCustomError(vesting, "InvalidVestingParams")
                .withArgs(cliffStartTimestamp1, startTimestamp1, endTimestamp1);

            const cliffStartTimestamp2 = (await time.latest()) + 100;
            const startTimestamp2 = cliffStartTimestamp2 - 1;
            const endTimestamp2 = startTimestamp2 + 1000;

            await expect(
                vesting.initVesting(
                    vestingID,
                    cliffStartTimestamp2,
                    startTimestamp2,
                    endTimestamp2,
                    beneficiaries,
                    amounts
                )
            )
                .to.be.revertedWithCustomError(vesting, "InvalidVestingParams")
                .withArgs(cliffStartTimestamp2, startTimestamp2, endTimestamp2);

            const cliffStartTimestamp3 = (await time.latest()) + 100;
            const startTimestamp3 = cliffStartTimestamp3 + 1000;
            const endTimestamp3 = startTimestamp3 - 1;

            await expect(
                vesting.initVesting(
                    vestingID,
                    cliffStartTimestamp3,
                    startTimestamp3,
                    endTimestamp3,
                    beneficiaries,
                    amounts
                )
            )
                .to.be.revertedWithCustomError(vesting, "InvalidVestingParams")
                .withArgs(cliffStartTimestamp3, startTimestamp3, endTimestamp3);
        });

        it("Should revert if beneficiary already exists", async () => {
            // Prepare data for the vesting
            const vestingID = 1;
            const cliffStartTimestamp = (await time.latest()) + 100;
            const startTimestamp = cliffStartTimestamp + 1000;
            const endTimestamp = startTimestamp + 1000;
            const beneficiaries = [user1, user1];
            const amounts = [addDec(250), addDec(100)];

            // Initialize vesting
            await expect(
                vesting.initVesting(
                    vestingID,
                    cliffStartTimestamp,
                    startTimestamp,
                    endTimestamp,
                    beneficiaries,
                    amounts
                )
            )
                .to.be.revertedWithCustomError(vesting, "BeneficiaryAlreadyExists")
                .withArgs(user1);
        });

        it("Should revert if zero vesting amount is provided", async () => {
            // Prepare data for the vesting
            const vestingID = 1;
            const cliffStartTimestamp = (await time.latest()) + 100;
            const startTimestamp = cliffStartTimestamp + 1000;
            const endTimestamp = startTimestamp + 1000;
            const beneficiaries = [user1, user2];
            const amounts = [addDec(250), 0];

            // Initialize vesting
            await expect(
                vesting.initVesting(
                    vestingID,
                    cliffStartTimestamp,
                    startTimestamp,
                    endTimestamp,
                    beneficiaries,
                    amounts
                )
            )
                .to.be.revertedWithCustomError(vesting, "ZeroVestingAmount")
                .withArgs(user2);
        });

        it("Should revert if beneficiary is zero address", async () => {
            // Prepare data for the vesting
            const vestingID = 1;
            const cliffStartTimestamp = (await time.latest()) + 100;
            const startTimestamp = cliffStartTimestamp + 1000;
            const endTimestamp = startTimestamp + 1000;
            const beneficiaries = [user1, ethers.ZeroAddress];
            const amounts = [addDec(250), addDec(100)];

            // Initialize vesting
            await expect(
                vesting.initVesting(
                    vestingID,
                    cliffStartTimestamp,
                    startTimestamp,
                    endTimestamp,
                    beneficiaries,
                    amounts
                )
            ).to.be.revertedWithCustomError(vesting, "ZeroAddress");
        });

        it("Should revert if total supply reached", async () => {
            // Prepare data for the vesting
            const vestingID = 1;
            const cliffStartTimestamp = (await time.latest()) + 100;
            const startTimestamp = cliffStartTimestamp + 1000;
            const endTimestamp = startTimestamp + 1000;
            const beneficiaries = [user1];
            const amounts = [(await vesting.totalSupply()) + 1n];

            // Initialize vesting
            await expect(
                vesting.initVesting(
                    vestingID,
                    cliffStartTimestamp,
                    startTimestamp,
                    endTimestamp,
                    beneficiaries,
                    amounts
                )
            ).to.be.revertedWithCustomError(vesting, "TotalSupplyReached");
        });
    });

    describe("# Claim", function () {
        // Data for the first vesting
        let vestingID: number;
        let cliffStartTimestamp: number;
        let startTimestamp: number;
        let endTimestamp: number;
        let beneficiaries: HardhatEthersSigner[];
        let amounts: bigint[];

        // Data for the second vesting
        let vestingID2: number;
        let cliffStartTimestamp2: number;
        let startTimestamp2: number;
        let endTimestamp2: number;
        let beneficiaries2: HardhatEthersSigner[];
        let amounts2: bigint[];

        beforeEach(async () => {
            // Prepare data for the vesting
            vestingID = 1;
            cliffStartTimestamp = (await time.latest()) + 100;
            startTimestamp = cliffStartTimestamp + 1000;
            endTimestamp = startTimestamp + time.duration.years(1);
            beneficiaries = [user1, user2];
            amounts = [addDec(250), addDec(100)];

            // Initialize vesting
            await expect(
                vesting.initVesting(
                    vestingID,
                    cliffStartTimestamp,
                    startTimestamp,
                    endTimestamp,
                    beneficiaries,
                    amounts
                )
            )
                .to.emit(vesting, "VestingInitialized")
                .withArgs(vestingID, cliffStartTimestamp, startTimestamp, endTimestamp);

            // Initialize second vesting
            vestingID2 = 2;
            cliffStartTimestamp2 = (await time.latest()) + 100;
            startTimestamp2 = cliffStartTimestamp + 1000;
            endTimestamp2 = startTimestamp + time.duration.years(1);
            beneficiaries2 = [user1, user2];
            amounts2 = [addDec(500), addDec(90)];

            // Initialize vesting
            await expect(
                vesting.initVesting(
                    vestingID2,
                    cliffStartTimestamp2,
                    startTimestamp2,
                    endTimestamp2,
                    beneficiaries2,
                    amounts2
                )
            )
                .to.emit(vesting, "VestingInitialized")
                .withArgs(vestingID2, cliffStartTimestamp2, startTimestamp2, endTimestamp2);
        });

        it("Should allow to claim tokens", async () => {
            // Skip 2 month from the vesting start
            await time.increaseTo(startTimestamp + time.duration.weeks(5));

            // Get expected claim amount
            const expectedClaimAmount = (amounts[0] / 12n) * 1n;

            // Save data before claim
            const user1Balance = await gini.balanceOf(user1);
            const vestingBalance = await gini.balanceOf(vesting);
            const totalClaims = await vesting.totalClaims(vestingID);
            const totalClaimsForAll = await vesting.totalClaimsForAll();
            const beneficiary = await vesting.beneficiaries(vestingID, user1);

            // Claim tokens
            await expect(vesting.connect(user1).claim(vestingID))
                .to.emit(vesting, "Claim")
                .withArgs(user1, vestingID, expectedClaimAmount);

            // Check values
            expect(await gini.balanceOf(user1)).to.eq(user1Balance + expectedClaimAmount);
            expect(await gini.balanceOf(vesting)).to.eq(vestingBalance - expectedClaimAmount);
            expect(await vesting.totalClaims(vestingID)).to.eq(totalClaims + expectedClaimAmount);
            expect(await vesting.totalClaimsForAll()).to.eq(totalClaimsForAll + expectedClaimAmount);
            const updatedBeneficiary = await vesting.beneficiaries(vestingID, user1);
            expect(updatedBeneficiary.claimedAmount).to.eq(beneficiary.claimedAmount + expectedClaimAmount);
            expect(updatedBeneficiary.areTotallyClaimed).to.be.false;
        });

        it("Should allow to claim tokens from all vestings at once", async () => {
            // Check that all vestings are initialized
            const allVestingsAllocations = await vesting.getAllocationsForAllVestings(user2);
            expect(allVestingsAllocations[1]).to.deep.eq([amounts[1], amounts2[1]]);
            expect(allVestingsAllocations[0]).to.deep.eq([vestingID, vestingID2]);

            // Skip 2 month from the vesting start
            await time.increaseTo(startTimestamp + time.duration.weeks(5));

            // Get expected claim amount
            const expectedClaimAmount = (amounts[1] / 12n) * 1n;
            const expectedClaimAmount2 = (amounts2[1] / 12n) * 1n;

            // Save data before claim
            const user2Balance = await gini.balanceOf(user2);
            const vestingBalance = await gini.balanceOf(vesting);
            const totalClaims = await vesting.totalClaims(vestingID);
            const totalClaimsForAll = await vesting.totalClaimsForAll();
            const beneficiary = await vesting.beneficiaries(vestingID, user1);

            // Claim tokens
            await expect(vesting.connect(user2).claimAll())
                .to.emit(vesting, "Claim")
                .withArgs(user2, vestingID, expectedClaimAmount)
                .to.emit(vesting, "Claim")
                .withArgs(user2, vestingID2, expectedClaimAmount2);

            // Check values for the first vesting
            expect(await gini.balanceOf(user2)).to.eq(user2Balance + expectedClaimAmount + expectedClaimAmount2);
            expect(await gini.balanceOf(vesting)).to.eq(vestingBalance - expectedClaimAmount - expectedClaimAmount2);
            expect(await vesting.totalClaims(vestingID)).to.eq(totalClaims + expectedClaimAmount);
            expect(await vesting.totalClaims(vestingID2)).to.eq(totalClaims + expectedClaimAmount2);
            expect(await vesting.totalClaimsForAll()).to.eq(
                totalClaimsForAll + expectedClaimAmount + expectedClaimAmount2
            );

            const updatedBeneficiary = await vesting.beneficiaries(vestingID, user2);
            const updatedBeneficiary2 = await vesting.beneficiaries(vestingID2, user2);
            expect(updatedBeneficiary.claimedAmount).to.eq(beneficiary.claimedAmount + expectedClaimAmount);
            expect(updatedBeneficiary2.claimedAmount).to.eq(beneficiary.claimedAmount + expectedClaimAmount2);
            expect(updatedBeneficiary.areTotallyClaimed).to.be.false;
            expect(updatedBeneficiary2.areTotallyClaimed).to.be.false;

            const totalClaimsFromAll = await vesting.getTotalClaims(user2);
            expect(totalClaimsFromAll[0]).to.deep.eq([vestingID, vestingID2]);
            expect(totalClaimsFromAll[1]).to.deep.eq([expectedClaimAmount, expectedClaimAmount2]);

            // Skip to the end of all vestings and make a claim
            await time.increaseTo(endTimestamp + time.duration.weeks(5));

            await vesting.connect(user2).claimAll();

            // Check that all vestings are totally claimed
            const beneficiary1 = await vesting.beneficiaries(vestingID, user2);
            const beneficiary2 = await vesting.beneficiaries(vestingID2, user2);
            expect(beneficiary1.areTotallyClaimed).to.be.true;
            expect(beneficiary2.areTotallyClaimed).to.be.true;
        });

        it("Should revert if vesting is not started yet", async () => {
            // Skip time to start of the vesting - 1 second
            await time.increaseTo(startTimestamp - 5);

            await expect(vesting.connect(user1).claim(vestingID))
                .to.be.revertedWithCustomError(vesting, "OnlyAfterVestingStart")
                .withArgs(vestingID);
        });

        it("Should revert if nothing to claim", async () => {
            // Skip 5 days from the vesting start
            await time.increaseTo(startTimestamp + time.duration.days(5));

            // Claim tokens
            await expect(vesting.connect(user1).claim(vestingID)).to.be.revertedWithCustomError(
                vesting,
                "NothingToClaim"
            );

            // Skip 2 month from the vesting start
            await time.increaseTo(startTimestamp + time.duration.weeks(5));

            // Claim tokens
            await vesting.connect(user1).claim(vestingID);

            // Claim tokens
            await expect(vesting.connect(user1).claim(vestingID)).to.be.revertedWithCustomError(
                vesting,
                "NothingToClaim"
            );

            // Skip time to the end of the vesting and claim all tokens
            await time.increaseTo(endTimestamp + 5);

            // Claim tokens
            await vesting.connect(user1).claim(vestingID);

            // Claim tokens again
            await expect(vesting.connect(user1).claim(vestingID)).to.be.revertedWithCustomError(
                vesting,
                "NothingToClaim"
            );

            // Claim tokens from the second user2
            await vesting.connect(user2).claimAll();

            // Claim tokens again
            await expect(vesting.connect(user2).claimAll()).to.be.revertedWithCustomError(vesting, "NothingToClaim");
        });
    });

    describe("# Rescue ERC20", function () {
        it("Should allow to rescue tokens", async () => {
            const tokensAmount = addDec(100);

            // Transfer tokens to vesting
            await usdc.transfer(vesting, tokensAmount);

            // Rescue tokens
            await expect(vesting.connect(deployer).rescueERC20(usdc, otherAcc))
                .to.emit(vesting, "ERC20Rescued")
                .withArgs(usdc, otherAcc, tokensAmount);

            // Check balances
            expect(await usdc.balanceOf(vesting)).to.eq(0);
            expect(await usdc.balanceOf(otherAcc)).to.eq(tokensAmount);
        });

        it("Should revert if caller is not owner", async () => {
            await expect(vesting.connect(otherAcc).rescueERC20(usdc, otherAcc)).to.be.revertedWithCustomError(
                vesting,
                "AccessControlUnauthorizedAccount"
            );
        });

        it("Should revert if token is zero address", async () => {
            await expect(
                vesting.connect(deployer).rescueERC20(ethers.ZeroAddress, deployer)
            ).to.be.revertedWithCustomError(vesting, "ZeroAddress");
        });

        it("Should revert if recipient is zero address", async () => {
            await expect(vesting.connect(deployer).rescueERC20(usdc, ethers.ZeroAddress)).to.be.revertedWithCustomError(
                vesting,
                "ZeroAddress"
            );
        });

        it("Should revert if token is vesting token", async () => {
            await expect(vesting.connect(deployer).rescueERC20(gini, vesting))
                .to.be.revertedWithCustomError(vesting, "VestingTokenRescue")
                .withArgs(gini);
        });
    });

    describe("# Set Gini Token", function () {
        it("Should allow to set Gini token address", async () => {
            await expect(vesting.setGiniToken(usdc)).to.emit(vesting, "SetGiniToken").withArgs(usdc);

            // Check
            expect(await vesting.gini()).to.eq(usdc);
        });

        it("Should revert if caller is not admin", async () => {
            await expect(vesting.connect(otherAcc).setGiniToken(gini)).to.be.revertedWithCustomError(
                vesting,
                "AccessControlUnauthorizedAccount"
            );
        });

        it("Should revert if Gini token address is zero address", async () => {
            await expect(vesting.setGiniToken(ethers.ZeroAddress)).to.be.revertedWithCustomError(
                vesting,
                "ZeroAddress"
            );
        });
    });

    describe("# Getters", function () {
        it("Should allow to get all vestings for the user", async () => {
            // Prepare data for the vesting
            const vestingID = 1;
            const cliffStartTimestamp = (await time.latest()) + 100;
            const startTimestamp = cliffStartTimestamp + 1000;
            const endTimestamp = startTimestamp + time.duration.years(1);
            const beneficiaries = [user1, user2];
            const amounts = [addDec(250), addDec(100)];

            // Initialize vesting
            await expect(
                vesting.initVesting(
                    vestingID,
                    cliffStartTimestamp,
                    startTimestamp,
                    endTimestamp,
                    beneficiaries,
                    amounts
                )
            )
                .to.emit(vesting, "VestingInitialized")
                .withArgs(vestingID, cliffStartTimestamp, startTimestamp, endTimestamp);

            // Initialize second vesting
            const vestingID2 = 2;
            const cliffStartTimestamp2 = (await time.latest()) + 100;
            const startTimestamp2 = cliffStartTimestamp2 + 1000;
            const endTimestamp2 = startTimestamp2 + time.duration.years(1);
            const beneficiaries2 = [user1, user2];
            const amounts2 = [addDec(500), addDec(90)];

            // Initialize vesting
            await expect(
                vesting.initVesting(
                    vestingID2,
                    cliffStartTimestamp2,
                    startTimestamp2,
                    endTimestamp2,
                    beneficiaries2,
                    amounts2
                )
            )
                .to.emit(vesting, "VestingInitialized")
                .withArgs(vestingID2, cliffStartTimestamp2, startTimestamp2, endTimestamp2);

            // Get all vestings
            const allVestings = await vesting.getVestingsDuration(user1);
            expect(allVestings[0]).to.deep.eq([vestingID, vestingID2]);
            expect(allVestings[1]).to.deep.eq([endTimestamp - startTimestamp, endTimestamp2 - startTimestamp2]);
        });

        it("Should allow to get vesting data", async () => {
            // Initialize second vesting
            const vestingID2 = 2;
            const cliffStartTimestamp2 = (await time.latest()) + 100;
            const startTimestamp2 = cliffStartTimestamp2 + 1000;
            const endTimestamp2 = startTimestamp2 + time.duration.years(1);
            const beneficiaries2 = [user1, user2];
            const amounts2 = [addDec(500), addDec(90)];

            // Initialize vesting
            await expect(
                vesting.initVesting(
                    vestingID2,
                    cliffStartTimestamp2,
                    startTimestamp2,
                    endTimestamp2,
                    beneficiaries2,
                    amounts2
                )
            )
                .to.emit(vesting, "VestingInitialized")
                .withArgs(vestingID2, cliffStartTimestamp2, startTimestamp2, endTimestamp2);

            // Get vesting data
            const vestingData = await vesting.getVestingData(vestingID2);

            expect(vestingData[0]).to.deep.eq([
                cliffStartTimestamp2,
                startTimestamp2,
                endTimestamp2,
                endTimestamp2 - startTimestamp2
            ]);
            expect(vestingData[1]).to.eq(amounts2[0] + amounts2[1]);
            expect(vestingData[2]).to.eq(addDec(0));
        });
    });

    describe("# Claim calculation", function () {
        // Data for the first vesting
        let vestingID: number;
        let cliffStartTimestamp: number;
        let startTimestamp: number;
        let endTimestamp: number;
        let beneficiaries: HardhatEthersSigner[];
        let amounts: bigint[];

        // Data for the second vesting
        let vestingID2: number;
        let cliffStartTimestamp2: number;
        let startTimestamp2: number;
        let endTimestamp2: number;
        let beneficiaries2: HardhatEthersSigner[];
        let amounts2: bigint[];

        beforeEach(async () => {
            // Prepare data for the vesting
            vestingID = 1;
            cliffStartTimestamp = (await time.latest()) + 100;
            startTimestamp = cliffStartTimestamp + 1000;
            endTimestamp = startTimestamp + time.duration.years(1);
            beneficiaries = [user1, user2];
            amounts = [addDec(250), addDec(100)];

            // Initialize vesting
            await expect(
                vesting.initVesting(
                    vestingID,
                    cliffStartTimestamp,
                    startTimestamp,
                    endTimestamp,
                    beneficiaries,
                    amounts
                )
            )
                .to.emit(vesting, "VestingInitialized")
                .withArgs(vestingID, cliffStartTimestamp, startTimestamp, endTimestamp);

            // Initialize second vesting
            vestingID2 = 2;
            cliffStartTimestamp2 = (await time.latest()) + 100;
            startTimestamp2 = cliffStartTimestamp + 1000;
            endTimestamp2 = startTimestamp + time.duration.years(1);
            beneficiaries2 = [user1, user2];
            amounts2 = [addDec(500), addDec(90)];

            // Initialize vesting
            await expect(
                vesting.initVesting(
                    vestingID2,
                    cliffStartTimestamp2,
                    startTimestamp2,
                    endTimestamp2,
                    beneficiaries2,
                    amounts2
                )
            )
                .to.emit(vesting, "VestingInitialized")
                .withArgs(vestingID2, cliffStartTimestamp2, startTimestamp2, endTimestamp2);
        });

        it("Should calculate claim amount correctly", async () => {
            // Skip some time to start of the vesting
            await time.increaseTo(startTimestamp + 100);

            // Calculate claim amount
            let claimAmount = await vesting.calculateClaimAmount(user1, vestingID);
            let claimAmount2 = await vesting.calculateClaimAmount(user1, vestingID2);
            expect(claimAmount).to.eq(0);
            expect(claimAmount2).to.eq(0);

            // Skip to 1 month from the vesting start
            await time.increaseTo(startTimestamp + time.duration.days(30));

            // Calculate claim amount
            const expected1 = (amounts[0] / 12n) * 1n;
            const expected2 = (amounts2[0] / 12n) * 1n;
            claimAmount = await vesting.calculateClaimAmount(user1, vestingID);
            claimAmount2 = await vesting.calculateClaimAmount(user1, vestingID2);
            expect(claimAmount).to.eq(expected1);
            expect(claimAmount2).to.eq(expected2);

            // Skip 2 month from the vesting start
            await time.increaseTo(startTimestamp + time.duration.days(30) * 2);

            // Calculate claim amount
            claimAmount = await vesting.calculateClaimAmount(user1, vestingID);
            claimAmount2 = await vesting.calculateClaimAmount(user1, vestingID2);
            expect(claimAmount).to.eq(expected1 + expected1);
            expect(claimAmount2).to.eq(expected2 + expected2);

            // Skip 3 weeks from the vesting start + 2 month
            await time.increaseTo(startTimestamp + time.duration.weeks(3) + time.duration.days(30) * 2);

            // Calculate claim amount
            claimAmount = await vesting.calculateClaimAmount(user1, vestingID);
            claimAmount2 = await vesting.calculateClaimAmount(user1, vestingID2);
            expect(claimAmount).to.eq(expected1 + expected1);
            expect(claimAmount2).to.eq(expected2 + expected2);

            // Skip 8 month from the start of the vesting
            await time.increaseTo(startTimestamp + time.duration.days(30) * 8);

            const expected3 = (amounts[0] / 12n) * 8n;
            const expected4 = (amounts2[0] / 12n) * 8n;

            // Calculate claim amount
            claimAmount = await vesting.calculateClaimAmount(user1, vestingID);
            claimAmount2 = await vesting.calculateClaimAmount(user1, vestingID2);
            expect(claimAmount).to.eq(expected3);
            expect(claimAmount2).to.eq(expected4);

            // Skip 8 month from the start of the vesting and 2 days
            await time.increaseTo(startTimestamp + time.duration.days(30) * 8 + time.duration.days(2));

            // Calculate claim amount
            claimAmount = await vesting.calculateClaimAmount(user1, vestingID);
            claimAmount2 = await vesting.calculateClaimAmount(user1, vestingID2);
            expect(claimAmount).to.eq(expected3);
            expect(claimAmount2).to.eq(expected4);
        });

        it("Should calculate claim amount correctly from all vestings", async () => {
            // Skip some time to start of the vesting
            await time.increaseTo(startTimestamp + 100);

            // Calculate claim amount
            let claimAmount = await vesting.getClaimsAmountForAllVestings(user1);
            expect(claimAmount[0]).to.eq(0);

            // Skip to 1 month from the vesting start
            await time.increaseTo(startTimestamp + time.duration.days(30));

            // Calculate claim amount
            const expected1 = (amounts[0] / 12n) * 1n;
            const expected2 = (amounts2[0] / 12n) * 1n;
            claimAmount = await vesting.getClaimsAmountForAllVestings(user1);
            expect(claimAmount[0]).to.eq(expected1 + expected2);

            // Skip 2 month from the vesting start
            await time.increaseTo(startTimestamp + time.duration.days(30) * 2);

            // Calculate claim amount
            claimAmount = await vesting.getClaimsAmountForAllVestings(user1);
            expect(claimAmount[0]).to.eq(expected1 + expected1 + expected2 + expected2);

            // Skip 3 weeks from the vesting start + 2 month
            await time.increaseTo(startTimestamp + time.duration.weeks(3) + time.duration.days(30) * 2);

            // Calculate claim amount
            claimAmount = await vesting.getClaimsAmountForAllVestings(user1);
            expect(claimAmount[0]).to.eq(expected1 + expected1 + expected2 + expected2);

            // Skip 8 month from the start of the vesting
            await time.increaseTo(startTimestamp + time.duration.days(30) * 8);

            const expected3 = (amounts[0] / 12n) * 8n;
            const expected4 = (amounts2[0] / 12n) * 8n;

            // Calculate claim amount
            claimAmount = await vesting.getClaimsAmountForAllVestings(user1);
            expect(claimAmount[0]).to.eq(expected3 + expected4);

            // Skip 8 month from the start of the vesting and 2 days
            await time.increaseTo(startTimestamp + time.duration.days(30) * 8 + time.duration.days(2));

            // Calculate claim amount
            claimAmount = await vesting.getClaimsAmountForAllVestings(user1);
            expect(claimAmount[0]).to.eq(expected3 + expected4);
        });
    });
});
