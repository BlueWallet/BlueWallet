import assert from 'assert';
import dayjs from 'dayjs';

import { buildChatRows, ChatMessage } from '../../components/depinChat/chatRows';

const labels = { today: 'Today', yesterday: 'Yesterday' };
const now = dayjs('2026-11-26T18:00:00');
const at = (iso: string) => new Date(iso);
const message = (id: string, sender: string, iso: string): ChatMessage => ({ id, text: id, createdAt: at(iso), sender, pending: false });

describe('DePIN chat rows', () => {
  it('groups a sender’s close messages into one run', () => {
    const rows = buildChatRows(
      [
        message('a', 'alice', '2026-11-26T10:00:00'),
        message('b', 'alice', '2026-11-26T10:01:00'),
        message('c', 'alice', '2026-11-26T10:02:00'),
        message('d', 'me', '2026-11-26T10:03:00'),
      ],
      'me',
      labels,
      now,
    );
    assert.deepStrictEqual(
      rows.map(row => [row.message.id, row.runStart, row.runEnd, row.mine]),
      [
        ['a', true, false, false],
        ['b', false, false, false],
        ['c', false, true, false],
        ['d', true, true, true],
      ],
    );
  });

  it('starts a new run after a pause or on a new day, and heads each day', () => {
    const rows = buildChatRows(
      [
        message('a', 'alice', '2026-11-25T23:58:00'),
        message('b', 'alice', '2026-11-26T00:01:00'),
        message('c', 'alice', '2026-11-26T00:30:00'),
      ],
      'me',
      labels,
      now,
    );
    assert.deepStrictEqual(
      rows.map(row => [row.message.id, row.runStart, row.runEnd, row.day]),
      [
        ['a', true, true, 'Yesterday'],
        ['b', true, true, 'Today'],
        ['c', true, true, undefined],
      ],
    );
  });
});
