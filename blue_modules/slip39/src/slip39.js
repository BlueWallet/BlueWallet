/* eslint-disable radix */
const slipHelper = require('./slip39_helper.js');

const MAX_DEPTH = 2;

/**
 * Slip39Node
 * For root node, description refers to the whole set's title e.g. "Hardware wallet X SSSS shares"
 * For children nodes, description refers to the group e.g. "Family group: mom, dad, sister, wife"
 */
class Slip39Node {
  constructor(index = 0, description = '', mnemonic = '', children = []) {
    this.index = index;
    this.description = description;
    this.mnemonic = mnemonic;
    this.children = children;
  }

  get mnemonics() {
    if (this.children.length === 0) {
      return [this.mnemonic];
    }
    const result = this.children.reduce((prev, item) => {
      return prev.concat(item.mnemonics);
    }, []);
    return result;
  }
}

//
// The javascript implementation of the SLIP-0039: Shamir's Secret-Sharing for Mnemonic Codes
// see: https://github.com/satoshilabs/slips/blob/master/slip-0039.md)
//
class Slip39 {
  constructor({
    iterationExponent = 0,
    identifier,
    groupCount,
    groupThreshold
  } = {}) {
    this.iterationExponent = iterationExponent;
    this.identifier = identifier;
    this.groupCount = groupCount;
    this.groupThreshold = groupThreshold;
  }

  static fromArray(masterSecret, {
    passphrase = '',
    threshold = 1,
    groups = [
      [1, 1, 'Default 1-of-1 group share']
    ],
    iterationExponent = 0,
    title = 'My default slip39 shares'
  } = {}) {
    if (masterSecret.length * 8 < slipHelper.MIN_ENTROPY_BITS) {
      throw Error(`The length of the master secret (${masterSecret.length} bytes) must be at least ${slipHelper.bitsToBytes(slipHelper.MIN_ENTROPY_BITS)} bytes.`);
    }

    if (masterSecret.length % 2 !== 0) {
      throw Error('The length of the master secret in bytes must be an even number.');
    }

    if (!/^[\x20-\x7E]*$/.test(passphrase)) {
      throw Error('The passphrase must contain only printable ASCII characters (code points 32-126).');
    }

    if (threshold > groups.length) {
      throw Error(`The requested group threshold (${threshold}) must not exceed the number of groups (${groups.length}).`);
    }

    groups.forEach((item) => {
      if (item[0] === 1 && item[1] > 1) {
        throw Error(`Creating multiple member shares with member threshold 1 is not allowed. Use 1-of-1 member sharing instead. ${groups.join()}`);
      }
    });

    const identifier = slipHelper.generateIdentifier();

    const slip = new Slip39({
      iterationExponent: iterationExponent,
      identifier: identifier,
      groupCount: groups.length,
      groupThreshold: threshold
    });

    const encryptedMasterSecret = slipHelper.crypt(
      masterSecret, passphrase, iterationExponent, slip.identifier);

    const root = slip.buildRecursive(
      new Slip39Node(0, title),
      groups,
      encryptedMasterSecret,
      threshold
    );

    slip.root = root;
    return slip;
  }

  buildRecursive(currentNode, nodes, secret, threshold, index) {
    // It means it's a leaf.
    if (nodes.length === 0) {
      const mnemonic = slipHelper.encodeMnemonic(this.identifier, this.iterationExponent, index,
        this.groupThreshold, this.groupCount, currentNode.index, threshold, secret);

      currentNode.mnemonic = mnemonic;
      return currentNode;
    }

    const secretShares = slipHelper.splitSecret(threshold, nodes.length, secret);
    let children = [];
    let idx = 0;

    nodes.forEach((item) => {
      // n=threshold
      const n = item[0];
      // m=members
      const m = item[1];
      // d=description
      const d = item[2] || '';

      // Generate leaf members, means their `m` is `0`
      const members = Array().slip39Generate(m, () => [n, 0, d]);

      const node = new Slip39Node(idx, d);
      const branch = this.buildRecursive(
        node,
        members,
        secretShares[idx],
        n,
        currentNode.index);

      children = children.concat(branch);
      idx = idx + 1;
    });
    currentNode.children = children;
    return currentNode;
  }

  static recoverSecret(mnemonics, passphrase) {
    return slipHelper.combineMnemonics(mnemonics, passphrase);
  }

  static validateMnemonic(mnemonic) {
    return slipHelper.validateMnemonic(mnemonic);
  }

  fromPath(path) {
    this.validatePath(path);

    const children = this.parseChildren(path);

    if (typeof children === 'undefined' || children.length === 0) {
      return this.root;
    }

    return children.reduce((prev, childNumber) => {
      let childrenLen = prev.children.length;
      if (childNumber >= childrenLen) {
        throw new Error(`The path index (${childNumber}) exceeds the children index (${childrenLen - 1}).`);
      }

      return prev.children[childNumber];
    }, this.root);
  }

  validatePath(path) {
    if (!path.match(/(^r)(\/\d{1,2}){0,2}$/)) {
      throw new Error('Expected valid path e.g. "r/0/0".');
    }

    const depth = path.split('/');
    const pathLength = depth.length - 1;
    if (pathLength > MAX_DEPTH) {
      throw new Error(`Path\'s (${path}) max depth (${MAX_DEPTH}) is exceeded (${pathLength}).`);
    }
  }

  parseChildren(path) {
    const splitted = path.split('/').slice(1);

    const result = splitted.map((pathFragment) => {
      return parseInt(pathFragment);
    });
    return result;
  }
}

exports = module.exports = Slip39;
