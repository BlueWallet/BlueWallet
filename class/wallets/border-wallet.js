import { HDSegwitBech32Wallet } from './hd-segwit-bech32-wallet';

/**
 * Introducing a new way to quickly and reliably memorise Bitcoin seed phrases.
 * @see https://www.borderwallets.com/
 */
export class BorderWallet extends HDSegwitBech32Wallet {
  isBorderWallet;
  entropyType;

  constructor(entropyType) {
    super();
    this.isBorderWallet = true;
    this.entropyType = entropyType;
  }

  static typesOfGrid = [
    'Pattern Grid (blank)',
    'Word Grid (the first 4 characters of the word)',
    'Number Grid (from 1-2048)',
    'Index Grid (from 0-2047)',
    'Hex Grid (hexadecimal - base16)',
  ];

  static defaultTypeOfGrid = BorderWallet.typesOfGrid[1];

  static typesOfEntropy = ['Deterministic (128 bit)', 'Maximum (19580 bit / 2048!)'];

  static defaultOfEntropy = BorderWallet.typesOfEntropy[0];

  static EntropyType = {
    DEFAULT: '128',
    MAX: 'max',
  };
}
