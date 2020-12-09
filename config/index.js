import Config from 'react-native-config';

const bitcoin = require('bitcoinjs-lib');

const {
  ENVIRONMENT,
  SENTRY_DSN,
  HOSTS,
  PORT,
  BTCV_NETWORK,
  PROTOCOL,
  ELECTRUM_X_PROTOCOL_VERSION,
  IS_BETA,
  APP_ID,
  APPLICATION_NAME,
  EXPLORER_URL,
} = Config;

const defaultNetworkName = 'bitcoinvault';

const networkName = BTCV_NETWORK || defaultNetworkName;

const hosts = (HOSTS || 'electrumx-mainnet1.bitcoinvault.global,electrumx-mainnet2.bitcoinvault.global').split(',');

export default {
  environment: ENVIRONMENT,
  isBeta: IS_BETA === 'true',
  applicationId: APP_ID,
  applicationName: APPLICATION_NAME,
  hosts,
  port: PORT || '443',
  networkName,
  network: bitcoin.alt_networks[networkName],
  protocol: PROTOCOL || 'tcp',
  electrumXProtocolVersion: ELECTRUM_X_PROTOCOL_VERSION || '2.0',
  explorerUrl: EXPLORER_URL || 'https://explorer.bitcoinvault.global',
  sentryDsn: SENTRY_DSN,
};
