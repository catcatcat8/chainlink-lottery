import { ethers } from 'hardhat'

async function main() {
    const [owner, user1, user2, user3, user4, ...users] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", owner.address);

    const NFTTicket = await ethers.getContractFactory("NFTTicket");
    let nftTicket = await NFTTicket.deploy();
    await nftTicket.deployed();

    const LotteryToken = await ethers.getContractFactory("LotteryToken");
    let lotteryToken = await LotteryToken.deploy();
    await lotteryToken.deployed();

    const Randomness = await ethers.getContractFactory("Randomness");
    let randomness = await Randomness.deploy();
    await randomness.deployed();

    const OneWinPerUserLottery = await ethers.getContractFactory("OneWinPerUserLottery");
    let oneWinPerUserLottery = await OneWinPerUserLottery.deploy(5, 10, 10, nftTicket.address, lotteryToken.address, randomness.address);
    await oneWinPerUserLottery.deployed();

    await nftTicket.grantMinterRole(oneWinPerUserLottery.address);
    await lotteryToken.grantBurnerRole(oneWinPerUserLottery.address);
  
    console.log("NFTTicket address:", nftTicket.address);
    console.log("LotteryToken address:", lotteryToken.address);
    console.log("Randomness address:", randomness.address);
    console.log("OneWinPerUserLottery address:", oneWinPerUserLottery.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });

// Deploying contracts with the account: 0x3Ba6810768c2F4FD3Be2c5508E214E68B514B35f
// NFTTicket address: 0x682f50627D9dbCDD49B2932717AA4204b9F20C89
// LotteryToken address: 0x53656A51858c0d4749C574d8936F2636924ac752
// Randomness address: 0xE172e3F590dD501B987781f096AE0c270B17853C
// OneWinPerUserLottery address: 0x18d8EC0C11210aB579eB70f6a42C5142cd3Ec02F