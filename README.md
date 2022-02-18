# Multiwin chainlink lottery

This project is a multi-ticket multi-winning lottery using random winning numbers from Chainlink.

The project comes with four types of lottery contracts, ERC-20 lottery loken contract used for buying tickets, ERC-721 lottery ticket contract, and two random generating contracts (the first one is for testing and the second one is for deployment in the testnet using Chainlink). Also the project has deployment scripts for each type of lottery.

For one lottery token you can purchase one lottery ticket.

# Lottery types

| Contract name | Buying tickets rules | Withdrawing the reward rules | Description |
| ------------- |-------------|-------------|-------------|
| OneTicketPerUserLottery.sol | It's allowed to buy only one ticket per user. | For each your winning ticket you will get a reward. | When withdrawing a reward, a coin is tossed, taking into account your chance of winning, depending on the number of tickets purchased |
| OneWinPerUserLottery.sol    | It's allowed to buy as many tickets as there are left in the lottery,<br /> but not more than 10 tickets at once | You can only receive a reward for only one winning ticket. After that, withdrawing the reward is blocked. | Admin starts the function of generating winning tickets after all tickets were purchased. The participant can view his winning tickets by using view function of contract. After that, he can start the function of obtaining an award by indicating the number of the winning ticket. |
| MultiWinPerUserLottery.sol | Similarly as in OneWinPerUserLottery.sol | You can receive a reward for each your winning ticket, <br /> but not more than 10 rewards at once | Similarly as OneWinPerUserLottery.sol except that when withdrawing an award, the participant can indicate more than one winning ticket. |
| CircularLottery.sol | Similarly as in OneWinPerUserLottery.sol | Similarly as in MultiWinPerUserLottery.sol | After all tickets have been purchased, they are combined into a ring. If you buy tickets in a row it increases the chance of hitting the jackpot, otherwise you increase the chances of winning. |

# Compilation

To compile all contracts:

```bash
npx hardhat compile
```

# Deploy

To deploy the specific lottery type smart contract to the rinkeby testnet:

```bash
npx hardhat run scripts/{lottery type}.js --network rinkeby
```

# Tests

For checking tests you should change imports in all lottery contracts:

from: `import "./Randomness.sol";` to: `import "./FakeRandomness.sol";`

After that you can run all tests:

```bash
npx hardhat test
```
