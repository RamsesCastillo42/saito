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

$$f \cdot Ps$$

#### Routing Payment

If the attacker finds a golden ticket that pays one their own node they are paid the entire block reward. The expected reward for a block into which the attacker has stuffed _p_ of their own fees is:

$$ f \cdot Ps \cdot p $$ 

But, the attacker is only getting the honest fees back, so for a single golden ticket solution the payout is the portion of fees that go to the routing reward $f\cdotPs& minus the fees the attacker put into the block $f\cdot p$:

$$ f \cdot Ps \cdot p - f \cdot p $$ 

Hasing to find n solutions yields an expected outcome of:

$$ f \cdot Ps \cdot (1-p^n) - f \cdot p$$

Given also that the attacker is waiting d blocks to hash, to optimise the number of blocks paying out in their favor, expected routing reward becomes:

$$ d \cdot f \cdot Ps  \cdot (1-p^n) - d \cdot f \cdot p $$

We can simplify this to $d \cdot f \cdot (Ps \cdot (1-p^n)-p)$, but this is more abstract so is left expanded.

#### Mining Cost

Given the attacker's access to hashpower mining cost is a simple function. The expected cost of mining _n_ golden tickets is: $c \cdot n$. Butm the attacker will stop mining if they have found a solution that has solved all outstanding blocks.

The chance that a solution solves all blocks in the attacker's favour is $p^d$. So the expected saving per golden ticket is $c \cdot (1-p^d)$. The cost of mining is then:

$$c \cdot n - ((n-1) \cdot (c -p^d)) $$

Which simplifies to:

$$ c \cdot ( n - ((n-1) \cdot p^d)) $$


#### Total expected attack reward

Combining the above we have 


$$x = f \cdot Ps + d \cdot f \cdot Ps \cdot (1-p^n) - d \cdot f \cdot p - c⋅(n−((n−1)⋅p 
d
 )) $$


## Results