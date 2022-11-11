# FAQ

## Too much nodejs dependencies! Who audits all of that?

We do. Really, when we bump deps we glance over the diff, and all versions are 
pinned. Also, we use paid audit solution https://snyk.io which is specifically 
designed to keep an eye on deps.

And yes, we have too many of them, and PRs cutting deps are welcome 
(see https://github.com/BlueWallet/BlueWallet/blob/master/CONTRIBUTING.md)

Also, really risky dependencies (like, from not-reputable/anonymous maintainers)
we fork and use under our organization, and when we update them from upstream (rarely)
we do review the code

## Does BlueWallet download the Bitcoin Headers? I see no place you call blockchain.block.headers so I'm wondering how do you guys deal with the headers? How can you make sure you follow the correct chain in order to make sure you're spending a confirmed UTXO?

The idea is that by default BW doesn’t use public electrum servers, only
ones hosted by BlueWallet, so they are kinda trusted. And end-user has an
option to change Electrum server to something he provides, so he knows what
he is doing and trusts his own electrum server.

We would definitely need proper SPV verification if we used random
electrum server every time from a pool of public servers.
