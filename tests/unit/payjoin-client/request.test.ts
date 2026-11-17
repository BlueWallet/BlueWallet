import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';
import { PAYJOIN_REQUEST_TIMEOUT_MS, PayjoinEndpointError, PayjoinRequester } from '../../../blue_modules/payjoin-client';

// first valid p2wpkh "wallet" vector from upstream test/fixtures/client.fixtures.ts
const PSBTTEXT =
  'cHNidP8BAHECAAAAAcG1DqRm0b8vhX6JpsU3m2N8V6xVz226gjY+pE7up8ebAAAAAAD/////AhY3AAAAAAAAFgAUn1AUWTvX0DxQkFIeS+rmPrPMvBrazjABAAAAABYAFD4WR6SuL+LmgQYyQeDKe7e53H2FAAAAAAABAR8ALTEBAAAAABYAFH+Ar5fIkaBhnFoV+l63h8a3ieXNIgICz9HHZqLbHIDNDIlaeWJXXhfij/uu5fpIoXRDkICd/IBHMEQCIA5rthangBAiievrSBxLjaY84rH0rTQWtLZZgjJXmCNwAiBfahFoEsKJIpYNT6gLpgnz4Kd5tfhwxVu4suC3JtYDRwEiBgLP0cdmotscgM0MiVp5YldeF+KP+67l+kihdEOQgJ38gBi9mckDVAAAgAEAAIAAAACAAAAAAAAAAAAAACICAnV5cU7BjADcEOOyGq9mFwih6VX/4pXpJdKCxY/szjOXGL2ZyQNUAACAAQAAgAAAAIABAAAAAAAAAAA=';

describe('payjoin requester', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('aborts a hanging endpoint after the request timeout', async () => {
    jest.useFakeTimers();
    jest.spyOn(globalThis, 'fetch').mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const requester = new PayjoinRequester('http://127.0.0.1:12345/1234');
    const pending = requester.requestPayjoin(bitcoin.Psbt.fromBase64(PSBTTEXT));
    const outcome = assert.rejects(pending, (e: any) => e instanceof PayjoinEndpointError);
    jest.advanceTimersByTime(PAYJOIN_REQUEST_TIMEOUT_MS);
    await outcome;
  });

  it('posts base64 psbt as text/plain and parses response', async () => {
    const spy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(PSBTTEXT, { status: 200 }));
    const requester = new PayjoinRequester('http://127.0.0.1:12345/1234');
    const response = await requester.requestPayjoin(bitcoin.Psbt.fromBase64(PSBTTEXT));
    assert.strictEqual(response.toBase64(), PSBTTEXT);
    const [url, init] = spy.mock.calls[0];
    assert.strictEqual(url, 'http://127.0.0.1:12345/1234');
    assert.strictEqual(init?.method, 'POST');
    assert.strictEqual(init?.body, PSBTTEXT);
    assert.strictEqual((init?.headers as Headers).get('Content-Type'), 'text/plain');
  });

  it('throws when psbt missing', async () => {
    const requester = new PayjoinRequester('http://127.0.0.1:12345/1234');
    // @ts-ignore testing runtime guard
    await assert.rejects(requester.requestPayjoin(), /Need to pass psbt/);
  });

  it('maps network failure to generic PayjoinEndpointError', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('boom'));
    const requester = new PayjoinRequester('http://127.0.0.1:12345/1234');
    await assert.rejects(
      requester.requestPayjoin(bitcoin.Psbt.fromBase64(PSBTTEXT)),
      /Something went wrong when requesting the payjoin endpoint\./,
    );
  });

  it('maps known errorCode from a non-ok response', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ errorCode: 'original-psbt-rejected' }), { status: 400 }));
    const requester = new PayjoinRequester('http://127.0.0.1:12345/1234');
    await assert.rejects(requester.requestPayjoin(bitcoin.Psbt.fromBase64(PSBTTEXT)), (e: any) => {
      assert.ok(e instanceof PayjoinEndpointError);
      assert.strictEqual(e.code, 'original-psbt-rejected');
      assert.strictEqual(e.message, 'The receiver rejected the original PSBT.');
      return true;
    });
  });
});
