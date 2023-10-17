import assert from 'assert';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';

jest.mock('../../blue_modules/BlueElectrum', () => {
  return {
    connectMain: jest.fn(),
  };
});

describe.each(['', '//'])('unit - DeepLinkSchemaMatch', function (suffix) {
  it('hasSchema', () => {
    assert.ok(DeeplinkSchemaMatch.hasSchema(`bitcoin:${suffix}12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG`));
    assert.ok(DeeplinkSchemaMatch.hasSchema(`bitcoin:${suffix}bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo`));
    assert.ok(DeeplinkSchemaMatch.hasSchema(`bitcoin:${suffix}BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7?amount=666&label=Yo`));
    assert.ok(DeeplinkSchemaMatch.hasSchema(`BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE`));
    assert.ok(DeeplinkSchemaMatch.hasSchema(`BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo`));
    assert.ok(
      DeeplinkSchemaMatch.hasSchema(
        `lightning:${suffix}lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde`,
      ),
    );

    assert.ok(DeeplinkSchemaMatch.hasSchema(`bluewallet:bitcoin:${suffix}12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG`));
    assert.ok(DeeplinkSchemaMatch.hasSchema(`bluewallet:bitcoin:${suffix}bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo`));
    assert.ok(DeeplinkSchemaMatch.hasSchema(`bluewallet:bitcoin:${suffix}BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7?amount=666&label=Yo`));
    assert.ok(DeeplinkSchemaMatch.hasSchema(`bluewallet:BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE`));
    assert.ok(DeeplinkSchemaMatch.hasSchema(`bluewallet:BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo`));
    assert.ok(
      DeeplinkSchemaMatch.hasSchema(
        `bluewallet:lightning:${suffix}lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde`,
      ),
    );
  });

  it('isBitcoin Address', () => {
    assert.ok(DeeplinkSchemaMatch.isBitcoinAddress('12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG'));
    assert.ok(DeeplinkSchemaMatch.isBitcoinAddress('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK'));
    assert.ok(DeeplinkSchemaMatch.isBitcoinAddress('bc1qykcp2x3djgdtdwelxn9z4j2y956npte0a4sref'));
    assert.ok(DeeplinkSchemaMatch.isBitcoinAddress('BC1QYKCP2X3DJGDTDWELXN9Z4J2Y956NPTE0A4SREF'));
    assert.ok(DeeplinkSchemaMatch.isBitcoinAddress(`bitcoin:${suffix}BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7`));
    assert.ok(DeeplinkSchemaMatch.isBitcoinAddress(`BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE`));
    assert.ok(DeeplinkSchemaMatch.isBitcoinAddress(`BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo`));
  });

  it('isLighting Invoice', () => {
    assert.ok(
      DeeplinkSchemaMatch.isLightningInvoice(
        `lightning:${suffix}lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde`,
      ),
    );
  });

  it('isBoth Bitcoin & Invoice', () => {
    assert.ok(
      DeeplinkSchemaMatch.isBothBitcoinAndLightning(
        `bitcoin:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=0.000001&lightning=lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4`,
      ),
    );
    assert.ok(
      DeeplinkSchemaMatch.isBothBitcoinAndLightning(
        `BITCOIN:${suffix}12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG?amount=0.000001&lightning=lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4`,
      ),
    );

    const rez = DeeplinkSchemaMatch.isBothBitcoinAndLightning(
      `bitcoin:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=0.000001&lightning=lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4`,
    );
    assert.strictEqual(rez.bitcoin, 'bitcoin:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=0.000001&');
    assert.strictEqual(
      rez.lndInvoice,
      'lightning:lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4',
    );

    const rez2 = DeeplinkSchemaMatch.isBothBitcoinAndLightning(
      `bitcoin:${suffix}bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?lightning=LNBC1P3WKFY3DQQPP5030V53XSDHSGJKZELYLE7EKTMEM38974498VNQDT2JAZ24TRW39QSP502JQJ4K6NR7AXQYMHKF3AX70JXFX6JZA4JYGVC66NJZHFS4TSA2Q9QRSGQCQPCXQY8AYQRZJQV06K0M23T593PNGL0JT7N9WZNP64FQNGVCTZ7VTS8NQ4TUKVTLJQZ2ZHYQQXQGQQSQQQQQQQQQQQQQQ9GRZJQTSJY9P55GDCEEVP36FVDMRKXQVZFHY8AK2TGC5ZGTJTRA9XLAZ97ZKCYVQQPRSQQVQQQQQQQQQQQQQQ9GY3X4N6RV6RCN53LDEV96AURLS3C66KPX74WA4UWCWU92JGKTPQE8NCQPZJ8JG6SUNYGZM320CDUTNVGSRC6XV286EVHRXEFSXXUZ0SSQWTM6DQ&amount=0`,
    );
    assert.strictEqual(rez2.bitcoin, 'bitcoin:bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?');
    assert.strictEqual(
      rez2.lndInvoice,
      'lightning:LNBC1P3WKFY3DQQPP5030V53XSDHSGJKZELYLE7EKTMEM38974498VNQDT2JAZ24TRW39QSP502JQJ4K6NR7AXQYMHKF3AX70JXFX6JZA4JYGVC66NJZHFS4TSA2Q9QRSGQCQPCXQY8AYQRZJQV06K0M23T593PNGL0JT7N9WZNP64FQNGVCTZ7VTS8NQ4TUKVTLJQZ2ZHYQQXQGQQSQQQQQQQQQQQQQQ9GRZJQTSJY9P55GDCEEVP36FVDMRKXQVZFHY8AK2TGC5ZGTJTRA9XLAZ97ZKCYVQQPRSQQVQQQQQQQQQQQQQQ9GY3X4N6RV6RCN53LDEV96AURLS3C66KPX74WA4UWCWU92JGKTPQE8NCQPZJ8JG6SUNYGZM320CDUTNVGSRC6XV286EVHRXEFSXXUZ0SSQWTM6DQ',
    );

    const rez3 = DeeplinkSchemaMatch.isBothBitcoinAndLightning(
      `bitcoin:bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?lightning=lnbc1p3wkfy3dqqpp5030v53xsdhsgjkzelyle7ektmem38974498vnqdt2jaz24trw39qsp502jqj4k6nr7axqymhkf3ax70jxfx6jza4jygvc66njzhfs4tsa2q9qrsgqcqpcxqy8ayqrzjqv06k0m23t593pngl0jt7n9wznp64fqngvctz7vts8nq4tukvtljqz2zhyqqxqgqqsqqqqqqqqqqqqqq9grzjqtsjy9p55gdceevp36fvdmrkxqvzfhy8ak2tgc5zgtjtra9xlaz97zkcyvqqprsqqvqqqqqqqqqqqqqq9gy3x4n6rv6rcn53ldev96aurls3c66kpx74wa4uwcwu92jgktpqe8ncqpzj8jg6sunygzm320cdutnvgsrc6xv286evhrxefsxxuz0ssqwtm6dq&amount=0`,
    );
    assert.strictEqual(rez3.bitcoin, 'bitcoin:bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?');
    assert.strictEqual(
      rez3.lndInvoice,
      'lightning:lnbc1p3wkfy3dqqpp5030v53xsdhsgjkzelyle7ektmem38974498vnqdt2jaz24trw39qsp502jqj4k6nr7axqymhkf3ax70jxfx6jza4jygvc66njzhfs4tsa2q9qrsgqcqpcxqy8ayqrzjqv06k0m23t593pngl0jt7n9wznp64fqngvctz7vts8nq4tukvtljqz2zhyqqxqgqqsqqqqqqqqqqqqqq9grzjqtsjy9p55gdceevp36fvdmrkxqvzfhy8ak2tgc5zgtjtra9xlaz97zkcyvqqprsqqvqqqqqqqqqqqqqq9gy3x4n6rv6rcn53ldev96aurls3c66kpx74wa4uwcwu92jgktpqe8ncqpzj8jg6sunygzm320cdutnvgsrc6xv286evhrxefsxxuz0ssqwtm6dq',
    );

    // no amount
    const rez4 = DeeplinkSchemaMatch.isBothBitcoinAndLightning(
      `bitcoin:bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?lightning=lnbc1p3wkfy3dqqpp5030v53xsdhsgjkzelyle7ektmem38974498vnqdt2jaz24trw39qsp502jqj4k6nr7axqymhkf3ax70jxfx6jza4jygvc66njzhfs4tsa2q9qrsgqcqpcxqy8ayqrzjqv06k0m23t593pngl0jt7n9wznp64fqngvctz7vts8nq4tukvtljqz2zhyqqxqgqqsqqqqqqqqqqqqqq9grzjqtsjy9p55gdceevp36fvdmrkxqvzfhy8ak2tgc5zgtjtra9xlaz97zkcyvqqprsqqvqqqqqqqqqqqqqq9gy3x4n6rv6rcn53ldev96aurls3c66kpx74wa4uwcwu92jgktpqe8ncqpzj8jg6sunygzm320cdutnvgsrc6xv286evhrxefsxxuz0ssqwtm6dq`,
    );
    assert.strictEqual(rez4.bitcoin, 'bitcoin:bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?');
    assert.strictEqual(
      rez4.lndInvoice,
      'lightning:lnbc1p3wkfy3dqqpp5030v53xsdhsgjkzelyle7ektmem38974498vnqdt2jaz24trw39qsp502jqj4k6nr7axqymhkf3ax70jxfx6jza4jygvc66njzhfs4tsa2q9qrsgqcqpcxqy8ayqrzjqv06k0m23t593pngl0jt7n9wznp64fqngvctz7vts8nq4tukvtljqz2zhyqqxqgqqsqqqqqqqqqqqqqq9grzjqtsjy9p55gdceevp36fvdmrkxqvzfhy8ak2tgc5zgtjtra9xlaz97zkcyvqqprsqqvqqqqqqqqqqqqqq9gy3x4n6rv6rcn53ldev96aurls3c66kpx74wa4uwcwu92jgktpqe8ncqpzj8jg6sunygzm320cdutnvgsrc6xv286evhrxefsxxuz0ssqwtm6dq',
    );
  });

  it('isLnurl', () => {
    assert.ok(
      DeeplinkSchemaMatch.isLnUrl(
        'LNURL1DP68GURN8GHJ7UM9WFMXJCM99E3K7MF0V9CXJ0M385EKVCENXC6R2C35XVUKXEFCV5MKVV34X5EKZD3EV56NYD3HXQURZEPEXEJXXEPNXSCRVWFNV9NXZCN9XQ6XYEFHVGCXXCMYXYMNSERXFQ5FNS',
      ),
    );
  });

  it('navigationForRoute', async () => {
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
      assert.deepStrictEqual(navValue, event.expected);
    }

    // BIP21 w/BOLT11 support
    const rez = await asyncNavigationRouteFor({
      url: `bitcoin:${suffix}1DamianM2k8WfNEeJmyqSe2YW1upB7UATx?amount=0.000001&lightning=lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4`,
    });
    assert.strictEqual(rez[0], 'SelectWallet');
    assert.ok(rez[1].onWalletSelect);
    assert.ok(typeof rez[1].onWalletSelect === 'function');
  });

  it('decodes bip21', () => {
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

  it('encodes bip21', () => {
    let encoded = DeeplinkSchemaMatch.bip21encode('1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH');
    assert.strictEqual(encoded, 'bitcoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH');
    encoded = DeeplinkSchemaMatch.bip21encode('1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH', {
      amount: 20.3,
      label: 'Foobar',
    });
    assert.strictEqual(encoded, 'bitcoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar');
  });

  it('encodes bip21 and discards empty arguments', () => {
    const encoded = DeeplinkSchemaMatch.bip21encode('1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH', {
      label: ' ',
      amoount: undefined,
    });
    assert.strictEqual(encoded, 'bitcoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH');
  });

  it('can decodeBitcoinUri', () => {
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

  it('recognizes files', () => {
    // txn files:
    assert.ok(DeeplinkSchemaMatch.isTXNFile('file://com.android.externalstorage.documents/document/081D-1403%3Atxhex.txn'));
    assert.ok(!DeeplinkSchemaMatch.isPossiblySignedPSBTFile('file://com.android.externalstorage.documents/document/081D-1403%3Atxhex.txn'));

    assert.ok(DeeplinkSchemaMatch.isTXNFile('content://com.android.externalstorage.documents/document/081D-1403%3Atxhex.txn'));
    assert.ok(
      !DeeplinkSchemaMatch.isPossiblySignedPSBTFile('content://com.android.externalstorage.documents/document/081D-1403%3Atxhex.txn'),
    );

    // psbt files (signed):
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

    // psbt files (unsigned):
    assert.ok(DeeplinkSchemaMatch.isPossiblyPSBTFile('content://com.android.externalstorage.documents/document/081D-1403%3Atxhex.psbt'));
    assert.ok(DeeplinkSchemaMatch.isPossiblyPSBTFile('file://com.android.externalstorage.documents/document/081D-1403%3Atxhex.psbt'));
  });

  it('can work with some deeplink actions', () => {
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

  it('should accept only the one valid format', function () {
    // has all the necessary json keys
    const isAllowed1 = '{"xfp":"ffffffff", "path":"m/84\'/0\'/0\'", "xpub":"Zpubsnkjansdjnjnekjwcnwkjnc"}';
    // has all the necessary json keys, different order
    const isAllowed2 = '{"path":"m/84\'/0\'/0\'", "xpub":"Zpubsnkjansdjnjnekjwcnwkjnc", "xfp":"ffffffff"}';

    //

    assert.strictEqual(DeeplinkSchemaMatch.hasNeededJsonKeysForMultiSigSharing(isAllowed1), true);
    assert.strictEqual(DeeplinkSchemaMatch.hasNeededJsonKeysForMultiSigSharing(isAllowed2), true);

    const isNotAllowed1 = '{"path":"m/84\'/0\'/0\'", "xpub":"Zpubsnkjansdjnjnekjwcnwkjnc"}';
    const isNotAllowed2 = '{"path":1233, "xpub":"Zpubsnkjansdjnjnekjwcnwkjnc", "xfp":"ffffffff"}';

    assert.strictEqual(DeeplinkSchemaMatch.hasNeededJsonKeysForMultiSigSharing(isNotAllowed1), false);
    assert.strictEqual(DeeplinkSchemaMatch.hasNeededJsonKeysForMultiSigSharing(isNotAllowed2), false);
  });
});
