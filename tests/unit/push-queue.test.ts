/**
 * H20 · The stored push queue loses nothing: concurrent arrivals are both
 * kept, a failed write leaves the push deliverable again, and entries leave
 * the queue only when acknowledged.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  acknowledgeStoredNotification,
  addNotification,
  getStoredNotifications,
  storeIncomingNotification,
} from '../../blue_modules/notifications';

const push = (id: string, txid: string) =>
  ({ identifier: id, title: 'Payment', body: 'You received XNA', payload: { type: 1, txid, subText: 'Payment' } }) as never;

const entry = (id: string, txid: string) => ({ identifier: id, type: 1, txid, hash: '', address: '', foreground: true, userInteraction: false, message: 'm' });

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('H20 · stored push queue', () => {
  it('keeps both of two pushes written at the same time', async () => {
    await Promise.all([addNotification(entry('a', 'tx-a')), addNotification(entry('b', 'tx-b'))]);
    expect((await getStoredNotifications()).map(n => n.identifier).sort()).toEqual(['a', 'b']);
  });

  it('stores each delivery once, also when the same push arrives twice concurrently', async () => {
    await Promise.all([
      storeIncomingNotification(push('p1', 'tx-1'), { foreground: false, userInteraction: true }),
      storeIncomingNotification(push('p1', 'tx-1'), { foreground: false, userInteraction: true }),
      storeIncomingNotification(push('p2', 'tx-2'), { foreground: false, userInteraction: true }),
    ]);
    expect((await getStoredNotifications()).map(n => n.identifier).sort()).toEqual(['p1', 'p2']);
  });

  it('accepts a redelivery after a failed write instead of dropping the push', async () => {
    // AsyncStorage's jest mock is already a jest.fn: fail one write, keep its implementation.
    (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error('disk full')));
    await storeIncomingNotification(push('p3', 'tx-3'), { foreground: false, userInteraction: false });
    expect(await getStoredNotifications()).toEqual([]);

    await storeIncomingNotification(push('p3', 'tx-3'), { foreground: false, userInteraction: false });
    expect((await getStoredNotifications()).map(n => n.identifier)).toEqual(['p3']);
  });

  it('removes only acknowledged entries, so a restart replays the rest', async () => {
    await addNotification(entry('a', 'tx-a'));
    await addNotification(entry('b', 'tx-b'));
    await addNotification(entry('c', 'tx-c'));
    const batch = await getStoredNotifications();

    await acknowledgeStoredNotification(batch[0]);
    // "restart" here: the next read still has the two not yet dispatched.
    expect((await getStoredNotifications()).map(n => n.identifier)).toEqual(['b', 'c']);

    await addNotification(entry('d', 'tx-d')); // arrives while the batch is processed
    await acknowledgeStoredNotification(batch[1]);
    await acknowledgeStoredNotification(batch[2]);
    expect((await getStoredNotifications()).map(n => n.identifier)).toEqual(['d']);
  });

  it('resets an unreadable queue instead of failing every read', async () => {
    await AsyncStorage.setItem('NOTIFICATIONS_STORAGE', '{not json');
    expect(await getStoredNotifications()).toEqual([]);
    expect(await AsyncStorage.getItem('NOTIFICATIONS_STORAGE')).toBe('[]');
    await addNotification(entry('after', 'tx'));
    expect((await getStoredNotifications()).map(n => n.identifier)).toEqual(['after']);
  });
});
