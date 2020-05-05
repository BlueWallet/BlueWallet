/* global it */
import { HDLegacyBreadwalletWallet } from '../../class';
const assert = require('assert');

it('Legacy HD Breadwallet works', async () => {
  if (!process.env.HD_MNEMONIC_BREAD) {
    console.error('process.env.HD_MNEMONIC_BREAD not set, skipped');
    return;
  }
  let hdBread = new HDLegacyBreadwalletWallet();
  hdBread.setSecret(process.env.HD_MNEMONIC_BREAD);

  assert.strictEqual(hdBread.validateMnemonic(), true);
  assert.strictEqual(hdBread._getExternalAddressByIndex(0), '1ARGkNMdsBE36fJhddSwf8PqBXG3s4d2KU');
  assert.strictEqual(hdBread._getInternalAddressByIndex(0), '1JLvA5D7RpWgChb4A5sFcLNrfxYbyZdw3V');
  assert.strictEqual(hdBread._getExternalWIFByIndex(0), 'L25CoHfqWKR5byQhgp4M8sW1roifBteD3Lj3zCGNcV4JXhbxZ93F');
  assert.strictEqual(hdBread._getInternalWIFByIndex(0), 'KyEQuB73eueeS7D6iBJrNSvkD1kkdkJoUsavuxGXv5fxWkPJxt96');
  assert.strictEqual(
    hdBread._getPubkeyByAddress(hdBread._getExternalAddressByIndex(0)).toString('hex'),
    '0354d804a7943eb61ec13deef44586510506889175dc2f3a375867e4796debf2a9',
  );
  assert.strictEqual(
    hdBread._getPubkeyByAddress(hdBread._getInternalAddressByIndex(0)).toString('hex'),
    '02d241fadf3e48ff30a93360f6ef255cc3a797c588c907615d096510a918f46dce',
  );

  assert.strictEqual(
    hdBread.getXpub(),
    'xpub68nLLEi3KERQY7jyznC9PQSpSjmekrEmN8324YRCXayMXaavbdEJsK4gEcX2bNf9vGzT4xRks9utZ7ot1CTHLtdyCn9udvv1NWvtY7HXroh',
  );
});
