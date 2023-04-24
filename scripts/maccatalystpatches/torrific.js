/**
 * TOR wrapper mimicking Frisbee interface
 */
class Torsbee {
  baseURI = '';

  constructor(opts) {
    opts = opts || {};
    this.baseURI = opts.baseURI || this.baseURI;
  }

  async get(path, options) {
    return false;
  }

  async post(path, options) {
    return false;
  }

  testSocket() {
    return false;
  }
}

/**
 * Wrapper for react-native-tor mimicking Socket class from NET package
 */
class TorSocket {
  constructor() {
    this._socket = false;
    this._listeners = {};
  }

  setTimeout() {}

  setEncoding() {}

  setKeepAlive() {}

  setNoDelay() {}

  on(event, listener) {}

  removeListener(event, listener) {}

  connect(port, host, callback) {}

  _passOnEvent(event, data) {}

  emit(event, data) {}

  end() {}

  destroy() {}

  write(data) {}
}

module.exports.getDaemonStatus = async () => {
  return false;
};

module.exports.stopIfRunning = async () => {
  return false;
};

module.exports.startIfNotStarted = async () => {
  return false;
};

module.exports.testSocket = async () => {
  return false;
};

module.exports.testHttp = async () => {};

module.exports.Torsbee = Torsbee;
module.exports.Socket = TorSocket;
