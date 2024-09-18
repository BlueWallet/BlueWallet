import DefaultPreference from 'react-native-default-preference';
import { GROUP_IO_BLUEWALLET } from '../blue_modules/currency';

export const BLOCK_EXPLORER = 'blockExplorer';
export const BLOCK_EXPLORERS = {
  DEFAULT: 'https://mempool.space/tx',
  BLOCKCHAIR: 'https://blockchair.com',
  BLOCKSTREAM: 'https://blockstream.info',
  CUSTOM: 'custom',
};

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
    await DefaultPreference.set(BLOCK_EXPLORER, url); // Save whatever URL is provided (either predefined or custom)
    return true;
  } catch (error) {
    console.error('Error saving block explorer:', error);
    return false;
  }
};
