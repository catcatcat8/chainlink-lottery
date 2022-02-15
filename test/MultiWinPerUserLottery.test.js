const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiWinPerUserLottery tests", function() {
    let owner, user1, user2, user3, user4, user5;
    let LotteryToken, lotteryToken, NFTTicket, nftTicket, FakeRandomness, fakeRandomness, MultiWinPerUserLottery, multiWinPerUserLottery;
    let status;

    beforeEach(async () => {
        [owner, user1, user2, user3, user4, user5] = await ethers.getSigners();
        NFTTicket = await ethers.getContractFactory("NFTTicket");
        nftTicket = await NFTTicket.deploy();
        await nftTicket.deployed();

        LotteryToken = await ethers.getContractFactory("LotteryToken");
        lotteryToken = await LotteryToken.deploy();
        await lotteryToken.deployed();

        FakeRandomness = await ethers.getContractFactory("FakeRandomness");
        fakeRandomness = await FakeRandomness.deploy();
        await fakeRandomness.deployed();

        MultiWinPerUserLottery = await ethers.getContractFactory("MultiWinPerUserLottery");
        multiWinPerUserLottery = await MultiWinPerUserLottery.deploy(5, 15, 10, nftTicket.address, lotteryToken.address, fakeRandomness.address);
        await multiWinPerUserLottery.deployed();

        await nftTicket.grantMinterRole(multiWinPerUserLottery.address);
        await lotteryToken.grantBurnerRole(multiWinPerUserLottery.address);

        await lotteryToken.transfer(user1.address, 1);
        await lotteryToken.transfer(user2.address, 2);
        await lotteryToken.transfer(user3.address, 3);
        await lotteryToken.transfer(user4.address, 4);
        await lotteryToken.transfer(user5.address, 25);

        status = {
            Started: 0,
            Closed: 1,
            Completed: 2
        };
    });

    describe("buyTickets tests", function() {
        it("correct buy tickets", async function() {
            let balanceBefore = await lotteryToken.balanceOf(user4.address);
            await multiWinPerUserLottery.connect(user4).buyTickets([1]);
    
            expect(await nftTicket.ownerOf(1)).to.equal(user4.address);
            
            let expectedNumbers = [1]
            for(let i=0; i<(await multiWinPerUserLottery.viewTicketNumbers(user4.address)).length; i++) {
                expect((await multiWinPerUserLottery.viewTicketNumbers(user4.address))[i]).to.equal(expectedNumbers[i]);
            }

            expect(await lotteryToken.balanceOf(user4.address)).to.equal(balanceBefore - 1);
            expect((await multiWinPerUserLottery.viewPurchasedTickets()).length).to.equal(1);

            await multiWinPerUserLottery.connect(user4).buyTickets([2, 3]);
            expect(await nftTicket.ownerOf(2)).to.equal(user4.address);
            expect(await nftTicket.ownerOf(3)).to.equal(user4.address);
            
            expectedNumbers = [1, 2, 3]
            for(let i=0; i<(await multiWinPerUserLottery.viewTicketNumbers(user4.address)).length; i++) {
                expect((await multiWinPerUserLottery.viewTicketNumbers(user4.address))[i]).to.equal(expectedNumbers[i]);
            }

            expect(await lotteryToken.balanceOf(user4.address)).to.equal(balanceBefore - 3);
            expect((await multiWinPerUserLottery.viewPurchasedTickets()).length).to.equal(3);
        });
    
        it("not enough tokens to buy tickets", async function() {
            await expect(multiWinPerUserLottery.connect(user4).buyTickets([1, 2, 3, 4, 5, 6, 7])).to.be.revertedWith("Not enough balance to buy tickets");
        });

        it("buy more than 10 tickets at once", async function() {
            await expect(multiWinPerUserLottery.connect(user5).buyTickets([1,2,3,4,5,6,7,8,9,10,11])).to.be.revertedWith("It's not allowed to buy more than 10 tickets at once");
        });
    
        it("incorrect number of ticket", async function() {
            await expect(multiWinPerUserLottery.connect(user5).buyTickets([1, 5, 16])).to.be.revertedWith("Incorrect number of ticket");
        });

        it("buy too many tickets returns revert", async function() {
            await multiWinPerUserLottery.connect(user1).buyTickets([1]);
            await multiWinPerUserLottery.connect(user2).buyTickets([2, 3]);
            await multiWinPerUserLottery.connect(user3).buyTickets([4, 5, 6]);
            await multiWinPerUserLottery.connect(user4).buyTickets([7, 8, 9, 10]);

            await expect(multiWinPerUserLottery.buyTickets([11, 12, 13, 15, 16, 17, 18, 19])).to.be.revertedWith("You can't buy so many tickets");
        });
    });

    describe("closeLottery tests", function() {
        it("correct close lottery, unable to buy tickets after close", async function() {
            await multiWinPerUserLottery.connect(user1).buyTickets([1]);
            await multiWinPerUserLottery.connect(user2).buyTickets([2, 3]);
            await multiWinPerUserLottery.connect(user3).buyTickets([4, 5, 6]);
            await multiWinPerUserLottery.connect(user4).buyTickets([7, 8, 9, 10]);
            await multiWinPerUserLottery.connect(user5).buyTickets([11, 12, 13, 14, 15])
            await lotteryToken.approve(multiWinPerUserLottery.address, lotteryToken.balanceOf(owner.address));
            
            expect((await multiWinPerUserLottery.lottery()).status).to.equal(status.Started);
            await multiWinPerUserLottery.closeLottery();
            expect((await multiWinPerUserLottery.lottery()).status).to.equal(status.Closed);

            await expect(multiWinPerUserLottery.buyTickets([1])).to.be.revertedWith("Purchase stage is over");
        });

        it("not all tickets were bought", async function() {
            await multiWinPerUserLottery.connect(user1).buyTickets([1]);
            await expect(multiWinPerUserLottery.closeLottery()).to.be.revertedWith("Not all tickets have been purchased yet");
        });

        it("admin didn't allow spending tokens for contract", async function() {
            await multiWinPerUserLottery.connect(user1).buyTickets([1]);
            await multiWinPerUserLottery.connect(user2).buyTickets([2, 3]);
            await multiWinPerUserLottery.connect(user3).buyTickets([4, 5, 6]);
            await multiWinPerUserLottery.connect(user4).buyTickets([7, 8, 9, 10]);
            await multiWinPerUserLottery.connect(user5).buyTickets([11, 12, 13, 14, 15])

            await expect(multiWinPerUserLottery.closeLottery()).to.be.reverted;
        });

        it("double close lottery", async function() {
            await multiWinPerUserLottery.connect(user1).buyTickets([1]);
            await multiWinPerUserLottery.connect(user2).buyTickets([2, 3]);
            await multiWinPerUserLottery.connect(user3).buyTickets([4, 5, 6]);
            await multiWinPerUserLottery.connect(user4).buyTickets([7, 8, 9, 10]);
            await multiWinPerUserLottery.connect(user5).buyTickets([11, 12, 13, 14, 15])
            await lotteryToken.approve(multiWinPerUserLottery.address, lotteryToken.balanceOf(owner.address));
            await multiWinPerUserLottery.closeLottery();
            
            await expect(multiWinPerUserLottery.closeLottery()).to.be.revertedWith("Purchase stage is over");
        });
    });

    describe("drawWinningNumbers tests", function() {
        it("can't throw numbers before random was generated", async function() {
            await expect(multiWinPerUserLottery.drawWinningNumbers()).to.be.revertedWith("It is purchase stage now or all winning numbers has already been generated");
        });
    
        it("correct draw winning numbers", async function() {
            await multiWinPerUserLottery.connect(user1).buyTickets([1]);
            await multiWinPerUserLottery.connect(user2).buyTickets([2, 3]);
            await multiWinPerUserLottery.connect(user3).buyTickets([4, 5, 6]);
            await multiWinPerUserLottery.connect(user4).buyTickets([7, 8, 9, 10]);
            await multiWinPerUserLottery.connect(user5).buyTickets([11, 12, 13, 14, 15])
            await lotteryToken.approve(multiWinPerUserLottery.address, lotteryToken.balanceOf(owner.address));
            await multiWinPerUserLottery.closeLottery();
    
            await multiWinPerUserLottery.drawWinningNumbers();
            expect((await multiWinPerUserLottery.lottery()).status).to.equal(status.Completed);
            expect((await multiWinPerUserLottery.viewWinningTickets()).length).to.equal(5); // 5 winning tickets
            expect(new Set(await multiWinPerUserLottery.viewWinningTickets()).size).to.equal(5);  // no dublicates
        });
    
        it("draws more than 10", async function() {
            MultiWinPerUserLottery2 = await ethers.getContractFactory("MultiWinPerUserLottery");
            multiWinPerUserLottery2 = await MultiWinPerUserLottery.deploy(12, 15, 10, nftTicket.address, lotteryToken.address, fakeRandomness.address);
            await multiWinPerUserLottery2.deployed();
            await nftTicket.grantMinterRole(multiWinPerUserLottery2.address);
            await lotteryToken.grantBurnerRole(multiWinPerUserLottery2.address);
    
            await multiWinPerUserLottery2.connect(user1).buyTickets([1]);
            await multiWinPerUserLottery2.connect(user2).buyTickets([2, 3]);
            await multiWinPerUserLottery2.connect(user3).buyTickets([4, 5, 6]);
            await multiWinPerUserLottery2.connect(user4).buyTickets([7, 8, 9, 10]);
            await multiWinPerUserLottery2.connect(user5).buyTickets([11, 12, 13, 14, 15])
            await lotteryToken.approve(multiWinPerUserLottery2.address, lotteryToken.balanceOf(owner.address));
            await multiWinPerUserLottery2.closeLottery();
    
            await multiWinPerUserLottery2.drawWinningNumbers();
            expect((await multiWinPerUserLottery2.lottery()).status).to.equal(status.Closed);
            await multiWinPerUserLottery2.drawWinningNumbers();
            expect((await multiWinPerUserLottery2.lottery()).status).to.equal(status.Completed);
            expect((await multiWinPerUserLottery2.viewWinningTickets()).length).to.equal(12); // 5 winning tickets
            expect(new Set(await multiWinPerUserLottery2.viewWinningTickets()).size).to.equal(12);  // no dublicates
        });
    });

    describe("getReward tests", function() {
        it("withdrawing before lottery is completed", async function() {
            await multiWinPerUserLottery.connect(user1).buyTickets([1]);
            await multiWinPerUserLottery.connect(user2).buyTickets([2, 3]);
            await multiWinPerUserLottery.connect(user3).buyTickets([4, 5, 6]);
            await multiWinPerUserLottery.connect(user4).buyTickets([7, 8, 9, 10]);
            await multiWinPerUserLottery.connect(user5).buyTickets([11, 12, 13, 14, 15]);
            await lotteryToken.approve(multiWinPerUserLottery.address, lotteryToken.balanceOf(owner.address));
            await multiWinPerUserLottery.closeLottery();

            await expect(multiWinPerUserLottery.connect(user1).getReward([1])).to.be.revertedWith("Lottery isn't completed yet");
        });

        it("correct withdrawing the reward", async function() {
            await multiWinPerUserLottery.connect(user1).buyTickets([1]);
            await multiWinPerUserLottery.connect(user2).buyTickets([2, 3]);
            await multiWinPerUserLottery.connect(user3).buyTickets([4, 5, 6]);
            await multiWinPerUserLottery.connect(user4).buyTickets([7, 8, 9, 10]);
            await multiWinPerUserLottery.connect(user5).buyTickets([11, 12, 13, 14, 15]);
            await lotteryToken.approve(multiWinPerUserLottery.address, lotteryToken.balanceOf(owner.address));
            await multiWinPerUserLottery.closeLottery();
            await multiWinPerUserLottery.drawWinningNumbers();

            let reward = (await multiWinPerUserLottery.lottery()).rewardPerTicket;
            let users = [user1, user2, user3, user4, user5]

            let userBalances = []
            for (let i = 0; i < 5; i++) {
                userBalances[i] = await lotteryToken.balanceOf(users[i].address);
            }

            for (let i = 0; i < 5; i++) {
                if ((await multiWinPerUserLottery.connect(users[i]).isWinnerAndWinningTickets())[0] == true) {
                    let winTicket = (await multiWinPerUserLottery.connect(users[i]).isWinnerAndWinningTickets())[1][0];
                    await multiWinPerUserLottery.connect(users[i]).getReward([winTicket]);
                    expect(await lotteryToken.balanceOf(users[i].address)).to.equal(parseInt(userBalances[i]) + parseInt(reward));
                }
            }

            for (let i = 0; i < 5; i++) {
                userBalances[i] = await lotteryToken.balanceOf(users[i].address);
            }

            for (let i = 0; i < 5; i++) {
                if ((await multiWinPerUserLottery.connect(users[i]).isWinnerAndWinningTickets())[0] == true) {
                    let winTickets = (await multiWinPerUserLottery.connect(users[i]).isWinnerAndWinningTickets())[1];
                    if (winTickets.length > 1) {
                        if ((await multiWinPerUserLottery.connect(users[i]).isWinnerAndWinningTickets())[1][1] != 0) {
                            let winTicket = (await multiWinPerUserLottery.connect(users[i]).isWinnerAndWinningTickets())[1][1];
                            await multiWinPerUserLottery.connect(users[i]).getReward([winTicket]);
                            expect(await lotteryToken.balanceOf(users[i].address)).to.equal(parseInt(userBalances[i]) + parseInt(reward));
                        }
                    }
                }
            }
        });

        it("check winner from non ticket owner", async function() {
            await multiWinPerUserLottery.connect(user1).buyTickets([1]);
            await multiWinPerUserLottery.connect(user2).buyTickets([2, 3]);
            await multiWinPerUserLottery.connect(user3).buyTickets([4, 5, 6]);
            await multiWinPerUserLottery.connect(user4).buyTickets([7, 8, 9, 10]);
            await multiWinPerUserLottery.connect(user5).buyTickets([11, 12, 13, 14, 15]);
            await lotteryToken.approve(multiWinPerUserLottery.address, lotteryToken.balanceOf(owner.address));
            await multiWinPerUserLottery.closeLottery();
            await multiWinPerUserLottery.drawWinningNumbers();

            await expect(multiWinPerUserLottery.isWinnerAndWinningTickets()).to.be.revertedWith("You did not participate in the lottery!");
        });

        it("check winner before lottery is completed", async function() {
            await multiWinPerUserLottery.connect(user1).buyTickets([1]);
            await multiWinPerUserLottery.connect(user2).buyTickets([2, 3]);
            await multiWinPerUserLottery.connect(user3).buyTickets([4, 5, 6]);
            await multiWinPerUserLottery.connect(user4).buyTickets([7, 8, 9, 10]);
            await multiWinPerUserLottery.connect(user5).buyTickets([11, 12, 13, 14, 15]);
            await lotteryToken.approve(multiWinPerUserLottery.address, lotteryToken.balanceOf(owner.address));
            await multiWinPerUserLottery.closeLottery();

            await expect(multiWinPerUserLottery.connect(user1).isWinnerAndWinningTickets()).to.be.revertedWith("Lottery isn't completed yet");
            await expect(multiWinPerUserLottery.connect(user1).viewWinningTickets()).to.be.reverted;
        })
    });
});