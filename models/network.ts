import * as bitcoin from 'bitcoinjs-lib';

export type NetworkType = 'mainnet' | 'testnet' | 'signet';

let _networkType: NetworkType = 'mainnet';

/**
 * Sets the current network type. This should be called early during app initialization,
 * before any wallet operations. Changing the network at runtime takes effect for new
 * Electrum connections, but existing wallets in memory retain stale state — the user
 * should restart the app after switching.
 */
export function setNetworkType(network: NetworkType): void {
  _networkType = network;
}

/**
 * Returns the bitcoinjs-lib network object for the current network.
 * Testnet and signet both use bitcoin.networks.testnet (same address format, derivation paths).
 */
export function getNetwork(): bitcoin.Network {
  if (_networkType === 'testnet' || _networkType === 'signet') {
    return bitcoin.networks.testnet;
  }
  return bitcoin.networks.bitcoin;
}

/**
 * Returns true if the current network is not mainnet.
 */
export function isTestnet(): boolean {
  return _networkType !== 'mainnet';
}
