const slip39 = require('../src/slip39.js');
const assert = require('assert');
// threshold (N) number of group-shares required to reconstruct the master secret.
const groupThreshold = 2;
const masterSecret = 'ABCDEFGHIJKLMNOP'.slip39EncodeHex();
const passphrase = 'TREZOR';

function recover(groupShares, pass) {
  const recoveredSecret = slip39.recoverSecret(groupShares, pass);
  console.log('\tMaster secret: ' + masterSecret.slip39DecodeHex());
  console.log('\tRecovered one: ' + recoveredSecret.slip39DecodeHex());
  assert(masterSecret.slip39DecodeHex() === recoveredSecret.slip39DecodeHex());
}

function printShares(shares) {
  shares.forEach((s, i) => console.log(`\t${i + 1}) ${s}`));
}

/**
 * 4 groups shares:
 *    = two for Alice
 *    = one for friends and
 *    = one for family members
 * Any two (see threshold) of these four group-shares are required to reconstruct the master secret
 * i.e. to recover the master secret the goal is to reconstruct any 2-of-4 group-shares.
 * To reconstruct each group share, we need at least N of its M member-shares.
 * Thus all possible master secret recovery combinations:
 * Case 1) [requires 1 person: Alice] Alice alone with her 1-of-1 member-shares reconstructs both the 1st and 2nd group-shares
 * Case 2) [requires 4 persons: Alice + any 3 of her 5 friends] Alice with her 1-of-1 member-shares reconstructs 1st (or 2nd) group-share + any 3-of-5 friend member-shares reconstruct the 3rd group-share
 * Case 3) [requires 3 persons: Alice + any 2 of her 6 family relatives] Alice with her 1-of-1 member-shares reconstructs 1st (or 2nd) group-share + any 2-of-6 family member-shares reconstruct the 4th group-share
 * Case 4) [requires 5 persons: any 3 of her 5 friends + any 2 of her 6 family relatives] any 3-of-5 friend member-shares reconstruct the 3rd group-share + any 2-of-6 family member-shares reconstruct the 4th group-share
 */
const groups = [
  // Alice group-shares. 1 is enough to reconstruct a group-share,
  // therefore she needs at least two group-shares to reconstruct the master secret.
  [1, 1, 'Alice personal group share 1'],
  [1, 1, 'Alice personal group share 2'],
  // 3 of 5 Friends' shares are required to reconstruct this group-share
  [3, 5, 'Friends group share for Bob, Charlie, Dave, Frank and Grace'],
  // 2 of 6 Family's shares are required to reconstruct this group-share
  [2, 6, 'Family group share for mom, dad, brother, sister and wife']
];

const slip = slip39.fromArray(masterSecret, {
  passphrase: passphrase,
  threshold: groupThreshold,
  groups: groups,
  title: 'Slip39 example for 2-level SSSS'
});

let requiredGroupShares;
let aliceBothGroupShares;
let aliceFirstGroupShare;
let aliceSecondGroupShare;
let friendGroupShares;
let familyGroupShares;


/*
 * Example of Case 1
 */
// The 1st, and only, member-share (member 0) of the 1st group-share (group 0) + the 1st, and only, member-share (member 0) of the 2nd group-share (group 1)
aliceBothGroupShares = slip.fromPath('r/0/0').mnemonics
  .concat(slip.fromPath('r/1/0').mnemonics);

requiredGroupShares = aliceBothGroupShares;

console.log(`\n* Shares used by Alice alone for restoring the master secret (total of ${requiredGroupShares.length} member-shares):`);
printShares(requiredGroupShares);
recover(requiredGroupShares, passphrase);

/*
 * Example of Case 2
 */
// The 1st, and only, member-share (member 0) of the 2nd group-share (group 1)
aliceSecondGroupShare = slip.fromPath('r/1/0').mnemonics;

// ...plus the 3rd member-share (member 2) + the 4th member-share (member 3) + the 5th member-share (member 4) of the 3rd group-share (group 2)
friendGroupShares = slip.fromPath('r/2/2').mnemonics
  .concat(slip.fromPath('r/2/3').mnemonics)
  .concat(slip.fromPath('r/2/4').mnemonics);

requiredGroupShares = aliceSecondGroupShare.concat(friendGroupShares);

console.log(`\n* Shares used by Alice + 3 friends for restoring the master secret (total of ${requiredGroupShares.length} member-shares):`);
printShares(requiredGroupShares);
recover(requiredGroupShares, passphrase);


/*
 * Example of Case 3
 */
// The 1st, and only, member-share (member 0) of the 1st group-share (group 0)
aliceFirstGroupShare = slip.fromPath('r/0/0').mnemonics;

// ...plus the 2nd member-share (member 1) + the 3rd member-share (member 2) of the 4th group-share (group 3)
familyGroupShares = slip.fromPath('r/3/1').mnemonics
  .concat(slip.fromPath('r/3/2').mnemonics);

requiredGroupShares = aliceFirstGroupShare.concat(familyGroupShares);

console.log(`\n* Shares used by Alice + 2 family members for restoring the master secret (total of ${requiredGroupShares.length} member-shares):`);
printShares(requiredGroupShares);
recover(requiredGroupShares, passphrase);

/*
 * Example of Case 4
 */
// The 3rd member-share (member 2) + the 4th member-share (member 3) + the 5th member-share (member 4) of the 3rd group-share (group 2)
friendGroupShares = slip.fromPath('r/2/2').mnemonics
  .concat(slip.fromPath('r/2/3').mnemonics)
  .concat(slip.fromPath('r/2/4').mnemonics);

// ...plus the 2nd member-share (member 1) + the 3rd member-share (member 2) of the 4th group-share (group 3)
familyGroupShares = slip.fromPath('r/3/1').mnemonics
  .concat(slip.fromPath('r/3/2').mnemonics);

requiredGroupShares = friendGroupShares.concat(familyGroupShares);

console.log(`\n* Shares used by 3 friends + 2 family members for restoring the master secret (total of ${requiredGroupShares.length} member-shares):`);
printShares(requiredGroupShares);
recover(requiredGroupShares, passphrase);
