import type { SnapshotRestorer } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { takeSnapshot, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

import { addDec, eth } from "./helpers";
import { GiniToken, GiniTokenSale, USDC } from "../typechain-types";

describe("GiniTokenSale", function () {
    let snapshotA: SnapshotRestorer;

    let deployer: HardhatEthersSigner;
    let vestingContract: HardhatEthersSigner;
    let otherAcc: HardhatEthersSigner;

    let gini: GiniToken;
    let sale: GiniTokenSale;
    let usdc: USDC;

    let saleStart: number, saleEnd: number;

    // Constants
    const SALE_TOTAL_SUPPLY = addDec(300_000_000);
    const giniPrice = addDec(0.5);

    beforeEach(async () => {
        // Getting of signers
        [deployer, vestingContract, otherAcc] = await ethers.getSigners();

        // Deploy purchase token
        usdc = await ethers.deployContract("USDC", [addDec(100_000)]);
        await usdc.waitForDeployment();

        // Sale phase preparation
        saleStart = (await time.latest()) + 100;
        saleEnd = saleStart + time.duration.days(2);

        // Deploy token sale contract
        const Sale = await ethers.getContractFactory("GiniTokenSale", deployer);
        sale = <GiniTokenSale>(<unknown>await upgrades.deployProxy(Sale, [giniPrice, saleStart, saleEnd, usdc.target]));
        await sale.waitForDeployment();

        // Deploy GINI token
        gini = await ethers.deployContract("GiniToken", [sale.target, vestingContract.address], deployer);
        await gini.waitForDeployment();

        snapshotA = await takeSnapshot();
    });

    afterEach(async () => await snapshotA.restore());

    describe("# Initializer", function () {
        it("Should allow to set all values correctly", async () => {
            expect(await sale.getSaleTime()).to.deep.eq([saleStart, saleEnd]);
            expect(await sale.purchaseToken()).to.eq(usdc);
            expect(await sale.hasRole(await sale.DEFAULT_ADMIN_ROLE(), deployer.address)).to.be.true;
            expect(await sale.purchaseTokenDecimals()).to.eq(18);
        });

        it("Should revert if initial gini price is equal zero", async () => {
            const Sale = await ethers.getContractFactory("GiniTokenSale", deployer);

            await expect(
                upgrades.deployProxy(Sale, [0, saleStart, saleEnd, usdc.target])
            ).to.be.revertedWithCustomError(sale, "InsufficientValue");
        });

        it("Should revert if sale phase values are incorrect", async () => {
            // Prepare data for the first case
            const wrongStart = await time.latest();
            const wrongEnd = wrongStart + time.duration.days(2);
            const Sale = await ethers.getContractFactory("GiniTokenSale", deployer);

            // Skip start of the sale
            await time.increaseTo(wrongStart + 1);

            // Deploy and expect revert
            await expect(upgrades.deployProxy(Sale, [giniPrice, wrongStart, wrongEnd, usdc.target]))
                .to.be.revertedWithCustomError(sale, "InvalidPhaseParams")
                .withArgs(wrongStart, wrongEnd);

            // Prepare data for the second case
            const wrongStart2 = (await time.latest()) + 1000;
            const wrongEnd2 = wrongStart2 - 1;

            // Deploy and expect revert
            await expect(upgrades.deployProxy(Sale, [giniPrice, wrongStart2, wrongEnd2, usdc.target]))
                .to.be.revertedWithCustomError(Sale, "InvalidPhaseParams")
                .withArgs(wrongStart2, wrongEnd2);
        });

        it("Should revert if purchase token address is zero", async () => {
            const Sale = await ethers.getContractFactory("GiniTokenSale", deployer);

            await expect(
                upgrades.deployProxy(Sale, [giniPrice, saleStart, saleEnd, ethers.ZeroAddress])
            ).to.be.revertedWithCustomError(Sale, "ZeroAddress");
        });

        it("Should revert when initialize again", async () => {
            const Sale = await ethers.getContractFactory("GiniTokenSale", deployer);

            await expect(sale.initialize(giniPrice, saleStart, saleEnd, usdc.target)).to.be.revertedWithCustomError(
                Sale,
                "InvalidInitialization"
            );
        });
    });

    describe("# Setters", function () {
        describe("# Gini token setter", function () {
            it("Should allow to set Gini token address", async () => {
                await expect(sale.setGiniToken(gini)).to.emit(sale, "SetGiniToken").withArgs(gini);

                // Check
                expect(await sale.gini()).to.eq(gini);
                expect(await gini.balanceOf(sale)).to.eq(SALE_TOTAL_SUPPLY);
            });

            it("Should revert if caller is not admin", async () => {
                await expect(sale.connect(otherAcc).setGiniToken(gini)).to.be.revertedWithCustomError(
                    sale,
                    "AccessControlUnauthorizedAccount"
                );
            });

            it("Should revert if Gini token is already set", async () => {
                await sale.setGiniToken(gini);

                await expect(sale.setGiniToken(gini)).to.be.revertedWithCustomError(sale, "TokenAlreadySet");
            });

            it("Should revert if Gini token address is zero", async () => {
                await expect(sale.setGiniToken(ethers.ZeroAddress)).to.be.revertedWithCustomError(sale, "ZeroAddress");
            });

            it("Should revert if total supply if zero", async () => {
                const Sale = await ethers.getContractFactory("GiniTokenSale", deployer);

                const sale2 = await upgrades.deployProxy(Sale, [giniPrice, saleStart, saleEnd, usdc.target]);

                await expect(sale2.setGiniToken(gini)).to.be.revertedWithCustomError(Sale, "InsufficientValue");
            });

            it("Should revert while purchase when token is not set", async () => {
                // Skip time to start of the sale
                await time.increaseTo(saleStart + 1);

                await expect(sale.purchase(100)).to.be.revertedWithCustomError(sale, "TokenNotSet");
            });
        });
    });

    describe("# Purchase", function () {
        beforeEach(async () => {
            await sale.setGiniToken(gini);
        });

        it("Should allow to purchase tokens", async () => {
            // Prepare data
            const amount = addDec(400);

            // Skip time to start of the sale
            await time.increaseTo(saleStart + 1);

            // Approve
            await usdc.connect(deployer).approve(sale, amount);

            // Save data before purchase
            const purchaseAmount = await sale.purchaseAmount(deployer);
            const totalSupply = await sale.totalSupply();
            const giniBalance = await gini.balanceOf(deployer);
            const usdcBalance = await usdc.balanceOf(deployer);

            // Purchase
            await expect(sale.connect(deployer).purchase(amount))
                .to.emit(sale, "Purchase")
                .withArgs(deployer, amount / 2n);

            // Check values
            expect(await sale.purchaseAmount(deployer)).to.eq(purchaseAmount + amount / 2n);
            expect(await sale.totalSupply()).to.eq(totalSupply - amount / 2n);
            expect(await gini.balanceOf(deployer)).to.eq(giniBalance + amount / 2n);
            expect(await usdc.balanceOf(deployer)).to.eq(usdcBalance - amount);
        });

        it("Should revert if value is zero", async () => {
            await expect(sale.connect(deployer).purchase(0)).to.be.revertedWithCustomError(sale, "CannotBuyZeroTokens");
        });

        it("Should revert if purchase is not during sale time", async () => {
            // Trying to buy before start
            await time.increaseTo(saleStart - 2);

            await expect(sale.connect(deployer).purchase(100)).to.be.revertedWithCustomError(
                sale,
                "OnlyWhileSalePhase"
            );

            // Trying to buy after end
            await time.increaseTo(saleEnd + 1);

            await expect(sale.connect(deployer).purchase(100)).to.be.revertedWithCustomError(
                sale,
                "OnlyWhileSalePhase"
            );
        });

        it("Should revert if total supply is reached", async () => {
            // Prepare data
            const amount = SALE_TOTAL_SUPPLY * 2n;
            await usdc.connect(deployer).mint(amount);

            // Skip start of the sale
            await time.increaseTo(saleStart + 1);

            // Approve
            await usdc.connect(deployer).approve(sale, amount);

            // Purchase
            await sale.connect(deployer).purchase(amount);

            expect(await sale.totalSupply()).to.eq(0);

            // Mint USDC from other token
            const revertedAmount = addDec(0.5);
            await usdc.connect(otherAcc).mint(revertedAmount);

            // Purchase from other account
            await usdc.connect(otherAcc).approve(sale, revertedAmount);
            await expect(sale.connect(otherAcc).purchase(revertedAmount)).to.be.revertedWithCustomError(
                sale,
                "TotalSupplyReached"
            );
        });
    });

    describe("# Withdraw remaining tokens", function () {
        beforeEach(async () => {
            await sale.setGiniToken(gini);
        });

        it("Should allow to withdraw remaining tokens (GINI)", async () => {
            // Prepare data
            const amount = await gini.balanceOf(sale);
            const recipient = otherAcc.address;
            const balanceBefore = await gini.balanceOf(recipient);

            // Withdraw
            await expect(sale.withdrawRemainingTokens(recipient))
                .to.emit(sale, "Withdraw")
                .withArgs(gini, recipient, amount);

            // Check
            expect(await gini.balanceOf(recipient)).to.eq(balanceBefore + amount);
        });

        it("Should allow to rescue tokens (ETH)", async () => {
            // Prepare data
            const amount = eth(1);
            const recipient = otherAcc.address;
            const balanceBefore = await ethers.provider.getBalance(recipient);

            // Send eth to the contract
            await deployer.sendTransaction({ to: sale.target, value: amount });

            // Withdraw
            await expect(sale.rescueTokens(ethers.ZeroAddress, recipient))
                .to.emit(sale, "Withdraw")
                .withArgs(ethers.ZeroAddress, recipient, amount);

            // Check
            expect(await ethers.provider.getBalance(recipient)).to.eq(balanceBefore + amount);
        });

        it("Should allow to rescue tokens (ERC20)", async () => {
            // Prepare data
            const amount = addDec(100);
            const recipient = otherAcc.address;
            const balanceBefore = await usdc.balanceOf(recipient);

            // Send some USDC to the contract
            await usdc.connect(deployer).mintFor(sale, amount);

            // Withdraw
            await expect(sale.rescueTokens(usdc, recipient))
                .to.emit(sale, "Withdraw")
                .withArgs(usdc, recipient, amount);

            // Check
            expect(await usdc.balanceOf(recipient)).to.eq(balanceBefore + amount);
            expect(await usdc.balanceOf(sale)).to.eq(0);
        });

        it("Should revert if caller is not admin", async () => {
            await expect(
                sale.connect(otherAcc).withdrawRemainingTokens(otherAcc.address)
            ).to.be.revertedWithCustomError(sale, "AccessControlUnauthorizedAccount");

            await expect(
                sale.connect(otherAcc).rescueTokens(ethers.ZeroAddress, otherAcc.address)
            ).to.be.revertedWithCustomError(sale, "AccessControlUnauthorizedAccount");
        });

        it("Should revert if recipient is zero address", async () => {
            await expect(sale.withdrawRemainingTokens(ethers.ZeroAddress)).to.be.revertedWithCustomError(
                sale,
                "ZeroAddress"
            );

            await expect(sale.rescueTokens(ethers.ZeroAddress, ethers.ZeroAddress)).to.be.revertedWithCustomError(
                sale,
                "ZeroAddress"
            );
        });

        it("Should revert if withdraw during sale", async () => {
            // Skip time to start of the sale
            await time.increaseTo(saleStart + 1);

            await expect(sale.withdrawRemainingTokens(otherAcc.address)).to.be.revertedWithCustomError(
                sale,
                "WithdrawingDuringSale"
            );
        });

        it("Should revert if rescue token is GINI", async () => {
            await expect(sale.rescueTokens(gini, otherAcc.address))
                .to.be.revertedWithCustomError(sale, "NotAllowedToken")
                .withArgs(gini);
        });
    });

    describe("# Prolong sale", function () {
        it("Should allow to prolong sale", async () => {
            // Prepare data
            const newEnd = saleEnd + time.duration.days(2);

            // Prolong
            await expect(sale.prolongSale(newEnd)).to.emit(sale, "SalePhaseSet").withArgs(saleStart, newEnd);

            // Check
            expect(await sale.getSaleTime()).to.deep.eq([saleStart, newEnd]);
        });

        it("Should revert if caller is not admin", async () => {
            await expect(sale.connect(otherAcc).prolongSale(saleEnd)).to.be.revertedWithCustomError(
                sale,
                "AccessControlUnauthorizedAccount"
            );
        });

        it("Should revert if new end is already ended", async () => {
            // Skip time to the end of the sale
            await time.increaseTo(saleEnd + 1);

            await expect(sale.prolongSale(saleEnd + 1000)).to.be.revertedWithCustomError(sale, "SaleAlreadyEnded");
        });

        it("Should revert if new end is less than current", async () => {
            await expect(sale.prolongSale(saleEnd - 1000))
                .to.be.revertedWithCustomError(sale, "InvalidPhaseParams")
                .withArgs(saleEnd, saleEnd - 1000);
        });
    });

    describe("# Getters", function () {
        it("Should allow to get correct received amount while purchase", async () => {
            // Prepare data
            const amount1 = addDec(34);
            const amount2 = addDec(17.5234);
            const amount3 = addDec(786.4333);
            const amount4 = addDec(344.86765);

            // Check
            expect(await sale.getReceivedAmount(amount1)).to.eq(amount1 / 2n);
            expect(await sale.getReceivedAmount(amount2)).to.eq(amount2 / 2n);
            expect(await sale.getReceivedAmount(amount3)).to.eq(amount3 / 2n);
            expect(await sale.getReceivedAmount(amount4)).to.eq(amount4 / 2n);
        });

        it("Should allow to get correct purchase amount (when 6 decimals in token)", async () => {
            // Deploy token with 6 decimals
            const usdt = await ethers.deployContract("USDT", [addDec(100_000)]);
            await usdt.waitForDeployment();

            // Check that token has 6 decimals
            expect(await usdt.decimals()).to.eq(6);

            // Sale phase preparation
            const saleStart = (await time.latest()) + 100;
            const saleEnd = saleStart + time.duration.days(2);

            // Deploy token sale contract
            const Sale = await ethers.getContractFactory("GiniTokenSale", deployer);
            const sale2 = <GiniTokenSale>(
                (<unknown>await upgrades.deployProxy(Sale, [giniPrice, saleStart, saleEnd, usdt.target]))
            );
            await sale2.waitForDeployment();

            // Deploy GINI token
            const gini = await ethers.deployContract("GiniToken", [sale2, vestingContract], deployer);
            await gini.waitForDeployment();

            // Set Gini token
            await sale2.setGiniToken(gini);

            // Calculate received amount
            const amount1 = addDec(34, 6);
            const amount1Expected = addDec(34) / 2n;

            const amount2 = addDec(17.5234, 6);
            const amount2Expected = addDec(17.5234) / 2n;

            const amount3 = addDec(786.4333, 6);
            const amount3Expected = addDec(786.4333) / 2n;

            const amount4 = addDec(344.86765, 6);
            const amount4Expected = addDec(344.86765) / 2n;

            // Check
            expect(await sale2.getReceivedAmount(amount1)).to.eq(amount1Expected);
            expect(await sale2.getReceivedAmount(amount2)).to.eq(amount2Expected);
            expect(await sale2.getReceivedAmount(amount3)).to.eq(amount3Expected);
            expect(await sale2.getReceivedAmount(amount4)).to.eq(amount4Expected);
        });
    });
});
