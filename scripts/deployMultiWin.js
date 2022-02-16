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

    MultiWinPerUserLottery = await ethers.getContractFactory("MultiWinPerUserLottery");
    multiWinPerUserLottery = await MultiWinPerUserLottery.deploy(5, 10, 10, nftTicket.address, lotteryToken.address, randomness.address);
    await multiWinPerUserLottery.deployed();

    await nftTicket.grantMinterRole(multiWinPerUserLottery.address);
    await lotteryToken.grantBurnerRole(multiWinPerUserLottery.address);
  
    console.log("NFTTicket address:", nftTicket.address);
    console.log("LotteryToken address:", lotteryToken.address);
    console.log("Randomness address:", randomness.address);
    console.log("MultiWinPerUserLottery address:", multiWinPerUserLottery.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });

// Deploying contracts with the account: 0x3Ba6810768c2F4FD3Be2c5508E214E68B514B35f
// NFTTicket address: 0x97094f9d86278c357c8337Cdb63d0a3460500A47
// LotteryToken address: 0x6e5590A3b15635957Ad4AC6E074541e17e14D24D
// Randomness address: 0x25CF5B1879A3e6cA1f05F33d66046f4da53E7eB6
// MultiWinPerUserLottery address: 0x125a260c58519F563E3dd9f45A3a6B57b64E1Ee5