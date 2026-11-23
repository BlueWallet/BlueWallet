import { recentSendDestinations, RecentSendTransaction } from '../../blue_modules/recentSendDestinations';

const own = (address: string) => address.startsWith('own');

const tx = (partial: RecentSendTransaction): RecentSendTransaction => partial;

describe('recentSendDestinations', () => {
  it('keeps the newest five foreign destinations and counts each payment once', () => {
    const transactions: RecentSendTransaction[] = [
      tx({
        value: -1000,
        timestamp: 10,
        outputs: [{ scriptPubKey: { addresses: ['a'] } }, { scriptPubKey: { addresses: ['a'] } }],
      }),
      tx({ value: -1000, timestamp: 20, outputs: [{ scriptPubKey: { addresses: ['a'] } }] }),
      tx({ value: -1000, timestamp: 30, outputs: [{ scriptPubKey: { addresses: ['b'] } }] }),
      tx({ value: -1000, timestamp: 40, outputs: [{ scriptPubKey: { addresses: ['c'] } }] }),
      tx({ value: -1000, timestamp: 50, outputs: [{ scriptPubKey: { addresses: ['d'] } }] }),
      tx({ value: -1000, timestamp: 60, outputs: [{ scriptPubKey: { addresses: ['e'] } }] }),
      tx({ value: -1000, timestamp: 5, outputs: [{ scriptPubKey: { addresses: ['too-old'] } }] }),
    ];

    const result = recentSendDestinations(transactions, own);

    expect(result.map(item => item.address)).toEqual(['e', 'd', 'c', 'b', 'a']);
    expect(result.find(item => item.address === 'a')).toEqual({ address: 'a', count: 2, lastTimestamp: 20 });
    expect(result.find(item => item.address === 'too-old')).toBeUndefined();
  });

  it('skips incoming transactions, change, and paycode payments', () => {
    const transactions: RecentSendTransaction[] = [
      tx({ value: 500, timestamp: 100, outputs: [{ scriptPubKey: { addresses: ['incoming'] } }] }),
      tx({ value: 0, timestamp: 90, outputs: [{ scriptPubKey: { addresses: ['zero'] } }] }),
      tx({
        value: -1000,
        timestamp: 80,
        outputs: [{ scriptPubKey: { addresses: ['own-change', 'paid'] } }],
      }),
      tx({
        value: -1000,
        timestamp: 70,
        counterparty: 'PM8paycode',
        outputs: [{ scriptPubKey: { addresses: ['joint-address'] } }],
      }),
      tx({ value: -1000, timestamp: 60, outputs: [{ scriptPubKey: {} }] }),
    ];

    expect(recentSendDestinations(transactions, own)).toEqual([{ address: 'paid', count: 1, lastTimestamp: 80 }]);
  });
});
