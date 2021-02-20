import { HDAezeedWallet } from '../../class';
const assert = require('assert');

describe('HDAezeedWallet', () => {
  it('can import mnemonics and generate addresses and WIFs', async function () {
    const aezeed = new HDAezeedWallet();

    aezeed.setSecret('bs');
    assert.ok(!(await aezeed.validateMnemonicAsync()));
    assert.ok(!(await aezeed.mnemonicInvalidPassword()));

    // correct pass:
    aezeed.setSecret(
      'able mix price funny host express lawsuit congress antique float pig exchange vapor drip wide cup style apple tumble verb fix blush tongue market:strongPassword',
    );
    assert.ok(await aezeed.validateMnemonicAsync());
    assert.ok(!(await aezeed.mnemonicInvalidPassword()));

    // no pass but its required:
    aezeed.setSecret(
      'able mix price funny host express lawsuit congress antique float pig exchange vapor drip wide cup style apple tumble verb fix blush tongue market',
    );
    assert.ok(!(await aezeed.validateMnemonicAsync()));
    assert.ok(await aezeed.mnemonicInvalidPassword());

    // wrong pass:
    aezeed.setSecret(
      'able mix price funny host express lawsuit congress antique float pig exchange vapor drip wide cup style apple tumble verb fix blush tongue market:badpassword',
    );
    assert.ok(!(await aezeed.validateMnemonicAsync()));
    assert.ok(await aezeed.mnemonicInvalidPassword());

    aezeed.setSecret(
      'able concert slush lend olive cost wagon dawn board robot park snap dignity churn fiction quote shrimp hammer wing jump immune skill sunset west',
    );
    assert.ok(await aezeed.validateMnemonicAsync());
    assert.ok(!(await aezeed.mnemonicInvalidPassword()));

    aezeed.setSecret(
      'abstract rhythm weird food attract treat mosquito sight royal actor surround ride strike remove guilt catch filter summer mushroom protect poverty cruel chaos pattern',
    );
    assert.ok(await aezeed.validateMnemonicAsync());
    assert.ok(!(await aezeed.mnemonicInvalidPassword()));

    assert.strictEqual(
      aezeed.getXpub(),
      'zpub6rrqwqM3aF1Jdz6y5Zw18RTppHbZQeQpsrSyf3E2uibcrsEeZAbm5MX41Nq4XBF7HbCvRVASHLzRkFsg6sMgakcceWzJazZH7SaVPBoXzDQ',
    );

    let address = aezeed._getExternalAddressByIndex(0);
    assert.strictEqual(address, 'bc1qdjj7lhj9lnjye7xq3dzv3r4z0cta294xy78txn');
    assert.ok(aezeed.getAllExternalAddresses().includes('bc1qdjj7lhj9lnjye7xq3dzv3r4z0cta294xy78txn'));

    address = aezeed._getExternalAddressByIndex(1);
    assert.strictEqual(address, 'bc1qswr3s4fylskqn9vemef8l28qukshuagsjz3wpe');
    assert.ok(aezeed.getAllExternalAddresses().includes('bc1qswr3s4fylskqn9vemef8l28qukshuagsjz3wpe'));

    address = aezeed._getInternalAddressByIndex(0);
    assert.strictEqual(address, 'bc1qzyjq8sjj56n8v9fgw5klsc8sq8yuy0jx03hzzp');

    let wif = aezeed._getExternalWIFByIndex(0);
    assert.strictEqual(wif, 'KxtkgprHVXCcgzRetDt3JnNuRApgzQyRrvAuwiE1yFPjmYnWh6rH');

    wif = aezeed._getInternalWIFByIndex(0);
    assert.strictEqual(wif, 'L1dewhNXkVMB3JdoXYRikbz6g4CbaMGfSqSXSrmTkk5PvzmEgpdT');

    assert.strictEqual(aezeed.getIdentityPubkey(), '0384b9a7158320e828280075224af324931ca9d6de4334f724dbb553ffee447164');

    // we should not really test private methods, but oh well
    assert.strictEqual(
      aezeed._getNodePubkeyByIndex(0, 0).toString('hex'),
      '03ed28668d446c6e2ac11e4848f7afd894761ad26569baa8a16adff723699f2c07',
    );
    assert.strictEqual(
      aezeed._getNodePubkeyByIndex(1, 0).toString('hex'),
      '0210791263114fe72ab5a2131ca1986b84c62a93e30ee9d509266f1eadf4febaf2',
    );
    assert.strictEqual(
      aezeed._getPubkeyByAddress(aezeed._getExternalAddressByIndex(1)).toString('hex'),
      aezeed._getNodePubkeyByIndex(0, 1).toString('hex'),
    );
    assert.strictEqual(
      aezeed._getPubkeyByAddress(aezeed._getInternalAddressByIndex(1)).toString('hex'),
      aezeed._getNodePubkeyByIndex(1, 1).toString('hex'),
    );
  });
});
