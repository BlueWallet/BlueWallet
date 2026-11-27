/**
 * H13 · Logs never carry push tokens, addresses, txids, messages or request
 * bodies. Every value below is a marker that must not reach the console.
 */
import { describeNotification } from '../../blue_modules/notifications';
import { describeRequest } from '../../util/fetch';

const MARKERS = ['TOKEN-MARKER-7f3a', 'NADDRESS-MARKER', 'TXID-MARKER', 'MESSAGE-MARKER', 'QUERY-ADDRESS-MARKER'];

function captureConsole(): { output: () => string; restore: () => void } {
  const lines: string[] = [];
  const spies = (['log', 'debug', 'info', 'warn', 'error'] as const).map(level =>
    jest.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      lines.push(args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '));
    }),
  );
  return { output: () => lines.join('\n'), restore: () => spies.forEach(spy => spy.mockRestore()) };
}

describe('H13 · log hygiene', () => {
  it('describes a push by kind only', () => {
    const description = describeNotification({
      type: 2,
      chain: 'mainnet',
      foreground: true,
      userInteraction: false,
      address: 'NADDRESS-MARKER',
      txid: 'TXID-MARKER',
      hash: 'h',
      message: 'MESSAGE-MARKER',
      subText: 'MESSAGE-MARKER',
    });
    expect(description).toEqual({ type: 2, chain: 'mainnet', foreground: true, userInteraction: false, hasTxid: true, hasAddress: true });
    expect(JSON.stringify(description)).not.toMatch(/MARKER/);
  });

  it('describes a request without its query string or body', () => {
    expect(describeRequest('https://gc.example/majorTomToGroundControl?address=QUERY-ADDRESS-MARKER', { method: 'post' })).toBe(
      'POST https://gc.example/majorTomToGroundControl',
    );
    expect(describeRequest(new URL('https://node.example/rpc?x=1'))).toBe('GET https://node.example/rpc');
  });

  it('the fetch wrapper logs no body in development builds', async () => {
    // util/fetch binds the native fetch when it loads: stub it first, then load a fresh copy.
    const native = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
    let wrapper!: typeof import('../../util/fetch').fetch;
    jest.isolateModules(() => {
      wrapper = require('../../util/fetch').fetch;
    });
    const previousDev = (globalThis as any).__DEV__;
    (globalThis as any).__DEV__ = true;
    const consoleCapture = captureConsole();
    try {
      await wrapper('https://gc.example/setTokenConfiguration?a=QUERY-ADDRESS-MARKER', {
        method: 'POST',
        body: JSON.stringify({ token: 'TOKEN-MARKER-7f3a', addresses: ['NADDRESS-MARKER'] }),
      });
    } finally {
      consoleCapture.restore();
      (globalThis as any).__DEV__ = previousDev;
      native.mockRestore();
    }
    const output = consoleCapture.output();
    expect(output).toContain('POST https://gc.example/setTokenConfiguration');
    for (const marker of MARKERS) expect(output).not.toContain(marker);
  });
});
