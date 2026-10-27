import assert from 'assert';
import { bech32m } from 'bech32';

import { ContactList } from '../../class/contact-list';

describe('ContactList', () => {
  it('isAddressValid()', () => {
    const cl = new ContactList();
    assert.ok(cl.isAddressValid('3BDsBDxDimYgNZzsqszNZobqQq3yeUoJf2'));
    assert.ok(cl.isAddressValid('bc1quuafy8htjjj263cvpj7md84magzmc8svmh8lrm'));
    assert.ok(cl.isAddressValid('BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7'));

    assert.ok(!cl.isAddressValid('sfhsdhsdf'));
  });

  it('isPaymentCodeValid()', async () => {
    const cl = new ContactList();

    assert.ok(!cl.isPaymentCodeValid('sfdgsfdghsfd'));
    assert.ok(
      cl.isPaymentCodeValid(
        'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97',
      ),
    );

    assert.ok(
      cl.isPaymentCodeValid(
        'sp1qqgste7k9hx0qftg6qmwlkqtwuy6cycyavzmzj85c6qdfhjdpdjtdgqjuexzk6murw56suy3e0rd2cgqvycxttddwsvgxe2usfpxumr70xc9pkqwv',
      ),
    );

    assert.ok(!cl.isPaymentCodeValid('sp1qq'));
  });

  it('isBip352PaymentCodeValid() checks prefix, case, version and keys', () => {
    const cl = new ContactList();
    const pc = 'sp1qqgste7k9hx0qftg6qmwlkqtwuy6cycyavzmzj85c6qdfhjdpdjtdgqjuexzk6murw56suy3e0rd2cgqvycxttddwsvgxe2usfpxumr70xc9pkqwv';
    const data = bech32m.fromWords(bech32m.decode(pc, 118).words.slice(1));
    const keys = data.slice(0, 66);
    const notOnCurve = [2, ...new Array(32).fill(0xff)];
    const encode = (prefix: string, version: number, bytes: number[]) => bech32m.encode(prefix, [version, ...bech32m.toWords(bytes)], 1023);

    assert.ok(cl.isBip352PaymentCodeValid(pc));
    assert.ok(cl.isBip352PaymentCodeValid(pc.toUpperCase()));
    assert.ok(!cl.isBip352PaymentCodeValid(pc.slice(0, 10).toUpperCase() + pc.slice(10))); // mixed case
    assert.ok(!cl.isBip352PaymentCodeValid(encode('tsp', 0, keys)));
    assert.ok(!cl.isBip352PaymentCodeValid(encode('bc', 0, keys)));
    assert.ok(!cl.isBip352PaymentCodeValid(encode('sp', 1, keys))); // pinned silent-payments sends to v0 only
    assert.ok(!cl.isBip352PaymentCodeValid(encode('sp', 0, keys.slice(0, 40))));
    assert.ok(!cl.isBip352PaymentCodeValid(encode('sp', 0, [...keys, 1])));
    assert.ok(!cl.isBip352PaymentCodeValid(encode('sp', 0, [...keys.slice(0, 33), ...notOnCurve])));
    assert.ok(!cl.isBip352PaymentCodeValid(encode('sp', 0, [...notOnCurve, ...keys.slice(33)])));
  });
});
