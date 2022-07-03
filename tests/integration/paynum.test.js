import assert from 'assert';

import { HDSegwitBech32Wallet } from '../../class';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';

jest.setTimeout(30 * 1000);

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.connectMain();
});

describe('Bip47', () => {
  it('Bip47 works', async () => {
    if (!process.env.PAYNUM_HD_MNEMONIC) {
      console.error('process.env.PAYNUM_HD_MNEMONIC not set, skipped');
      return;
    }

    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.PAYNUM_HD_MNEMONIC);

    assert.strictEqual(hd.getPNNotificationAddress(), '1Eku8xdcT1sfA3KB9yTyfgEJNFxS16xm6Z');

    const pns = await hd.getBip47PaymentCodes();

    assert.ok(
      pns.includes('PM8TJXFvDCPNA1SHDxFojuRSUkJTqiVoHqmqfqZ79TaJaHiHVaCSanyxQ1X5wNoWHhyVJC1gTpi8yTaDJEijeQxdoTgFqppvZqCfytBzP2Tv4h8SetGg'),
    );
    assert.ok(
      pns.includes('PM8TJYstmXnM4rJV7tYbD6YeMxMCPew44mRQxMh17PJT4RvYVuutx94qAy3qmUtRf4svb54p2f8t89ceMFCEP9cHHod3QAAAF2hkYF5ibhWEeMo2zTuP'),
    );

    // PM8TJXFvDCPNA1SHDxFojuRSUkJTqiVoHqmqfqZ79TaJaHiHVaCSanyxQ1X5wNoWHhyVJC1gTpi8yTaDJEijeQxdoTgFqppvZqCfytBzP2Tv4h8SetGg
    assert.strictEqual(
      hd.getBip47Address(
        'PM8TJXFvDCPNA1SHDxFojuRSUkJTqiVoHqmqfqZ79TaJaHiHVaCSanyxQ1X5wNoWHhyVJC1gTpi8yTaDJEijeQxdoTgFqppvZqCfytBzP2Tv4h8SetGg',
        0,
      ),
      'bc1q66exnstnse26uxs3gxvtljq3pr8qgcuj2u9jqn',
    );
    assert.strictEqual(
      hd.getBip47Address(
        'PM8TJXFvDCPNA1SHDxFojuRSUkJTqiVoHqmqfqZ79TaJaHiHVaCSanyxQ1X5wNoWHhyVJC1gTpi8yTaDJEijeQxdoTgFqppvZqCfytBzP2Tv4h8SetGg',
        1,
      ),
      'bc1q5r87z6trk7xtq7xckd24k8yd5l2yau0z6jsl0f',
    );

    // PM8TJYstmXnM4rJV7tYbD6YeMxMCPew44mRQxMh17PJT4RvYVuutx94qAy3qmUtRf4svb54p2f8t89ceMFCEP9cHHod3QAAAF2hkYF5ibhWEeMo2zTuP
    assert.strictEqual(
      hd.getBip47Address(
        'PM8TJYstmXnM4rJV7tYbD6YeMxMCPew44mRQxMh17PJT4RvYVuutx94qAy3qmUtRf4svb54p2f8t89ceMFCEP9cHHod3QAAAF2hkYF5ibhWEeMo2zTuP',
        0,
      ),
      'bc1q68r4l2ymzwurl2fps4s6kl5hta3jrrhd7vd0v7',
    );
    assert.strictEqual(
      hd.getBip47Address(
        'PM8TJYstmXnM4rJV7tYbD6YeMxMCPew44mRQxMh17PJT4RvYVuutx94qAy3qmUtRf4svb54p2f8t89ceMFCEP9cHHod3QAAAF2hkYF5ibhWEeMo2zTuP',
        1,
      ),
      'bc1qukka3766u8maxxssceshdausmm5a2yp8gxc0t4',
    );
  });
});
