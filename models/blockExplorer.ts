import DefaultPreference from 'react-native-default-preference';
import { GROUP_IO_BLUEWALLET } from '../blue_modules/currency';
import loc from '../loc';

export const BLOCK_EXPLORER = 'blockExplorer';

export const BLOCK_EXPLORERS = {
  DEFAULT: 'https://mempool.space',
  BLOCKCHAIR: 'https://blockchair.com',
  BLOCKSTREAM: 'https://blockstream.info',
  CUSTOM: 'custom',
};

export const blockExplorers = [
  { name: `${loc._.default} - Mempool.space`, key: 'default', url: BLOCK_EXPLORERS.DEFAULT },
  { name: 'Blockchair', key: 'blockchair', url: BLOCK_EXPLORERS.BLOCKCHAIR },
  { name: 'Blockstream.info', key: 'blockstream', url: BLOCK_EXPLORERS.BLOCKSTREAM },
  { name: loc.settings.block_explorer_custom, key: 'custom', url: null },
];

export const getBlockExplorer = async (): Promise<string> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const selectedExplorer = await DefaultPreference.get(BLOCK_EXPLORER);
    return selectedExplorer || BLOCK_EXPLORERS.DEFAULT; // Return the selected explorer or default to mempool.space
  } catch (error) {
    console.error('Error getting block explorer:', error);
    return BLOCK_EXPLORERS.DEFAULT;
  }
};

export const saveBlockExplorer = async (url: string): Promise<boolean> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    await DefaultPreference.set(BLOCK_EXPLORER, url);
    return true;
  } catch (error) {
    console.error('Error saving block explorer:', error);
    return false;
  }
};
