//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./FakeRandomness.sol";
import "./LotteryToken.sol";
import "./NFTTicket.sol";

contract OneTicketPerUserLottery is Ownable {

    NFTTicket nft;
    LotteryToken token;
    FakeRandomness random;

    enum Status {
        Started,
        Closed
    }

    struct LotteryInfo {
        Status status;
        uint256 winningTicketsAmount;
        uint256 totalTicketsAmount;
        uint256 purchasedTickets;
        uint256 rewardPerTicket;
        address contractOwner;
    }

    struct UserInfo {
        uint256 ticketNumber;
        bool alreadyWithdrawedReward;
    }

    LotteryInfo lottery;

    mapping(address => UserInfo) tickets;

    constructor(uint256 _winningTicketsAmount, 
                uint256 _totalTicketsAmount, 
                uint256 _rewardPerTicket,
                address _nftAddress,
                address _tokenAddress,
                address _randomAddress) {
        lottery.status = Status.Started;
        lottery.winningTicketsAmount = _winningTicketsAmount;
        lottery.totalTicketsAmount = _totalTicketsAmount;
        lottery.rewardPerTicket = _rewardPerTicket;
        lottery.contractOwner = msg.sender;

        nft = NFTTicket(_nftAddress);
        token = LotteryToken(_tokenAddress);
        random = FakeRandomness(_randomAddress);
    }

    // 1 LotteryToken = 1 NFTTicket
    function buyTicket(uint256 _ticketId) external {
        require(lottery.status == Status.Started, "Purchase stage is over");
        require(nft.balanceOf(msg.sender) == 0, "It's allowed to buy only one ticket");
        require(_ticketId > 0 && _ticketId <= lottery.totalTicketsAmount, "Incorrect number of ticket");
        require(lottery.purchasedTickets < lottery.totalTicketsAmount, "All tickets are already sold");
        
        nft.mint(msg.sender, _ticketId);
        tickets[msg.sender].ticketNumber = _ticketId;
        token.burn(msg.sender, 1);  // pay for ticket
        lottery.purchasedTickets += 1;
    }

    function closeLottery() external onlyOwner() {
        require(lottery.status == Status.Started, "Purchase stage is over");
        require(lottery.purchasedTickets == lottery.totalTicketsAmount, "Not all tickets have been purchased yet");
        // Before to call "closeLottery" contract owner should call token.approve(lottery contract, all contract_owner's tokens)
        require(token.allowance(lottery.contractOwner, address(this)) == token.balanceOf(lottery.contractOwner));

        lottery.status = Status.Closed;
        random.getRandomNumber();
    }

    // function drawWinningNumbers(random.randomResult) {} - для всех остальных контрактов

    function getReward() external {
        require(isWinner(), "You lost in this lottery");
        require(!tickets[msg.sender].alreadyWithdrawedReward, "You have already withdrawed the reward");

        token.transferFrom(lottery.contractOwner, msg.sender, lottery.rewardPerTicket);
        tickets[msg.sender].alreadyWithdrawedReward = true;
    }

    function isWinner() public view returns (bool) {
        require(tickets[msg.sender].ticketNumber != 0, "You did not participate in the lottery!");
        require(lottery.status == Status.Closed, "Lottery isn't completed yet");
        require(random.randomResult() != 0, "Wait a little bit, winning tickets are being generated");

        uint256 coinFlip = uint256(keccak256(abi.encode(random.randomResult, tickets[msg.sender]))) % lottery.totalTicketsAmount;
        if (coinFlip < lottery.winningTicketsAmount) {
            return true;
        }
        return false;
    }
}