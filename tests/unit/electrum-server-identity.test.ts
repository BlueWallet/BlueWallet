import assert from 'assert';

import { saveServerIdentity, ServerIdentityError, validationModes, verifyServerIdentity } from '../../blue_modules/electrumServerIdentity';

// real public keys of electrum1.bluewallet.io (EC) and bitcoin.lu.ke (RSA), the way each platform reports them
const ecBare = 'BF2jbOAl909ITPcjocraDtHId/6d48VATLRzUeZF7srKNfjqidSY8Ta8PgpeSBxvOkjzotQp2avQo530pMnlna0='; // iOS, nodejs
const ecSpki =
  'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEXaNs4CX3T0hM9yOhytoO0ch3/p3jxUBMtHNR5kXuyso1+OqJ1JjxNrw+Cl5IHG86SPOi1CnZq9CjnfSkyeWdrQ=='; // android
const lukeBare =
  'MIIBCgKCAQEAtAsmZqxtPc9zd5ITHPyexu6P3ZXF+xLEyvlYUV9iirBgSRW2adB/CH57orjnzrlL/kdIKYjkVZ0aVbIzVDQ+uGFUUYsOozEOYINO6O2ZekPaj3Z+mXdlrH/DW+vQVzVp20goVcXDUcGBTaUDuqrmzrgXwDgWsoa4vtesS3gXj201xI+aUkzWcYgNg+060+PpnVYTTmRGWm5AFNh2Q3BqRlAfEHKdmumlhf+Gmq6OpJyBJrZOX0v7HEU3QYYwwgWSvdhUNqCUcZ7+JDeLg5jDIVrQvgfqo9bV5ATLpvWiTOoWn8zE9XhjISLwsywk7ECAx2ytGJBpwEEQyV4nIeyGPwIDAQAB'; // iOS
const lukeSpki = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A' + lukeBare; // android, nodejs

const clientWith = (pubkey?: string | Uint8Array) => ({ conn: { getPeerCertificate: async () => (pubkey ? { pubkey } : null) } });
const noCertificate = clientWith(); // that's what iOS gives after regular validation

describe('electrum server identity', () => {
  it('servers that ship with the app are never trusted on first use', async () => {
    assert.deepStrictEqual(await validationModes('electrum1.bluewallet.io', 443), [true]);
    assert.deepStrictEqual(await validationModes('Electrum.ACINQ.co', 50002, true), [true]);
    assert.deepStrictEqual(await validationModes('bitcoin.lu.ke', 50002, true), [false]);

    await verifyServerIdentity(clientWith(lukeBare), 'bitcoin.lu.ke', 50002, false);
    await verifyServerIdentity(clientWith(lukeSpki), 'bitcoin.lu.ke', 50002, false);
    await assert.rejects(verifyServerIdentity(clientWith(ecBare), 'bitcoin.lu.ke', 50002, false, true), (e: ServerIdentityError) => {
      return e instanceof ServerIdentityError && !e.change; // nothing for the user to decide
    });
  });

  it('refuses when there is no peer key to compare', async () => {
    await assert.rejects(verifyServerIdentity(noCertificate, 'bitcoin.lu.ke', 50002, false));
    await assert.rejects(verifyServerIdentity(noCertificate, 'nokey.server', 50002, false, true));
  });

  it('remembers key of a self-signed server and notices when it changes', async () => {
    assert.deepStrictEqual(await validationModes('selfsigned.server', 50002), [true, false]);
    await verifyServerIdentity(clientWith(lukeSpki), 'selfsigned.server', 50002, false);
    assert.deepStrictEqual(await validationModes('selfsigned.server', 50002), [false]);

    // same key, whatever the encoding
    await verifyServerIdentity(clientWith(lukeBare), 'SelfSigned.server', 50002, false);
    await verifyServerIdentity(clientWith(Buffer.from(lukeSpki, 'base64')), 'selfsigned.server', 50002, false);

    // another port is another server
    await verifyServerIdentity(clientWith(ecSpki), 'selfsigned.server', 50003, false);

    let change: ServerIdentityError['change'];
    await assert.rejects(verifyServerIdentity(clientWith(ecSpki), 'selfsigned.server', 50002, false), (e: ServerIdentityError) => {
      change = e.change;
      return e instanceof ServerIdentityError;
    });
    assert.strictEqual(change?.host, 'selfsigned.server');
    assert.strictEqual(change?.port, 50002);
    assert.notStrictEqual(change?.savedPubkey, change?.newPubkey);

    // still refused until user says its fine
    await assert.rejects(verifyServerIdentity(clientWith(ecBare), 'selfsigned.server', 50002, false), ServerIdentityError);
    await saveServerIdentity(change!.host, change!.port, change!.newPubkey);
    await verifyServerIdentity(clientWith(ecBare), 'selfsigned.server', 50002, false);
    await assert.rejects(verifyServerIdentity(clientWith(lukeSpki), 'selfsigned.server', 50002, false), ServerIdentityError);
  });

  it('server with a valid certificate can not be swapped for a self-signed one', async () => {
    await verifyServerIdentity(noCertificate, 'valid.server', 50002, true);
    assert.deepStrictEqual(await validationModes('valid.server', 50002), [true]);
    assert.deepStrictEqual(await validationModes('valid.server', 50002, true), [true]); // not even by saving it in settings again
  });

  it('saving server in settings again replaces the remembered key', async () => {
    await verifyServerIdentity(clientWith(lukeSpki), 'resaved.server', 50002, false);

    // new self-signed certificate
    assert.deepStrictEqual(await validationModes('resaved.server', 50002, true), [true, false]);
    await verifyServerIdentity(clientWith(ecSpki), 'resaved.server', 50002, false, true);
    await verifyServerIdentity(clientWith(ecBare), 'resaved.server', 50002, false);

    // proper certificate now
    await verifyServerIdentity(noCertificate, 'resaved.server', 50002, true, true);
    assert.deepStrictEqual(await validationModes('resaved.server', 50002), [true]);
  });
});
