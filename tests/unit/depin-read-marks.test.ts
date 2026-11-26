import assert from 'assert';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadReadMarks, markMessagesRead } from '../../blue_modules/neurai/depinReadMarks';
import {
  getUnreadCounts,
  getUnreadTotal,
  loadUnreadCounts,
  setUnreadCount,
  subscribePoolSeen,
} from '../../blue_modules/neurai/depinPoolSeen';

describe('DePIN read marks', () => {
  it('records each message once and keeps them across loads', async () => {
    assert.strictEqual(markMessagesRead('w1', '&BREAK', ['h1', 'h2']), true);
    assert.strictEqual(markMessagesRead('w1', '&BREAK', ['h1']), false);
    // Same channel whatever the token spelling.
    const marks = await loadReadMarks('w1', 'break');
    assert.ok(marks.has('h1') && marks.has('h2'));
    assert.strictEqual((await loadReadMarks('w2', '&BREAK')).size, 0);
  });

  it('merges stored marks with the ones added before the storage answered', async () => {
    await AsyncStorage.setItem('depin_read_w3|BREAK', JSON.stringify(['old']));
    markMessagesRead('w3', '&BREAK', ['new']);
    const marks = await loadReadMarks('w3', '&BREAK');
    assert.deepStrictEqual(Array.from(marks), ['old', 'new']);
  });

  it('loads what an earlier session stored', async () => {
    await AsyncStorage.setItem('depin_read_w4|BREAK', JSON.stringify(['a', 'b']));
    const marks = await loadReadMarks('w4', '&BREAK');
    assert.deepStrictEqual(Array.from(marks).sort(), ['a', 'b']);
  });
});

describe('DePIN unread counts', () => {
  it('stores the count per token and wakes the watchers', async () => {
    await loadUnreadCounts('wallet-u');
    let calls = 0;
    const unsubscribe = subscribePoolSeen(() => calls++);
    setUnreadCount('wallet-u', '&BREAK', 2);
    setUnreadCount('wallet-u', '&BREAK', 2);
    setUnreadCount('wallet-u', '&OTHER', 1);
    assert.strictEqual(calls, 2);
    assert.strictEqual(getUnreadTotal('wallet-u'), 3);
    setUnreadCount('wallet-u', '&BREAK', 0);
    assert.deepStrictEqual(getUnreadCounts('wallet-u'), { '&OTHER': 1 });
    unsubscribe();
  });
});
