import assert from 'assert';

import { HDSegwitBech32Wallet, LightningCustodianWallet } from '../../class';
import { bip21decode, bip21encode, decodeBitcoinUri, isBitcoinAddress, isPossiblyPSBTFile, isTXNFile } from '../../class/bitcoin-uri';
import {
  getServerFromSetElectrumServerAction,
  getUrlFromSetLndhubUrlAction,
  hasNeededJsonKeysForMultiSigSharing,
  hasSchema,
  isBothBitcoinAndLightning,
  isLightningInvoice,
  isLnUrl,
  resolveDeepLinkRoute,
  resolveDeepLinkUrl,
} from '../../navigation/linking';

jest.mock('../../blue_modules/BlueElectrum', () => {
  return {
    connectMain: jest.fn(),
  };
});

const asyncNavigationRouteFor = async function (event) {
  return resolveDeepLinkRoute(event.url);
};

describe.each(['', '//'])('unit - linking', function (suffix) {
  it('hasSchema', () => {
    assert.ok(hasSchema(`bitcoin:${suffix}12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG`));
    assert.ok(hasSchema(`bitcoin:${suffix}bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo`));
    assert.ok(hasSchema(`bitcoin:${suffix}BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7?amount=666&label=Yo`));
    assert.ok(hasSchema(`BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE`));
    assert.ok(hasSchema(`BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo`));
    assert.ok(
      hasSchema(
        `lightning:${suffix}lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde`,
      ),
    );

    assert.ok(hasSchema(`bluewallet:bitcoin:${suffix}12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG`));
    assert.ok(hasSchema(`bluewallet:bitcoin:${suffix}bc1qh6tf004ty7z7un2v5ntu4mkf630545gvhs45u7?amount=666&label=Yo`));
    assert.ok(hasSchema(`bluewallet:bitcoin:${suffix}BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7?amount=666&label=Yo`));
    assert.ok(hasSchema(`bluewallet:BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE`));
    assert.ok(hasSchema(`bluewallet:BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo`));
    assert.ok(
      hasSchema(
        `bluewallet:lightning:${suffix}lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde`,
      ),
    );
  });

  it('isBitcoin Address', () => {
    assert.ok(isBitcoinAddress('12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG'));
    assert.ok(isBitcoinAddress('3GcKN7q7gZuZ8eHygAhHrvPa5zZbG5Q1rK'));
    assert.ok(isBitcoinAddress('bc1qykcp2x3djgdtdwelxn9z4j2y956npte0a4sref'));
    assert.ok(isBitcoinAddress('BC1QYKCP2X3DJGDTDWELXN9Z4J2Y956NPTE0A4SREF'));
    assert.ok(isBitcoinAddress(`bitcoin:${suffix}BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7`));
    assert.ok(isBitcoinAddress(`BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE`));
    assert.ok(isBitcoinAddress(`BITCOIN:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo`));
  });

  it('isLighting Invoice', () => {
    assert.ok(
      isLightningInvoice(
        `lightning:${suffix}lnbc10u1pwjqwkkpp5vlc3tttdzhpk9fwzkkue0sf2pumtza7qyw9vucxyyeh0yaqq66yqdq5f38z6mmwd3ujqar9wd6qcqzpgxq97zvuqrzjqvgptfurj3528snx6e3dtwepafxw5fpzdymw9pj20jj09sunnqmwqz9hx5qqtmgqqqqqqqlgqqqqqqgqjq5duu3fs9xq9vn89qk3ezwpygecu4p3n69wm3tnl28rpgn2gmk5hjaznemw0gy32wrslpn3g24khcgnpua9q04fttm2y8pnhmhhc2gncplz0zde`,
      ),
    );
  });

  it('isBoth Bitcoin & Invoice', () => {
    assert.ok(
      isBothBitcoinAndLightning(
        `bitcoin:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=0.000001&lightning=lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4`,
      ),
    );
    assert.ok(
      isBothBitcoinAndLightning(
        `BITCOIN:${suffix}12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG?amount=0.000001&lightning=lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4`,
      ),
    );

    const rez = isBothBitcoinAndLightning(
      `bitcoin:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=0.000001&lightning=lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4`,
    );
    assert.strictEqual(rez.bitcoin, 'bitcoin:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=0.000001&');
    assert.strictEqual(
      rez.lndInvoice,
      'lightning:lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4',
    );

    const rez2 = isBothBitcoinAndLightning(
      `bitcoin:${suffix}bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?lightning=LNBC1P3WKFY3DQQPP5030V53XSDHSGJKZELYLE7EKTMEM38974498VNQDT2JAZ24TRW39QSP502JQJ4K6NR7AXQYMHKF3AX70JXFX6JZA4JYGVC66NJZHFS4TSA2Q9QRSGQCQPCXQY8AYQRZJQV06K0M23T593PNGL0JT7N9WZNP64FQNGVCTZ7VTS8NQ4TUKVTLJQZ2ZHYQQXQGQQSQQQQQQQQQQQQQQ9GRZJQTSJY9P55GDCEEVP36FVDMRKXQVZFHY8AK2TGC5ZGTJTRA9XLAZ97ZKCYVQQPRSQQVQQQQQQQQQQQQQQ9GY3X4N6RV6RCN53LDEV96AURLS3C66KPX74WA4UWCWU92JGKTPQE8NCQPZJ8JG6SUNYGZM320CDUTNVGSRC6XV286EVHRXEFSXXUZ0SSQWTM6DQ&amount=0`,
    );
    assert.strictEqual(rez2.bitcoin, 'bitcoin:bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?');
    assert.strictEqual(
      rez2.lndInvoice,
      'lightning:LNBC1P3WKFY3DQQPP5030V53XSDHSGJKZELYLE7EKTMEM38974498VNQDT2JAZ24TRW39QSP502JQJ4K6NR7AXQYMHKF3AX70JXFX6JZA4JYGVC66NJZHFS4TSA2Q9QRSGQCQPCXQY8AYQRZJQV06K0M23T593PNGL0JT7N9WZNP64FQNGVCTZ7VTS8NQ4TUKVTLJQZ2ZHYQQXQGQQSQQQQQQQQQQQQQQ9GRZJQTSJY9P55GDCEEVP36FVDMRKXQVZFHY8AK2TGC5ZGTJTRA9XLAZ97ZKCYVQQPRSQQVQQQQQQQQQQQQQQ9GY3X4N6RV6RCN53LDEV96AURLS3C66KPX74WA4UWCWU92JGKTPQE8NCQPZJ8JG6SUNYGZM320CDUTNVGSRC6XV286EVHRXEFSXXUZ0SSQWTM6DQ',
    );

    const rez3 = isBothBitcoinAndLightning(
      `bitcoin:bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?lightning=lnbc1p3wkfy3dqqpp5030v53xsdhsgjkzelyle7ektmem38974498vnqdt2jaz24trw39qsp502jqj4k6nr7axqymhkf3ax70jxfx6jza4jygvc66njzhfs4tsa2q9qrsgqcqpcxqy8ayqrzjqv06k0m23t593pngl0jt7n9wznp64fqngvctz7vts8nq4tukvtljqz2zhyqqxqgqqsqqqqqqqqqqqqqq9grzjqtsjy9p55gdceevp36fvdmrkxqvzfhy8ak2tgc5zgtjtra9xlaz97zkcyvqqprsqqvqqqqqqqqqqqqqq9gy3x4n6rv6rcn53ldev96aurls3c66kpx74wa4uwcwu92jgktpqe8ncqpzj8jg6sunygzm320cdutnvgsrc6xv286evhrxefsxxuz0ssqwtm6dq&amount=0`,
    );
    assert.strictEqual(rez3.bitcoin, 'bitcoin:bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?');
    assert.strictEqual(
      rez3.lndInvoice,
      'lightning:lnbc1p3wkfy3dqqpp5030v53xsdhsgjkzelyle7ektmem38974498vnqdt2jaz24trw39qsp502jqj4k6nr7axqymhkf3ax70jxfx6jza4jygvc66njzhfs4tsa2q9qrsgqcqpcxqy8ayqrzjqv06k0m23t593pngl0jt7n9wznp64fqngvctz7vts8nq4tukvtljqz2zhyqqxqgqqsqqqqqqqqqqqqqq9grzjqtsjy9p55gdceevp36fvdmrkxqvzfhy8ak2tgc5zgtjtra9xlaz97zkcyvqqprsqqvqqqqqqqqqqqqqq9gy3x4n6rv6rcn53ldev96aurls3c66kpx74wa4uwcwu92jgktpqe8ncqpzj8jg6sunygzm320cdutnvgsrc6xv286evhrxefsxxuz0ssqwtm6dq',
    );

    // no amount
    const rez4 = isBothBitcoinAndLightning(
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
      isLnUrl(
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
          'ScanLNDInvoiceRoot',
          {
            screen: 'ScanLNDInvoice',
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
          'ScanLNDInvoiceRoot',
          {
            screen: 'ScanLNDInvoice',
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
            params: {
              aztecoVoucher: { c1: '3062', c2: '2586', c3: '5053', c4: '5261' },
            },
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
            params: {
              aztecoVoucher: { c1: '1111', c2: '2222', c3: '3333', c4: '4444' },
            },
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
          'ScanLNDInvoiceRoot',
          {
            screen: 'ScanLNDInvoice',
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
    let decoded = bip21decode(`bitcoin:${suffix}1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar`);
    assert.deepStrictEqual(decoded, {
      address: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
      options: {
        amount: 20.3,
        label: 'Foobar',
      },
    });

    decoded = bip21decode(
      `bitcoin:${suffix}bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7?amount=0.0001&pj=https://btc.donate.kukks.org/BTC/pj`,
    );
    assert.strictEqual(decoded.options.pj, 'https://btc.donate.kukks.org/BTC/pj');

    decoded = bip21decode(`BITCOIN:${suffix}1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar`);
    assert.deepStrictEqual(decoded, {
      address: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
      options: {
        amount: 20.3,
        label: 'Foobar',
      },
    });
  });

  it('encodes bip21', () => {
    let encoded = bip21encode('1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH');
    assert.strictEqual(encoded, 'bitcoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH');
    encoded = bip21encode('1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH', {
      amount: 20.3,
      label: 'Foobar',
    });
    assert.strictEqual(encoded, 'bitcoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar');
  });

  it('encodes bip21 and discards empty arguments', () => {
    const encoded = bip21encode('1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH', {
      label: ' ',
      amount: undefined,
    });
    assert.strictEqual(encoded, 'bitcoin:1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH');
  });

  it('can decodeBitcoinUri', () => {
    assert.deepStrictEqual(
      decodeBitcoinUri(`bitcoin:${suffix}bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7?amount=0.0001&pj=https://btc.donate.kukks.org/BTC/pj`),
      {
        address: 'bc1qnapskphjnwzw2w3dk4anpxntunc77v6qrua0f7',
        amount: 0.0001,
        memo: '',
        payjoinUrl: 'https://btc.donate.kukks.org/BTC/pj',
      },
    );

    assert.deepStrictEqual(decodeBitcoinUri(`BITCOIN:${suffix}1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH?amount=20.3&label=Foobar`), {
      address: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
      amount: 20.3,
      memo: 'Foobar',
      payjoinUrl: '',
    });
  });

  it('recognizes files', () => {
    // txn files:
    assert.ok(isTXNFile('file://com.android.externalstorage.documents/document/081D-1403%3Atxhex.txn'));

    assert.ok(isTXNFile('content://com.android.externalstorage.documents/document/081D-1403%3Atxhex.txn'));

    assert.ok(!isTXNFile('content://com.android.externalstorage.documents/document/081D-1403%3Atxhex-signed.psbt'));
    assert.ok(!isTXNFile('file://com.android.externalstorage.documents/document/081D-1403%3Atxhex-signed.psbt'));

    // psbt files (unsigned):
    assert.ok(isPossiblyPSBTFile('content://com.android.externalstorage.documents/document/081D-1403%3Atxhex.psbt'));
    assert.ok(isPossiblyPSBTFile('file://com.android.externalstorage.documents/document/081D-1403%3Atxhex.psbt'));
  });

  it('resolves canonical navigation URLs for React Navigation linking', async () => {
    const sendUrl = await resolveDeepLinkUrl(`bitcoin:${suffix}12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG`);
    assert.strictEqual(sendUrl, 'bluewallet://route/send?uri=bitcoin%3A12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG');

    const lightningSettingsUrl = await resolveDeepLinkUrl('bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com');
    assert.strictEqual(lightningSettingsUrl, 'bluewallet://route/settings/lightning?url=https%3A%2F%2Flndhub.herokuapp.com');

    const combinedUrl = await resolveDeepLinkUrl(
      `bitcoin:${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=0.000001&lightning=lnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4`,
    );
    assert.strictEqual(
      combinedUrl,
      'bluewallet://route/send/select-wallet?bitcoin=bitcoin%3ABC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE%3Famount%3D0.000001%26&lndInvoice=lightning%3Alnbc1u1pwry044pp53xlmkghmzjzm3cljl6729cwwqz5hhnhevwfajpkln850n7clft4sdqlgfy4qv33ypmj7sj0f32rzvfqw3jhxaqcqzysxq97zvuq5zy8ge6q70prnvgwtade0g2k5h2r76ws7j2926xdjj2pjaq6q3r4awsxtm6k5prqcul73p3atveljkn6wxdkrcy69t6k5edhtc6q7lgpe4m5k4',
    );

    const wallet = new HDSegwitBech32Wallet();
    const unresolvedWalletShortcutUrl = await resolveDeepLinkUrl(`bluewallet://wallet/${wallet.getID()}`);
    assert.strictEqual(unresolvedWalletShortcutUrl, null);

    const walletShortcutUrl = await resolveDeepLinkUrl(`bluewallet://wallet/${wallet.getID()}`, {
      wallets: [wallet],
      saveToDisk: () => {},
      addWallet: () => {},
      setSharedCosigner: () => {},
    });
    assert.strictEqual(
      walletShortcutUrl,
      `bluewallet://route/wallet/transactions?walletID=${encodeURIComponent(wallet.getID())}&walletType=${encodeURIComponent(wallet.type)}`,
    );

    const unresolvedWidgetUrl = await resolveDeepLinkUrl('bluewallet://widget?action=openReceive');
    assert.strictEqual(unresolvedWidgetUrl, null);

    const widgetUrl = await resolveDeepLinkUrl('bluewallet://widget?action=openReceive', {
      wallets: [wallet],
      saveToDisk: () => {},
      addWallet: () => {},
      setSharedCosigner: () => {},
    });
    assert.strictEqual(widgetUrl, `bluewallet://route/wallet/receive?walletID=${encodeURIComponent(wallet.getID())}`);
  });

  it('can work with some deeplink actions', () => {
    assert.strictEqual(getServerFromSetElectrumServerAction('sgasdgasdgasd'), false);
    assert.strictEqual(
      getServerFromSetElectrumServerAction('bluewallet:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As'),
      'electrum1.bluewallet.io:443:s',
    );
    assert.strictEqual(
      getServerFromSetElectrumServerAction('setelectrumserver?server=electrum1.bluewallet.io%3A443%3As'),
      'electrum1.bluewallet.io:443:s',
    );
    assert.strictEqual(getServerFromSetElectrumServerAction('ololo:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As'), false);
    assert.strictEqual(getServerFromSetElectrumServerAction('setTrololo?server=electrum1.bluewallet.io%3A443%3As'), false);

    assert.strictEqual(
      getUrlFromSetLndhubUrlAction('bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com'),
      'https://lndhub.herokuapp.com',
    );
    assert.strictEqual(
      getUrlFromSetLndhubUrlAction('bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com%3A443'),
      'https://lndhub.herokuapp.com:443',
    );
    assert.strictEqual(
      getUrlFromSetLndhubUrlAction('setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com%3A443'),
      'https://lndhub.herokuapp.com:443',
    );
    assert.strictEqual(getUrlFromSetLndhubUrlAction('gsom?url=https%3A%2F%2Flndhub.herokuapp.com%3A443'), false);
    assert.strictEqual(getUrlFromSetLndhubUrlAction('sdfhserhsthsd'), false);
  });

  it('should accept only the one valid format', function () {
    // has all the necessary json keys
    const isAllowed1 = '{"xfp":"ffffffff", "path":"m/84\'/0\'/0\'", "xpub":"Zpubsnkjansdjnjnekjwcnwkjnc"}';
    // has all the necessary json keys, different order
    const isAllowed2 = '{"path":"m/84\'/0\'/0\'", "xpub":"Zpubsnkjansdjnjnekjwcnwkjnc", "xfp":"ffffffff"}';

    //

    assert.strictEqual(hasNeededJsonKeysForMultiSigSharing(isAllowed1), true);
    assert.strictEqual(hasNeededJsonKeysForMultiSigSharing(isAllowed2), true);

    const isNotAllowed1 = '{"path":"m/84\'/0\'/0\'", "xpub":"Zpubsnkjansdjnjnekjwcnwkjnc"}';
    const isNotAllowed2 = '{"path":1233, "xpub":"Zpubsnkjansdjnjnekjwcnwkjnc", "xfp":"ffffffff"}';

    assert.strictEqual(hasNeededJsonKeysForMultiSigSharing(isNotAllowed1), false);
    assert.strictEqual(hasNeededJsonKeysForMultiSigSharing(isNotAllowed2), false);
  });

  it('onWalletSelect should work', async () => {
    const response = await asyncNavigationRouteFor({
      url: 'bitcoin:BC1QR7P8NSYPZEJY4KP7CJS0HL5T9X0VF3AYF6UQPC?amount=0.00185579&lightning=LNBC1855790N1PNUPWSFPP5P5RVQJA067PV6NJQ3EFKLP78TN6MHUK842ZFGDCTXRDSGNTY765QDZ62PSKJEPQW3HJQSNPD36XJCEQFPHKUETEVFSKGEM9WGSRYVPJXSSZSNMJV3JHYGZFGSAZQARFVD4K2AR5V95KCMMJ9YCQZPUXQZ6GSP53E4EX9YTD2MGDN2C2CFA0J0SM3E7PVLPJ208H5LMYPNJMGZ7RLGS9QXPQYSGQ6GQMEQXJKKF2DHXJK8XQ4WGLM5NTE3RKEXGYQC6HYGFKS9SHHA6HL9X4339MXHNNQFSH7TS62PU8T9RSWTK6HQ4LV4GW3DPD25DQ8UQQYC909N',
    });
    assert.ok(response[1].onWalletSelect);

    let popWasCalled = false;
    let navigateWasCalled = false;
    let popWasCalled2 = false;
    let navigateWasCalled2 = false;
    const lw = new LightningCustodianWallet();
    const bw = new HDSegwitBech32Wallet();

    // navigation for a case when user selected LN wallet when was given a choice
    const navigationMock = {
      pop: () => {
        popWasCalled = true;
        // console.log('pop called');
      },
      navigate: (...args) => {
        navigateWasCalled = true;
        assert.deepStrictEqual(args, [
          'ScanLNDInvoiceRoot',
          {
            params: {
              uri: 'lightning:LNBC1855790N1PNUPWSFPP5P5RVQJA067PV6NJQ3EFKLP78TN6MHUK842ZFGDCTXRDSGNTY765QDZ62PSKJEPQW3HJQSNPD36XJCEQFPHKUETEVFSKGEM9WGSRYVPJXSSZSNMJV3JHYGZFGSAZQARFVD4K2AR5V95KCMMJ9YCQZPUXQZ6GSP53E4EX9YTD2MGDN2C2CFA0J0SM3E7PVLPJ208H5LMYPNJMGZ7RLGS9QXPQYSGQ6GQMEQXJKKF2DHXJK8XQ4WGLM5NTE3RKEXGYQC6HYGFKS9SHHA6HL9X4339MXHNNQFSH7TS62PU8T9RSWTK6HQ4LV4GW3DPD25DQ8UQQYC909N',
              walletID: 'bfcacb7288cf43c6c02a1154c432ec155b813798fa4e87cd2c1e5531d6363f71',
            },
            screen: 'ScanLNDInvoice',
          },
        ]);
      },
    };

    // navigation for a case when user selected ONCHAIN wallet when was given a choice
    const navigationMock2 = {
      pop: () => {
        popWasCalled2 = true;
      },
      navigate: (...args) => {
        navigateWasCalled2 = true;
        assert.deepStrictEqual(args, [
          'SendDetailsRoot',
          {
            params: {
              uri: 'bitcoin:BC1QR7P8NSYPZEJY4KP7CJS0HL5T9X0VF3AYF6UQPC?amount=0.00185579&',
              walletID: 'a1c50c266e229bb66aca0221d5b6a116720004c97437a0a6e279cfea027d0c87',
            },
            screen: 'SendDetails',
          },
        ]);
      },
    };

    response[1].onWalletSelect(lw, { navigation: navigationMock });
    response[1].onWalletSelect(bw, { navigation: navigationMock2 });

    assert.ok(popWasCalled);
    assert.ok(navigateWasCalled);

    assert.ok(popWasCalled2);
    assert.ok(navigateWasCalled2);
  });
});
