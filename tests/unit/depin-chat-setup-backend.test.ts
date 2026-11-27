/**
 * Third review, finding 6 · After the user changes the DePIN server with the
 * chat mounted, every access goes to the new server: the first direct read
 * (the DePIN address balance uses `getBackend()`) and the next RPC alike.
 * Real override module and backends; the WebSocket only records where it was
 * asked to connect, then fails like an unreachable host.
 */
import { cleanup, renderHook } from '@testing-library/react-native';

import { loadDepinRpcOverrides, setDepinWssOverride } from '../../blue_modules/neurai';
import useDepinChatSetup from '../../hooks/useDepinChatSetup';

const opened: string[] = [];
class RecordingWebSocket {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data?: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(url: string) {
    opened.push(url);
    setTimeout(() => {
      this.readyState = 3;
      this.onerror?.('unreachable');
      this.onclose?.();
    }, 0);
  }

  send(): void {}
  close(): void {}
}

describe('useDepinChatSetup · the DePIN server changed while the chat is mounted (third review)', () => {
  const realWebSocket = (globalThis as { WebSocket?: unknown }).WebSocket;
  beforeEach(() => {
    opened.length = 0;
    (globalThis as { WebSocket?: unknown }).WebSocket = RecordingWebSocket;
  });
  afterEach(async () => {
    cleanup();
    await setDepinWssOverride('testnet', null);
    (globalThis as { WebSocket?: unknown }).WebSocket = realWebSocket;
  });

  it('the first balance read and the next RPC reach the new server, never the old one', async () => {
    await loadDepinRpcOverrides();
    await setDepinWssOverride('testnet', 'wss://old-node.example/push');
    // Paused and already revealed: nothing runs on its own, only the calls below.
    const { result } = renderHook(() =>
      useDepinChatSetup({ identity: null, network: 'testnet', supported: true, knownRevealed: true, paused: true }),
    );

    await result.current.rpc!('getpubkey', ['address']).catch(() => undefined);
    expect(opened.length).toBeGreaterThan(0);
    expect(opened.every(url => url.startsWith('wss://old-node.example'))).toBe(true);

    // The user saves another server and comes back to the mounted chat.
    await setDepinWssOverride('testnet', 'wss://new-node.example/push');
    const changedAt = opened.length;

    await result.current
      .getBackend()
      .getUtxos(['address'])
      .catch(() => undefined);
    expect(opened.length).toBeGreaterThan(changedAt);
    await result.current.rpc!('getpubkey', ['address']).catch(() => undefined);

    const afterChange = opened.slice(changedAt);
    expect(afterChange.every(url => url.startsWith('wss://new-node.example'))).toBe(true);
  });
});
