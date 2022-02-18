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

    const MultiWinPerUserLottery = await ethers.getContractFactory("MultiWinPerUserLottery");
    let multiWinPerUserLottery = await MultiWinPerUserLottery.deploy(5, 10, 10, nftTicket.address, lotteryToken.address, randomness.address);
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