import Config from 'react-native-config';

const bitcoin = require('bitcoinjs-lib');

const { SENTRY_DSN, HOST, PORT, BTCV_NETWORK, PROTOCOL, ELECTRUM_X_PROTOCOL_VERSION } = Config;

export default {
  sentryDsn: SENTRY_DSN || '',
  host: HOST || 'e1.electrumx.bitcoinvault.global',
  port: PORT || '50001',
  network: bitcoin.alt_networks[BTCV_NETWORK || 'bitcoinvault'],
  protocol: PROTOCOL || 'tcp',
  electrumXProtocolVersion: ELECTRUM_X_PROTOCOL_VERSION || '2.0',
};
