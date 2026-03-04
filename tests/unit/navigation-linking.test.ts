import assert from 'assert';
import linking from '../../navigation/linking';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { Chain } from '../../models/bitcoinUnits';

expect(typeof DeeplinkSchemaMatch.isBothBitcoinAndLightning).toBe('function');

describe.each(['', '//'])('unit - navigation linking (suffix=%s)', function (suffix) {
  it('routes plain bitcoin address to SendDetails', () => {
    const path = `${suffix}12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG`;
    const state: any = linking.getStateFromPath(path);

    assert.strictEqual(state.routes[0].name, 'SendDetailsRoot');
    const inner = state.routes[0].state.routes[0];
    assert.strictEqual(inner.name, 'SendDetails');
    assert.strictEqual(inner.params.uri, 'bitcoin:12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG');
  });

  it('routes BIP21 with params to SendDetails', () => {
    const path = `${suffix}BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo`;
    const state: any = linking.getStateFromPath(path);

    assert.strictEqual(state.routes[0].name, 'SendDetailsRoot');
    const inner = state.routes[0].state.routes[0];
    assert.strictEqual(inner.name, 'SendDetails');
    assert.strictEqual(inner.params.uri, 'bitcoin:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=666&label=Yo');
  });

  it('routes BIP21+BOLT11 to SelectWallet and onWalletSelect navigates per wallet chain', () => {
    const bolt11 =
      'LNBC1P3WKFY3DQQPP5030V53XSDHSGJKZELYLE7EKTMEM38974498VNQDT2JAZ24TRW39QSP502JQJ4K6NR7AXQYMHKF3AX70JXFX6JZA4JYGVC66NJZHFS4TSA2Q9QRSGQCQPCXQY8AYQRZJQV06K0M23T593PNGL0JT7N9WZNP64FQNGVCTZ7VTS8NQ4TUKVTLJQZ2ZHYQQXQGQQSQQQQQQQQQQQQQQ9GRZJQTSJY9P55GDCEEVP36FVDMRKXQVZFHY8AK2TGC5ZGTJTRA9XLAZ97ZKCYVQQPRSQQVQQQQQQQQQQQQQQ9GY3X4N6RV6RCN53LDEV96AURLS3C66KPX74WA4UWCWU92JGKTPQE8NCQPZJ8JG6SUNYGZM320CDUTNVGSRC6XV286EVHRXEF' +
      'SXXUZ0SSQWTM6DQ';
    const path = `${suffix}bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?lightning=${bolt11}&amount=0`;
    const state: any = linking.getStateFromPath(path);

    assert.strictEqual(state.routes[0].name, 'SelectWallet');
    const onWalletSelect = state.routes[0].params.onWalletSelect;
    assert.ok(onWalletSelect && typeof onWalletSelect === 'function');

    // Mock navigation
    let popCalled = false;
    let navArgsOn: any;
    let navArgsOff: any;
    const navigationMockOn = {
      pop: () => (popCalled = true),
      navigate: (...args: any[]) => {
        navArgsOn = args;
      },
    };
    const navigationMockOff = {
      pop: () => (popCalled = true),
      navigate: (...args: any[]) => {
        navArgsOff = args;
      },
    };

    const onchainWallet = { chain: Chain.ONCHAIN, getID: () => 'on-id' };
    const offchainWallet = { chain: Chain.OFFCHAIN, getID: () => 'off-id' };

    onWalletSelect(onchainWallet, { navigation: navigationMockOn });
    onWalletSelect(offchainWallet, { navigation: navigationMockOff });

    assert.ok(popCalled);

    // ONCHAIN navigates to SendDetails
    assert.deepStrictEqual(navArgsOn[0], 'SendDetailsRoot');
    assert.strictEqual(navArgsOn[1].screen, 'SendDetails');
    assert.strictEqual(navArgsOn[1].params.walletID, 'on-id');
    assert.strictEqual(navArgsOn[1].params.uri, 'bitcoin:bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk?');

    // OFFCHAIN navigates to ScanLNDInvoice
    assert.deepStrictEqual(navArgsOff[0], 'ScanLNDInvoiceRoot');
    assert.strictEqual(navArgsOff[1].screen, 'ScanLNDInvoice');
    assert.strictEqual(navArgsOff[1].params.walletID, 'off-id');
    assert.strictEqual(navArgsOff[1].params.uri, `lightning:${bolt11}`);
  });
});
