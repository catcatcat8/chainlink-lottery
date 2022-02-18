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

    const CircularLottery = await ethers.getContractFactory("CircularLottery");
    let circularLottery = await CircularLottery.deploy(5, 10, 10, nftTicket.address, lotteryToken.address, randomness.address);
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