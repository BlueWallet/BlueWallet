import assert from 'assert';

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
});
