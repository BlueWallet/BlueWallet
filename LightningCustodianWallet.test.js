/* global it */
import { LightningCustodianWallet } from './class';
let assert = require('assert');

it('can generate auth secret', () => {
  let l1 = new LightningCustodianWallet();
  let l2 = new LightningCustodianWallet();
  l1.generate();
  l2.generate();

  assert.ok(l1.getSecret() !== l2.getSecret(), 'generated credentials should not be the same');
});
