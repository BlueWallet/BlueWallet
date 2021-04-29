# Bluewallet

It's original [slip39](https://github.com/ilap/slip39-js/) but compiled with `babel-plugin-transform-bigint` to replace js `BigInt` with `JSBI`.

To update:
- sync src folder
- run `npm build`


# SLIP39

[![npm](https://img.shields.io/npm/v/slip39.svg)](https://www.npmjs.org/package/slip39)


The javascript implementation of the [SLIP39](https://github.com/satoshilabs/slips/blob/master/slip-0039.md) for Shamir's Secret-Sharing for Mnemonic Codes.

The code based on my [Dart implementation of SLIP-0039](https://github.com/ilap/slip39-dart/).

# DISCLAIMER

This project is still in early development phase. Use it at your own risk.

## Description

 This SLIP39 implementation uses a 3 level height (l=3) of a 16 degree (d=16) tree (T), which is represented as an array of the level two nodes (groups, G).

 The degree (d) and the level (l) of the tree are 16 and 3 respectively,
 which means that max d^(l-1), i.e. 16^2, leaf nodes (M) can be in a complete tree (or forest).

 The first level (l=1) node of the tree is the the root (R), the level 2 ones are the `SSS` groups (Gs or group nodes) e.g. `[G0, ..., Gd]`.

 The last, the third, level nodes are the only leafs (M, group members) which contains the generated mnemonics.

 Every node has two values:
  - the N and
  - M i.e. n(N,M).

 Whihc means, that N (`threshold`) number of M children are required to reconstruct the node's secret.

## Format

The tree's human friendly array representation only uses the group (l=2) nodes as arrays.
For example. : ``` [[1,1], [1,1], [3,5], [2,6]]```
The group's first parameter is the `N` (group threshold) while the second is the `M`, the number of members in the group. See, and example in [Using](#Using).

## Installing

```
npm install slip39

```

## Using
See `example/main.js`

  ``` javascript
const slip39 = require('../src/slip39.js');
const assert = require('assert');
// threshold (N) number of group shares required to reconstruct the master secret.
const threshold = 2;
const masterSecret = 'ABCDEFGHIJKLMNOP'.slip39EncodeHex();
const passphrase = 'TREZOR';

/**
 * 4 groups shares.
 * = two for Alice
 * = one for friends and
 * = one for family members
 * Two of these group shares are required to reconstruct the master secret.
 */
const groups = [
  // Alice group shares. 1 is enough to reconstruct a group share,
  // therefore she needs at least two group shares to be reconstructed,
  [1, 1],
  [1, 1],
  // 3 of 5 Friends' shares are required to reconstruct this group share
  [3, 5],
  // 2 of 6 Family's shares are required to reconstruct this group share
  [2, 6]
];

const slip = slip39.fromArray({
  masterSecret: masterSecret,
  passphrase: passphrase,
  threshold: threshold,
  groups: groups
});

// One of Alice's share
const aliceShare = slip.fromPath('r/0').mnemonics;

// and any two of family's shares.
const familyShares = slip.fromPath('r/3/1').mnemonics
  .concat(slip.fromPath('r/3/3').mnemonics);

const allShares = aliceShare.concat(familyShares);

console.log('Shares used for restoring the master secret:');
allShares.forEach((s) => console.log(s));

const recoveredSecret = slip39.recoverSecret(allShares, passphrase);
console.log('Master secret: ' + masterSecret.slip39DecodeHex());
console.log('Recovered one: ' + recoveredSecret.slip39DecodeHex());
assert(masterSecret.slip39DecodeHex() === recoveredSecret.slip39DecodeHex());
```

## Testing

``` bash
 $ npm install
 $ npm test

  Basic Tests
    Test threshold 1 with 5 of 7 shares of a group combinations
      ✓ Test combination 0 1 2 3 4.
      ✓ Test combination 0 1 2 3 5.
      ✓ Test combination 0 1 2 3 6.
      ✓ Test combination 0 1 2 4 5.
      ✓ Test combination 0 1 2 4 6.
      ✓ Test combination 0 1 2 5 6.
      ✓ Test combination 0 1 3 4 5.
      ✓ Test combination 0 1 3 4 6.
      ✓ Test combination 0 1 3 5 6.
      ✓ Test combination 0 1 4 5 6.
      ✓ Test combination 0 2 3 4 5.
      ✓ Test combination 0 2 3 4 6.
      ✓ Test combination 0 2 3 5 6.
      ✓ Test combination 0 2 4 5 6.
      ✓ Test combination 0 3 4 5 6.
      ✓ Test combination 1 2 3 4 5.
      ✓ Test combination 1 2 3 4 6.
      ✓ Test combination 1 2 3 5 6.
      ✓ Test combination 1 2 4 5 6.
      ✓ Test combination 1 3 4 5 6.
      ✓ Test combination 2 3 4 5 6.
    Test passhrase
      ✓ should return valid mastersecret when user submits valid passphrse
      ✓ should NOT return valid mastersecret when user submits invalid passphrse
      ✓ should return valid mastersecret when user does not submit passphrse
    Test iteration exponent
      ✓ should return valid mastersecret when user apply valid iteration exponent (44ms)
      ✓ should throw an Error when user submits invalid iteration exponent

  Group Shares Tests
    Test all valid combinations of mnemonics
      ✓ should return the valid mastersecret when valid mnemonics used for recovery
    Original test vectors Tests
      ✓ 1. Valid mnemonic without sharing (128 bits)
      ✓ 2. Mnemonic with invalid checksum (128 bits)
      ✓ 3. Mnemonic with invalid padding (128 bits)
      ✓ 4. Basic sharing 2-of-3 (128 bits)
      ✓ 5. Basic sharing 2-of-3 (128 bits)
      ✓ 6. Mnemonics with different identifiers (128 bits)
      ✓ 7. Mnemonics with different iteration exponents (128 bits)
      ✓ 8. Mnemonics with mismatching group thresholds (128 bits)
      ✓ 9. Mnemonics with mismatching group counts (128 bits)
      ✓ 10. Mnemonics with greater group threshold than group counts (128 bits)
      ✓ 11. Mnemonics with duplicate member indices (128 bits)
      ✓ 12. Mnemonics with mismatching member thresholds (128 bits)
      ✓ 13. Mnemonics giving an invalid digest (128 bits)
      ✓ 14. Insufficient number of groups (128 bits, case 1)
      ✓ 15. Insufficient number of groups (128 bits, case 2)
      ✓ 16. Threshold number of groups, but insufficient number of members in one group (128 bits)
      ✓ 17. Threshold number of groups and members in each group (128 bits, case 1)
      ✓ 18. Threshold number of groups and members in each group (128 bits, case 2)
      ✓ 19. Threshold number of groups and members in each group (128 bits, case 3)
      ✓ 20. Valid mnemonic without sharing (256 bits)
      ✓ 21. Mnemonic with invalid checksum (256 bits)
      ✓ 22. Mnemonic with invalid padding (256 bits)
      ✓ 23. Basic sharing 2-of-3 (256 bits)
      ✓ 24. Basic sharing 2-of-3 (256 bits)
      ✓ 25. Mnemonics with different identifiers (256 bits)
      ✓ 26. Mnemonics with different iteration exponents (256 bits)
      ✓ 27. Mnemonics with mismatching group thresholds (256 bits)
      ✓ 28. Mnemonics with mismatching group counts (256 bits)
      ✓ 29. Mnemonics with greater group threshold than group counts (256 bits)
      ✓ 30. Mnemonics with duplicate member indices (256 bits)
      ✓ 31. Mnemonics with mismatching member thresholds (256 bits)
      ✓ 32. Mnemonics giving an invalid digest (256 bits)
      ✓ 33. Insufficient number of groups (256 bits, case 1)
      ✓ 34. Insufficient number of groups (256 bits, case 2)
      ✓ 35. Threshold number of groups, but insufficient number of members in one group (256 bits)
      ✓ 36. Threshold number of groups and members in each group (256 bits, case 1)
      ✓ 37. Threshold number of groups and members in each group (256 bits, case 2)
      ✓ 38. Threshold number of groups and members in each group (256 bits, case 3)
      ✓ 39. Mnemonic with insufficient length
      ✓ 40. Mnemonic with invalid master secret length
    Invalid Shares
      ✓ Short master secret
      ✓ Odd length master secret
      ✓ Group threshold exceeds number of groups
      ✓ Invalid group threshold.
      ✓ Member threshold exceeds number of members
      ✓ Invalid member threshold
      ✓ Group with multiple members and threshold 1


  74 passing (477ms)

```

## TODOS

- [x] Add unit tests.
- [x] Test with the reference code's test vectors.
- [ ] Refactor the helpers to different helper classes e.g. `CryptoHelper()`, `ShamirHelper()` etc.
- [ ] Add `JSON` representation, see [JSON representation](#json-representation) below.
- [ ] Refactor to much simpler code.

### JSON Representation

``` json
  {
  "name": "Slip39",
  "threshold": 2,
  "shares": [
    {
      "name": "My Primary",
      "threshold": 1,
      "shares": [
        "Primary"
      ]
    },
    {
      "name": "My Secondary",
      "threshold": 1,
      "shares": [
        "Secondary"
      ]
    },
    {
      "name": "Friends",
      "threshold": 3,
      "shares": [
        "Alice",
        "Bob",
        "Charlie",
        "David",
        "Erin"
      ]
    },
    {
      "name": "Family",
      "threshold": 2,
      "shares": [
        "Adam",
        "Brenda",
        "Carol",
        "Dan",
        "Edward",
        "Frank"
      ]
    }
  ]
}
```
# LICENSE

CopyRight (c) 2019 Pal Dorogi `"iLap"` <pal.dorogi@gmail.com>

[MIT License](LICENSE)
