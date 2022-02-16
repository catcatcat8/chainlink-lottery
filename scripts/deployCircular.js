async function main() {
    [owner, user1, user2, user3, user4] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", owner.address);

    NFTTicket = await ethers.getContractFactory("NFTTicket");
    nftTicket = await NFTTicket.deploy();
    await nftTicket.deployed();

    LotteryToken = await ethers.getContractFactory("LotteryToken");
    lotteryToken = await LotteryToken.deploy();
    await lotteryToken.deployed();

    Randomness = await ethers.getContractFactory("Randomness");
    randomness = await Randomness.deploy();
    await randomness.deployed();

    CircularLottery = await ethers.getContractFactory("CircularLottery");
    circularLottery = await CircularLottery.deploy(5, 10, 10, nftTicket.address, lotteryToken.address, randomness.address);
    await circularLottery.deployed();

    await nftTicket.grantMinterRole(circularLottery.address);
    await lotteryToken.grantBurnerRole(circularLottery.address);
  
    console.log("NFTTicket address:", nftTicket.address);
    console.log("LotteryToken address:", lotteryToken.address);
    console.log("Randomness address:", randomness.address);
    console.log("CircularLottery address:", circularLottery.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });

// Deploying contracts with the account: 0x3Ba6810768c2F4FD3Be2c5508E214E68B514B35f
// NFTTicket address: 0x6Bfd39a71B819b8016Dd839793445672E6D885B6
// LotteryToken address: 0x4DA72CFAb437F21bC01B4483585B9063e5AfBB82
// Randomness address: 0x683a092EE655A0fF73fAd1666d8885905Df54976
// CircularLottery address: 0xA54f2DC9D0a82a618816B11B1B5aD847E9aD8772