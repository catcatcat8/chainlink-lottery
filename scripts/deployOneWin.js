const { ethers } = require("ethers");

async function main() {
    [owner, user1, user2, user3, user4] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", owner.address);

    NFTTicket = await ethers.getContractFactory("NFTTicket");
    nftTicket = await NFTTicket.deploy();
    await nftTicket.deployed();

    LotteryToken = await ethers.getContractFactory("LotteryToken");
    lotteryToken = await LotteryToken.deploy();
    await lotteryToken.deployed();

    FakeRandomness = await ethers.getContractFactory("FakeRandomness");
    fakeRandomness = await FakeRandomness.deploy();
    await fakeRandomness.deployed();

    OneWinPerUserLottery = await ethers.getContractFactory("OneWinPerUserLottery");
    oneWinPerUserLottery = await OneWinPerUserLottery.deploy(5, 10, 10, nftTicket.address, lotteryToken.address, fakeRandomness.address);
    await oneWinPerUserLottery.deployed();

    await nftTicket.grantMinterRole(oneWinPerUserLottery.address);
    await lotteryToken.grantBurnerRole(oneWinPerUserLottery.address);
  
    console.log("NFTTicket address:", nftTicket.address);
    console.log("LotteryToken address:", lotteryToken.address);
    console.log("FakeRandomness address:", fakeRandomness.address);
    console.log("OneWinPerUserLottery address:", oneWinPerUserLottery.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });