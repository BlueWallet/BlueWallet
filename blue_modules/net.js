/**
 * @fileOverview adapter for ReactNative TCP module
 * This module mimics the nodejs net api and is intended to work in RN environment.
 * @see https://github.com/Rapsssito/react-native-tcp-socket
 */

import TcpSocket from 'react-native-tcp-socket';

/**
 * Constructor function. Resulting object has to act as it was a real socket (basically
 * conform to nodejs/net api)
 *
 * @constructor
 */
function Socket() {
  this._socket = false; // reference to socket thats gona be created later
  // defaults:
  this._noDelay = true;

  this._listeners = {};

  // functions not supported by RN module, yet:
  this.setTimeout = () => {};
  this.setEncoding = () => {};
  this.setKeepAlive = () => {};

  // proxying call to real socket object:
  this.setNoDelay = noDelay => {
    if (this._socket) this._socket.setNoDelay(noDelay);
    this._noDelay = noDelay;
  };

  this.connect = (port, host, callback) => {
    this._socket = TcpSocket.createConnection(
      {
        port,
        host,
        tls: false,
      },
      callback,
    );

    this._socket.on('data', data => {
      this._passOnEvent('data', data);
    });
    this._socket.on('error', data => {
      this._passOnEvent('error', data);
    });
    this._socket.on('close', data => {
      this._passOnEvent('close', data);
    });
    this._socket.on('connect', data => {
      this._passOnEvent('connect', data);
      this._socket.setNoDelay(this._noDelay);
    });
    this._socket.on('connection', data => {
      this._passOnEvent('connection', data);
    });
  };

  this._passOnEvent = (event, data) => {
    this._listeners[event] = this._listeners[event] || [];
    for (const savedListener of this._listeners[event]) {
      savedListener(data);
    }
  };

  this.on = (event, listener) => {
    this._listeners[event] = this._listeners[event] || [];
    this._listeners[event].push(listener);
  };

  this.removeListener = (event, listener) => {
    this._listeners[event] = this._listeners[event] || [];
    const newListeners = [];

    let found = false;
    for (const savedListener of this._listeners[event]) {
      if (savedListener === listener) {
        // found our listener
        found = true;
        // we just skip it
      } else {
        // other listeners should go back to original array
        newListeners.push(savedListener);
      }
    }

    if (found) {
      this._listeners[event] = newListeners;
    } else {
      // something went wrong, lets just cleanup all listeners
      this._listeners[event] = [];
    }
  };

  this.end = () => {
    this._socket.end();
  };

  this.destroy = () => {
    this._socket.destroy();
  };

  this.write = data => {
    this._socket.write(data);
  };
}

module.exports.Socket = Socket;
