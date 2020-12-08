import Tor from 'react-native-tor';
const tor = Tor();

/**
 * TOR wrapper mimicking Frisbee interface
 */
class Torsbee {
  baseURI = '';

  constructor(opts) {
    this.baseURI = opts.baseURI || this.baseURI;
  }

  async get(path, options) {
    console.log('TOR: starting...');
    const socksProxy = await tor.startIfNotStarted();
    console.log('TOR: started', await tor.getDaemonStatus(), 'on local port', socksProxy);
    if (path.startsWith('/') && this.baseURI.endsWith('/')) {
      // oy vey, duplicate slashes
      path = path.substr(1);
    }

    const response = {};
    try {
      const uri = this.baseURI + path;
      console.log('TOR: requesting', uri);
      const torResponse = await tor.get(uri, options?.headers || {}, true);
      response.originalResponse = torResponse;
      const str = Buffer.from(torResponse.b64Data, 'base64').toString();

      if (options?.headers['Content-Type'] === 'application/json') {
        response.body = JSON.parse(str);
      } else {
        response.body = str;
      }
    } catch (error) {
      response.err = error;
      console.warn(error);
    }

    return response;
  }

  async post(path, options) {
    console.log('TOR: starting...');
    const socksProxy = await tor.startIfNotStarted();
    console.log('TOR: started', await tor.getDaemonStatus(), 'on local port', socksProxy);
    if (path.startsWith('/') && this.baseURI.endsWith('/')) {
      // oy vey, duplicate slashes
      path = path.substr(1);
    }

    const uri = this.baseURI + path;
    console.log('TOR: posting to', uri);

    const response = {};
    try {
      const torResponse = await tor.post(uri, JSON.stringify(options?.body || {}), options?.headers || {}, true);
      response.originalResponse = torResponse;
      const str = Buffer.from(torResponse.b64Data, 'base64').toString();

      if (options?.headers['Content-Type'] === 'application/json') {
        response.body = JSON.parse(str);
      } else {
        response.body = str;
      }
    } catch (error) {
      response.err = error;
      console.warn(error);
    }

    return response;
  }
}

module.exports = Torsbee;
