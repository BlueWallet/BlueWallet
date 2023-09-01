import assert from 'assert';
import { BorderWallet } from '../../class';

describe('Border wallet extends HDSegwitBech32', () => {
  it('can create a border wallet', () => {
    const mnemonic = 'radio demand ghost glimpse rain slender fall struggle update kiss peanut inflict';
    const wallet = new BorderWallet(BorderWallet.EntropyType.DEFAULT);
    wallet.setSecret(mnemonic);

    assert.strictEqual(true, wallet.validateMnemonic());
    assert.strictEqual(true, wallet.isBorderWallet);
    assert.strictEqual(
      'zpub6rDUQrPZE5zJvnJngn49CCAXdJ5uH2LCoYhcVatasoLRwwCU7usQa4B9DokDm1NsbnKHSuMifW7Z6NyuT9iXvkHpZmsWqu13wyVR69VATsn',
      wallet.getXpub(),
    );
  });
});
