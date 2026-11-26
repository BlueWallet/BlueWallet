/**
 * How a conversation is laid out: messages oldest first, grouped into runs
 * (one sender, a few minutes apart, the same day) the way messaging apps draw
 * them, with a day heading wherever the day changes.
 */
import dayjs from 'dayjs';

export interface ChatMessage {
  id: string;
  text: string;
  createdAt: Date;
  sender: string;
  /** Sent from here and not yet handed back by the pool. */
  pending: boolean;
}

export interface ChatRow {
  message: ChatMessage;
  mine: boolean;
  /** Opens a run: the sender's name goes on it. */
  runStart: boolean;
  /** Closes a run: it carries the bubble's tail and, in a group, the avatar. */
  runEnd: boolean;
  /** Day heading above this message, when the day changes here. */
  day?: string;
}

/** Messages further apart than this start a new run even from the same sender. */
export const RUN_GAP_MS = 5 * 60_000;

export interface ChatDayLabels {
  today: string;
  yesterday: string;
}

export function chatDayTitle(date: Date, labels: ChatDayLabels, now: dayjs.Dayjs = dayjs()): string {
  const day = dayjs(date);
  if (day.isSame(now, 'day')) return labels.today;
  if (day.isSame(now.subtract(1, 'day'), 'day')) return labels.yesterday;
  return day.format(day.year() === now.year() ? 'dddd, D MMMM' : 'D MMMM YYYY');
}

/** `messages` oldest first; the rows come back in the same order. */
export function buildChatRows(messages: ChatMessage[], me: string, labels: ChatDayLabels, now: dayjs.Dayjs = dayjs()): ChatRow[] {
  const together = (a: ChatMessage | undefined, b: ChatMessage | undefined): boolean =>
    !!a &&
    !!b &&
    a.sender === b.sender &&
    Math.abs(+b.createdAt - +a.createdAt) <= RUN_GAP_MS &&
    dayjs(a.createdAt).isSame(dayjs(b.createdAt), 'day');

  return messages.map((message, index) => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const newDay = !previous || !dayjs(previous.createdAt).isSame(dayjs(message.createdAt), 'day');
    return {
      message,
      mine: message.sender === me,
      runStart: !together(previous, message),
      runEnd: !together(message, next),
      day: newDay ? chatDayTitle(message.createdAt, labels, now) : undefined,
    };
  });
}
