//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./Randomness.sol";
import "./LotteryToken.sol";
import "./NFTTicket.sol";

contract OneWinPerUserLottery is Ownable {

    NFTTicket nft;
    LotteryToken token;
    Randomness random;

    enum Status {
        Started,
        Closed,
        Completed
    }

    struct LotteryInfo {
        Status status;
        uint256 winningTicketsAmount;
        uint256 totalTicketsAmount;
        uint256 rewardPerWinner;
        address contractOwner;

        // Because of admin can generate only 10 winning tickets at once
        uint256 winningTicketsDrawnAlready;
        uint256 lastRandomNumber;
    }

    uint256[] public purchasedTickets;
    mapping(uint256 => bool) public winningTickets;

    struct UserInfo {
        uint256[] ticketNumbers;
        bool alreadyWithdrawedReward;
    }

    struct UserTickets {
        address ticketOwner;
        uint256 ticketNumber;
    }

    LotteryInfo public lottery;

    mapping(address => UserInfo) public tickets;

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
        lottery.rewardPerWinner = _rewardPerWinner;
        lottery.contractOwner = msg.sender;

        nft = NFTTicket(_nftAddress);
        token = LotteryToken(_tokenAddress);
        random = Randomness(_randomAddress);
    }

    // 1 LotteryToken = 1 NFTTicket
    function buyTickets(uint256[] memory _ticketsId) external {
        require(lottery.status == Status.Started, "Purchase stage is over");
        require(_ticketsId.length <= 10, "It's not allowed to buy more than 10 tickets at once");
        require(purchasedTickets.length + _ticketsId.length <= lottery.totalTicketsAmount, 
                "You can't buy so many tickets");
        require(token.balanceOf(msg.sender) >= _ticketsId.length, "Not enough balance to buy tickets");

        for (uint256 i = 0; i < _ticketsId.length; i++) {
            require(_ticketsId[i] > 0 && _ticketsId[i] <= lottery.totalTicketsAmount, "Incorrect number of ticket");
            nft.mint(msg.sender, _ticketsId[i]);
            tickets[msg.sender].ticketNumbers.push(_ticketsId[i]);
            purchasedTickets.push(_ticketsId[i]);

            UserTickets memory ut = UserTickets(msg.sender, _ticketsId[i]);
            userTickets.push(ut);
        }
        token.burn(msg.sender, _ticketsId.length);  // pay for tickets
    }

    function closeLottery() external onlyOwner() {
        require(lottery.status == Status.Started, "Purchase stage is over");
        require(purchasedTickets.length == lottery.totalTicketsAmount, "Not all tickets have been purchased yet");
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

            winningTickets[winningTicket] = true;

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

    function getReward(uint256 _ticketId) external {
        require(lottery.status == Status.Completed, "Lottery isn't completed yet");
        require(nft.ownerOf(_ticketId) == msg.sender, "You are not the owner of this ticket");
        require(!tickets[msg.sender].alreadyWithdrawedReward, "You have already withdrawed the reward");
        require(winningTickets[_ticketId], "This ticket is not the winning ticket, check your winning tickets using isWinnerAndWinningTickets()");

        token.transferFrom(lottery.contractOwner, msg.sender, lottery.rewardPerWinner);
        tickets[msg.sender].alreadyWithdrawedReward = true;
    }

    /**
     * @notice Returns true and the array of winning tickets if you win, otherwise returns false and the empty array
     */
    function isWinnerAndWinningTickets() public view returns (bool, uint256[] memory) {
        require(tickets[msg.sender].ticketNumbers.length != 0, "You did not participate in the lottery!");
        require(lottery.status == Status.Completed, "Lottery isn't completed yet");

        uint256 count = countUserWinningTickets();
        if (count == 0) {
            uint256[] memory winTickets;
            return (false, winTickets);
        }
        uint256[] memory myTickets = viewTicketNumbers(msg.sender);
        uint256[] memory wins = new uint256[](count);
        uint256 b = 0;
        for (uint256 i=0; i<myTickets.length; i++) {
            if (winningTickets[myTickets[i]]) {
                wins[b] = myTickets[i];
                b++;
            }
        }
        return (true, wins);
    }

    /**
     * @notice Returning count of the array except zeroes for creating dynamic array
     */
    function countUserWinningTickets() internal view returns (uint256){
        uint256[] memory myTickets = viewTicketNumbers(msg.sender);
        uint256 count = 0;
        for (uint256 i=0; i<myTickets.length; i++) {
            if (winningTickets[myTickets[i]]) {
                count++;
            }
        }
        return count;
    }

    function viewTicketNumbers(address _account) public view returns (uint256[] memory) {
        return tickets[_account].ticketNumbers;
    }

    function viewPurchasedTickets() external view returns (uint256[] memory) {
        return purchasedTickets;
    }

    function viewWinningTickets() external view returns (uint256[] memory) {
        require(lottery.status == Status.Completed);
        uint256[] memory _winningTickets = new uint256[](lottery.winningTicketsAmount);
        uint256 b = 0;
        for(uint256 i=0; i<=lottery.totalTicketsAmount; i++) {
            if (winningTickets[i] == true) {
                _winningTickets[b] = i;
                b++;
            }
        }
        return _winningTickets;
    }
}