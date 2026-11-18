import { Psbt } from 'bitcoinjs-lib';

// upstream had no deadline: a receiver that never answers would leave the sender hanging with nothing broadcast
export const PAYJOIN_REQUEST_TIMEOUT_MS = 30 * 1000;

/**
 * Known endpoint error codes get a fixed message; unknown ones get a generic message
 * so a server-controlled string never reaches the UI.
 */
export class PayjoinEndpointError extends Error {
  static messageMap: { [key: string]: string } = {
    unavailable: 'The payjoin endpoint is not available for now.',
    'not-enough-money': 'The receiver added some inputs but could not bump the fee of the payjoin proposal.',
    'version-unsupported': 'This version of payjoin is not supported.',
    'original-psbt-rejected': 'The receiver rejected the original PSBT.',
  };

  static codeToMessage(code: string): string {
    return this.messageMap[code] || 'Something went wrong when requesting the payjoin endpoint.';
  }

  code: string;

  constructor(code: string) {
    super(PayjoinEndpointError.codeToMessage(code));
    this.code = code;
  }
}

export interface IPayjoinRequester {
  requestPayjoin(psbt: Psbt): Promise<Psbt>;
}

export class PayjoinRequester implements IPayjoinRequester {
  private endpointUrl: string;
  private customFetch?: typeof fetch;

  constructor(endpointUrl: string, customFetch?: typeof fetch) {
    this.endpointUrl = endpointUrl;
    this.customFetch = customFetch;
  }

  async requestPayjoin(psbt: Psbt): Promise<Psbt> {
    if (!psbt) {
      throw new Error('Need to pass psbt');
    }

    const fetchFunction = this.customFetch || fetch;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PAYJOIN_REQUEST_TIMEOUT_MS);
    let response: Response;
    let responseText: string;
    try {
      response = await fetchFunction(this.endpointUrl, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'text/plain' }),
        body: psbt.toBase64(),
        signal: controller.signal,
      }).catch(
        (v: Error): Response =>
          ({
            ok: false,
            async text(): Promise<string> {
              return v.message;
            },
          }) as any,
      );
      responseText = await response.text();
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      let errorCode = '';
      try {
        errorCode = JSON.parse(responseText).errorCode;
      } catch (err) {}
      throw new PayjoinEndpointError(errorCode);
    }

    return Psbt.fromBase64(responseText);
  }
}
