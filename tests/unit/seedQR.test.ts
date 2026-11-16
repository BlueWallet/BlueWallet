import assert from 'assert';

import { mnemonicToSeedQR } from '../../blue_modules/seedQR';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';

describe('mnemonicToSeedQR', () => {
  it('encodes a 12-word mnemonic (SeedSigner docs test vector)', () => {
    const mnemonic = 'approve fruit lens brass ring actual stool coin doll boss strong rate';
    assert.strictEqual(mnemonicToSeedQR(mnemonic), '008607501025021714880023171503630517020917211425');
  });

  it('encodes a 24-word mnemonic and keeps leading zeros', () => {
    const mnemonic = Array(23).fill('abandon').join(' ') + ' art';
    assert.strictEqual(mnemonicToSeedQR(mnemonic), '0000'.repeat(23) + '0102');
  });

  it('tolerates extra whitespace', () => {
    const mnemonic = '  abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon  about ';
    assert.strictEqual(mnemonicToSeedQR(mnemonic), '0000'.repeat(11) + '0003');
  });

  it('round-trips through wallet.setSecret()', () => {
    const mnemonic = 'approve fruit lens brass ring actual stool coin doll boss strong rate';
    const wallet = new HDSegwitBech32Wallet();
    wallet.setSecret(mnemonicToSeedQR(mnemonic)!);
    assert.strictEqual(wallet.getSecret(), mnemonic);
  });

  it('returns null for invalid checksum, non-English words and non-mnemonics', () => {
    assert.strictEqual(mnemonicToSeedQR('abandon '.repeat(12).trim()), null);
    assert.strictEqual(
      mnemonicToSeedQR('abaisser abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon'),
      null,
    );
    assert.strictEqual(
      mnemonicToSeedQR('xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz'),
      null,
    );
    assert.strictEqual(mnemonicToSeedQR(''), null);
  });
});
