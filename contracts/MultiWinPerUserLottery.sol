//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./FakeRandomness.sol";
import "./LotteryToken.sol";
import "./NFTTicket.sol";

contract OneWinPerUserLottery is Ownable {

    NFTTicket nft;
    LotteryToken token;
    FakeRandomness random;

    enum Status {
        Started,
        Closed,
        Completed
    }

    struct LotteryInfo {
        Status status;
        uint256 winningTicketsAmount;
        uint256 totalTicketsAmount;
        uint256[] purchasedTickets;
        uint256 rewardPerTicket;
        address contractOwner;
        mapping(uint256 => bool) winningTickets;

        // Because of admin can generate only 10 winning tickets at once
        uint256 winningTicketsDrawnAlready;
        uint256 lastRandomNumber;
    }

    struct UserInfo {
        uint256[] ticketNumbers;
        mapping(uint256 => bool) alreadyWithdrawedRewardPerTicket;
    }

    struct UserTickets {
        address ticketOwner;
        uint256 ticketNumber;
    }

    LotteryInfo lottery;

    mapping(address => UserInfo) tickets;

    /**
     * Is needed because drawWinningNumbers() can generate the same winning numbers
     * So drawWinningNumbers() will generate indexes from this array, after that it will delete these elements reducing the range of random
     */
    UserTickets[] userTickets;

    constructor(uint256 _winningTicketsAmount, 
                uint256 _totalTicketsAmount, 
                uint256 _rewardPerWinner,
                address _nftAddress,
                address _tokenAddress,
                address _randomAddress) {
        lottery.status = Status.Started;
        lottery.winningTicketsAmount = _winningTicketsAmount;
        lottery.totalTicketsAmount = _totalTicketsAmount;
        lottery.rewardPerTicket = _rewardPerWinner;
        lottery.contractOwner = msg.sender;

        nft = NFTTicket(_nftAddress);
        token = LotteryToken(_tokenAddress);
        random = FakeRandomness(_randomAddress);
    }

    // 1 LotteryToken = 1 NFTTicket
    function buyTickets(uint256[] memory _ticketsId) external {
        require(lottery.status == Status.Started, "Purchase stage is over");
        require(_ticketsId.length <= 10, "It's not allowed to buy more than 10 tickets at once");
        require(lottery.purchasedTickets.length + _ticketsId.length <= lottery.totalTicketsAmount, 
                "You can't buy so many tickets, check 'leftTicketsAmount function'");

        for (uint256 i = 0; i < _ticketsId.length; i++) {
            require(_ticketsId[i] > 0 && _ticketsId[i] <= lottery.totalTicketsAmount, "Incorrect number of ticket");
            nft.mint(msg.sender, _ticketsId[i]);
            tickets[msg.sender].ticketNumbers.push(_ticketsId[i]);
            lottery.purchasedTickets.push(_ticketsId[i]);

            UserTickets memory ut = UserTickets(msg.sender, _ticketsId[i]);
            userTickets.push(ut);
        }
        token.burn(msg.sender, _ticketsId.length);  // pay for tickets
    }

    function closeLottery() external onlyOwner() {
        require(lottery.status == Status.Started, "Purchase stage is over");
        require(lottery.purchasedTickets.length == lottery.totalTicketsAmount, "Not all tickets have been purchased yet");
        // Before to call "closeLottery" contract owner should call token.approve(lottery contract, all contract_owner's tokens)
        require(token.allowance(lottery.contractOwner, address(this)) == token.balanceOf(lottery.contractOwner));

        lottery.status = Status.Closed;
        random.getRandomNumber();
    }

    function drawWinningNumbers() external onlyOwner() {
        require(lottery.status == Status.Closed, "It is purchase stage now or all winning numbers has already been generated");
        require(random.randomResult() != 0, "Random hasn't been generated yet");
        
        uint256 drawAmount = lottery.winningTicketsAmount - lottery.winningTicketsDrawnAlready;
        uint256 currentRandom = lottery.lastRandomNumber;
        if (drawAmount > 10) {
            drawAmount = 10;  // not more than 10 winning tickets at once because of gas limit
        }
        if (currentRandom == 0) {
            currentRandom = random.randomResult();
        }
        uint256 winningTicket = 0;
        for (uint256 i = 0; i < drawAmount; i++) {
            uint256 newRandom = uint256(keccak256(abi.encode(currentRandom)));
            uint256 winningIndex = newRandom % userTickets.length;
            winningTicket = userTickets[winningIndex].ticketNumber;

            // Deleting an index and decreasing the array size
            userTickets[winningIndex] = userTickets[userTickets.length-1];
            userTickets.pop();

            lottery.winningTickets[winningTicket] = true;

            currentRandom = newRandom;
        }
        lottery.winningTicketsDrawnAlready += drawAmount;
        if (lottery.winningTicketsDrawnAlready < lottery.winningTicketsAmount) {
            lottery.lastRandomNumber = currentRandom;
        }
        else {
            lottery.status = Status.Completed;
        }
    }

    function getReward(uint256[] memory _tickets) external {
        require(lottery.status == Status.Completed, "Lottery isn't completed yet");
        require(_tickets.length <= 10, "It's allowed to get reward for no more than 10 tickets at once");

        for (uint256 i=0; i<_tickets.length; i++) {
            if (lottery.winningTickets[_tickets[i]] &&  // This ticket is the winning ticket  
                nft.ownerOf(_tickets[i]) == msg.sender &&  // You are owner of this ticket
                !tickets[msg.sender].alreadyWithdrawedRewardPerTicket[_tickets[i]])  // You haven't already withdrawed the reward for this ticket
            {
                token.transferFrom(lottery.contractOwner, msg.sender, lottery.rewardPerTicket);
                tickets[msg.sender].alreadyWithdrawedRewardPerTicket[_tickets[i]] = true;
            }
        }
    }

    /**
     * @notice Returns true and the array of winning tickets (except zeros in this array) if you win, otherwise returns false and the array of zeros
     */
    function isWinnerAndWinningTickets(uint256[] memory _tickets) public view returns (bool, uint256[] memory) {
        require(tickets[msg.sender].ticketNumbers.length != 0, "You did not participate in the lottery!");
        require(lottery.status == Status.Completed, "Lottery isn't completed yet");

        uint256[] memory wins = new uint256[](_tickets.length);
        uint256 b = 0;
        bool isWin;
        for (uint256 i=0; i<_tickets.length; i++) {
            require(nft.ownerOf(_tickets[i]) == msg.sender, "Some tickets are not yours");
            if (lottery.winningTickets[_tickets[i]]) {
                wins[b] = _tickets[i];
                b++;
                if (!isWin) {
                    isWin = true;
                }
            }
        }
        if (isWin) {
            return (true, wins);
        }
        return (false, wins);
    }
}