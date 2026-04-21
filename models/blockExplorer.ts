// blockExplorer.ts
import DefaultPreference from 'react-native-default-preference';
import { NetworkType } from './network';

export interface BlockExplorer {
  key: string;
  name: string;
  url: string;
}

export const BLOCK_EXPLORERS: { [key: string]: BlockExplorer } = {
  default: { key: 'default', name: 'Mempool.space', url: 'https://mempool.space' },
  blockchair: { key: 'blockchair', name: 'Blockchair', url: 'https://blockchair.com/bitcoin' },
  blockstream: { key: 'blockstream', name: 'Blockstream.info', url: 'https://blockstream.info' },
  custom: { key: 'custom', name: 'Custom', url: '' }, // Custom URL will be handled separately
};

export const getBlockExplorersList = (): BlockExplorer[] => {
  return Object.values(BLOCK_EXPLORERS);
};

export const normalizeUrl = (url: string): string => {
  return url.replace(/\/+$/, '');
};

export const isValidUrl = (url: string): boolean => {
  const pattern = /^(https?:\/\/)/;
  return pattern.test(url);
};

export const findMatchingExplorerByDomain = (url: string): BlockExplorer | null => {
  const domain = getDomain(url);
  for (const explorer of Object.values(BLOCK_EXPLORERS)) {
    if (getDomain(explorer.url) === domain) {
      return explorer;
    }
  }
  return null;
};

export const getDomain = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

/**
 * Adjusts a block explorer URL for the given network.
 * e.g. mempool.space -> mempool.space/testnet4, blockstream.info -> blockstream.info/testnet
 */
export const adjustBlockExplorerUrlForNetwork = (url: string, network: NetworkType): string => {
  if (network === 'mainnet') return url;

  const normalized = normalizeUrl(url);
  const networkPath = network === 'testnet' ? 'testnet4' : 'signet';

  const domain = getDomain(normalized);

  if (domain === 'mempool.space') {
    return `${normalized}/${networkPath}`;
  }
  if (domain === 'blockstream.info') {
    return `${normalized}/${network === 'testnet' ? 'testnet' : 'signet'}`;
  }
  if (domain === 'blockchair.com') {
    return `${normalized.replace('/bitcoin', '')}/${network === 'testnet' ? 'bitcoin/testnet' : 'bitcoin/signet'}`;
  }

  return normalized;
};

const BLOCK_EXPLORER_STORAGE_KEY = 'blockExplorer';

export const saveBlockExplorer = async (url: string): Promise<boolean> => {
  try {
    await DefaultPreference.set(BLOCK_EXPLORER_STORAGE_KEY, url);
    return true;
  } catch (error) {
    console.error('Error saving block explorer:', error);
    return false;
  }
};

export const removeBlockExplorer = async (): Promise<boolean> => {
  try {
    await DefaultPreference.clear(BLOCK_EXPLORER_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error removing block explorer:', error);
    return false;
  }
};

export const getBlockExplorerUrl = async (): Promise<string> => {
  try {
    const url = (await DefaultPreference.get(BLOCK_EXPLORER_STORAGE_KEY)) as string | null;
    return url ?? BLOCK_EXPLORERS.default.url;
  } catch (error) {
    console.error('Error getting block explorer:', error);
    return BLOCK_EXPLORERS.default.url;
  }
};
