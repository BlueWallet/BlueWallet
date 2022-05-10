# bc-bech32
this library is for implementing [BlockChain Commons bc-32](https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-0004-bc32.md)

an encoding 

## Installation

```
yarn add bc-bech32
```

## Test

```
    yarn test
```

## Build

```
    yarn build
```

## Sample

```
    import { encodeBc32Data, decodeBc32Data, encodeSegwitAddress, decodeSegwitAddress } from '../src';
    const data = encodeBc32Data('48656c6c6f20776f726c64');
    console.log(data) // fpjkcmr0ypmk7unvvsh4ra4j

```


note: for using the node vesion should be upper than 10.16

this library is inspire on the [bech32](https://github.com/sipa/bech32/tree/master/ref/javascript). Thanks for the good library.