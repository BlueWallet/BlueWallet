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

  // functions not supported by RN module, yet:
  client.setEncoding = () => {};
  client.setKeepAlive = () => {};
  client.setNoDelay = () => {};

  return client;
}

module.exports.connect = connect;
