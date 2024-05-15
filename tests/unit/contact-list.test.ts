import assert from 'assert';

import { HDSegwitBech32Wallet } from '../../class';
import { ContactList } from '../../class/contact-list';

describe('ContactList', () => {
  it('isPaymentCodeValid()', async () => {
    const w = new HDSegwitBech32Wallet();
    w.switchBIP47(true);
    const cl = new ContactList(w);

    assert.ok(!cl.isPaymentCodeValid('sfdgsfdghsfd'));
    assert.ok(
      cl.isPaymentCodeValid(
        'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97',
      ),
    );
  });
});
