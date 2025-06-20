import bip21, { TOptions } from 'bip21';

/**
 * Decode a BIP21 URI
 */
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

/**
 * Encode a BIP21 URI
 */
export const bip21encode = (address: string, options?: TOptions): string => {
  // uppercase address if bech32 to satisfy BIP_0173
  const isBech32 = address.startsWith('bc1');
  if (isBech32) {
    address = address.toUpperCase();
  }

  for (const key in options) {
    if (key === 'label' && String(options[key]).replace(' ', '').length === 0) {
      delete options[key];
    }
    if (key === 'amount' && !(Number(options[key]) > 0)) {
      delete options[key];
    }
  }
  return bip21.encode(address, options);
};

/**
 * Decode a Bitcoin URI and extract components
 */
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
