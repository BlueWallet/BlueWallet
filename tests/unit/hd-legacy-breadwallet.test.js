import { HDLegacyBreadwalletWallet } from '../../class';

it('Legacy HD Breadwallet works', async () => {
  if (!process.env.HD_MNEMONIC_BREAD) {
    console.error('process.env.HD_MNEMONIC_BREAD not set, skipped');
    return;
  }
  const hdBread = new HDLegacyBreadwalletWallet();
  hdBread.setSecret(process.env.HD_MNEMONIC_BREAD);

  expect(hdBread.validateMnemonic()).toBe(true);
  expect(hdBread._getExternalAddressByIndex(0)).toBe('1M1UphJDb1mpXV3FVEg6b2qqaBieNuaNrt');
  expect(hdBread._getInternalAddressByIndex(0)).toBe('1A9Sc4opR6c7Ui6NazECiGmsmnUPh2WeHJ');
  hdBread._internal_segwit_index = 2;
  hdBread._external_segwit_index = 2;
  expect(hdBread._getExternalAddressByIndex(0).startsWith('1')).toBeTruthy();
  expect(hdBread._getInternalAddressByIndex(0).startsWith('1')).toBeTruthy();
  expect(hdBread._getExternalAddressByIndex(2)).toBe('bc1qh0vtrnjn7zs99j4n6xaadde95ctnnvegh9l2jn');
  expect(hdBread._getInternalAddressByIndex(2)).toBe('bc1qk9hvkxqsqmps6ex3qawr79rvtg8es4ecjfu5v0');

  expect(hdBread._getDerivationPathByAddress('1M1UphJDb1mpXV3FVEg6b2qqaBieNuaNrt')).toBe("m/0'/0/0");
  expect(hdBread._getDerivationPathByAddress('bc1qk9hvkxqsqmps6ex3qawr79rvtg8es4ecjfu5v0')).toBe("m/0'/1/2");

  expect(hdBread._getPubkeyByAddress(hdBread._getExternalAddressByIndex(0)).toString('hex')).toBe(
    '029ba027f3f0a9fa69ce680a246198d56a3b047108f26791d1e4aa2d10e7e7a29a',
  );
  expect(hdBread._getPubkeyByAddress(hdBread._getInternalAddressByIndex(0)).toString('hex')).toBe(
    '03074225b31a95af63de31267104e07863d892d291a33ef5b2b32d59c772d5c784',
  );

  expect(hdBread.getXpub()).toBe(
    'xpub68hPk9CrHimZMBQEja43qWRC2TuXmCDdgZcR5YMebr38XatUEPu2Q2oaBViSMshDcyuMDGkGbTS2aqNHFKdcN1sFWaZgK6SLg84dtN7Ym64',
  );

  expect(hdBread.getAllExternalAddresses().includes('1M1UphJDb1mpXV3FVEg6b2qqaBieNuaNrt')).toBeTruthy();
  expect(hdBread.getAllExternalAddresses().includes('bc1qh0vtrnjn7zs99j4n6xaadde95ctnnvegh9l2jn')).toBeTruthy();
});
