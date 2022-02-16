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

    OneTicketPerUserLottery = await ethers.getContractFactory("OneTicketPerUserLottery");
    oneTicketPerUserLottery = await OneTicketPerUserLottery.deploy(2, 4, 10, nftTicket.address, lotteryToken.address, randomness.address);
    await oneTicketPerUserLottery.deployed();

    await nftTicket.grantMinterRole(oneTicketPerUserLottery.address);
    await lotteryToken.grantBurnerRole(oneTicketPerUserLottery.address);
  
    console.log("NFTTicket address:", nftTicket.address);
    console.log("LotteryToken address:", lotteryToken.address);
    console.log("Randomness address:", randomness.address);
    console.log("OneTicketPerUserLottery address:", oneTicketPerUserLottery.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });

// Deploying contracts with the account: 0x3Ba6810768c2F4FD3Be2c5508E214E68B514B35f
// NFTTicket address: 0xcD9772b058abaFd58762e598e4b1caf50fb8b3D6
// LotteryToken address: 0x55574E2e0C5B11a6488073FA464B9f32D0442D9C
// Randomness address: 0xaF4c1eB94473369E41063504ddF86Af434041a3c
// OneTicketPerUserLottery address: 0x342001df21f038488F8559f59C373fBF5F6411EC