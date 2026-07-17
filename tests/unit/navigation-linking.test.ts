import assert from 'assert';
import { linking, normalizeBitcoinDeepLinkUrl, parseBitcoinUriRecipients } from '../../navigation/linking';

describe('navigation linking - bitcoin deeplinks', () => {
  it('normalizes supported bitcoin URI variants', () => {
    assert.strictEqual(
      normalizeBitcoinDeepLinkUrl('bitcoin://BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=0.1'),
      'bitcoin:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=0.1',
    );

    assert.strictEqual(
      normalizeBitcoinDeepLinkUrl('bluewallet:BITCOIN:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=1'),
      'BITCOIN:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=1',
    );

    assert.strictEqual(
      normalizeBitcoinDeepLinkUrl('bc1qykcp2x3djgdtdwelxn9z4j2y956npte0a4sref?amount=0.001'),
      'bitcoin:bc1qykcp2x3djgdtdwelxn9z4j2y956npte0a4sref?amount=0.001',
    );
  });

  it('accepts only bitcoin deeplinks through linking filter', () => {
    assert.strictEqual(linking.filter?.('bitcoin:12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG'), true);
    assert.strictEqual(linking.filter?.('bluewallet:bitcoin:12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG'), true);
    assert.strictEqual(linking.filter?.('bluewallet:bitcoin://12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG'), true);
    assert.strictEqual(linking.filter?.('lightning:lnbc1...'), false);
    assert.strictEqual(linking.filter?.('https://example.com'), false);
  });

  it('filters out non-bitcoin and auth-session URLs', () => {
    assert.strictEqual(linking.filter?.('bitcoin:12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG'), true);
    assert.strictEqual(linking.filter?.('bluewallet://widget?action=openReceive'), true);
    assert.strictEqual(linking.filter?.('bitcoin:12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG+expo-auth-session'), false);
    assert.strictEqual(linking.filter?.('https://example.com'), false);
  });

  it('maps widget openReceive deeplink to nested ReceiveDetails route', () => {
    const state = linking.getStateFromPath?.('bluewallet://widget?action=openReceive', undefined as never);
    const firstRoute = state?.routes?.[0] as any;

    assert.strictEqual(firstRoute?.name, 'DrawerRoot');
    assert.strictEqual(firstRoute?.params?.screen, 'DetailViewStackScreensStack');
    assert.strictEqual(firstRoute?.params?.params?.screen, 'ReceiveDetails');
  });

  it('maps bitcoin deeplinks to SendDetailsRoot/SendDetails state', () => {
    const state = linking.getStateFromPath?.('bc1qykcp2x3djgdtdwelxn9z4j2y956npte0a4sref?amount=0.005', undefined as never);
    const firstRoute = state?.routes?.[0] as any;

    assert.strictEqual(firstRoute?.name, 'SendDetailsRoot');
    assert.strictEqual(firstRoute?.params?.screen, 'SendDetails');
    assert.strictEqual(firstRoute?.params?.params?.uri, 'bitcoin:bc1qykcp2x3djgdtdwelxn9z4j2y956npte0a4sref?amount=0.005');
  });

  it('maps bluewallet-prefixed and uppercase bitcoin deeplinks', () => {
    const state = linking.getStateFromPath?.('bluewallet:BITCOIN://BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=1', undefined as never);
    const firstRoute = state?.routes?.[0] as any;

    assert.strictEqual(firstRoute?.name, 'SendDetailsRoot');
    assert.strictEqual(firstRoute?.params?.screen, 'SendDetails');
    assert.strictEqual(firstRoute?.params?.params?.uri, 'bitcoin:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=1');
  });

  it('keeps multi-recipient bip21 query payload intact for SendDetails parsing', () => {
    const path =
      'bitcoin:bc1qykcp2x3djgdtdwelxn9z4j2y956npte0a4sref?amount=0.001&address=bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk&amount=0.002&message=Batch%20Pay';
    const state = linking.getStateFromPath?.(path, undefined as never);
    const firstRoute = state?.routes?.[0] as any;

    assert.strictEqual(firstRoute?.name, 'SendDetailsRoot');
    assert.strictEqual(firstRoute?.params?.screen, 'SendDetails');
    assert.strictEqual(firstRoute?.params?.params?.uri, path);
  });

  it('serializes SendDetails bitcoin route state back to bitcoin uri', () => {
    const state = {
      routes: [
        {
          name: 'SendDetailsRoot',
          params: {
            screen: 'SendDetails',
            params: {
              uri: 'bluewallet:BITCOIN://BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=1',
            },
          },
        },
      ],
    } as any;

    const path = linking.getPathFromState?.(state, undefined as never);
    assert.strictEqual(path, 'bitcoin:BC1Q3RL0MKYK0ZRTXFMQN9WPCD3GNAZ00YV9YP0HXE?amount=1');
  });

  it('parses bip21 recipients and indexed recipient fields', () => {
    const parsed = parseBitcoinUriRecipients(
      'bitcoin:bc1qykcp2x3djgdtdwelxn9z4j2y956npte0a4sref?amount=0.001&address_1=bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk&amount_1=0.002&message=Batch%20Pay',
    );

    assert.deepStrictEqual(parsed.recipients, [
      { address: 'bc1qykcp2x3djgdtdwelxn9z4j2y956npte0a4sref', amount: 0.001 },
      { address: 'bc1q8flg3jcnv6x6mpjrqty8h8h9mg0shgp5jc9smk', amount: 0.002 },
    ]);
    assert.strictEqual(parsed.memo, 'Batch Pay');
  });
});
