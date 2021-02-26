import assert from 'assert';
import { HDLegacyBreadwalletWallet } from '../../class';

it('Legacy HD Breadwallet works', async () => {
  if (!process.env.HD_MNEMONIC_BREAD) {
    console.error('process.env.HD_MNEMONIC_BREAD not set, skipped');
    return;
  }
  const hdBread = new HDLegacyBreadwalletWallet();
  hdBread.setSecret(process.env.HD_MNEMONIC_BREAD);

  assert.strictEqual(hdBread.validateMnemonic(), true);
  assert.strictEqual(hdBread._getExternalAddressByIndex(0), '1M1UphJDb1mpXV3FVEg6b2qqaBieNuaNrt');
  assert.strictEqual(hdBread._getInternalAddressByIndex(0), '1A9Sc4opR6c7Ui6NazECiGmsmnUPh2WeHJ');
  hdBread._internal_segwit_index = 2;
  hdBread._external_segwit_index = 2;
  assert.ok(hdBread._getExternalAddressByIndex(0).startsWith('1'));
  assert.ok(hdBread._getInternalAddressByIndex(0).startsWith('1'));
  assert.strictEqual(hdBread._getExternalAddressByIndex(2), 'bc1qh0vtrnjn7zs99j4n6xaadde95ctnnvegh9l2jn');
  assert.strictEqual(hdBread._getInternalAddressByIndex(2), 'bc1qk9hvkxqsqmps6ex3qawr79rvtg8es4ecjfu5v0');

  assert.strictEqual(hdBread._getDerivationPathByAddress('1M1UphJDb1mpXV3FVEg6b2qqaBieNuaNrt'), "m/0'/0/0");
  assert.strictEqual(hdBread._getDerivationPathByAddress('bc1qk9hvkxqsqmps6ex3qawr79rvtg8es4ecjfu5v0'), "m/0'/1/2");

  assert.strictEqual(
    hdBread._getPubkeyByAddress(hdBread._getExternalAddressByIndex(0)).toString('hex'),
    '029ba027f3f0a9fa69ce680a246198d56a3b047108f26791d1e4aa2d10e7e7a29a',
  );
  assert.strictEqual(
    hdBread._getPubkeyByAddress(hdBread._getInternalAddressByIndex(0)).toString('hex'),
    '03074225b31a95af63de31267104e07863d892d291a33ef5b2b32d59c772d5c784',
  );

  assert.strictEqual(
    hdBread.getXpub(),
    'xpub68hPk9CrHimZMBQEja43qWRC2TuXmCDdgZcR5YMebr38XatUEPu2Q2oaBViSMshDcyuMDGkGbTS2aqNHFKdcN1sFWaZgK6SLg84dtN7Ym64',
  );

  assert.ok(hdBread.getAllExternalAddresses().includes('1M1UphJDb1mpXV3FVEg6b2qqaBieNuaNrt'));
  assert.ok(hdBread.getAllExternalAddresses().includes('bc1qh0vtrnjn7zs99j4n6xaadde95ctnnvegh9l2jn'));
});
