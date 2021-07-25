import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
jest.useFakeTimers();

describe('unit - DeepLinkSchemaMatch', function () {
  it('hasSchema', () => {
    expect(DeeplinkSchemaMatch.hasSchema('bitcoin:12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG')).toBeTruthy();
    expect(DeeplinkSchemaMatch.hasSchema('bitcoin:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo')).toBeTruthy();
    expect(DeeplinkSchemaMatch.hasSchema('bitcoin:BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7?amount=666&label=Yo')).toBeTruthy();
    expect(DeeplinkSchemaMatch.hasSchema('BITCOIN:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE')).toBeTruthy();
    expect(DeeplinkSchemaMatch.hasSchema('BITCOIN:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo')).toBeTruthy();
    expect(
      DeeplinkSchemaMatch.hasSchema(
        'lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde',
      ),
    ).toBeTruthy();

    expect(DeeplinkSchemaMatch.hasSchema('bluewallet:bitcoin:12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG')).toBeTruthy();
    expect(DeeplinkSchemaMatch.hasSchema('bluewallet:bitcoin:bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo')).toBeTruthy();
    expect(DeeplinkSchemaMatch.hasSchema('bluewallet:bitcoin:BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7?amount=666&label=Yo')).toBeTruthy();
    expect(DeeplinkSchemaMatch.hasSchema('bluewallet:BITCOIN:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE')).toBeTruthy();
    expect(DeeplinkSchemaMatch.hasSchema('bluewallet:BITCOIN:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo')).toBeTruthy();
    expect(
      DeeplinkSchemaMatch.hasSchema(
        'bluewallet:lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde',
      ),
    ).toBeTruthy();
  });

  it('isBitcoin Address', () => {
    expect(DeeplinkSchemaMatch.isBitcoinAddress('12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG')).toBeTruthy();
    expect(DeeplinkSchemaMatch.isBitcoinAddress('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK')).toBeTruthy();
    expect(DeeplinkSchemaMatch.isBitcoinAddress('bc1qykcp2x3djgdtdwelxn9z4j2y956npte0a4sref')).toBeTruthy();
    expect(DeeplinkSchemaMatch.isBitcoinAddress('BC1QYKCP2X3DJGDTDWELXN9Z4J2Y956NPTE0A4SREF')).toBeTruthy();
    expect(DeeplinkSchemaMatch.isBitcoinAddress('bitcoin:BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7')).toBeTruthy();
    expect(DeeplinkSchemaMatch.isBitcoinAddress('BITCOIN:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE')).toBeTruthy();
    expect(DeeplinkSchemaMatch.isBitcoinAddress('BITCOIN:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo')).toBeTruthy();
  });

  it('isLighting Invoice', () => {
    expect(
      DeeplinkSchemaMatch.isLightningInvoice(
        'lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde',
      ),
    ).toBeTruthy();
  });

  it('isBoth Bitcoin & Invoice', () => {
    expect(
      DeeplinkSchemaMatch.isBothBitcoinAndLightning(
        'bitcoin:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=0.000001&lightning=lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4',
      ),
    ).toBeTruthy();
    expect(
      DeeplinkSchemaMatch.isBothBitcoinAndLightning(
        'BITCOIN:12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG?amount=0.000001&lightning=lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4',
      ),
    ).toBeTruthy();
  });

  it('isLnurl', () => {
    expect(
      DeeplinkSchemaMatch.isLnUrl(
        'LNURL1DP68GURN8GHJ7UM9WFMXJCM99E3K7MF0V9CXJ0M385EKVCENXC6R2C35XVUKXEFCV5MKVV34X5EKZD3EV56NYD3HXQURZEPEXEJXXEPNXSCRVWFNV9NXZCN9XQ6XYEFHVGCXXCMYXYMNSERXFQ5FNS',
      ),
    ).toBeTruthy();
  });

  it('isSafelloRedirect', () => {
    expect(DeeplinkSchemaMatch.isSafelloRedirect({ url: 'bluewallet:?safello-state-token=TEST' })).toBeTruthy();
    expect(!DeeplinkSchemaMatch.isSafelloRedirect({ url: 'bluewallet:' })).toBeTruthy();
  });

  it('navigationForRoute', async () => {
    const events = [
      {
        argument: { url: '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG' },
        expected: ['SendDetailsRoot', { screen: 'SendDetails', params: { uri: '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG' } }],
      },
      {
        argument: { url: 'bitcoin:12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG' },
        expected: ['SendDetailsRoot', { screen: 'SendDetails', params: { uri: 'bitcoin:12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG' } }],
      },
      {
        argument: { url: 'BITCOIN:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo' },
        expected: [
          'SendDetailsRoot',
          { screen: 'SendDetails', params: { uri: 'BITCOIN:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo' } },
        ],
      },
      {
        argument: { url: 'bluewallet:BITCOIN:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo' },
        expected: [
          'SendDetailsRoot',
          { screen: 'SendDetails', params: { uri: 'BITCOIN:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo' } },
        ],
      },
      {
        argument: {
          url:
            'lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde',
        },
        expected: [
          'ScanLndInvoiceRoot',
          {
            screen: 'ScanLndInvoice',
            params: {
              uri:
                'lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde',
            },
          },
        ],
      },
      {
        argument: {
          url:
            'bluewallet:lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde',
        },
        expected: [
          'ScanLndInvoiceRoot',
          {
            screen: 'ScanLndInvoice',
            params: {
              uri:
                'lightning:lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde',
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
          url: 'bluewallet:?safello-state-token=TEST',
        },
        expected: [
          'BuyBitcoin',
          {
            safelloStateToken: 'TEST',
            uri: 'bluewallet:?safello-state-token=TEST',
            wallet: undefined,
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
          url:
            'https://lnbits.com/?lightning=LNURL1DP68GURN8GHJ7MRWVF5HGUEWVDHK6TMHD96XSERJV9MJ7CTSDYHHVVF0D3H82UNV9UM9JDENFPN5SMMK2359J5RKWVMKZ5ZVWAV4VJD63TM',
        },
        expected: [
          'LNDCreateInvoiceRoot',
          {
            screen: 'LNDCreateInvoice',
            params: {
              uri:
                'https://lnbits.com/?lightning=LNURL1DP68GURN8GHJ7MRWVF5HGUEWVDHK6TMHD96XSERJV9MJ7CTSDYHHVVF0D3H82UNV9UM9JDENFPN5SMMK2359J5RKWVMKZ5ZVWAV4VJD63TM',
            },
          },
        ],
      },
      {
        argument: {
          url: require('fs').readFileSync('./tests/unit/fixtures/skeleton-cobo.txt', 'ascii'),
        },
        expected: [
          'AddWalletRoot',
          {
            screen: 'ImportWallet',
            params: {
              triggerImport: true,
              label: require('fs').readFileSync('./tests/unit/fixtures/skeleton-cobo.txt', 'ascii'),
            },
          },
        ],
      },
      {
        argument: {
          url: require('fs').readFileSync('./tests/unit/fixtures/skeleton-coldcard.txt', 'ascii'),
        },
        expected: [
          'AddWalletRoot',
          {
            screen: 'ImportWallet',
            params: {
              triggerImport: true,
              label: require('fs').readFileSync('./tests/unit/fixtures/skeleton-coldcard.txt', 'ascii'),
            },
          },
        ],
      },
      {
        argument: {
          url: require('fs').readFileSync('./tests/unit/fixtures/skeleton-electrum.txt', 'ascii'),
        },
        expected: [
          'AddWalletRoot',
          {
            screen: 'ImportWallet',
            params: {
              triggerImport: true,
              label: require('fs').readFileSync('./tests/unit/fixtures/skeleton-electrum.txt', 'ascii'),
            },
          },
        ],
      },
      {
        argument: {
          url: require('fs').readFileSync('./tests/unit/fixtures/skeleton-walletdescriptor.txt', 'ascii'),
        },
        expected: [
          'AddWalletRoot',
          {
            screen: 'ImportWallet',
            params: {
              triggerImport: true,
              label: require('fs').readFileSync('./tests/unit/fixtures/skeleton-walletdescriptor.txt', 'ascii'),
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
      {
        argument: {
          url: 'aopp:?v=0&msg=vasp-chosen-msg&asset=btc&format=p2wpkh&callback=https://vasp.com/proofs/vasp-chosen-token​',
        },
        expected: [
          'AOPPRoot',
          {
            screen: 'AOPP',
            params: {
              uri: 'aopp:?v=0&msg=vasp-chosen-msg&asset=btc&format=p2wpkh&callback=https://vasp.com/proofs/vasp-chosen-token​',
            },
          },
        ],
      },
    ];

    const asyncNavigationRouteFor = async function (event) {
      return new Promise(function (resolve) {
        DeeplinkSchemaMatch.navigationRouteFor(event, navValue => {
          resolve(navValue);
        });
      });
    };

    for (const event of events) {
      const navValue = await asyncNavigationRouteFor(event.argument);
      expect(navValue).toEqual(event.expected);
    }

    // BIP21 w/BOLT11 support
    expect(
      (
        await asyncNavigationRouteFor({
          url:
            'bitcoin:1DamianM2k8WfNEeJmyqSe2YW1upB7UATx?amount=0.000001&lightning=lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4',
        })
      )[0],
    ).toBe('SelectWallet');
  });

  it('decodes bip21', () => {
    let decoded = DeeplinkSchemaMatch.bip21decode('bitcoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar');
    expect(decoded).toEqual({
      address: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
      options: {
        amount: 20.3,
        label: 'Foobar',
      },
    });

    decoded = DeeplinkSchemaMatch.bip21decode(
      'bitcoin:bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7?amount=0.0001&pj=https://btc.donate.kukks.org/BTC/pj',
    );
    expect(decoded.options.pj).toBe('https://btc.donate.kukks.org/BTC/pj');

    decoded = DeeplinkSchemaMatch.bip21decode('BITCOIN:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar');
    expect(decoded).toEqual({
      address: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
      options: {
        amount: 20.3,
        label: 'Foobar',
      },
    });
  });

  it('encodes bip21', () => {
    let encoded = DeeplinkSchemaMatch.bip21encode('1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH');
    expect(encoded).toBe('bitcoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH');
    encoded = DeeplinkSchemaMatch.bip21encode('1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH', {
      amount: 20.3,
      label: 'Foobar',
    });
    expect(encoded).toBe('bitcoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar');
  });

  it('can decodeBitcoinUri', () => {
    expect(
      DeeplinkSchemaMatch.decodeBitcoinUri(
        'bitcoin:bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7?amount=0.0001&pj=https://btc.donate.kukks.org/BTC/pj',
      ),
    ).toEqual({
      address: 'bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7',
      amount: 0.0001,
      memo: '',
      payjoinUrl: 'https://btc.donate.kukks.org/BTC/pj',
    });

    expect(DeeplinkSchemaMatch.decodeBitcoinUri('BITCOIN:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar')).toEqual({
      address: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
      amount: 20.3,
      memo: 'Foobar',
      payjoinUrl: '',
    });
  });

  it('recognizes files', () => {
    // txn files:
    expect(DeeplinkSchemaMatch.isTXNFile('file://com.android.externalstorage.documents/document/081D-1403%3Atxhex.txn')).toBeTruthy();
    expect(
      !DeeplinkSchemaMatch.isPossiblySignedPSBTFile('file://com.android.externalstorage.documents/document/081D-1403%3Atxhex.txn'),
    ).toBeTruthy();

    expect(DeeplinkSchemaMatch.isTXNFile('content://com.android.externalstorage.documents/document/081D-1403%3Atxhex.txn')).toBeTruthy();
    expect(
      !DeeplinkSchemaMatch.isPossiblySignedPSBTFile('content://com.android.externalstorage.documents/document/081D-1403%3Atxhex.txn'),
    ).toBeTruthy();

    // psbt files (signed):
    expect(
      DeeplinkSchemaMatch.isPossiblySignedPSBTFile(
        'content://com.android.externalstorage.documents/document/081D-1403%3Atxhex-signed.psbt',
      ),
    ).toBeTruthy();
    expect(
      DeeplinkSchemaMatch.isPossiblySignedPSBTFile('file://com.android.externalstorage.documents/document/081D-1403%3Atxhex-signed.psbt'),
    ).toBeTruthy();

    expect(
      !DeeplinkSchemaMatch.isTXNFile('content://com.android.externalstorage.documents/document/081D-1403%3Atxhex-signed.psbt'),
    ).toBeTruthy();
    expect(
      !DeeplinkSchemaMatch.isTXNFile('file://com.android.externalstorage.documents/document/081D-1403%3Atxhex-signed.psbt'),
    ).toBeTruthy();

    // psbt files (unsigned):
    expect(
      DeeplinkSchemaMatch.isPossiblyPSBTFile('content://com.android.externalstorage.documents/document/081D-1403%3Atxhex.psbt'),
    ).toBeTruthy();
    expect(
      DeeplinkSchemaMatch.isPossiblyPSBTFile('file://com.android.externalstorage.documents/document/081D-1403%3Atxhex.psbt'),
    ).toBeTruthy();
  });

  it('can work with some deeplink actions', () => {
    expect(DeeplinkSchemaMatch.getServerFromSetElectrumServerAction('sgasdgasdgasd')).toBe(false);
    expect(
      DeeplinkSchemaMatch.getServerFromSetElectrumServerAction('bluewallet:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As'),
    ).toBe('electrum1.bluewallet.io:443:s');
    expect(DeeplinkSchemaMatch.getServerFromSetElectrumServerAction('setelectrumserver?server=electrum1.bluewallet.io%3A443%3As')).toBe(
      'electrum1.bluewallet.io:443:s',
    );
    expect(
      DeeplinkSchemaMatch.getServerFromSetElectrumServerAction('ololo:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As'),
    ).toBe(false);
    expect(DeeplinkSchemaMatch.getServerFromSetElectrumServerAction('setTrololo?server=electrum1.bluewallet.io%3A443%3As')).toBe(false);

    expect(DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction('bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com')).toBe(
      'https://lndhub.herokuapp.com',
    );
    expect(DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction('bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com%3A443')).toBe(
      'https://lndhub.herokuapp.com:443',
    );
    expect(DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction('setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com%3A443')).toBe(
      'https://lndhub.herokuapp.com:443',
    );
    expect(DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction('gsom?url=https%3A%2F%2Flndhub.herokuapp.com%3A443')).toBe(false);
    expect(DeeplinkSchemaMatch.getUrlFromSetLndhubUrlAction('sdfhserhsthsd')).toBe(false);
  });
});
