/**
 * @fileOverview adapter for ReactNative TCP module
 * This module mimics the nodejs tls api and is intended to work in RN environment.
 * @see https://github.com/Rapsssito/react-native-tcp-socket
 */

import TcpSocket from 'react-native-tcp-socket';

/**
 * Constructor function. Mimicking nodejs/tls api
 *
 * @constructor
 */
function connect(config, callback) {
  const client = TcpSocket.createConnection(
    {
      port: config.port,
      host: config.host,
      tls: true,
      tlsCheckValidity: config.rejectUnauthorized,
    },
    callback,
  );

  // defaults:
  this._noDelay = true;

  // functions not supported by RN module, yet:
  client.setTimeout = () => {};
  client.setEncoding = () => {};
  client.setKeepAlive = () => {};

  // we will save `noDelay` and proxy it to socket object when its actually created and connected:
  const realSetNoDelay = client.setNoDelay; // reference to real setter
  client.setNoDelay = noDelay => {
    this._noDelay = noDelay;
  };

  client.on('connect', () => {
    realSetNoDelay.apply(client, [this._noDelay]);
  });

  return client;
}

module.exports.connect = connect;
