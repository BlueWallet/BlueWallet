import { HDAezeedWallet, WatchOnlyWallet } from '../../class';

describe('HDAezeedWallet', () => {
  it('can import mnemonics and generate addresses and WIFs', async function () {
    const aezeed = new HDAezeedWallet();

    aezeed.setSecret('bs');
    expect(!(await aezeed.validateMnemonicAsync())).toBeTruthy();
    expect(!(await aezeed.mnemonicInvalidPassword())).toBeTruthy();

    // correct pass:
    aezeed.setSecret(
      'able mix price funny host express lawsuit congress antique float pig exchange vapor drip wide cup style apple tumble verb fix blush tongue market',
    );
    aezeed.setPassphrase('strongPassword');
    expect(await aezeed.validateMnemonicAsync()).toBeTruthy();
    expect(!(await aezeed.mnemonicInvalidPassword())).toBeTruthy();

    // no pass but its required:
    aezeed.setSecret(
      'able mix price funny host express lawsuit congress antique float pig exchange vapor drip wide cup style apple tumble verb fix blush tongue market',
    );
    aezeed.setPassphrase();
    expect(!(await aezeed.validateMnemonicAsync())).toBeTruthy();
    expect(await aezeed.mnemonicInvalidPassword()).toBeTruthy();

    // wrong pass:
    aezeed.setSecret(
      'able mix price funny host express lawsuit congress antique float pig exchange vapor drip wide cup style apple tumble verb fix blush tongue market',
    );
    aezeed.setPassphrase('badpassword');
    expect(!(await aezeed.validateMnemonicAsync())).toBeTruthy();
    expect(await aezeed.mnemonicInvalidPassword()).toBeTruthy();

    aezeed.setSecret(
      'able concert slush lend olive cost wagon dawn board robot park snap dignity churn fiction quote shrimp hammer wing jump immune skill sunset west',
    );
    aezeed.setPassphrase();
    expect(await aezeed.validateMnemonicAsync()).toBeTruthy();
    expect(!(await aezeed.mnemonicInvalidPassword())).toBeTruthy();

    aezeed.setSecret(
      'able concert slush lend olive cost wagon dawn board robot park snap dignity churn fiction quote shrimp hammer wing jump immune skill sunset west',
    );
    aezeed.setPassphrase('aezeed');
    expect(await aezeed.validateMnemonicAsync()).toBeTruthy();
    expect(!(await aezeed.mnemonicInvalidPassword())).toBeTruthy();

    aezeed.setSecret(
      'abstract rhythm weird food attract treat mosquito sight royal actor surround ride strike remove guilt catch filter summer mushroom protect poverty cruel chaos pattern',
    );
    aezeed.setPassphrase();
    expect(await aezeed.validateMnemonicAsync()).toBeTruthy();
    expect(!(await aezeed.mnemonicInvalidPassword())).toBeTruthy();

    expect(aezeed.getXpub()).toBe(
      'zpub6rkAmx9z6PmK7tBpGQatqpRweZvRw7uqiEMRS9KuZA9VFKUSoz3GQeJFtRQsQwduWugh5mGHro1tGnt78ci9AiB8qEH4hCRBWxdMaxadGVy',
    );

    let address = aezeed._getExternalAddressByIndex(0);
    expect(address).toBe('bc1qdjj7lhj9lnjye7xq3dzv3r4z0cta294xy78txn');
    expect(aezeed.getAllExternalAddresses().includes('bc1qdjj7lhj9lnjye7xq3dzv3r4z0cta294xy78txn')).toBeTruthy();

    address = aezeed._getExternalAddressByIndex(1);
    expect(address).toBe('bc1qswr3s4fylskqn9vemef8l28qukshuagsjz3wpe');
    expect(aezeed.getAllExternalAddresses().includes('bc1qswr3s4fylskqn9vemef8l28qukshuagsjz3wpe')).toBeTruthy();

    address = aezeed._getInternalAddressByIndex(0);
    expect(address).toBe('bc1qzyjq8sjj56n8v9fgw5klsc8sq8yuy0jx03hzzp');

    let wif = aezeed._getExternalWIFByIndex(0);
    expect(wif).toBe('KxtkgprHVXCcgzRetDt3JnNuRApgzQyRrvAuwiE1yFPjmYnWh6rH');

    wif = aezeed._getInternalWIFByIndex(0);
    expect(wif).toBe('L1dewhNXkVMB3JdoXYRikbz6g4CbaMGfSqSXSrmTkk5PvzmEgpdT');

    expect(aezeed.getIdentityPubkey()).toBe('0384b9a7158320e828280075224af324931ca9d6de4334f724dbb553ffee447164');

    // we should not really test private methods, but oh well
    expect(aezeed._getNodePubkeyByIndex(0, 0).toString('hex')).toBe('03ed28668d446c6e2ac11e4848f7afd894761ad26569baa8a16adff723699f2c07');
    expect(aezeed._getNodePubkeyByIndex(1, 0).toString('hex')).toBe('0210791263114fe72ab5a2131ca1986b84c62a93e30ee9d509266f1eadf4febaf2');
    expect(aezeed._getPubkeyByAddress(aezeed._getExternalAddressByIndex(1)).toString('hex')).toBe(
      aezeed._getNodePubkeyByIndex(0, 1).toString('hex'),
    );
    expect(aezeed._getPubkeyByAddress(aezeed._getInternalAddressByIndex(1)).toString('hex')).toBe(
      aezeed._getNodePubkeyByIndex(1, 1).toString('hex'),
    );
  });

  it('watch-only from zpub produces correct addresses', async () => {
    const aezeed = new HDAezeedWallet();
    aezeed.setSecret(
      'abstract rhythm weird food attract treat mosquito sight royal actor surround ride strike remove guilt catch filter summer mushroom protect poverty cruel chaos pattern',
    );
    expect(await aezeed.validateMnemonicAsync()).toBeTruthy();
    expect(!(await aezeed.mnemonicInvalidPassword())).toBeTruthy();

    expect(aezeed.getXpub()).toBe(
      'zpub6rkAmx9z6PmK7tBpGQatqpRweZvRw7uqiEMRS9KuZA9VFKUSoz3GQeJFtRQsQwduWugh5mGHro1tGnt78ci9AiB8qEH4hCRBWxdMaxadGVy',
    );

    const address = aezeed._getExternalAddressByIndex(0);
    expect(address).toBe('bc1qdjj7lhj9lnjye7xq3dzv3r4z0cta294xy78txn');
    expect(aezeed.getAllExternalAddresses().includes('bc1qdjj7lhj9lnjye7xq3dzv3r4z0cta294xy78txn')).toBeTruthy();

    const watchOnly = new WatchOnlyWallet();
    watchOnly.setSecret(aezeed.getXpub());
    watchOnly.init();
    expect(watchOnly._getExternalAddressByIndex(0)).toBe(aezeed._getExternalAddressByIndex(0));
    expect(watchOnly.weOwnAddress('bc1qdjj7lhj9lnjye7xq3dzv3r4z0cta294xy78txn')).toBeTruthy();
    expect(!watchOnly.weOwnAddress('garbage')).toBeTruthy();
    expect(!watchOnly.weOwnAddress(false)).toBeTruthy();
  });

  it('can sign and verify messages', async () => {
    const aezeed = new HDAezeedWallet();
    aezeed.setSecret(
      'abstract rhythm weird food attract treat mosquito sight royal actor surround ride strike remove guilt catch filter summer mushroom protect poverty cruel chaos pattern',
    );
    expect(await aezeed.validateMnemonicAsync()).toBeTruthy();
    expect(!(await aezeed.mnemonicInvalidPassword())).toBeTruthy();
    let signature;

    // external address
    signature = aezeed.signMessage('vires is numeris', aezeed._getExternalAddressByIndex(0));
    expect(signature).toBe('J9zF7mdGGdc/9HMlvor6Zl7ap1qseQpiBDJ4oaSpkzbQGGhdfkM6LHo6m9BV8o/BlqiQI1vuODaNlBFyeyIWgfE=');
    expect(aezeed.verifyMessage('vires is numeris', aezeed._getExternalAddressByIndex(0), signature)).toBe(true);

    // internal address
    signature = aezeed.signMessage('vires is numeris', aezeed._getInternalAddressByIndex(0));
    expect(signature).toBe('KIda06aSswmo9NiAYNUBRADA9q1v39raSmHHVg56+thtah5xL7hVw/x+cZgydFNyel2bXfyGluJRaP1uRQfJtzo=');
    expect(aezeed.verifyMessage('vires is numeris', aezeed._getInternalAddressByIndex(0), signature)).toBe(true);
  });
});
