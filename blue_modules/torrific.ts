/**
 * TOR wrapper mimicking Frisbee interface
 */

import TorModule from './kmpTor';

interface TorsbeeResponse {
  originalResponse?: string;
  body?: object | string;
  err?: unknown;
}

interface TorsbeeGetOptions {
  headers: Record<string, string>;
}

interface TorsbeePostOptions {
  headers: Record<string, string>;
  body?: object | string;
}

class Torsbee {
  baseURI = '';

  constructor(opts: { baseURI?: string }) {
    opts = opts || {};
    this.baseURI = opts.baseURI || this.baseURI;
  }

  async get(path: string, options: TorsbeeGetOptions): Promise<TorsbeeResponse> {
    if (path.startsWith('/') && this.baseURI.endsWith('/')) {
      // oy vey, duplicate slashes
      path = path.slice(1);
    }

    const response: TorsbeeResponse = {};
    try {
      const uri = this.baseURI + path;
      console.log('TOR: requesting', uri);
      const torResponse = await TorModule.sendRequest('GET', uri, JSON.stringify(options?.headers || {}), '{}');
      response.originalResponse = torResponse;

      if (options?.headers['Content-Type'] === 'application/json' && torResponse) {
        response.body = JSON.parse(torResponse)?.json ?? {};
      } else {
        response.body = atob(torResponse);
      }
    } catch (error) {
      response.err = error;
      console.warn(error);
    }

    return response;
  }

  async post(path: string, options: TorsbeePostOptions): Promise<TorsbeeResponse> {
    if (path.startsWith('/') && this.baseURI.endsWith('/')) {
      // oy vey, duplicate slashes
      path = path.slice(1);
    }

    const response: TorsbeeResponse = {};
    try {
      const uri = this.baseURI + path;
      console.log('TOR: posting', uri);
      const torResponse = await TorModule.sendRequest(
        'POST',
        uri,
        JSON.stringify(options?.headers || {}),
        JSON.stringify(options?.body || {}),
      );
      response.originalResponse = torResponse;

      if (options?.headers['Content-Type'] === 'application/json' && torResponse) {
        response.body = JSON.parse(torResponse)?.json ?? {};
      } else {
        response.body = atob(torResponse);
      }
    } catch (error) {
      response.err = error;
      console.warn(error);
    }

    return response;
  }
}

export default Torsbee;
