# Attacks

Saito is secure against classes of attack which have no defense mechanisms in other chains. This document explains how these defense mechanisms work. Those struggling to understand how Saito works may find it a useful document.


## 1. SYBIL ATTACKS

Saito is secure against sybil attacks.

It is possible to identify sybils in Saito by examining the transaction-embedded routing paths. This ability to recognize sybils (who occupy intermediate positions in the routing network and consume more in value than they contribute to their peers) and makes Saito distinct from other blockchains, which lack the ability to identify which nodes in their routing network are providing real value.

As every hop in a routing path lowers the profitability of every single node on that path, there is a strong incentive for all nodes to purge sybils from their routing paths. This is particularly the case for nodes on the inside of a sybil which experience an immediate fifty-percent drop in profitability. Nodes which fail to monitor local routing conditions and get sybilled will be less profitable than their peers, unable to compete effectively, and forced off the network through organic economic competition.

Nodes may easily route around sybils by connecting to their remote peers. The blockchain may be used to communicate with remote peers as necessary. We expect that most nodes will automate this process. 



## 2. TRANSACTION HOARDING

Other blockchains are vulnerable to transaction hoarding attacks. Block producers who pay to collect transactions are strictly disincentivized from sharing those transactions with their peers lest those peers "free-ride" on their work and gain market share at their expanse. This problem incentives hoarding once the network is too large for a volunteer-supported peer-to-peer network to distribute transactions to miners. It breaks the economics of those blockchains: users looking for fast confirmations in networks with hoarding will direct their transactions to the largest and more profitable block producers. Centralization inexorably follows.

Saito is secure against transaction hoarding attacks.

The network achieves this by paying the nodes which collect transactions from users the largest share of the routing payments. This encourages competition to form at user-facing portions of the network and ensures there will always be nodes willing to offer routing services to users. The profitability of these competing routing nodes consequently depends on their forwarding these transactions as quickly and efficiently as possible to block producers. 

Any nodes which "hoard" transactions which may be held by others risk losing the value of their routing work completely. But they may earn revenue from routing work even if they are not able to produce a block: forwarding is a preferred strategy. The transaction-embedded routing paths also allows users and nodes to monitor the behavior of their peers and negotiate reasonable terms of service given local economic conditions.


## 3. BLOCK-FLOODING ATTACKS

Proof-of-Work networks require block producers to burn money to produce viable blocks. All peers are expected to forward all blocks by default, under the understanding that the costs needed to create a block prevent block-flooding (DOS) attacks on the network.

Saito imposes the same block-flooding protections by stipulating that peers only forward blocks once they have been convinced those blocks form part of the longest-chain. While nodes may thus forward the first block they receive from attackers, they will not forward subsequent blocks at the same block depth. The fact that every additional block produced involves a cost to the attacker ensures that this approach achieves the same guarantee: attackers cannot flood the network with data and launch DOS attacks.

In addition, the economic structure of the routing network incentivizes nodes to maintain efficient network connections. While nodes on the edge of the network are likely to be susceptible, high-throughput nodes towards the center have strong economic incentives to penalizes peers which impose undue costs on them. Malicious nodes must necessarily start their attacks from positions on the edge of the network, where their attacks can be easily overcome by the honest network.


## 4. GRINDING ATTACKS

Proof-of-Stake networks without an explicit cost to block production are susceptible to grinding attacks. These occur when it is possible for nodes to create a large number of variant blocks in order to find one that benefits them.

This is not possible in Saito as block producers have no control over the block reward. Block producers who delay producing blocks for any reason also risk the cost of losing the entire value of their routing work, lowering their profitability and alienating the routing nodes with whom they are cooperating. Similarly, miners who find a golden ticket and fail to submit it will not find another in time to collect any payment from the block in question.



## 5. 51\% ATTACKS

Saito is the only blockchain that is fully secure against 51 percent attacks. To understand how Saito accomplishes this, note that attackers who wish to attack the blockchain must necessary produce the same amount of routing work as the honest nodes. Once that is done they must then match the amount of honest mining in order to produce the golden tickets which allow them to get their money back from block production.

Security reaches the 100 percent level as attackers who do not include the "routing work" of honest nodes in their attack blocks face a non-stop increase in their attack costs, as they are forced to match ALL CUMULATIVE OUTSTANDING WORK in order to control the longest chain. The need to lock ever-increasing amounts of tokens up in blocks not only risks bankrupting attackers eventually, but increases mining costs by speeding up block production, forcing attacks into a situation where their mining costs must rise along with their costs of block production.

The only way attackers can escape bankruptcy is by including the "routing work" of honest nodes in their attack block. In this case they must necessarily double their mining costs however as it will suddenly take them two golden tickets on average to find a solution that will pay them (rather than an honest node) all of the revenues. The security of the network is double that of all proof-of-work and proof-of-stake networks are every level of fee volume.


## 6. THE DEATH OF MOORE'S LAW

Blockchains secured by proof-of-work collapse once the supply curve of hashpower becomes reasonably elastic. This is likely to occur to Bitcoin in the next decade. Even if the network continues to grow in the short term, the death of Moore's Law will slow the pace of improvements in mining technology and create a more commoditized market for hashpower generally.

Saito remains secure beyond the death of Moore's Law. The reason for this is that the golden ticket system ensures that collecting 100 percent of the routing reward always costs 100 percet of network fees. This property holds even if not every block is solved by a golden ticket. The addition of proof-of-stake component adds a deadweight loss *on top of this* that is proportional to the percentage of the stake that is not controlled by the attacker multiplied by the proportion of total network revenue that is allocated to the staking pool.

In the mainnet Saito implementation, The only situation in which attackers can theoretically avoid losing money attacking the network is if they control 100 percent of network hashpower, control 100 percent of the outstanding network stake, and are able to match 100 percent of the . Since attackers must transfer wealth to any other stakers in the network in the course of their attack, the rational behavior for stakers when the network comes under attack is to expand their stake and bankrupt the attacker sooner. The network self-balances towards security instead of away from it as in existing proof-of-stake implementations, where stakers have an incentive to liquidate their stake when the network comes under attack.


## 7. I-HAVE-ALL-THIS-MONEY-WHY-DEAR-GOD-WILL-NO-ONE-SELL-ME-A-PEPSI ATTACKS

Occasionally people new to Saito think their way into circular critiques where there is some hypothetical attack on a Saito node that consists of an attacker maneuvering itself into being someone's only point of access to the network and leveraging that to censor transaction flows, extract supra-market rents or produce a dummy blockchain at a much slower rate than the chain produced by the honest network. We call these I-HAVE-ALL-THIS-MONEY-WHY-DEAR-GOD-WILL-NO-ONE-SELL-ME-A-PEPSI attacks.

All consensus systems fail in situations where one's view of the longest chain is dictated by an attacker. Saito is no different than other blockchains in this regard. For those concerned about these issues, the important thing to note is that only Saito provides explicit economic incentives to prevent these issues. While blockchains with other consensus systems often suffer from underfunded access nodes (giving attackers a vector to ) in Saito access to the network is easy: it can be purchased with as little effort as sending someone a transaction.


## 8. OTHER ATTACKS

Concerned about other attacks? Contact us at info@saito.tech and we will expand this document to clarify any outstanding issues.


