const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CircularLottery tests", function() {
    let owner, user1, user2, user3, user4, user5;
    let LotteryToken, lotteryToken, NFTTicket, nftTicket, FakeRandomness, fakeRandomness, CircularLottery, circularLottery;
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

        CircularLottery = await ethers.getContractFactory("CircularLottery");
        circularLottery = await CircularLottery.deploy(5, 15, 10, nftTicket.address, lotteryToken.address, fakeRandomness.address);
        await circularLottery.deployed();

        await nftTicket.grantMinterRole(circularLottery.address);
        await lotteryToken.grantBurnerRole(circularLottery.address);

        await lotteryToken.transfer(user1.address, 1);
        await lotteryToken.transfer(user2.address, 2);
        await lotteryToken.transfer(user3.address, 3);
        await lotteryToken.transfer(user4.address, 4);
        await lotteryToken.transfer(user5.address, 25);

        status = {
            Started: 0,
            Closed: 1
        };
    });

    describe("buyTickets tests", function() {
        it("correct buy tickets", async function() {
            let balanceBefore = await lotteryToken.balanceOf(user4.address);
            await circularLottery.connect(user4).buyTickets([1]);
    
            expect(await nftTicket.ownerOf(1)).to.equal(user4.address);
            
            let expectedNumbers = [1]
            for(let i=0; i<(await circularLottery.viewTicketNumbers(user4.address)).length; i++) {
                expect((await circularLottery.viewTicketNumbers(user4.address))[i]).to.equal(expectedNumbers[i]);
            }

            expect(await lotteryToken.balanceOf(user4.address)).to.equal(balanceBefore - 1);
            expect((await circularLottery.viewPurchasedTickets()).length).to.equal(1);

            await circularLottery.connect(user4).buyTickets([2, 3]);
            expect(await nftTicket.ownerOf(2)).to.equal(user4.address);
            expect(await nftTicket.ownerOf(3)).to.equal(user4.address);
            
            expectedNumbers = [1, 2, 3]
            for(let i=0; i<(await circularLottery.viewTicketNumbers(user4.address)).length; i++) {
                expect((await circularLottery.viewTicketNumbers(user4.address))[i]).to.equal(expectedNumbers[i]);
            }

            expect(await lotteryToken.balanceOf(user4.address)).to.equal(balanceBefore - 3);
            expect((await circularLottery.viewPurchasedTickets()).length).to.equal(3);
        });
    
        it("not enough tokens to buy tickets", async function() {
            await expect(circularLottery.connect(user4).buyTickets([1, 2, 3, 4, 5, 6, 7])).to.be.revertedWith("Not enough balance to buy tickets");
        });

        it("buy more than 10 tickets at once", async function() {
            await expect(circularLottery.connect(user5).buyTickets([1,2,3,4,5,6,7,8,9,10,11])).to.be.revertedWith("It's not allowed to buy more than 10 tickets at once");
        });
    
        it("incorrect number of ticket", async function() {
            await expect(circularLottery.connect(user5).buyTickets([1, 5, 16])).to.be.revertedWith("Incorrect number of ticket");
        });

        it("buy too many tickets returns revert", async function() {
            await circularLottery.connect(user1).buyTickets([1]);
            await circularLottery.connect(user2).buyTickets([2, 3]);
            await circularLottery.connect(user3).buyTickets([4, 5, 6]);
            await circularLottery.connect(user4).buyTickets([7, 8, 9, 10]);

            await expect(circularLottery.buyTickets([11, 12, 13, 15, 16, 17, 18, 19])).to.be.revertedWith("You can't buy so many tickets");
        });
    });

    describe("closeLottery tests", function() {
        it("correct close lottery, unable to buy tickets after close", async function() {
            await circularLottery.connect(user1).buyTickets([1]);
            await circularLottery.connect(user2).buyTickets([2, 3]);
            await circularLottery.connect(user3).buyTickets([4, 5, 6]);
            await circularLottery.connect(user4).buyTickets([7, 8, 9, 10]);
            await circularLottery.connect(user5).buyTickets([11, 12, 13, 14, 15])
            await lotteryToken.approve(circularLottery.address, lotteryToken.balanceOf(owner.address));
            
            expect((await circularLottery.lottery()).status).to.equal(status.Started);
            await circularLottery.closeLottery();
            expect((await circularLottery.lottery()).status).to.equal(status.Closed);

            await expect(circularLottery.buyTickets([1])).to.be.revertedWith("Purchase stage is over");
        });

        it("not all tickets were bought", async function() {
            await circularLottery.connect(user1).buyTickets([1]);
            await expect(circularLottery.closeLottery()).to.be.revertedWith("Not all tickets have been purchased yet");
        });

        it("admin didn't allow spending tokens for contract", async function() {
            await circularLottery.connect(user1).buyTickets([1]);
            await circularLottery.connect(user2).buyTickets([2, 3]);
            await circularLottery.connect(user3).buyTickets([4, 5, 6]);
            await circularLottery.connect(user4).buyTickets([7, 8, 9, 10]);
            await circularLottery.connect(user5).buyTickets([11, 12, 13, 14, 15])

            await expect(circularLottery.closeLottery()).to.be.reverted;
        });

        it("double close lottery", async function() {
            await circularLottery.connect(user1).buyTickets([1]);
            await circularLottery.connect(user2).buyTickets([2, 3]);
            await circularLottery.connect(user3).buyTickets([4, 5, 6]);
            await circularLottery.connect(user4).buyTickets([7, 8, 9, 10]);
            await circularLottery.connect(user5).buyTickets([11, 12, 13, 14, 15])
            await lotteryToken.approve(circularLottery.address, lotteryToken.balanceOf(owner.address));
            await circularLottery.closeLottery();
            
            await expect(circularLottery.closeLottery()).to.be.revertedWith("Purchase stage is over");
        });
    });

    describe("getReward tests", function() {
        it("withdrawing before lottery is closed", async function() {
            await circularLottery.connect(user1).buyTickets([1]);
            await circularLottery.connect(user2).buyTickets([2, 3]);
            await circularLottery.connect(user3).buyTickets([4, 5, 6]);
            await circularLottery.connect(user4).buyTickets([7, 8, 9, 10]);
            await circularLottery.connect(user5).buyTickets([11, 12, 13, 14, 15]);
            await lotteryToken.approve(circularLottery.address, lotteryToken.balanceOf(owner.address));

            await expect(circularLottery.connect(user1).getReward([1])).to.be.revertedWith("Lottery isn't completed yet");
        });

        it("correct withdrawing the reward", async function() {
            await circularLottery.connect(user1).buyTickets([1]);
            await circularLottery.connect(user2).buyTickets([2, 3]);
            await circularLottery.connect(user3).buyTickets([4, 5, 6]);
            await circularLottery.connect(user4).buyTickets([7, 8, 9, 10]);
            await circularLottery.connect(user5).buyTickets([11, 12, 13, 14, 15]);
            await lotteryToken.approve(circularLottery.address, lotteryToken.balanceOf(owner.address));
            await circularLottery.closeLottery();

            let reward = (await circularLottery.lottery()).rewardPerTicket;
            let users = [user1, user2, user3, user4, user5]
            let rewardsAmount = 0;

            let userBalances = []
            for (let i = 0; i < 5; i++) {
                userBalances[i] = await lotteryToken.balanceOf(users[i].address);
            }

            for (let i = 0; i < 5; i++) {
                if ((await circularLottery.connect(users[i]).isWinnerAndWinningTickets())[0] == true) {
                    let winTicket = (await circularLottery.connect(users[i]).isWinnerAndWinningTickets())[1][0];
                    await circularLottery.connect(users[i]).getReward([winTicket]);
                    expect(await lotteryToken.balanceOf(users[i].address)).to.equal(parseInt(userBalances[i]) + parseInt(reward));
                    rewardsAmount += 1;
                }
            }

            for (let i = 0; i < 5; i++) {
                userBalances[i] = await lotteryToken.balanceOf(users[i].address);
            }

            for (let i = 0; i < 5; i++) {
                if ((await circularLottery.connect(users[i]).isWinnerAndWinningTickets())[0] == true) {
                    let winTickets = (await circularLottery.connect(users[i]).isWinnerAndWinningTickets())[1];
                    if (winTickets.length > 1) {
                        let notWithdrawRewardAlready = winTickets.slice(1);
                        await circularLottery.connect(users[i]).getReward(notWithdrawRewardAlready);
                        expect(await lotteryToken.balanceOf(users[i].address)).to.equal(
                            parseInt(userBalances[i]) + parseInt(reward) * notWithdrawRewardAlready.length);
                        rewardsAmount += notWithdrawRewardAlready.length;
                    }
                }
            }
            expect((await circularLottery.viewWinningTickets()).length).to.equal(rewardsAmount);
        });

        it("check winner from non ticket owner", async function() {
            await circularLottery.connect(user1).buyTickets([1]);
            await circularLottery.connect(user2).buyTickets([2, 3]);
            await circularLottery.connect(user3).buyTickets([4, 5, 6]);
            await circularLottery.connect(user4).buyTickets([7, 8, 9, 10]);
            await circularLottery.connect(user5).buyTickets([11, 12, 13, 14, 15]);
            await lotteryToken.approve(circularLottery.address, lotteryToken.balanceOf(owner.address));
            await circularLottery.closeLottery();

            await expect(circularLottery.isWinnerAndWinningTickets()).to.be.revertedWith("You did not participate in the lottery!");
        });

        it("check winner before lottery is closed", async function() {
            await circularLottery.connect(user1).buyTickets([1]);
            await circularLottery.connect(user2).buyTickets([2, 3]);
            await circularLottery.connect(user3).buyTickets([4, 5, 6]);
            await circularLottery.connect(user4).buyTickets([7, 8, 9, 10]);
            await circularLottery.connect(user5).buyTickets([11, 12, 13, 14, 15]);
            await lotteryToken.approve(circularLottery.address, lotteryToken.balanceOf(owner.address));

            await expect(circularLottery.connect(user1).isWinnerAndWinningTickets()).to.be.revertedWith("Lottery isn't completed yet");
            await expect(circularLottery.connect(user1).viewWinningTickets()).to.be.reverted;
        })
    });
});