//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./FakeRandomness.sol";
import "./LotteryToken.sol";
import "./NFTTicket.sol";

contract MultiWinPerUserLottery is Ownable {

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
        uint256 rewardPerTicket;
        address contractOwner;
    }

    uint256[] public purchasedTickets;

    LotteryInfo public lottery;

    mapping(address => uint256[]) public tickets;
    mapping(address => mapping(uint256 => bool)) alreadyWithdrawedRewardPerTicket;

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
        require(purchasedTickets.length + _ticketsId.length <= lottery.totalTicketsAmount, 
                "You can't buy so many tickets, check 'leftTicketsAmount function'");
        require(token.balanceOf(msg.sender) >= _ticketsId.length, "Not enough balance to buy tickets");

        for (uint256 i = 0; i < _ticketsId.length; i++) {
            require(_ticketsId[i] > 0 && _ticketsId[i] <= lottery.totalTicketsAmount, "Incorrect number of ticket");
            nft.mint(msg.sender, _ticketsId[i]);
            tickets[msg.sender].push(_ticketsId[i]);
            purchasedTickets.push(_ticketsId[i]);
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

    function getReward(uint256[] memory _tickets) external {
        require(lottery.status == Status.Closed, "Lottery isn't completed yet");
        require(random.randomResult() != 0, "Random hasn't been generated yet");
        require(_tickets.length <= 10, "It's allowed to get reward for no more than 10 tickets at once");

        uint256 firstWinTicket = random.randomResult() % lottery.totalTicketsAmount + 1;
        bool moreThenLastTicket = true;  // last winning ticket is more then last ticket, for ex. firstWinTicket = 5, total = 7, amountWin = 4
        if (firstWinTicket < (firstWinTicket + lottery.winningTicketsAmount - 1) % (lottery.totalTicketsAmount + 1)) {
            moreThenLastTicket = false;
        }

        for (uint256 i=0; i<_tickets.length; i++) {
            if (!moreThenLastTicket) {  // for example 96, 97, 98, 99, 100
                // win condition
                if ((_tickets[i] >= firstWinTicket) && 
                    (_tickets[i] <= firstWinTicket + lottery.winningTicketsAmount - 1) &&
                    nft.ownerOf(_tickets[i]) == msg.sender &&  // You are owner of this ticket
                    !alreadyWithdrawedRewardPerTicket[msg.sender][_tickets[i]]) {  // win condition
                    
                    token.transferFrom(lottery.contractOwner, msg.sender, lottery.rewardPerTicket);
                    alreadyWithdrawedRewardPerTicket[msg.sender][_tickets[i]] = true;
                }
            }
            else {  // for example 98, 99, 100, 1, 2
                // win condition
                if (((_tickets[i] >= firstWinTicket) || (_tickets[i] <= (firstWinTicket + lottery.winningTicketsAmount - 1) % lottery.totalTicketsAmount)) &&
                    nft.ownerOf(_tickets[i]) == msg.sender &&  // You are owner of this ticket
                    !alreadyWithdrawedRewardPerTicket[msg.sender][_tickets[i]]) {  // You haven't already withdrawed the reward for this ticket
                    
                    token.transferFrom(lottery.contractOwner, msg.sender, lottery.rewardPerTicket);
                    alreadyWithdrawedRewardPerTicket[msg.sender][_tickets[i]] = true;
                }
            }
        }

        for (uint256 i=0; i<_tickets.length; i++) {
            if (winningTickets[_tickets[i]] &&  // This ticket is the winning ticket  
                nft.ownerOf(_tickets[i]) == msg.sender &&  // You are owner of this ticket
                !alreadyWithdrawedRewardPerTicket[msg.sender][_tickets[i]])  // You haven't already withdrawed the reward for this ticket
            {
                token.transferFrom(lottery.contractOwner, msg.sender, lottery.rewardPerTicket);
                alreadyWithdrawedRewardPerTicket[msg.sender][_tickets[i]] = true;
            }
        }
    }

    /**
     * @notice Returns true and the array of winning tickets (except zeros in this array) if you win, otherwise returns false and the array of zeros
     */
    function isWinnerAndWinningTickets() public view returns (bool, uint256[] memory) {
        require(tickets[msg.sender].length != 0, "You did not participate in the lottery!");
        require(lottery.status == Status.Closed, "Lottery isn't completed yet");
        require(random.randomResult() != 0, "Random hasn't been generated yet");

        uint256[] memory myTickets = viewTicketNumbers(msg.sender);
        uint256[] memory wins = new uint256[](myTickets.length);

        uint256 firstWinTicket = random.randomResult() % lottery.totalTicketsAmount + 1;
        bool moreThenLastTicket = true;  // last winning ticket is more then last ticket, for ex. firstWinTicket = 5, total = 7, amountWin = 4
        if (firstWinTicket < (firstWinTicket + lottery.winningTicketsAmount - 1) % (lottery.totalTicketsAmount + 1)) {
            moreThenLastTicket = false;
        }

        uint256 b = 0;
        bool isWin = false;
        for (uint256 i=0; i<myTickets.length; i++) {
            if (!moreThenLastTicket) {  // for example 96, 97, 98, 99, 100
                if ((myTickets[i] >= firstWinTicket) && 
                    (myTickets[i] <= firstWinTicket + lottery.winningTicketsAmount - 1)) {  // win condition
                    wins[b] = myTickets[i];
                    b++;
                    if (!isWin) {
                        isWin = true;
                    }
                }
            }
            else {  // for example 98, 99, 100, 1, 2
                if ((myTickets[i] >= firstWinTicket) || 
                    (myTickets[i] <= (firstWinTicket + lottery.winningTicketsAmount - 1) % lottery.totalTicketsAmount)) {  // win condition
                    wins[b] = myTickets[i];
                    b++;
                    if (!isWin) {
                        isWin = true;
                    }
                }
            }
        }
        if (isWin) {
            return (true, wins);
        }
        return (false, wins);
    }

    function viewTicketNumbers(address _account) public view returns (uint256[] memory) {
        return tickets[_account];
    }

    function viewPurchasedTickets() external view returns (uint256[] memory) {
        return purchasedTickets;
    }

    function viewWinningTickets() external view returns (uint256[] memory) {
        require(lottery.status == Status.Closed);
        uint256[] memory _winningTickets = new uint256[](lottery.winningTicketsAmount);

        uint256 currentWinTicket = random.randomResult() % lottery.totalTicketsAmount + 1;
        for (uint256 i=0; i<_winningTickets.length; i++) {
            _winningTickets[i] = currentWinTicket;
            if (currentWinTicket + 1 > lottery.totalTicketsAmount) {
                currentWinTicket = 1;
            }
            else {
                currentWinTicket++;
            }
        }
        return _winningTickets;
    }
}