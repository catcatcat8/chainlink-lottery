import { ethers } from "hardhat";
import { BaseContract, BigNumber, BigNumberish, Signer } from 'ethers'


import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { LotteryToken, NFTTicket, FakeRandomness, OneWinPerUserLottery } from '../typechain-types';

describe("OneWinPerUserLottery tests", function() {
    let lotteryToken: BaseContract & LotteryToken;
    let nftTicket: BaseContract & NFTTicket;
    let fakeRandomness: BaseContract & FakeRandomness;
    let oneWinPerUserLottery: BaseContract & OneWinPerUserLottery;
    let oneWinPerUserLottery2: BaseContract & OneWinPerUserLottery;
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

        const OneWinPerUserLottery = await ethers.getContractFactory("OneWinPerUserLottery");
        oneWinPerUserLottery = await OneWinPerUserLottery.deploy(5, 15, 10, nftTicket.address, lotteryToken.address, fakeRandomness.address);
        await oneWinPerUserLottery.deployed();

        await nftTicket.grantMinterRole(oneWinPerUserLottery.address);
        await lotteryToken.grantBurnerRole(oneWinPerUserLottery.address);

        await lotteryToken.transfer(accounts[1].address, 1);
        await lotteryToken.transfer(accounts[2].address, 2);
        await lotteryToken.transfer(accounts[3].address, 3);
        await lotteryToken.transfer(accounts[4].address, 4);
        await lotteryToken.transfer(accounts[5].address, 25);

        status = [0, 1, 2]
    });

    describe("buyTickets tests", function() {
        it("correct buy tickets", async function() {
            let balanceBefore = await lotteryToken.balanceOf(accounts[4].address);
            await oneWinPerUserLottery.connect(accounts[4]).buyTickets([1]);
    
            expect(await nftTicket.ownerOf(1)).to.equal(accounts[4].address);
            
            // expect(await oneWinPerUserLottery.viewTicketNumbers(accounts[4].address)).to.eql([1]);
            let expectedNumbers = [1]
            for(let i=0; i<(await oneWinPerUserLottery.viewTicketNumbers(accounts[4].address)).length; i++) {
                expect((await oneWinPerUserLottery.viewTicketNumbers(accounts[4].address))[i]).to.equal(expectedNumbers[i]);
            }

            expect(await lotteryToken.balanceOf(accounts[4].address)).to.equal(balanceBefore.sub(1));
            expect((await oneWinPerUserLottery.viewPurchasedTickets()).length).to.equal(1);

            await oneWinPerUserLottery.connect(accounts[4]).buyTickets([2, 3]);
            expect(await nftTicket.ownerOf(2)).to.equal(accounts[4].address);
            expect(await nftTicket.ownerOf(3)).to.equal(accounts[4].address);
            
            // expect(await oneWinPerUserLottery.viewTicketNumbers(accounts[4].address)).to.deep.equal([1, 2, 3]);
            expectedNumbers = [1, 2, 3]
            for(let i=0; i<(await oneWinPerUserLottery.viewTicketNumbers(accounts[4].address)).length; i++) {
                expect((await oneWinPerUserLottery.viewTicketNumbers(accounts[4].address))[i]).to.equal(expectedNumbers[i]);
            }

            expect(await lotteryToken.balanceOf(accounts[4].address)).to.equal(balanceBefore.sub(3));
            expect((await oneWinPerUserLottery.viewPurchasedTickets()).length).to.equal(3);
        });
    
        it("not enough tokens to buy tickets", async function() {
            await expect(oneWinPerUserLottery.connect(accounts[4]).buyTickets([1, 2, 3, 4, 5, 6, 7])).to.be.revertedWith("Not enough balance to buy tickets");
        });

        it("buy more than 10 tickets at once", async function() {
            await expect(oneWinPerUserLottery.connect(accounts[5]).buyTickets([1,2,3,4,5,6,7,8,9,10,11])).to.be.revertedWith("It's not allowed to buy more than 10 tickets at once");
        });
    
        it("incorrect number of ticket", async function() {
            await expect(oneWinPerUserLottery.connect(accounts[5]).buyTickets([1, 5, 16])).to.be.revertedWith("Incorrect number of ticket");
        });

        it("buy too many tickets returns revert", async function() {
            await oneWinPerUserLottery.connect(accounts[1]).buyTickets([1]);
            await oneWinPerUserLottery.connect(accounts[2]).buyTickets([2, 3]);
            await oneWinPerUserLottery.connect(accounts[3]).buyTickets([4, 5, 6]);
            await oneWinPerUserLottery.connect(accounts[4]).buyTickets([7, 8, 9, 10]);

            await expect(oneWinPerUserLottery.buyTickets([11, 12, 13, 15, 16, 17, 18, 19])).to.be.revertedWith("You can't buy so many tickets");
        });
    });
    
    describe("closeLottery tests", function() {
        it("correct close lottery, unable to buy tickets after close", async function() {
            await oneWinPerUserLottery.connect(accounts[1]).buyTickets([1]);
            await oneWinPerUserLottery.connect(accounts[2]).buyTickets([2, 3]);
            await oneWinPerUserLottery.connect(accounts[3]).buyTickets([4, 5, 6]);
            await oneWinPerUserLottery.connect(accounts[4]).buyTickets([7, 8, 9, 10]);
            await oneWinPerUserLottery.connect(accounts[5]).buyTickets([11, 12, 13, 14, 15])
            await lotteryToken.approve(oneWinPerUserLottery.address, await lotteryToken.balanceOf(accounts[0].address));
            
            expect((await oneWinPerUserLottery.lottery()).status).to.equal(status[0]);
            await oneWinPerUserLottery.closeLottery();
            expect((await oneWinPerUserLottery.lottery()).status).to.equal(status[1]);

            await expect(oneWinPerUserLottery.buyTickets([1])).to.be.revertedWith("Purchase stage is over");
        });

        it("not all tickets were bought", async function() {
            await oneWinPerUserLottery.connect(accounts[1]).buyTickets([1]);
            await expect(oneWinPerUserLottery.closeLottery()).to.be.revertedWith("Not all tickets have been purchased yet");
        });

        it("admin didn't allow spending tokens for contract", async function() {
            await oneWinPerUserLottery.connect(accounts[1]).buyTickets([1]);
            await oneWinPerUserLottery.connect(accounts[2]).buyTickets([2, 3]);
            await oneWinPerUserLottery.connect(accounts[3]).buyTickets([4, 5, 6]);
            await oneWinPerUserLottery.connect(accounts[4]).buyTickets([7, 8, 9, 10]);
            await oneWinPerUserLottery.connect(accounts[5]).buyTickets([11, 12, 13, 14, 15])

            await expect(oneWinPerUserLottery.closeLottery()).to.be.reverted;
        });

        it("double close lottery", async function() {
            await oneWinPerUserLottery.connect(accounts[1]).buyTickets([1]);
            await oneWinPerUserLottery.connect(accounts[2]).buyTickets([2, 3]);
            await oneWinPerUserLottery.connect(accounts[3]).buyTickets([4, 5, 6]);
            await oneWinPerUserLottery.connect(accounts[4]).buyTickets([7, 8, 9, 10]);
            await oneWinPerUserLottery.connect(accounts[5]).buyTickets([11, 12, 13, 14, 15])
            await lotteryToken.approve(oneWinPerUserLottery.address, await lotteryToken.balanceOf(accounts[0].address));
            await oneWinPerUserLottery.closeLottery();
            
            await expect(oneWinPerUserLottery.closeLottery()).to.be.revertedWith("Purchase stage is over");
        });
    });

    describe("drawWinningNumbers tests", function() {
        it("can't throw numbers before random was generated", async function() {
            await expect(oneWinPerUserLottery.drawWinningNumbers()).to.be.revertedWith("It is purchase stage now or all winning numbers has already been generated");
        });

        it("correct draw winning numbers", async function() {
            await oneWinPerUserLottery.connect(accounts[1]).buyTickets([1]);
            await oneWinPerUserLottery.connect(accounts[2]).buyTickets([2, 3]);
            await oneWinPerUserLottery.connect(accounts[3]).buyTickets([4, 5, 6]);
            await oneWinPerUserLottery.connect(accounts[4]).buyTickets([7, 8, 9, 10]);
            await oneWinPerUserLottery.connect(accounts[5]).buyTickets([11, 12, 13, 14, 15])
            await lotteryToken.approve(oneWinPerUserLottery.address, await lotteryToken.balanceOf(accounts[0].address));
            await oneWinPerUserLottery.closeLottery();

            await oneWinPerUserLottery.drawWinningNumbers();
            expect((await oneWinPerUserLottery.lottery()).status).to.equal(status[2]);
            expect((await oneWinPerUserLottery.viewWinningTickets()).length).to.equal(5); // 5 winning tickets
            expect(new Set(await oneWinPerUserLottery.viewWinningTickets()).size).to.equal(5);  // no dublicates
        });

        it("draws more than 10", async function() {
            const OneWinPerUserLottery2 = await ethers.getContractFactory("OneWinPerUserLottery");
            oneWinPerUserLottery2 = await OneWinPerUserLottery2.deploy(12, 15, 10, nftTicket.address, lotteryToken.address, fakeRandomness.address);
            await oneWinPerUserLottery2.deployed();
            await nftTicket.grantMinterRole(oneWinPerUserLottery2.address);
            await lotteryToken.grantBurnerRole(oneWinPerUserLottery2.address);

            await oneWinPerUserLottery2.connect(accounts[1]).buyTickets([1]);
            await oneWinPerUserLottery2.connect(accounts[2]).buyTickets([2, 3]);
            await oneWinPerUserLottery2.connect(accounts[3]).buyTickets([4, 5, 6]);
            await oneWinPerUserLottery2.connect(accounts[4]).buyTickets([7, 8, 9, 10]);
            await oneWinPerUserLottery2.connect(accounts[5]).buyTickets([11, 12, 13, 14, 15])
            await lotteryToken.approve(oneWinPerUserLottery2.address, await lotteryToken.balanceOf(accounts[0].address));
            await oneWinPerUserLottery2.closeLottery();

            await oneWinPerUserLottery2.drawWinningNumbers();
            expect((await oneWinPerUserLottery2.lottery()).status).to.equal(status[1]);
            await oneWinPerUserLottery2.drawWinningNumbers();
            expect((await oneWinPerUserLottery2.lottery()).status).to.equal(status[2]);
            expect((await oneWinPerUserLottery2.viewWinningTickets()).length).to.equal(12); // 5 winning tickets
            expect(new Set(await oneWinPerUserLottery2.viewWinningTickets()).size).to.equal(12);  // no dublicates
        })
    });

    describe("getReward tests", function() {
        it("withdrawing before lottery is completed", async function() {
            await oneWinPerUserLottery.connect(accounts[1]).buyTickets([1]);
            await oneWinPerUserLottery.connect(accounts[2]).buyTickets([2, 3]);
            await oneWinPerUserLottery.connect(accounts[3]).buyTickets([4, 5, 6]);
            await oneWinPerUserLottery.connect(accounts[4]).buyTickets([7, 8, 9, 10]);
            await oneWinPerUserLottery.connect(accounts[5]).buyTickets([11, 12, 13, 14, 15]);
            await lotteryToken.approve(oneWinPerUserLottery.address, await lotteryToken.balanceOf(accounts[0].address));
            await oneWinPerUserLottery.closeLottery();

            await expect(oneWinPerUserLottery.connect(accounts[1]).getReward(1)).to.be.revertedWith("Lottery isn't completed yet");
        });

        it("withdrawing by non owner of ticket", async function() {
            await oneWinPerUserLottery.connect(accounts[1]).buyTickets([1]);
            await oneWinPerUserLottery.connect(accounts[2]).buyTickets([2, 3]);
            await oneWinPerUserLottery.connect(accounts[3]).buyTickets([4, 5, 6]);
            await oneWinPerUserLottery.connect(accounts[4]).buyTickets([7, 8, 9, 10]);
            await oneWinPerUserLottery.connect(accounts[5]).buyTickets([11, 12, 13, 14, 15]);
            await lotteryToken.approve(oneWinPerUserLottery.address, await lotteryToken.balanceOf(accounts[0].address));
            await oneWinPerUserLottery.closeLottery();
            await oneWinPerUserLottery.drawWinningNumbers();

            await expect(oneWinPerUserLottery.connect(accounts[1]).getReward(2)).to.be.revertedWith("You are not the owner of this ticket");
        });

        it("correct withdrawing the reward", async function() {
            await oneWinPerUserLottery.connect(accounts[1]).buyTickets([1]);
            await oneWinPerUserLottery.connect(accounts[2]).buyTickets([2, 3]);
            await oneWinPerUserLottery.connect(accounts[3]).buyTickets([4, 5, 6]);
            await oneWinPerUserLottery.connect(accounts[4]).buyTickets([7, 8, 9, 10]);
            await oneWinPerUserLottery.connect(accounts[5]).buyTickets([11, 12, 13, 14, 15]);
            await lotteryToken.approve(oneWinPerUserLottery.address, await lotteryToken.balanceOf(accounts[0].address));
            await oneWinPerUserLottery.closeLottery();
            await oneWinPerUserLottery.drawWinningNumbers();

            let reward = (await oneWinPerUserLottery.lottery()).rewardPerWinner;
            let users = [accounts[1], accounts[2], accounts[3], accounts[4], accounts[5]]
            let userBalances = []
            for (let i = 0; i < 5; i++) {
                userBalances[i] = await lotteryToken.balanceOf(users[i].address);
            }

            for (let i = 0; i < 5; i++) {
                if ((await oneWinPerUserLottery.connect(users[i]).isWinnerAndWinningTickets())[0] == true) {
                    let winTicket = (await oneWinPerUserLottery.connect(users[i]).isWinnerAndWinningTickets())[1][0];
                    await oneWinPerUserLottery.connect(users[i]).getReward(winTicket);
                    expect(await lotteryToken.balanceOf(users[i].address)).to.equal(userBalances[i].add(reward));
                    expect(await oneWinPerUserLottery.tickets(users[i].address)).to.be.true;
                }
            }
        });

        it("double withdraw returns revert", async function() {
            await oneWinPerUserLottery.connect(accounts[1]).buyTickets([1]);
            await oneWinPerUserLottery.connect(accounts[2]).buyTickets([2, 3]);
            await oneWinPerUserLottery.connect(accounts[3]).buyTickets([4, 5, 6]);
            await oneWinPerUserLottery.connect(accounts[4]).buyTickets([7, 8, 9, 10]);
            await oneWinPerUserLottery.connect(accounts[5]).buyTickets([11, 12, 13, 14, 15]);
            await lotteryToken.approve(oneWinPerUserLottery.address, await lotteryToken.balanceOf(accounts[0].address));
            await oneWinPerUserLottery.closeLottery();
            await oneWinPerUserLottery.drawWinningNumbers();

            let users = [accounts[1], accounts[2], accounts[3], accounts[4], accounts[5]]

            for (let i = 0; i < 5; i++) {
                if ((await oneWinPerUserLottery.connect(users[i]).isWinnerAndWinningTickets())[0] == true) {
                    let winTicket = (await oneWinPerUserLottery.connect(users[i]).isWinnerAndWinningTickets())[1][0];
                    await oneWinPerUserLottery.connect(users[i]).getReward(winTicket);
                }
            }

            for (let i = 0; i < 5; i++) {
                if ((await oneWinPerUserLottery.connect(users[i]).isWinnerAndWinningTickets())[0] == true) {
                    let winTicket = (await oneWinPerUserLottery.connect(users[i]).isWinnerAndWinningTickets())[1][0];
                    await expect(oneWinPerUserLottery.connect(users[i]).getReward(winTicket)).to.be.revertedWith("You have already withdrawed the reward");
                }
            }
        });

        it("withdraw for not winning ticket", async function() {
            await oneWinPerUserLottery.connect(accounts[1]).buyTickets([1]);
            await oneWinPerUserLottery.connect(accounts[2]).buyTickets([2, 3]);
            await oneWinPerUserLottery.connect(accounts[3]).buyTickets([4, 5, 6]);
            await oneWinPerUserLottery.connect(accounts[4]).buyTickets([7, 8, 9, 10]);
            await oneWinPerUserLottery.connect(accounts[5]).buyTickets([11, 12, 13, 14, 15]);
            await lotteryToken.approve(oneWinPerUserLottery.address, await lotteryToken.balanceOf(accounts[0].address));
            await oneWinPerUserLottery.closeLottery();
            await oneWinPerUserLottery.drawWinningNumbers();

            let users = [accounts[1], accounts[2], accounts[3], accounts[4], accounts[5]]

            for (let i = 0; i < 5; i++) {
                if ((await oneWinPerUserLottery.connect(users[i]).isWinnerAndWinningTickets())[0] == false) {
                    let yourTicket = (await oneWinPerUserLottery.viewTicketNumbers(users[i].address))[0];
                    await expect(oneWinPerUserLottery.connect(users[i]).getReward(yourTicket)).to.be.revertedWith(
                        "This ticket is not the winning ticket, check your winning tickets using isWinnerAndWinningTickets()"
                    );
                }
            }
        })

        it("check winner from non ticket owner", async function() {
            await oneWinPerUserLottery.connect(accounts[1]).buyTickets([1]);
            await oneWinPerUserLottery.connect(accounts[2]).buyTickets([2, 3]);
            await oneWinPerUserLottery.connect(accounts[3]).buyTickets([4, 5, 6]);
            await oneWinPerUserLottery.connect(accounts[4]).buyTickets([7, 8, 9, 10]);
            await oneWinPerUserLottery.connect(accounts[5]).buyTickets([11, 12, 13, 14, 15]);
            await lotteryToken.approve(oneWinPerUserLottery.address, await lotteryToken.balanceOf(accounts[0].address));
            await oneWinPerUserLottery.closeLottery();
            await oneWinPerUserLottery.drawWinningNumbers();

            await expect(oneWinPerUserLottery.isWinnerAndWinningTickets()).to.be.revertedWith("You did not participate in the lottery!");
        });

        it("check winner before lottery is completed", async function() {
            await oneWinPerUserLottery.connect(accounts[1]).buyTickets([1]);
            await oneWinPerUserLottery.connect(accounts[2]).buyTickets([2, 3]);
            await oneWinPerUserLottery.connect(accounts[3]).buyTickets([4, 5, 6]);
            await oneWinPerUserLottery.connect(accounts[4]).buyTickets([7, 8, 9, 10]);
            await oneWinPerUserLottery.connect(accounts[5]).buyTickets([11, 12, 13, 14, 15]);
            await lotteryToken.approve(oneWinPerUserLottery.address, await lotteryToken.balanceOf(accounts[0].address));
            await oneWinPerUserLottery.closeLottery();

            await expect(oneWinPerUserLottery.connect(accounts[1]).isWinnerAndWinningTickets()).to.be.revertedWith("Lottery isn't completed yet");
            await expect(oneWinPerUserLottery.connect(accounts[1]).viewWinningTickets()).to.be.reverted;
        })
    });
})
