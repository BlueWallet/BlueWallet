import assert from 'assert';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import fs from 'fs';

// Mock dependencies as needed
jest.mock('../../blue_modules/BlueElectrum', () => {
  return {
    connectMain: jest.fn(),
  };
});

// Import the filesystem module for reading fixture files

describe.each(['', '//'])('unit - DeeplinkSchemaMatch with suffix "%s"', function (suffix) {
  describe('hasSchema', () => {
    it('should recognize valid Bitcoin and Lightning schemas', () => {
      // Bitcoin Addresses
      assert.ok(DeeplinkSchemaMatch.hasSchema(`bitcoin:${suffix}12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG`));
      assert.ok(DeeplinkSchemaMatch.hasSchema(`bitcoin:${suffix}bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo`));
      assert.ok(DeeplinkSchemaMatch.hasSchema(`bitcoin:${suffix}BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7?amount=666&label=Yo`));
      assert.ok(DeeplinkSchemaMatch.hasSchema(`BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE`));
      assert.ok(DeeplinkSchemaMatch.hasSchema(`BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo`));

      // Lightning Invoices
      assert.ok(
        DeeplinkSchemaMatch.hasSchema(
          `lightning:${suffix}lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde`,
        ),
      );

      // Bluewallet Schemas
      assert.ok(DeeplinkSchemaMatch.hasSchema(`bluewallet:bitcoin:${suffix}12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG`));
      assert.ok(
        DeeplinkSchemaMatch.hasSchema(`bluewallet:bitcoin:${suffix}bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo`),
      );
      assert.ok(
        DeeplinkSchemaMatch.hasSchema(`bluewallet:bitcoin:${suffix}BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7?amount=666&label=Yo`),
      );
      assert.ok(DeeplinkSchemaMatch.hasSchema(`bluewallet:BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE`));
      assert.ok(
        DeeplinkSchemaMatch.hasSchema(`bluewallet:BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo`),
      );
      assert.ok(
        DeeplinkSchemaMatch.hasSchema(
          `bluewallet:lightning:${suffix}lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde`,
        ),
      );
    });
  });

  describe('isBitcoinAddress', () => {
    it('should validate valid Bitcoin addresses', () => {
      // P2PKH
      assert.ok(DeeplinkSchemaMatch.isBitcoinAddress('12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG'));
      // P2SH
      assert.ok(DeeplinkSchemaMatch.isBitcoinAddress('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK'));
      // Bech32
      assert.ok(DeeplinkSchemaMatch.isBitcoinAddress('bc1qykcp2x3djgdtdwelxn9z4j2y956npte0a4sref'));
      assert.ok(DeeplinkSchemaMatch.isBitcoinAddress('BC1QYKCP2X3DJGDTDWELXN9Z4J2Y956NPTE0A4SREF'));
      // Prefixed with bitcoin:
      assert.ok(DeeplinkSchemaMatch.isBitcoinAddress(`bitcoin:${suffix}BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7`));
      assert.ok(DeeplinkSchemaMatch.isBitcoinAddress(`BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE`));
      assert.ok(DeeplinkSchemaMatch.isBitcoinAddress(`BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo`));
    });
  });

  describe('isLightningInvoice', () => {
    it('should validate valid Lightning invoices', () => {
      assert.ok(
        DeeplinkSchemaMatch.isLightningInvoice(
          `lightning:${suffix}lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde`,
        ),
      );
    });
  });

  describe('isLnUrl', () => {
    it('should recognize valid LNURLs', () => {
      assert.ok(
        DeeplinkSchemaMatch.isLnUrl(
          'LNURL1DP68GURN8GHJ7MRWVF5HGUEWVDHK6TMHD96XSERJV9MJ7CTSDYHHVVF0D3H82UNV9UM9JDENFPN5SMMK2359J5RKWVMKZ5ZVWAV4VJD63TM',
        ),
      );
    });
  });

  describe('navigationRouteFor', () => {
    it('should correctly navigate based on various deeplinks', async () => {
      const events = [
        {
          argument: { url: `12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG` },
          expected: ['SendDetailsRoot', { screen: 'SendDetails', params: { uri: '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG' } }],
        },
        {
          argument: { url: `bitcoin:${suffix}12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG` },
          expected: ['SendDetailsRoot', { screen: 'SendDetails', params: { uri: 'bitcoin:12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG' } }],
        },
        {
          argument: { url: `BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo` },
          expected: [
            'SendDetailsRoot',
            { screen: 'SendDetails', params: { uri: 'BITCOIN:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo' } },
          ],
        },
        {
          argument: { url: `bluewallet:BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo` },
          expected: [
            'SendDetailsRoot',
            { screen: 'SendDetails', params: { uri: 'BITCOIN:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo' } },
          ],
        },
        {
          argument: {
            url: `lightning:${suffix}lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde`,
          },
          expected: [
            'ScanLndInvoiceRoot',
            {
              screen: 'ScanLndInvoice',
              params: {
                uri: 'lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde',
              },
            },
          ],
        },
        {
          argument: {
            url: `bluewallet:lightning:${suffix}lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde`,
          },
          expected: [
            'ScanLndInvoiceRoot',
            {
              screen: 'ScanLndInvoice',
              params: {
                uri: 'lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde',
              },
            },
          ],
        },
        {
          argument: {
            url: 'https://azte.co/?c1=3062&c2=2586&c3=5053&c4=5261',
          },
          expected: [
            'AztecoRedeemRoot',
            {
              screen: 'AztecoRedeem',
              params: { c1: '3062', c2: '2586', c3: '5053', c4: '5261', uri: 'https://azte.co/?c1=3062&c2=2586&c3=5053&c4=5261' },
            },
          ],
        },
        {
          argument: {
            url: 'https://azte.co/redeem?code=1111222233334444',
          },
          expected: [
            'AztecoRedeemRoot',
            {
              screen: 'AztecoRedeem',
              params: { c1: '1111', c2: '2222', c3: '3333', c4: '4444', uri: 'https://azte.co/redeem?code=1111222233334444' },
            },
          ],
        },
        {
          argument: {
            url: 'bluewallet:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As',
          },
          expected: [
            'ElectrumSettings',
            {
              server: 'electrum1.bluewallet.io:443:s',
            },
          ],
        },
        {
          argument: {
            url: 'bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com',
          },
          expected: [
            'LightningSettings',
            {
              url: 'https://lndhub.herokuapp.com',
            },
          ],
        },
        {
          argument: {
            url: 'https://lnbits.com/?lightning=LNURL1DP68GURN8GHJ7MRWVF5HGUEWVDHK6TMHD96XSERJV9MJ7CTSDYHHVVF0D3H82UNV9UM9JDENFPN5SMMK2359J5RKWVMKZ5ZVWAV4VJD63TM',
          },
          expected: [
            'LNDCreateInvoiceRoot',
            {
              screen: 'LNDCreateInvoice',
              params: {
                uri: 'https://lnbits.com/?lightning=LNURL1DP68GURN8GHJ7MRWVF5HGUEWVDHK6TMHD96XSERJV9MJ7CTSDYHHVVF0D3H82UNV9UM9JDENFPN5SMMK2359J5RKWVMKZ5ZVWAV4VJD63TM',
              },
            },
          ],
        },
        {
          argument: {
            url: 'lnaddress@zbd.gg',
          },
          expected: [
            'ScanLndInvoiceRoot',
            {
              screen: 'ScanLndInvoice',
              params: {
                uri: 'lnaddress@zbd.gg',
              },
            },
          ],
        },
        {
          argument: {
            url: fs.readFileSync('./tests/unit/fixtures/skeleton-cobo.txt', 'ascii'),
          },
          expected: [
            'AddWalletRoot',
            {
              screen: 'ImportWallet',
              params: {
                triggerImport: true,
                label: fs.readFileSync('./tests/unit/fixtures/skeleton-cobo.txt', 'ascii'),
              },
            },
          ],
        },
        {
          argument: {
            url: fs.readFileSync('./tests/unit/fixtures/skeleton-coldcard.txt', 'ascii'),
          },
          expected: [
            'AddWalletRoot',
            {
              screen: 'ImportWallet',
              params: {
                triggerImport: true,
                label: fs.readFileSync('./tests/unit/fixtures/skeleton-coldcard.txt', 'ascii'),
              },
            },
          ],
        },
        {
          argument: {
            url: fs.readFileSync('./tests/unit/fixtures/skeleton-electrum.txt', 'ascii'),
          },
          expected: [
            'AddWalletRoot',
            {
              screen: 'ImportWallet',
              params: {
                triggerImport: true,
                label: fs.readFileSync('./tests/unit/fixtures/skeleton-electrum.txt', 'ascii'),
              },
            },
          ],
        },
        {
          argument: {
            url: fs.readFileSync('./tests/unit/fixtures/skeleton-walletdescriptor.txt', 'ascii'),
          },
          expected: [
            'AddWalletRoot',
            {
              screen: 'ImportWallet',
              params: {
                triggerImport: true,
                label: fs.readFileSync('./tests/unit/fixtures/skeleton-walletdescriptor.txt', 'ascii'),
              },
            },
          ],
        },
        {
          argument: {
            url: 'zpub6rFDtF1nuXZ9PUL4XzKURh3vJBW6Kj6TUrYL4qPtFNtDXtcTVfiqjQDyrZNwjwzt5HS14qdqo3Co2282Lv3Re6Y5wFZxAVuMEpeygnnDwfx',
          },
          expected: [
            'AddWalletRoot',
            {
              screen: 'ImportWallet',
              params: {
                triggerImport: true,
                label: 'zpub6rFDtF1nuXZ9PUL4XzKURh3vJBW6Kj6TUrYL4qPtFNtDXtcTVfiqjQDyrZNwjwzt5HS14qdqo3Co2282Lv3Re6Y5wFZxAVuMEpeygnnDwfx',
              },
            },
          ],
        },
      ];

      for (const event of events) {
        const navValue = await DeeplinkSchemaMatch.navigationRouteFor(event.argument);
        assert.deepStrictEqual(navValue, event.expected);
      }

      // BIP21 with BOLT11 support
      const rez = await DeeplinkSchemaMatch.navigationRouteFor({
        url: `bitcoin:${suffix}1DamianM2k8WfNEeJmyqSe2YW1upB7UATx?amount=0.000001&lightning=lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4`,
      });
      assert.strictEqual(rez?.[0], 'SelectWallet');
      assert.ok(rez?.[1].onWalletSelect);
      assert.ok(typeof rez?.[1].onWalletSelect === 'function');
    });
  });

  describe('bip21decode', () => {
    it('should correctly decode BIP21 URIs', () => {
      let decoded = DeeplinkSchemaMatch.bip21decode(`bitcoin:${suffix}1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar`);
      assert.deepStrictEqual(decoded, {
        address: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
        options: {
          amount: 20.3,
          label: 'Foobar',
        },
      });

      decoded = DeeplinkSchemaMatch.bip21decode(
        `bitcoin:${suffix}bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7?amount=0.0001&pj=https://btc.donate.kukks.org/BTC/pj`,
      );
      assert.strictEqual(decoded.options.pj, 'https://btc.donate.kukks.org/BTC/pj');

      decoded = DeeplinkSchemaMatch.bip21decode(`BITCOIN:${suffix}1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar`);
      assert.deepStrictEqual(decoded, {
        address: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
        options: {
          amount: 20.3,
          label: 'Foobar',
        },
      });
    });
  });

  describe('bip21encode', () => {
    it('should correctly encode BIP21 URIs without options', () => {
      const encoded = DeeplinkSchemaMatch.bip21encode('1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH');
      assert.strictEqual(encoded, 'bitcoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH');
    });

    it('should correctly encode BIP21 URIs with options', () => {
      const encoded = DeeplinkSchemaMatch.bip21encode('1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH', {
        amount: 20.3,
        label: 'Foobar',
      });
      assert.strictEqual(encoded, 'bitcoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar');
    });

    it('should discard empty arguments when encoding BIP21 URIs', () => {
      const encoded = DeeplinkSchemaMatch.bip21encode('1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH', {
        label: ' ',
        amoount: undefined, // Intentional typo to test non-existing key
      });
      assert.strictEqual(encoded, 'bitcoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH');
    });
  });

  describe('decodeBitcoinUri', () => {
    it('should correctly decode Bitcoin URIs', () => {
      assert.deepStrictEqual(
        DeeplinkSchemaMatch.decodeBitcoinUri(
          `bitcoin:${suffix}bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7?amount=0.0001&pj=https://btc.donate.kukks.org/BTC/pj`,
        ),
        {
          address: 'bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7',
          amount: 0.0001,
          memo: '',
          payjoinUrl: 'https://btc.donate.kukks.org/BTC/pj',
        },
      );

      assert.deepStrictEqual(
        DeeplinkSchemaMatch.decodeBitcoinUri(`BITCOIN:${suffix}1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar`),
        {
          address: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
          amount: 20.3,
          memo: 'Foobar',
          payjoinUrl: '',
        },
      );
    });
  });

  describe('isTXNFile and related file checks', () => {
    it('should correctly identify transaction files', () => {
      // .txn files
      assert.ok(DeeplinkSchemaMatch.isTXNFile('file://com.android.externalstorage.documents/document/081D-1403%3Atxhex.txn'));
      assert.ok(DeeplinkSchemaMatch.isTXNFile('content://com.android.externalstorage.documents/document/081D-1403%3Atxhex.txn'));
      assert.ok(
        !DeeplinkSchemaMatch.isPossiblySignedPSBTFile('file://com.android.externalstorage.documents/document/081D-1403%3Atxhex.txn'),
      );
      assert.ok(
        !DeeplinkSchemaMatch.isPossiblySignedPSBTFile('content://com.android.externalstorage.documents/document/081D-1403%3Atxhex.txn'),
      );

      // Signed .psbt files
      assert.ok(
        DeeplinkSchemaMatch.isPossiblySignedPSBTFile(
          'content://com.android.externalstorage.documents/document/081D-1403%3Atxhex-signed.psbt',
        ),
      );
      assert.ok(
        DeeplinkSchemaMatch.isPossiblySignedPSBTFile('file://com.android.externalstorage.documents/document/081D-1403%3Atxhex-signed.psbt'),
      );
      assert.ok(!DeeplinkSchemaMatch.isTXNFile('content://com.android.externalstorage.documents/document/081D-1403%3Atxhex-signed.psbt'));
      assert.ok(!DeeplinkSchemaMatch.isTXNFile('file://com.android.externalstorage.documents/document/081D-1403%3Atxhex-signed.psbt'));

      // Unsigned .psbt files
      assert.ok(DeeplinkSchemaMatch.isPossiblyPSBTFile('content://com.android.externalstorage.documents/document/081D-1403%3Atxhex.psbt'));
      assert.ok(DeeplinkSchemaMatch.isPossiblyPSBTFile('file://com.android.externalstorage.documents/document/081D-1403%3Atxhex.psbt'));
    });
  });

  describe('deeplink actions', () => {
    it('should correctly extract server and URL from deeplink actions', () => {
      // Testing getServerFromSetElectrumServerAction
      assert.strictEqual(DeeplinkSchemaMatch.getServerFromSetElectrumServerAction('sgasdgasdgasd'), false);
      assert.strictEqual(
        DeeplinkSchemaMatch.getServerFromSetElectrumServerAction('bluewallet:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As'),
        'electrum1.bluewallet.io:443:s',
      );
      assert.strictEqual(
        DeeplinkSchemaMatch.getServerFromSetElectrumServerAction('setelectrumserver?server=electrum1.bluewallet.io%3A443%3As'),
        'electrum1.bluewallet.io:443:s',
      );
      assert.strictEqual(
        DeeplinkSchemaMatch.getServerFromSetElectrumServerAction('ololo:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As'),
        false,
      );
      assert.strictEqual(
        DeeplinkSchemaMatch.getServerFromSetElectrumServerAction('setTrololo?server=electrum1.bluewallet.io%3A443%3As'),
        false,
      );

      // Testing getUrlFromSetLndhubUrlAction
      assert.strictEqual(
        DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction('bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com'),
        'https://lndhub.herokuapp.com',
      );
      assert.strictEqual(
        DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction('bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com%3A443'),
        'https://lndhub.herokuapp.com:443',
      );
      assert.strictEqual(
        DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction('setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com%3A443'),
        'https://lndhub.herokuapp.com:443',
      );
      assert.strictEqual(DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction('gsom?url=https%3A%2F%2Flndhub.herokuapp.com%3A443'), false);
      assert.strictEqual(DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction('sdfhserhsthsd'), false);
    });
  });

  describe('hasNeededJsonKeysForMultiSigSharing', () => {
    it('should correctly validate JSON for multi-sig sharing', () => {
      // Valid JSON with required keys
      const isAllowed1 = '{"xfp":"ffffffff", "path":"m/84\'/0\'/0\'", "xpub":"Zpubsnkjansdjnjnekjwcnwkjnc"}';
      const isAllowed2 = '{"path":"m/84\'/0\'/0\'", "xpub":"Zpubsnkjansdjnjnekjwcnwkjnc", "xfp":"ffffffff"}';
      assert.strictEqual(DeeplinkSchemaMatch.hasNeededJsonKeysForMultiSigSharing(isAllowed1), true);
      assert.strictEqual(DeeplinkSchemaMatch.hasNeededJsonKeysForMultiSigSharing(isAllowed2), true);

      // Invalid JSON (missing keys)
      const isNotAllowed1 = '{"path":"m/84\'/0\'/0\'", "xpub":"Zpubsnkjansdjnjnekjwcnwkjnc"}';
      const isNotAllowed2 = '{"path":1233, "xpub":"Zpubsnkjansdjnjnekjwcnwkjnc", "xfp":"ffffffff"}';
      assert.strictEqual(DeeplinkSchemaMatch.hasNeededJsonKeysForMultiSigSharing(isNotAllowed1), false);
      assert.strictEqual(DeeplinkSchemaMatch.hasNeededJsonKeysForMultiSigSharing(isNotAllowed2), false);
    });
  });

  describe('isBothBitcoinAndLightning', () => {
    it('should correctly identify combined Bitcoin and Lightning URIs', () => {
      const rez = DeeplinkSchemaMatch.isBothBitcoinAndLightning(
        `bitcoin:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=0.000001&lightning=lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4`,
      );
      assert.deepStrictEqual(rez, {
        bitcoin: 'bitcoin:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=0.000001&',
        lndInvoice:
          'lightning:lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4',
      });

      const rez2 = DeeplinkSchemaMatch.isBothBitcoinAndLightning(
        `bitcoin:${suffix}bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?lightning=lnbc1p3wkfy3dqqpp5030v53xsdhsgjkzelyle7ektmem38974498vnqdt2jaz24trw39qsp502jqj4k6nr7axqymhkf3ax70jxfx6jza4jygvc66njzhfs4tsa2q9qrsgqcqpcxqy8ayqrzjqv06k0m23t593pngl0jt7n9wznp64fqngvctz7vts8nq4tukvtljqz2zhyqqxqgqqsqqqqqqqqqqqqqq9grzjqtsjy9p55gdceevp36fvdmrkxqvzfhy8ak2tgc5zgtjtra9xlaz97zkcyvqqprsqqvqqqqqqqqqqqqqq9gy3x4n6rv6rcn53ldev96aurls3c66kpx74wa4uwcwu92jgktpqe8ncqpzj8jg6sunygzm320cdutnvgsrc6xv286evhrxefsxxuz0ssqwtm6dq&amount=0`,
      );
      assert.deepStrictEqual(rez2, {
        bitcoin: 'bitcoin:bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?',
        lndInvoice:
          'lightning:LNBC1P3WKFY3DQQPP5030V53XSDHSGJKZELYLE7EKTMEM38974498VNQDT2JAZ24TRW39QSP502JQJ4K6NR7AXQYMHKF3AX70JXFX6JZA4JYGVC66NJZHFS4TSA2Q9QRSGQCQPCXQY8AYQRZJQV06K0M23T593PNGL0JT7N9WZNP64FQNGVCTZ7VTS8NQ4TUKVTLJQZ2ZHYQQXQGQQSQQQQQQQQQQQQQQ9GRZJQTSJY9P55GDCEEVP36FVDMRKXQVZFHY8AK2TGC5ZGTJTRA9XLAZ97ZKCYVQQPRSQQVQQQQQQQQQQQQQQ9GY3X4N6RV6RCN53LDEV96AURLS3C66KPX74WA4UWCWU92JGKTPQE8NCQPZJ8JG6SUNYGZM320CDUTNVGSRC6XV286EVHRXEFSXXUZ0SSQWTM6DQ',
      });

      const rez3 = DeeplinkSchemaMatch.isBothBitcoinAndLightning(
        `bitcoin:${suffix}bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?lightning=lnbc1p3wkfy3dqqpp5030v53xsdhsgjkzelyle7ektmem38974498vnqdt2jaz24trw39qsp502jqj4k6nr7axqymhkf3ax70jxfx6jza4jygvc66njzhfs4tsa2q9qrsgqcqpcxqy8ayqrzjqv06k0m23t593pngl0jt7n9wznp64fqngvctz7vts8nq4tukvtljqz2zhyqqxqgqqsqqqqqqqqqqqqqq9grzjqtsjy9p55gdceevp36fvdmrkxqvzfhy8ak2tgc5zgtjtra9xlaz97zkcyvqqprsqqvqqqqqqqqqqqqqq9gy3x4n6rv6rcn53ldev96aurls3c66kpx74wa4uwcwu92jgktpqe8ncqpzj8jg6sunygzm320cdutnvgsrc6xv286evhrxefsxxuz0ssqwtm6dq`,
      );
      assert.deepStrictEqual(rez3, {
        bitcoin: 'bitcoin:bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?',
        lndInvoice:
          'lightning:lnbc1p3wkfy3dqqpp5030v53xsdhsgjkzelyle7ektmem38974498vnqdt2jaz24trw39qsp502jqj4k6nr7axqymhkf3ax70jxfx6jza4jygvc66njzhfs4tsa2q9qrsgqcqpcxqy8ayqrzjqv06k0m23t593pngl0jt7n9wznp64fqngvctz7vts8nq4tukvtljqz2zhyqqxqgqqsqqqqqqqqqqqqqq9grzjqtsjy9p55gdceevp36fvdmrkxqvzfhy8ak2tgc5zgtjtra9xlaz97zkcyvqqprsqqvqqqqqqqqqqqqqq9gy3x4n6rv6rcn53ldev96aurls3c66kpx74wa4uwcwu92jgktpqe8ncqpzj8jg6sunygzm320cdutnvgsrc6xv286evhrxefsxxuz0ssqwtm6dq',
      });

      // No amount
      const rez4 = DeeplinkSchemaMatch.isBothBitcoinAndLightning(
        `bitcoin:${suffix}bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?lightning=lnbc1p3wkfy3dqqpp5030v53xsdhsgjkzelyle7ektmem38974498vnqdt2jaz24trw39qsp502jqj4k6nr7axqymhkf3ax70jxfx6jza4jygvc66njzhfs4tsa2q9qrsgqcqpcxqy8ayqrzjqv06k0m23t593pngl0jt7n9wznp64fqngvctz7vts8nq4tukvtljqz2zhyqqxqgqqsqqqqqqqqqqqqqq9grzjqtsjy9p55gdceevp36fvdmrkxqvzfhy8ak2tgc5zgtjtra9xlaz97zkcyvqqprsqqvqqqqqqqqqqqqqq9gy3x4n6rv6rcn53ldev96aurls3c66kpx74wa4uwcwu92jgktpqe8ncqpzj8jg6sunygzm320cdutnvgsrc6xv286evhrxefsxxuz0ssqwtm6dq`,
      );
      assert.deepStrictEqual(rez4, {
        bitcoin: 'bitcoin:bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?',
        lndInvoice:
          'lightning:lnbc1p3wkfy3dqqpp5030v53xsdhsgjkzelyle7ektmem38974498vnqdt2jaz24trw39qsp502jqj4k6nr7axqymhkf3ax70jxfx6jza4jygvc66njzhfs4tsa2q9qrsgqcqpcxqy8ayqrzjqv06k0m23t593pngl0jt7n9wznp64fqngvctz7vts8nq4tukvtljqz2zhyqqxqgqqsqqqqqqqqqqqqqq9grzjqtsjy9p55gdceevp36fvdmrkxqvzfhy8ak2tgc5zgtjtra9xlaz97zkcyvqqprsqqvqqqqqqqqqqqqqq9gy3x4n6rv6rcn53ldev96aurls3c66kpx74wa4uwcwu92jgktpqe8ncqpzj8jg6sunygzm320cdutnvgsrc6xv286evhrxefsxxuz0ssqwtm6dq',
      });
    });
  });
});
