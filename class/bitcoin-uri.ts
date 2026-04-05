import bip21, { TOptions } from 'bip21';
import * as bitcoin from 'bitcoinjs-lib';

export const isTXNFile = (filePath: string): boolean => {
  return filePath.toLowerCase().endsWith('.txn');
};

export const isPossiblyPSBTFile = (filePath: string): boolean => {
  return filePath.toLowerCase().endsWith('.psbt');
};

export const isBitcoinAddress = (address: string): boolean => {
  const normalizedAddress = address
    .replace('://', ':')
    .replace('bitcoin:', '')
    .replace('BITCOIN:', '')
    .replace('bitcoin=', '')
    .split('?')[0];

  try {
    bitcoin.address.toOutputScript(normalizedAddress);
    return true;
  } catch (_) {
    return false;
  }
};

export const bip21decode = (uri?: string) => {
  if (!uri) {
    throw new Error('No URI provided');
  }

  let replacedUri = uri;
  for (const replaceMe of ['BITCOIN://', 'bitcoin://', 'BITCOIN:']) {
    replacedUri = replacedUri.replace(replaceMe, 'bitcoin:');
  }

  return bip21.decode(replacedUri);
};

export const bip21encode = (address: string, options?: TOptions): string => {
  const cleanedOptions = { ...(options || {}) } as TOptions;

  if (address.startsWith('bc1')) {
    address = address.toUpperCase();
  }

  for (const key in cleanedOptions) {
    if (key === 'label' && String(cleanedOptions[key]).trim().length === 0) {
      delete cleanedOptions[key];
    }
    if (key === 'amount' && !(Number(cleanedOptions[key]) > 0)) {
      delete cleanedOptions[key];
    }
  }

  return bip21.encode(address, cleanedOptions);
};

export const decodeBitcoinUri = (uri: string) => {
  let amount;
  let address = uri || '';
  let memo = '';
  let payjoinUrl = '';

  try {
    const parsedBitcoinUri = bip21decode(uri);
    address = parsedBitcoinUri.address ? parsedBitcoinUri.address.toString() : address;

    if ('options' in parsedBitcoinUri) {
      if (parsedBitcoinUri.options.amount) {
        amount = Number(parsedBitcoinUri.options.amount);
      }
      if (parsedBitcoinUri.options.label) {
        memo = parsedBitcoinUri.options.label;
      }
      if (parsedBitcoinUri.options.pj) {
        payjoinUrl = parsedBitcoinUri.options.pj;
      }
    }
  } catch (_) {}

  return { address, amount, memo, payjoinUrl };
};
