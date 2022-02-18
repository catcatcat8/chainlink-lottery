import { ethers } from 'hardhat'

async function main() {
    const [owner, user1, user2, user3, user4, ...users] = await ethers.getSigners();
    const NFTTicketAddr = "0x97094f9d86278c357c8337Cdb63d0a3460500A47";
    const LotteryTokenAddr = "0x6e5590A3b15635957Ad4AC6E074541e17e14D24D";
    const RandomnessAddr = "0x25CF5B1879A3e6cA1f05F33d66046f4da53E7eB6";
    const MultiWinAddr = "0x125a260c58519F563E3dd9f45A3a6B57b64E1Ee5";

    const NFTTicket = await ethers.getContractFactory("NFTTicket");
    const LotteryToken = await ethers.getContractFactory("LotteryToken");
    const Randomness = await ethers.getContractFactory("Randomness");
    const MultiWinPerUserLottery = await ethers.getContractFactory("MultiWinPerUserLottery");

    let nftTicket = await NFTTicket.attach(NFTTicketAddr);
    let lotteryToken = await LotteryToken.attach(LotteryTokenAddr);
    let randomness = await Randomness.attach(RandomnessAddr);
    let multiWinPerUserLottery = await MultiWinPerUserLottery.attach(MultiWinAddr);
  }
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });