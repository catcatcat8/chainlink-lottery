import { ethers } from "hardhat";
import { BaseContract, BigNumber, BigNumberish, Signer } from 'ethers'


import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { LotteryToken, NFTTicket, FakeRandomness, OneTicketPerUserLottery } from '../typechain-types';

describe("OneTicketPerUserLottery tests", function() {
    let lotteryToken: BaseContract & LotteryToken;
    let nftTicket: BaseContract & NFTTicket;
    let fakeRandomness: BaseContract & FakeRandomness;
    let oneTicketPerUserLottery: BaseContract & OneTicketPerUserLottery;
    let accounts: SignerWithAddress[]
    let status : BigNumberish [];

    beforeEach(async () => {
        accounts = await ethers.getSigners();
        const NFTTicket = await ethers.getContractFactory("NFTTicket");
        nftTicket = await NFTTicket.deploy();
        await nftTicket.deployed();

        const LotteryToken = await ethers.getContractFactory("LotteryToken");
        lotteryToken = await LotteryToken.deploy();
        await lotteryToken.deployed();

        const FakeRandomness = await ethers.getContractFactory("FakeRandomness");
        fakeRandomness = await FakeRandomness.deploy();
        await fakeRandomness.deployed();

        const OneTicketPerUserLottery = await ethers.getContractFactory("OneTicketPerUserLottery");
        oneTicketPerUserLottery = await OneTicketPerUserLottery.deploy(2, 4, 10, nftTicket.address, lotteryToken.address, fakeRandomness.address);
        await oneTicketPerUserLottery.deployed();

        await nftTicket.grantMinterRole(oneTicketPerUserLottery.address);
        await lotteryToken.grantBurnerRole(oneTicketPerUserLottery.address);

        await lotteryToken.transfer(accounts[1].address, 1);
        await lotteryToken.transfer(accounts[2].address, 2);
        await lotteryToken.transfer(accounts[3].address, 3);
        await lotteryToken.transfer(accounts[4].address, 4);

        status = [0, 1]
    });

    describe("buyTicket tests", function() {
        it("correct buy ticket", async function() {
            let balanceBefore = await lotteryToken.balanceOf(accounts[1].address);
            let ticketsBefore = (await oneTicketPerUserLottery.lottery()).purchasedTickets;
            await oneTicketPerUserLottery.connect(accounts[1]).buyTicket(1);
    
            expect(await nftTicket.ownerOf(1)).to.equal(accounts[1].address);
            expect(await oneTicketPerUserLottery.viewTicketNumber(accounts[1].address)).to.equal(1);
            expect(await lotteryToken.balanceOf(accounts[1].address)).to.equal(balanceBefore.sub(1));
            expect((await oneTicketPerUserLottery.lottery()).purchasedTickets).to.equal(ticketsBefore.add(1));
        });
    
        it("buy more than one ticket", async function() {
            await oneTicketPerUserLottery.connect(accounts[2]).buyTicket(1);
            await expect(oneTicketPerUserLottery.connect(accounts[2]).buyTicket(1)).to.be.revertedWith("It's allowed to buy only one ticket");
        });
    
        it("not enough tokens to buy ticket", async function() {
            await expect(oneTicketPerUserLottery.connect(accounts[5]).buyTicket(1)).to.be.revertedWith("Not enough balance to buy ticket");
        });
    
        it("incorrect number of ticket", async function() {
            await expect(oneTicketPerUserLottery.connect(accounts[1]).buyTicket(5)).to.be.revertedWith("Incorrect number of ticket");
        });
    });

    describe("closeLottery tests", function() {
        it("correct close lottery, unable to buy tickets after close", async function() {
            await oneTicketPerUserLottery.connect(accounts[1]).buyTicket(1);
            await oneTicketPerUserLottery.connect(accounts[2]).buyTicket(2);
            await oneTicketPerUserLottery.connect(accounts[3]).buyTicket(3);
            await oneTicketPerUserLottery.connect(accounts[4]).buyTicket(4);
            await lotteryToken.approve(oneTicketPerUserLottery.address, await lotteryToken.balanceOf(accounts[0].address));
            
            expect((await oneTicketPerUserLottery.lottery()).status).to.equal(status[0]);
            await oneTicketPerUserLottery.closeLottery();
            expect((await oneTicketPerUserLottery.lottery()).status).to.equal(status[1]);

            await expect(oneTicketPerUserLottery.buyTicket(1)).to.be.revertedWith("Purchase stage is over");
        });

        it("not all tickets were bought", async function() {
            await oneTicketPerUserLottery.connect(accounts[1]).buyTicket(1);
            await expect(oneTicketPerUserLottery.closeLottery()).to.be.revertedWith("Not all tickets have been purchased yet");
        });

        it("admin didn't allow spending tokens for contract", async function() {
            await oneTicketPerUserLottery.connect(accounts[1]).buyTicket(1);
            await oneTicketPerUserLottery.connect(accounts[2]).buyTicket(2);
            await oneTicketPerUserLottery.connect(accounts[3]).buyTicket(3);
            await oneTicketPerUserLottery.connect(accounts[4]).buyTicket(4);

            await expect(oneTicketPerUserLottery.closeLottery()).to.be.reverted;
        });
    });

    describe("getReward tests", function() {
        it ("correct withdrawing the reward", async function() {
            await oneTicketPerUserLottery.connect(accounts[1]).buyTicket(1);
            await oneTicketPerUserLottery.connect(accounts[2]).buyTicket(2);
            await oneTicketPerUserLottery.connect(accounts[3]).buyTicket(3);
            await oneTicketPerUserLottery.connect(accounts[4]).buyTicket(4);
            await lotteryToken.approve(oneTicketPerUserLottery.address, await lotteryToken.balanceOf(accounts[0].address));
            await oneTicketPerUserLottery.closeLottery();
            
            let reward = (await oneTicketPerUserLottery.lottery()).rewardPerTicket;
            let users = [accounts[1], accounts[2], accounts[3], accounts[4]]
            let userBalances = []
            for (let i = 0; i < 4; i++) {
                userBalances[i] = await lotteryToken.balanceOf(users[i].address);
            }

            for (let i = 0; i < 4; i++) {
                if (await oneTicketPerUserLottery.connect(users[i]).isWinner() == true) {
                    await oneTicketPerUserLottery.connect(users[i]).getReward();
                    expect(await lotteryToken.balanceOf(users[i].address)).to.equal(userBalances[i].add(reward));
                    expect((await oneTicketPerUserLottery.tickets(users[i].address)).alreadyWithdrawedReward).to.be.true;
                }
                else {
                    await expect(oneTicketPerUserLottery.connect(users[i]).getReward()).to.be.revertedWith("You lost in this lottery");
                }
            }
        });

        it ("withdrawing the reward from non ticket owner", async function() {
            await oneTicketPerUserLottery.connect(accounts[1]).buyTicket(1);
            await oneTicketPerUserLottery.connect(accounts[2]).buyTicket(2);
            await oneTicketPerUserLottery.connect(accounts[3]).buyTicket(3);
            await oneTicketPerUserLottery.connect(accounts[4]).buyTicket(4);
            await lotteryToken.approve(oneTicketPerUserLottery.address, await lotteryToken.balanceOf(accounts[0].address));
            await oneTicketPerUserLottery.closeLottery();

            await expect(oneTicketPerUserLottery.connect(accounts[5]).getReward()).to.be.revertedWith("You did not participate in the lottery!");
        });

        it ("get reward before lottery closed", async function() {
            await oneTicketPerUserLottery.connect(accounts[1]).buyTicket(1);
            await expect(oneTicketPerUserLottery.connect(accounts[1]).getReward()).to.be.revertedWith("Lottery isn't completed yet");
        });

        it ("double withdraw the reward", async function() {
            await oneTicketPerUserLottery.connect(accounts[1]).buyTicket(1);
            await oneTicketPerUserLottery.connect(accounts[2]).buyTicket(2);
            await oneTicketPerUserLottery.connect(accounts[3]).buyTicket(3);
            await oneTicketPerUserLottery.connect(accounts[4]).buyTicket(4);
            await lotteryToken.approve(oneTicketPerUserLottery.address, await lotteryToken.balanceOf(accounts[0].address));
            await oneTicketPerUserLottery.closeLottery();

            let users = [accounts[1], accounts[2], accounts[3], accounts[4]]
            let userBalances = []
            for (let i = 0; i < 4; i++) {
                userBalances[i] = await lotteryToken.balanceOf(users[i].address);
            }

            for (let i = 0; i < 4; i++) {
                if (await oneTicketPerUserLottery.connect(users[i]).isWinner() == true) {
                    await oneTicketPerUserLottery.connect(users[i]).getReward();
                }
            }

            for (let i = 0; i < 4; i++) {
                if (await oneTicketPerUserLottery.connect(users[i]).isWinner() == true) {
                    await expect(oneTicketPerUserLottery.connect(users[i]).getReward()).to.be.revertedWith("You have already withdrawed the reward");
                }
            }
        });
    });
})
