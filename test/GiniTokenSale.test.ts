import type { SnapshotRestorer } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { takeSnapshot, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { expect } from "chai";
import { ethers } from "hardhat";
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
    const NAME = "Gini";
    const SYMBOL = "GINI";
    const TOTAL_SUPPLY = addDec(30_000);
    const SALE_TOTAL_SUPPLY = addDec(1500);

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
        sale = await ethers.deployContract(
            "GiniTokenSale",
            [giniPrice, saleStart, saleEnd, usdc, SALE_TOTAL_SUPPLY],
            deployer
        );
        await sale.waitForDeployment();

        // Deploy GINI token
        gini = await ethers.deployContract("GiniToken", [NAME, SYMBOL, TOTAL_SUPPLY, sale, vestingContract], deployer);
        await gini.waitForDeployment();

        // Set Gini token
        await sale.setGiniToken(gini);

        snapshotA = await takeSnapshot();
    });

    afterEach(async () => await snapshotA.restore());

    describe("# Constructor", function () {
        it("Should allow to set all values correctly", async () => {
            expect(await sale.giniPrice()).to.eq(giniPrice);
            expect(await sale.getSaleTime()).to.deep.eq([saleStart, saleEnd]);
            expect(await sale.purchaseToken()).to.eq(usdc);
            expect(await sale.hasRole(await sale.DEFAULT_ADMIN_ROLE(), deployer.address)).to.be.true;
            expect(await sale.purchaseTokenDecimals()).to.eq(18);
            expect(await sale.totalSupply()).to.eq(SALE_TOTAL_SUPPLY);
        });

        it("Should revert if initial gini price is equal zero", async () => {
            await expect(
                ethers.deployContract("GiniTokenSale", [0, saleStart, saleEnd, usdc, SALE_TOTAL_SUPPLY])
            ).to.be.revertedWithCustomError(sale, "InsufficientValue");
        });

        it("Should revert if sale phase values are incorrect", async () => {
            // Prepare data for the first case
            const wrongStart = await time.latest();
            const wrongEnd = wrongStart + time.duration.days(2);

            // Skip start of the sale
            await time.increaseTo(wrongStart + 1);

            // Deploy and expect revert
            await expect(
                ethers.deployContract("GiniTokenSale", [giniPrice, wrongStart, wrongEnd, usdc, SALE_TOTAL_SUPPLY])
            )
                .to.be.revertedWithCustomError(sale, "InvalidPhaseParams")
                .withArgs(wrongStart, wrongEnd);

            // Prepare data for the second case
            const wrongStart2 = (await time.latest()) + 1000;
            const wrongEnd2 = wrongStart2 - 1;

            // Deploy and expect revert
            await expect(
                ethers.deployContract("GiniTokenSale", [giniPrice, wrongStart2, wrongEnd2, usdc, SALE_TOTAL_SUPPLY])
            )
                .to.be.revertedWithCustomError(sale, "InvalidPhaseParams")
                .withArgs(wrongStart2, wrongEnd2);
        });

        it("Should revert if purchase token address is zero", async () => {
            await expect(
                ethers.deployContract("GiniTokenSale", [
                    giniPrice,
                    saleStart,
                    saleEnd,
                    ethers.ZeroAddress,
                    SALE_TOTAL_SUPPLY
                ])
            ).to.be.revertedWithCustomError(sale, "ZeroAddress");
        });

        it("Should revert if total supply for sale is zero", async () => {
            await expect(
                ethers.deployContract("GiniTokenSale", [giniPrice, saleStart, saleEnd, usdc, 0])
            ).to.be.revertedWithCustomError(sale, "InsufficientValue");
        });
    });

    describe("# Setters", function () {
        describe("# Gini token setter", function () {
            it("Should allow to set Gini token address", async () => {
                await expect(sale.setGiniToken(gini)).to.emit(sale, "SetGiniToken").withArgs(gini);

                // Check
                expect(await sale.gini()).to.eq(gini);
            });

            it("Should revert if caller is not admin", async () => {
                await expect(sale.connect(otherAcc).setGiniToken(gini)).to.be.revertedWithCustomError(
                    sale,
                    "AccessControlUnauthorizedAccount"
                );
            });

            it("Should revert if Gini token address is zero", async () => {
                await expect(sale.setGiniToken(ethers.ZeroAddress)).to.be.revertedWithCustomError(sale, "ZeroAddress");
            });

            it("Should revert when sale is active", async () => {
                // Skip time to start of the sale
                await time.increaseTo(saleStart + 1);

                await expect(sale.setGiniToken(gini)).to.be.revertedWithCustomError(sale, "NotAllowedDuringSale");
            });
        });
    });

    describe("# Purchase", function () {
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
            const amount = addDec(2000);

            // Skip start of the sale
            await time.increaseTo(saleStart + 1);

            // Approve
            await usdc.connect(deployer).approve(sale, amount);

            // Purchase
            await sale.connect(deployer).purchase(amount);

            // Mint USDC from other token
            await usdc.connect(otherAcc).mint(amount);

            // Purchase from other account
            await usdc.connect(otherAcc).approve(sale, amount);
            await expect(sale.connect(otherAcc).purchase(amount)).to.be.revertedWithCustomError(
                sale,
                "TotalSupplyReached"
            );
        });
    });

    describe("# Withdraw remaining tokens", function () {
        it("Should allow to withdraw remaining tokens (ERC20)", async () => {
            // Prepare data
            const amount = await gini.balanceOf(sale);
            const recipient = otherAcc.address;
            const balanceBefore = await gini.balanceOf(recipient);

            // Withdraw
            await expect(sale.withdrawRemainingTokens(gini, recipient))
                .to.emit(sale, "Withdraw")
                .withArgs(gini, recipient, amount);

            // Check
            expect(await gini.balanceOf(recipient)).to.eq(balanceBefore + amount);
        });

        it("Should allow to withdraw remaining tokens (ETH)", async () => {
            // Prepare data
            const amount = eth(1);
            const recipient = otherAcc.address;
            const balanceBefore = await ethers.provider.getBalance(recipient);

            // Send eth to the contract
            await deployer.sendTransaction({ to: sale.target, value: amount });

            // Withdraw
            await expect(sale.withdrawRemainingTokens(ethers.ZeroAddress, recipient))
                .to.emit(sale, "Withdraw")
                .withArgs(ethers.ZeroAddress, recipient, amount);

            // Check
            expect(await ethers.provider.getBalance(recipient)).to.eq(balanceBefore + amount);
        });

        it("Should revert if caller is not admin", async () => {
            await expect(
                sale.connect(otherAcc).withdrawRemainingTokens(gini, otherAcc.address)
            ).to.be.revertedWithCustomError(sale, "AccessControlUnauthorizedAccount");
        });

        it("Should revert if recipient is zero address", async () => {
            await expect(sale.withdrawRemainingTokens(gini, ethers.ZeroAddress)).to.be.revertedWithCustomError(
                sale,
                "ZeroAddress"
            );
        });

        it("Should revert if withdraw during sale", async () => {
            // Skip time to start of the sale
            await time.increaseTo(saleStart + 1);

            await expect(sale.withdrawRemainingTokens(gini, otherAcc.address)).to.be.revertedWithCustomError(
                sale,
                "WithdrawingDuringSale"
            );
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
    });
});
