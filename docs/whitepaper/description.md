# Description of Network

This document is divided into four parts. The first discusses the Saito mechanism for pruning old data at market prices. The second explains how blocks are produced. The third explains how the block reward is issued. The fourth explains how to ensure ensure attackers always lose money attacking the network.

## 1. PRUNING THE BLOCKCHAIN

Saito divides the blockchain into "epochs" of 100,000 blocks. If the latest block is 500,000, the current epoch streches from block 400,001 onwards.

Once a block falls out of the current epoch, its unspent transaction outputs (UTXO) are no longer spendable. But any UTXO in that block which contain enough tokens to pay a rebroadcasting fee must be rebroadcast and re-included in the chain by the next block producer.

Block producers do this by creating special "automatic transaction rebroadcasting" (ATR) transactions. The ATR transactions include the original transactions in an associated message field, but contain new UTXO that pay out to the original recipients the amount in their original UTXO minus the rebroadcasting fee (which is added to the block reward). Any blocks not containing all necessary ATR transactions are invalid by consensus rules. After two epochs block producers may delete all data, although the 32-byte header hash may be retained to prove the connection with the genesis block.


## 2. PRODUCING BLOCKS

Saito adds cryptographic signatures to the network layer, which give each transaction an unforgeable record of the path taken from originator to block producer. These paths generate a measure of the "routing work" provided by the routing nodes in the network.

The blockchain sets a "difficulty" for block production. This difficulty is overcome by collecting the  "routing work" embedded in individual transactions. The amount of "work" available to any node is the aggregate amount of work contained in its mempool. The amount of work in any transaction is the value of each transaction fee halved by each additional hop the transaction has taken into the network.

We specify that nodes cannot use "routing work" from transactions that do not include them on their routing path. If the "routing work" available to a block producer is equal to or greater than the "difficulty" required to produce a block, the block producer may produce a block. We also specify that any surplus value of "routing work" may be taken by the block producer in immediate payment for block production.


## 3. THE PAYMENT LOTTERY

Each block contains a proof-of-work challenge in the form of its block hash. We call the solution to this challenge the "golden ticket". If a miner finds a "golden ticket" it broadcasts its solution to the network as part of a normal Saito transaction.

A golden ticket solving any block must appear in the very next block for the lottery to allocate payment. And only one golden ticket may be included in any block. If a solution is found, the block reward is split between the miner that found the solution and a lucky node in the network selected through a random variable included in the miner solution. The "paysplit" of the network is 0.5 by default but may be adjusted to pay routing nodes more or less than miners respectively.

Each node has a chance of winning proportional to the amount of routing work it contributed to the block.\footnote[1]{If a transaction paying a 10 SAITO fee passes through two relay nodes before its inclusion in a block, the first relay node is deemed to have done 10 / 17.5 percent (57\%), the second node is deemed to have done 5 / 17.5 percent (29\%), and the block producer is deemed to have done 2.5 / 17.5 percent (14\%) of the routing work for that transaction. If a transaction is included without a routing path, the originator is assigned all of the work for that transaction.} Payment is guaranteed to be proportional to the value that nodes contribute to collecting fees and ensuring the network can continue to pay for its operations.

Mining difficulty auto-adjusts until the network produces one golden ticket solution on average per block.

## 4. ADDING A DEADWEIGHT LOSS MECHANISM

The above system eliminates the fifty-one percent attack. Unless attackers match one hundred percent of the mining and routing work done by the honest network, they either cannot produce blocks as quickly as honest nodes, or are able to produce blocks but not collect payments. We can increase costs further by modifying the payment lottery.

Once a golden ticket is found, the routing and mining rewards for the previous block are allocated as usual. If the previous block did not contain a golden ticket, the random variable is then hashed again to select a winning routing node for the previous block, and then again to pick a winner from a table of stakers. This process is repeated until all unsolved preceding blocks have had their payments issued. An upper limit to the number of solvable blocks may be applied for practical purposes, beyond which point any uncollected funds are simply apportioned to the treasury.

To add themselves to the staking table, users broadcast a transaction containing a specially-formatted UTXO. The amount of tokens staked are added to the transaction fee for the purpose of determining the "routing work" of this transaction. These UTXO are added to a list of "pending stakers" on their inclusion in a blok. Once the current staking table has been fully paid-out, all pending UTXO stakers are moved into the current staking table.

We specify that users may not spend their staked UTXO until they have been paid-out by the network at least once. The amount paid out to staking nodes each block is also set as the average of the amount paid into the treasury by the staking reward during the *previous* genesis period. Limits may be put on the size of the current staking pool to induce competition between stakers if desirable.

Block producers who rebroadcast staking-UTXOs must indicate in their reformatted transactions whether the outputs are in the current or pending pool. While a hash representation of the state of the staking table is included in every block in the form of a commitment allowing initial nodes, this permits nodes without access to off-chain data to reconstruct the state of both tables within one genesis period at most.

Mining difficulty is adjusted upwards if two blocks containing golden tickets are found in a row and downwards if two blocks without golden tickets are found in a row. An exponential multiplier to mining difficulty also begins to apply if than two blocks with golden tickets are found in a row. A similarly punitive cost applies if two blocks without golden tickets are found consecutively, which carves off an ever-increasing amount of the staking revenue for direct deposit to the network treasury instead of delivery to stakers.


### APPENDIX I: SAITO TERMINOLOGY

The division of the block reward between the routing nodes and lottery miners as the "paysplit" of the network. A higher paysplit allocates a greater percentage of revenue to the miners in the network.

We refer to the desired proportion of proof-of-work to proof-of-stake blocks as the "powsplit" of the network. Increasing POWSPLIT reduces the ease of forking the tip of the blockchain. Decreasing POWSPLIT increases the deadweight loss per block and allows a reduction in network paysplit while keeping security above the 100 percent point.





