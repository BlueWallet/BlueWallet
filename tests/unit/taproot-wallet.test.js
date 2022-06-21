import { TaprootWallet } from '../../class';
const assert = require('assert');

describe('Taproot wallet', () => {
  it('can convert scriptPubKey to address', () => {
    let address = TaprootWallet.scriptPubKeyToAddress('512040ef293a8a0ebaf8b351a27d89ff4b5b3822a635e4afdca77a30170c363bafa3');
    assert.strictEqual(address, 'bc1pgrhjjw52p6a03v635f7cnl6ttvuz9f34ujhaefm6xqtscd3m473szkl92g');
    address = TaprootWallet.scriptPubKeyToAddress();
    assert.strictEqual(address, false);
    address = TaprootWallet.scriptPubKeyToAddress('trololo');
    assert.strictEqual(address, false);
  });
});
