import type { SnapshotRestorer } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { takeSnapshot } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { expect } from "chai";
import { ethers } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

import { addDec } from "./helpers";
import { GiniToken } from "../typechain-types";

describe("GiniToken", function () {
    let snapshotA: SnapshotRestorer;

    let deployer: HardhatEthersSigner;
    let publicSaleContract: HardhatEthersSigner;
    let vestingContract: HardhatEthersSigner;

    let gini: GiniToken;

    // Constants
    const name = "Gini",
        symbol = "GINI",
        totalSupply = addDec(1_000_000);

    before(async () => {
        // Getting of signers
        [deployer, publicSaleContract, vestingContract] = await ethers.getSigners();

        // Deployment
        gini = await ethers.deployContract("GiniToken", [
            name,
            symbol,
            totalSupply,
            publicSaleContract.address,
            vestingContract.address
        ]);
        await gini.waitForDeployment();

        snapshotA = await takeSnapshot();
    });

    afterEach(async () => await snapshotA.restore());

    describe("# Constructor", function () {
        it("Should set all values and mint tokens correctly", async () => {
            expect(await gini.name()).to.equal(name);
            expect(await gini.symbol()).to.equal(symbol);
            expect(await gini.totalSupply()).to.equal(totalSupply);
            expect(await gini.balanceOf(publicSaleContract.address)).to.equal((totalSupply * 6n) / 100n);
            expect(await gini.balanceOf(vestingContract.address)).to.equal(totalSupply - (totalSupply * 6n) / 100n);
            expect(await gini.hasRole(await gini.DEFAULT_ADMIN_ROLE(), deployer.address)).to.equal(true);
        });

        it("Should revert if public sale contract or vesting contract address is zero during deployment", async () => {
            await expect(
                ethers.deployContract("GiniToken", [name, symbol, totalSupply, ethers.ZeroAddress, ethers.ZeroAddress])
            ).to.be.revertedWithCustomError(gini, "ZeroAddress");

            await expect(
                ethers.deployContract("GiniToken", [
                    name,
                    symbol,
                    totalSupply,
                    publicSaleContract.address,
                    ethers.ZeroAddress
                ])
            ).to.be.revertedWithCustomError(gini, "ZeroAddress");
        });
    });

    describe("# Pause control", function () {
        it("Should allow to pause", async () => {
            expect(await gini.paused()).to.be.false;

            // Pause
            await gini.pause();

            // Check
            expect(await gini.paused()).to.be.true;

            // Check tokens transferring
            await expect(gini.connect(publicSaleContract).transfer(deployer, addDec(1))).to.be.revertedWithCustomError(
                gini,
                "EnforcedPause"
            );

            // Check for burning token
            await expect(gini.connect(publicSaleContract).burn(addDec(1))).to.be.revertedWithCustomError(
                gini,
                "EnforcedPause"
            );
        });

        it("Should allow to unpause", async () => {
            expect(await gini.paused()).to.be.false;

            // Pause
            await gini.pause();

            // Check
            expect(await gini.paused()).to.be.true;

            // Unpause
            await gini.unpause();

            // Check
            expect(await gini.paused()).to.be.false;
        });

        it("Should revert if caller is not admin", async () => {
            await expect(gini.connect(publicSaleContract).pause()).to.be.revertedWithCustomError(
                gini,
                "AccessControlUnauthorizedAccount"
            );
            await expect(gini.connect(publicSaleContract).unpause()).to.be.revertedWithCustomError(
                gini,
                "AccessControlUnauthorizedAccount"
            );
        });
    });

    describe("# Deny list control", function () {
        it("Should allow to add address to deny list", async () => {
            expect(await gini.denylist(deployer.address)).to.be.false;

            // Add
            await expect(gini.deny(deployer.address)).to.emit(gini, "Denied").withArgs(deployer.address);

            // Check
            expect(await gini.denylist(deployer.address)).to.be.true;
        });

        it("Should remove address from deny list", async () => {
            expect(await gini.denylist(deployer.address)).to.be.false;

            // Add
            await expect(gini.deny(deployer.address)).to.emit(gini, "Denied").withArgs(deployer.address);

            // Check
            expect(await gini.denylist(deployer.address)).to.be.true;

            // Remove
            await expect(gini.allow(deployer.address)).to.emit(gini, "Allowed").withArgs(deployer.address);

            // Check
            expect(await gini.denylist(deployer.address)).to.be.false;
        });

        it("Should revert if caller is not admin", async () => {
            await expect(gini.connect(publicSaleContract).deny(deployer.address)).to.be.revertedWithCustomError(
                gini,
                "AccessControlUnauthorizedAccount"
            );
            await expect(gini.connect(publicSaleContract).allow(deployer.address)).to.be.revertedWithCustomError(
                gini,
                "AccessControlUnauthorizedAccount"
            );
        });

        it("Should revert if address is already denied", async () => {
            // Add
            await gini.deny(deployer.address);

            // Check
            expect(await gini.denylist(deployer.address)).to.be.true;

            await expect(gini.deny(deployer.address)).to.be.revertedWithCustomError(gini, "AlreadyDenied");
        });

        it("Should revert if address is already allowed", async () => {
            expect(await gini.denylist(deployer.address)).to.be.false;

            await expect(gini.allow(deployer.address)).to.be.revertedWithCustomError(gini, "NotDenied");
        });

        it("Denies an address for any transfers", async function () {
            // Preparation
            const amount = addDec(100);
            await gini.connect(publicSaleContract).transfer(deployer, amount);

            // Denial
            const tx = await gini.connect(deployer).deny(deployer);
            await expect(tx).to.emit(gini, "Denied").withArgs(deployer);

            // Check of the value
            expect(await gini.denylist(deployer)).to.be.true;

            // Attempt to transfer
            await expect(gini.connect(deployer).transfer(publicSaleContract, amount))
                .to.be.revertedWithCustomError(gini, "DeniedAddress")
                .withArgs(deployer);
            await expect(gini.connect(vestingContract).transfer(deployer, amount))
                .to.be.revertedWithCustomError(gini, "DeniedAddress")
                .withArgs(deployer);
        });
    });
});
