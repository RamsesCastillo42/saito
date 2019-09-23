# Optimal Attack Reward under Saito Networks


## Abstract


## Assumptions


## Methods

### Terms
>x = expected return of the attack \
>f = all transactions fees in the block \
>p = proportion of attacker fees in blocks \
>d = depth in number of blocks attacker waits to mine \
>c = cost of mining a golden ticket \
>Ps = paysplit (division of block reward between router and miner) \
>Pw = powsplit (division of pay between minter and stakers)

### Calculating Attack Reward

#### Description of the attack and parameters
We are assuming that an attacker is in possession of enough hashpower to control difficulty and able to mine at approaching 100% of total hash on the network. For example a small new Saito class network with few nodes CPU mining in Javascript, and an attacker with a spare Bitcoin mining farm.

It is also assumed that the attacker has sufficient tokens and network connectivity to fill blocks with attack transactions routed only to themselves.

Given the attacker's ability to control difficulty we are assuming they will be completely successful in mining golden ticket solutions when they choose.

Given these conditions the expected reward for an attack over time on the network will be:

> minig reward + routing reward - mining costs


#### Mining Reward
We are presuming the miner uses one of the golden ticket solutions found so their expected reward includes the miner reward or golden ticket prize.

<p align="center"><img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/147fed11fa9495a0e9194290d0017502.svg?invert_in_darkmode" align=middle width=42.23164605pt height=14.611878599999999pt/></p>

#### Routing Payment

If the attacker finds a golden ticket that pays one their own node they are paid the entire block reward. The expected reward for a block into which the attacker has stuffed _p_ of their own fees is:

<p align="center"><img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/0d8499c5b72cab68a0104aa7799e2d1d.svg?invert_in_darkmode" align=middle width=62.3741943pt height=14.611878599999999pt/></p> 

But, the attacker is only getting the honest fees back, so for a single golden ticket solution the payout is the portion of fees that go to the routing reward <img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/07f3afd171e70637bbd1a4a161adf243.svg?invert_in_darkmode" align=middle width=309.3699015pt height=22.831056599999986pt/>f\cdot p<img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/1ed5a3d62c832e552de9c6a97fd94368.svg?invert_in_darkmode" align=middle width=4.5662248499999905pt height=14.15524440000002pt/><img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/92a87785dc1169260c1da0aeeb35c994.svg?invert_in_darkmode" align=middle width=112.42534709999998pt height=22.831056599999986pt/><img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/119531d74a810a26fa348627b88f1d2d.svg?invert_in_darkmode" align=middle width=399.4531430999999pt height=45.84475499999998pt/><img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/b74729c69c4e9bdd1f0d5a610177fcbb.svg?invert_in_darkmode" align=middle width=162.46911945pt height=24.65753399999998pt/><img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/d4b75d4935a5e87d6e640d832f052540.svg?invert_in_darkmode" align=middle width=700.27450845pt height=85.29680939999997pt/><img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/67f3a862fb6e91e69469d32faa0b3218.svg?invert_in_darkmode" align=middle width=203.32500869999998pt height=24.65753399999998pt/><img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/f1744d536929178f9de1a32ded940f86.svg?invert_in_darkmode" align=middle width=151.7812197pt height=45.84475499999998pt/>d \cdot f \cdot (Ps \cdot (1-p^n)-p)<img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/553890b4e393f75a908e1d812cd83f94.svg?invert_in_darkmode" align=middle width=700.27471305pt height=127.76251289999999pt/>c \cdot n<img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/4c4f866eb45f8be037b3ea986035daf4.svg?invert_in_darkmode" align=middle width=696.87379245pt height=39.45205440000001pt/>p^d<img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/95739a549b283eb58cf5379f840f2ecd.svg?invert_in_darkmode" align=middle width=284.01859859999996pt height=22.831056599999986pt/>c \cdot (1-p^d)<img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/1eccac6e5d23fae2abcacef30aa944fc.svg?invert_in_darkmode" align=middle width=189.44260169999998pt height=22.831056599999986pt/><img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/ee4ab01ed58ce7b9888758e9a531a47c.svg?invert_in_darkmode" align=middle width=180.48997065pt height=27.91243950000002pt/><img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/b5baff075a053bc61cb73196ba959c70.svg?invert_in_darkmode" align=middle width=125.75374019999997pt height=45.84475499999998pt/><img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/88a1fcdf7321024c9cf6b6ade123952a.svg?invert_in_darkmode" align=middle width=153.28497525pt height=27.91243950000002pt/><img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/31322031e2aa2860022b1f6540c3f65b.svg?invert_in_darkmode" align=middle width=204.56674095pt height=85.29680939999997pt/><img src="https://rawgit.com/saitotech/saito (fetch/master/svgs/2c3a91bb57428a072dfcaff112792e41.svg?invert_in_darkmode" align=middle width=407.3012526pt height=24.65753399999998pt/>$


## Results