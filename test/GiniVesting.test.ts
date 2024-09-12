import type { SnapshotRestorer } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { takeSnapshot, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

import { addDec } from "./helpers";
import { GiniToken, GiniVesting, USDC } from "../typechain-types";

const toBn = BigInt;

describe("GiniVesting", function () {
    let snapshotA: SnapshotRestorer;

    let deployer: HardhatEthersSigner;
    let user1: HardhatEthersSigner;
    let user2: HardhatEthersSigner;
    let user3: HardhatEthersSigner;
    let sale: HardhatEthersSigner;
    let otherAcc: HardhatEthersSigner;

    let gini: GiniToken;
    let vesting: GiniVesting;
    let usdc: USDC;
    let startTimestamp: number;

    beforeEach(async () => {
        // Getting of signers
        [deployer, sale, otherAcc, user1, user2, user3] = await ethers.getSigners();

        // Deploy purchase token
        usdc = await ethers.deployContract("USDC", [addDec(100_000)]);
        await usdc.waitForDeployment();

        // Set time of the start of the vestings
        startTimestamp = (await time.latest()) + 10000;

        // Deploy vesting contract
        const GiniVesting = await ethers.getContractFactory("GiniVesting", deployer);
        vesting = <GiniVesting>(<unknown>await upgrades.deployProxy(GiniVesting, [startTimestamp]));
        await vesting.waitForDeployment();

        // Deploy GINI token
        gini = await ethers.deployContract("GiniToken", [sale.address, vesting.target], deployer);
        await gini.waitForDeployment();

        // Set Gini token
        await expect(await vesting.setGiniToken(gini))
            .to.emit(vesting, "SetGiniToken")
            .withArgs(gini);

        snapshotA = await takeSnapshot();
    });

    afterEach(async () => await snapshotA.restore());

    describe("# Initializer", function () {
        it("Should set all values correctly", async () => {
            expect(await vesting.hasRole(await vesting.DEFAULT_ADMIN_ROLE(), deployer.address)).to.equal(true);

            // Get vesting data
            const vesting0 = await vesting.vestingPeriods(0);
            const vesting1 = await vesting.vestingPeriods(1);
            const vesting2 = await vesting.vestingPeriods(2);
            const vesting3 = await vesting.vestingPeriods(3);
            const vesting4 = await vesting.vestingPeriods(4);

            // Check total allocations
            expect(vesting0.totalSupply).to.equal(addDec(300_000_000));
            expect(vesting1.totalSupply).to.equal(addDec(220_000_000));
            expect(vesting2.totalSupply).to.equal(addDec(800_000_000));
            expect(vesting3.totalSupply).to.equal(addDec(80_000_000));
            expect(vesting4.totalSupply).to.equal(addDec(300_000_000));

            // Check vesting period 1
            let vestingData = vesting0;
            expect(vestingData.cliffStartTimestamp).to.equal(startTimestamp);
            expect(vestingData.startTimestamp).to.equal(startTimestamp + time.duration.days(30) * 12);
            expect(vestingData.endTimestamp).to.equal(
                startTimestamp + time.duration.days(30) * 12 + time.duration.days(30) * 24
            );
            expect(vestingData.duration).to.equal(time.duration.days(30) * 24);
            expect(vestingData.tge).to.eq(0);

            // Check gini token
            expect(await vesting.gini()).to.eq(gini);
        });

        it("Should revert if start timestamp is zero", async () => {
            const GiniVesting = await ethers.getContractFactory("GiniVesting", deployer);
            await expect(upgrades.deployProxy(GiniVesting, [0])).to.be.revertedWithCustomError(vesting, "CannotBeZero");
        });

        it("Should revert when trying to initialize again", async () => {
            await expect(vesting.initialize(addDec(10_000))).to.be.revertedWithCustomError(
                vesting,
                "InvalidInitialization"
            );
        });
    });

    describe("# Add beneficiaries to the vestings", function () {
        it("Should allow to add beneficiaries to the vesting", async () => {
            // Add beneficiaries
            const vestingID = 1;
            const newBeneficiaries = [user3, otherAcc];
            const newAmounts = [addDec(100), addDec(50)];

            // Save data before adding
            const totalSupply = (await vesting.vestingPeriods(vestingID)).totalSupply;

            // Add beneficiaries
            await expect(vesting.addBeneficiaries(vestingID, newBeneficiaries, newAmounts))
                .to.emit(vesting, "BeneficiariesAdded")
                .withArgs(vestingID, addDec(100) + addDec(50));

            // Check
            expect((await vesting.vestingPeriods(vestingID)).totalSupply).to.equal(
                totalSupply - addDec(100) - addDec(50)
            );

            expect(await vesting.getUserVestings(user3)).to.deep.eq([vestingID]);
            expect(await vesting.getUserVestings(otherAcc)).to.deep.eq([vestingID]);

            expect(await vesting.beneficiaries(vestingID, user3)).to.deep.eq([newAmounts[0], 0]);
            expect(await vesting.beneficiaries(vestingID, otherAcc)).to.deep.eq([newAmounts[1], 0]);
        });

        it("Should allow to add beneficiaries to the scheduled vesting", async () => {
            // Add beneficiaries
            const vestingID = 4;
            const newBeneficiaries = [user3, otherAcc];
            const newAmounts = [addDec(100), addDec(50)];

            // Save data before adding
            const totalSupply = (await vesting.vestingPeriods(vestingID)).totalSupply;

            // Add beneficiaries
            await expect(vesting.addScheduled(newBeneficiaries, newAmounts))
                .to.emit(vesting, "BeneficiariesAdded")
                .withArgs(vestingID, addDec(100) + addDec(50));

            // Check
            expect((await vesting.vestingPeriods(vestingID)).totalSupply).to.equal(
                totalSupply - addDec(100) - addDec(50)
            );

            expect(await vesting.getUserVestings(user3)).to.deep.eq([vestingID]);
            expect(await vesting.getUserVestings(otherAcc)).to.deep.eq([vestingID]);

            expect(await vesting.beneficiaries(vestingID, user3)).to.deep.eq([newAmounts[0], 0]);
            expect(await vesting.beneficiaries(vestingID, otherAcc)).to.deep.eq([newAmounts[1], 0]);
        });

        it("Should allow to add beneficiaries to the airdrop vesting", async () => {
            // Add beneficiaries
            const vestingID = 3;
            const newBeneficiaries = [user3, otherAcc];
            const newAmounts = [addDec(100), addDec(50)];

            // Save data before adding
            const totalSupply = (await vesting.vestingPeriods(vestingID)).totalSupply;

            // Add beneficiaries
            await expect(vesting.addAirdrop(newBeneficiaries, newAmounts))
                .to.emit(vesting, "BeneficiariesAdded")
                .withArgs(vestingID, addDec(100) + addDec(50));

            // Check
            expect((await vesting.vestingPeriods(vestingID)).totalSupply).to.equal(
                totalSupply - addDec(100) - addDec(50)
            );

            expect(await vesting.getUserVestings(user3)).to.deep.eq([vestingID]);
            expect(await vesting.getUserVestings(otherAcc)).to.deep.eq([vestingID]);

            expect(await vesting.beneficiaries(vestingID, user3)).to.deep.eq([newAmounts[0], 0]);
            expect(await vesting.beneficiaries(vestingID, otherAcc)).to.deep.eq([newAmounts[1], 0]);
        });

        it("Should revert if caller is not admin", async () => {
            await expect(vesting.connect(user1).addBeneficiaries(0, [], [])).to.be.revertedWithCustomError(
                vesting,
                "AccessControlUnauthorizedAccount"
            );
        });

        it("Should revert if beneficiary is empty", async () => {
            await expect(vesting.addBeneficiaries(1, [], [])).to.be.revertedWithCustomError(vesting, "NoBeneficiaries");

            await expect(vesting.addAirdrop([], [])).to.be.revertedWithCustomError(vesting, "NoBeneficiaries");

            await expect(vesting.addScheduled([], [])).to.be.revertedWithCustomError(vesting, "NoBeneficiaries");
        });

        it("Should revert if beneficiary and amounts have different length", async () => {
            await expect(
                vesting.addBeneficiaries(1, [user1], [addDec(250), addDec(100)])
            ).to.be.revertedWithCustomError(vesting, "ArraysLengthMismatch");

            await expect(vesting.addAirdrop([user1], [addDec(250), addDec(100)])).to.be.revertedWithCustomError(
                vesting,
                "ArraysLengthMismatch"
            );

            await expect(vesting.addScheduled([user1], [addDec(250), addDec(100)])).to.be.revertedWithCustomError(
                vesting,
                "ArraysLengthMismatch"
            );
        });

        it("Should revert if beneficiary already added to the vesting", async () => {
            // Prepare data for the vesting
            const vestingID = 1;
            const beneficiaries = [user1];
            const amounts = [addDec(250)];

            // Add beneficiaries
            await vesting.addBeneficiaries(vestingID, beneficiaries, amounts);

            // Call and expect revert
            await expect(vesting.addBeneficiaries(vestingID, beneficiaries, amounts)).to.be.revertedWithCustomError(
                vesting,
                "BeneficiaryAlreadyExists"
            );
        });

        it("Should revert if beneficiary is zero address", async () => {
            // Prepare data for the vesting
            const vestingID = 1;
            const beneficiaries = [ethers.ZeroAddress];
            const amounts = [addDec(250)];

            // Call and expect revert
            await expect(vesting.addBeneficiaries(vestingID, beneficiaries, amounts)).to.be.revertedWithCustomError(
                vesting,
                "ZeroAddress"
            );
        });

        it("Should revert if amount is zero", async () => {
            // Prepare data for the vesting
            const vestingID = 1;
            const beneficiaries = [user1];
            const amounts = [0];

            // Call and expect revert
            await expect(vesting.addBeneficiaries(vestingID, beneficiaries, amounts)).to.be.revertedWithCustomError(
                vesting,
                "ZeroVestingAmount"
            );
        });

        it("Should revert if total supply reached", async () => {
            // Prepare data for the vesting
            const vestingID1 = 1;
            const vestingAirDropID = 3;
            const vestingScheduledID = 4;
            const beneficiaries = [otherAcc];
            const amounts1 = [(await vesting.vestingPeriods(vestingID1)).totalSupply + 1n];
            const amounts2 = [(await vesting.vestingPeriods(vestingAirDropID)).totalSupply + 1n];
            const amounts3 = [(await vesting.vestingPeriods(vestingScheduledID)).totalSupply + 1n];

            // Call and expect revert
            await expect(vesting.addBeneficiaries(vestingID1, beneficiaries, amounts1)).to.be.revertedWithCustomError(
                vesting,
                "TotalSupplyReached"
            );
            await expect(vesting.addAirdrop(beneficiaries, amounts2)).to.be.revertedWithCustomError(
                vesting,
                "TotalSupplyReached"
            );
            await expect(vesting.addScheduled(beneficiaries, amounts3)).to.be.revertedWithCustomError(
                vesting,
                "TotalSupplyReached"
            );
        });

        it("Should revert if vesting ID is for Airdrop or Scheduled vesting", async () => {
            // Prepare data for the vesting
            const beneficiaries = [otherAcc];
            const amounts = [addDec(100)];

            // Call with invalid vesting ID
            await expect(vesting.addBeneficiaries(3, beneficiaries, amounts))
                .to.be.revertedWithCustomError(vesting, "NotAllowedVesting")
                .withArgs(3);
            await expect(vesting.addBeneficiaries(4, beneficiaries, amounts))
                .to.be.revertedWithCustomError(vesting, "NotAllowedVesting")
                .withArgs(4);
        });
    });

    describe("# Access control", function () {
        it("Should revert if caller is not admin", async () => {
            await expect(vesting.connect(user1).addBeneficiaries(0, [], [])).to.be.revertedWithCustomError(
                vesting,
                "AccessControlUnauthorizedAccount"
            );

            await expect(vesting.connect(user1).addScheduled([], [])).to.be.revertedWithCustomError(
                vesting,
                "AccessControlUnauthorizedAccount"
            );

            await expect(vesting.connect(user1).addAirdrop([], [])).to.be.revertedWithCustomError(
                vesting,
                "AccessControlUnauthorizedAccount"
            );

            await expect(vesting.connect(user1).setGiniToken(gini)).to.be.revertedWithCustomError(
                vesting,
                "AccessControlUnauthorizedAccount"
            );

            await expect(vesting.connect(user1).rescueERC20(usdc, user1)).to.be.revertedWithCustomError(
                vesting,
                "AccessControlUnauthorizedAccount"
            );
        });
    });

    describe("# Claim", function () {
        // Data for the first vesting (Foundation)
        let vestingID: number;
        let beneficiaries: HardhatEthersSigner[];
        let amounts: bigint[];

        // Data for the second vesting (Airdrop)
        let vestingID2: number;
        let beneficiaries2: HardhatEthersSigner[];
        let amounts2: bigint[];

        beforeEach(async () => {
            // Add new beneficiary to the vesting 1
            vestingID = 1;
            beneficiaries = [user1];
            amounts = [addDec(250)];

            // Adding
            await vesting.addBeneficiaries(vestingID, beneficiaries, amounts);

            // Add new beneficiary to the vesting airdrop
            vestingID2 = 3;
            beneficiaries2 = [user1, user2];
            amounts2 = [addDec(100), addDec(50)];

            // Adding
            await vesting.addAirdrop(beneficiaries2, amounts2);
        });

        it("Should allow to claim tokens from the vesting without TGE", async () => {
            const vestingData = await vesting.vestingPeriods(vestingID);

            // Skip some time from the vesting start
            await time.increaseTo(vestingData.startTimestamp + toBn(time.duration.weeks(5)));

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

            // Get total claims of the user
            const totalClaimsFromAll = await vesting.getTotalClaims(user1);
            expect(totalClaimsFromAll[1]).to.deep.eq([expectedClaimAmount, 0]);
        });

        it("Should allow to claim tokens from the vesting with TGE", async () => {
            const vestingData = await vesting.vestingPeriods(vestingID2);

            // Skip 1 month from the vesting start
            await time.increaseTo(vestingData.startTimestamp + toBn(time.duration.weeks(5)));

            // Get expected claim amount
            const expectedClaimAmount = (amounts2[0] / 10n) * 2n;

            // Save data before claim
            const user1Balance = await gini.balanceOf(user1);
            const vestingBalance = await gini.balanceOf(vesting);
            const totalClaims = await vesting.totalClaims(vestingID2);
            const totalClaimsForAll = await vesting.totalClaimsForAll();
            const beneficiary = await vesting.beneficiaries(vestingID2, user1);

            // Claim tokens
            await expect(vesting.connect(user1).claim(vestingID2))
                .to.emit(vesting, "Claim")
                .withArgs(user1, vestingID2, expectedClaimAmount);

            // Check values
            expect(await gini.balanceOf(user1)).to.eq(user1Balance + expectedClaimAmount);
            expect(await gini.balanceOf(vesting)).to.eq(vestingBalance - expectedClaimAmount);
            expect(await vesting.totalClaims(vestingID2)).to.eq(totalClaims + expectedClaimAmount);
            expect(await vesting.totalClaimsForAll()).to.eq(totalClaimsForAll + expectedClaimAmount);
            const updatedBeneficiary = await vesting.beneficiaries(vestingID2, user1);
            expect(updatedBeneficiary.claimedAmount).to.eq(beneficiary.claimedAmount + expectedClaimAmount);

            // Get vesting data
            const totalVestingInfo = await vesting.getVestingData(vestingID2);
            expect(totalVestingInfo[1]).to.eq(expectedClaimAmount);
        });

        it("Should allow to claim tokens from all vestings at once", async () => {
            const vestingData1 = await vesting.vestingPeriods(vestingID);

            // Skip some time from the vesting start
            await time.increaseTo(vestingData1.startTimestamp + toBn(time.duration.days(30) * 10));

            // Get expected claim amount
            const expectedClaimAmount1 = (amounts[0] / 12n) * 10n;
            // Get expected claim amount
            const expectedClaimAmount2 = (amounts2[0] / 10n) * 5n;

            // Save data before claim
            const user1Balance = await gini.balanceOf(user1);
            const vestingBalance = await gini.balanceOf(vesting);
            const totalClaims = await vesting.totalClaims(vestingID);
            const totalClaimsForAll = await vesting.totalClaimsForAll();
            const beneficiary1 = await vesting.beneficiaries(vestingID, user1);
            const beneficiary2 = await vesting.beneficiaries(vestingID2, user1);

            // Claim tokens
            await expect(vesting.connect(user1).claimAll())
                .to.emit(vesting, "Claim")
                .withArgs(user1, vestingID, expectedClaimAmount1)
                .to.emit(vesting, "Claim")
                .withArgs(user1, vestingID2, expectedClaimAmount2);

            // Check values
            expect(await gini.balanceOf(user1)).to.eq(user1Balance + expectedClaimAmount1 + expectedClaimAmount2);
            expect(await gini.balanceOf(vesting)).to.eq(vestingBalance - expectedClaimAmount1 - expectedClaimAmount2);

            expect(await vesting.totalClaims(vestingID)).to.eq(totalClaims + expectedClaimAmount1);
            expect(await vesting.totalClaims(vestingID2)).to.eq(expectedClaimAmount2);

            expect(await vesting.totalClaimsForAll()).to.eq(
                totalClaimsForAll + expectedClaimAmount1 + expectedClaimAmount2
            );

            const updatedBeneficiary1 = await vesting.beneficiaries(vestingID, user1);
            const updatedBeneficiary2 = await vesting.beneficiaries(vestingID2, user1);

            expect(updatedBeneficiary1.claimedAmount).to.eq(beneficiary1.claimedAmount + expectedClaimAmount1);
            expect(updatedBeneficiary2.claimedAmount).to.eq(beneficiary2.claimedAmount + expectedClaimAmount2);
        });

        it("Should revert if vesting is not started yet", async () => {
            // Skip time to start of the vesting - 1 second
            await time.increaseTo(startTimestamp - 5);

            await expect(vesting.connect(user1).claim(vestingID))
                .to.be.revertedWithCustomError(vesting, "OnlyAfterVestingStart")
                .withArgs(vestingID);
        });

        it("Should revert if nothing to claim", async () => {
            const vestingData = await vesting.vestingPeriods(vestingID);
            // Skip 5 days from the vesting start
            await time.increaseTo(vestingData.startTimestamp + toBn(time.duration.days(5)));

            // Claim tokens
            await expect(vesting.connect(user1).claim(vestingID)).to.be.revertedWithCustomError(
                vesting,
                "NothingToClaim"
            );

            // Skip 2 month from the vesting start
            await time.increaseTo(vestingData.startTimestamp + toBn(time.duration.days(30) * 2));

            // Claim tokens
            await vesting.connect(user1).claim(vestingID);

            // Claim tokens
            await expect(vesting.connect(user1).claim(vestingID)).to.be.revertedWithCustomError(
                vesting,
                "NothingToClaim"
            );

            // Skip time to the end of the vesting and claim all tokens
            await time.increaseTo(vestingData.endTimestamp + 50000n);

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

            // Should get 0 claim amount
            expect(await vesting.calculateClaimAmount(user1, vestingID)).to.eq(0);
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
        it("Should revert if GINI token is already set", async () => {
            await expect(vesting.setGiniToken(gini)).to.be.revertedWithCustomError(vesting, "TokenAlreadySet");
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
            // Add new beneficiary to the vesting 1
            const vestingID = 1;
            const beneficiaries = [user1];
            const amounts = [addDec(250)];

            // Adding
            await vesting.addBeneficiaries(vestingID, beneficiaries, amounts);

            // Add new beneficiary to the vesting airdrop
            const vestingID2 = 3;
            const beneficiaries2 = [user1, user2];
            const amounts2 = [addDec(100), addDec(50)];

            // Adding
            await vesting.addAirdrop(beneficiaries2, amounts2);

            // Get vestings
            const user1Vestings = await vesting.getUserVestings(user1);
            expect(user1Vestings).to.deep.eq([vestingID, vestingID2]);
        });

        it("Should allow to get all vestings durations", async () => {
            // Add new beneficiary to the vesting 1
            const vestingID = 1;
            const beneficiaries = [user1];
            const amounts = [addDec(250)];

            // Adding
            await vesting.addBeneficiaries(vestingID, beneficiaries, amounts);

            // Add new beneficiary to the vesting airdrop
            const vestingID2 = 3;
            const beneficiaries2 = [user1, user2];
            const amounts2 = [addDec(100), addDec(50)];

            // Adding
            await vesting.addAirdrop(beneficiaries2, amounts2);

            // Get durations
            const durations = await vesting.getVestingsDuration(user1);
            const vesting1 = await vesting.vestingPeriods(vestingID);
            const vesting2 = await vesting.vestingPeriods(vestingID2);

            expect(durations[0]).to.deep.eq([vestingID, vestingID2]);
            expect(durations[1]).to.deep.eq([vesting1.duration, vesting2.duration]);
        });

        it("Should allow to get all allocations for user vestings", async () => {
            // Add new beneficiary to the vesting 1
            const vestingID = 1;
            const beneficiaries = [user1];
            const amounts = [addDec(250)];

            // Adding
            await vesting.addBeneficiaries(vestingID, beneficiaries, amounts);

            // Add new beneficiary to the vesting airdrop
            const vestingID2 = 3;
            const beneficiaries2 = [user1, user2];
            const amounts2 = [addDec(100), addDec(50)];

            // Adding
            await vesting.addAirdrop(beneficiaries2, amounts2);

            // Get allocations
            const data = await vesting.getAllocationsForAllVestings(user1);
            expect(data[0]).to.deep.eq([vestingID, vestingID2]);
            expect(data[1]).to.deep.eq([amounts[0], amounts2[0]]);
        });
    });

    describe("# Claim calculation", function () {
        // Data for the first vesting (Foundation)
        let vestingID: number;
        let beneficiaries: HardhatEthersSigner[];
        let amounts: bigint[];

        // Data for the second vesting (Airdrop)
        let vestingID2: number;
        let beneficiaries2: HardhatEthersSigner[];
        let amounts2: bigint[];

        beforeEach(async () => {
            // Add new beneficiary to the vesting 1
            vestingID = 1;
            beneficiaries = [user1];
            amounts = [addDec(250)];

            // Adding
            await vesting.addBeneficiaries(vestingID, beneficiaries, amounts);

            // Add new beneficiary to the vesting airdrop
            vestingID2 = 3;
            beneficiaries2 = [user1, user2];
            amounts2 = [addDec(100), addDec(50)];

            // Adding
            await vesting.addAirdrop(beneficiaries2, amounts2);
        });

        it("Should calculate claim amount correctly", async () => {
            const vestingData = await vesting.vestingPeriods(vestingID);
            // Skip some time to get to the TGE
            await time.increaseTo(vestingData.cliffStartTimestamp + 100n);

            const expectedClaimAmount = 0;
            expect(await vesting.calculateClaimAmount(user1, vestingID)).to.eq(expectedClaimAmount);

            // Skip 1 month from the vesting start
            await time.increaseTo(vestingData.startTimestamp + toBn(time.duration.days(30)));

            // Calculate claim amount
            const expectedClaimAmount2 = (amounts[0] / 12n) * 1n;
            expect(await vesting.calculateClaimAmount(user1, vestingID)).to.eq(expectedClaimAmount2);

            expect(await vesting.calculateClaimAmount(user1, vestingID)).to.eq(expectedClaimAmount2);

            // skip 1 more month
            await time.increase(time.duration.days(30));

            const expectedClaimAmount3 = (amounts[0] / 12n) * 2n;
            expect(await vesting.calculateClaimAmount(user1, vestingID)).to.eq(expectedClaimAmount3);

            // Skip 3 more months
            await time.increase(time.duration.days(30) * 3 + time.duration.days(2));

            const expectedClaimAmount4 = (amounts[0] / 12n) * 5n;
            expect(await vesting.calculateClaimAmount(user1, vestingID)).to.eq(expectedClaimAmount4);

            // Skip all time to the end of the vesting
            await time.increaseTo(vestingData.endTimestamp + toBn(time.duration.years(1)));

            const expectedClaimAmount5 = amounts[0];
            expect(await vesting.calculateClaimAmount(user1, vestingID)).to.eq(expectedClaimAmount5);
        });

        it("Should calculate claim amount correctly from vesting with TGE", async () => {
            const vestingData = await vesting.vestingPeriods(vestingID2);
            // Skip some time to get to the TGE
            await time.increaseTo(vestingData.cliffStartTimestamp + 100n);

            const expectedClaimAmount = (amounts2[0] / 10n) * 1n;
            expect(await vesting.calculateClaimAmount(user1, vestingID2)).to.eq(expectedClaimAmount);

            // Skip 1 month from the vesting start
            await time.increaseTo(vestingData.startTimestamp + toBn(time.duration.days(30)));

            // Calculate claim amount
            const expectedClaimAmount2 = (amounts2[0] / 10n) * 2n;
            expect(await vesting.calculateClaimAmount(user1, vestingID2)).to.eq(expectedClaimAmount2);

            expect(await vesting.calculateClaimAmount(user1, vestingID2)).to.eq(expectedClaimAmount2);

            // skip 1 more month
            await time.increase(time.duration.days(30));

            const expectedClaimAmount3 = (amounts2[0] / 10n) * 3n;
            expect(await vesting.calculateClaimAmount(user1, vestingID2)).to.eq(expectedClaimAmount3);

            // Skip 3 more months
            await time.increase(time.duration.days(30) * 3 + time.duration.days(2));

            const expectedClaimAmount4 = (amounts2[0] / 10n) * 6n;
            expect(await vesting.calculateClaimAmount(user1, vestingID2)).to.eq(expectedClaimAmount4);

            // Skip all time to the end of the vesting
            await time.increaseTo(vestingData.endTimestamp + toBn(time.duration.years(1)));

            const expectedClaimAmount5 = (amounts2[0] / 10n) * 10n;
            expect(await vesting.calculateClaimAmount(user1, vestingID2)).to.eq(expectedClaimAmount5);
        });

        it("Should calculate claim amount correctly from all vestings", async () => {
            const vestingData1 = await vesting.vestingPeriods(vestingID);

            // Skip some time from the vesting start
            await time.increaseTo(vestingData1.startTimestamp + toBn(time.duration.days(30) * 10));

            // Get expected claim amount
            const expectedClaimAmount1 = (amounts[0] / 12n) * 10n;
            // Get expected claim amount
            const expectedClaimAmount2 = (amounts2[0] / 10n) * 5n;

            // Calculate claim amount for all vestings
            const claimAmount = await vesting.getClaimsAmountForAllVestings(user1);

            expect(claimAmount[0]).to.eq(expectedClaimAmount1 + expectedClaimAmount2);
            expect(claimAmount[1]).to.deep.eq([vestingID, vestingID2]);
            expect(claimAmount[2]).to.deep.eq([expectedClaimAmount1, expectedClaimAmount2]);
        });
    });
});
