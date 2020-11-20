import Config from 'react-native-config';

const bitcoin = require('bitcoinjs-lib');

const { SENTRY_DSN, HOST, PORT, BTCV_NETWORK, PROTOCOL, ELECTRUM_X_PROTOCOL_VERSION, IS_BETA, EXPLORER_URL } = Config;

let isBeta = false;
try {
  isBeta = JSON.parse(IS_BETA);
} catch (_) {}

const defaultNetworkName = 'bitcoinvault';

const networkName = BTCV_NETWORK || defaultNetworkName;

export default {
  sentryDsn: SENTRY_DSN || '',
  host: HOST || 'e1.electrumx.bitcoinvault.global',
  port: PORT || '50001',
  network: bitcoin.alt_networks[networkName],
  networkName,
  protocol: PROTOCOL || 'tcp',
  electrumXProtocolVersion: ELECTRUM_X_PROTOCOL_VERSION || '2.0',
  isBeta,
  applicationId: isBeta ? 'io.goldwallet.wallet.testnet' : 'io.goldwallet.wallet',
  applicationName: isBeta ? 'Testnet Gold Wallet' : 'GoldWallet',
  explorerUrl: EXPLORER_URL || 'https://explorer.bitcoinvault.global',
};
