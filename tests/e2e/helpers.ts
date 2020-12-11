export const WAIT_FOR_ELEMENT_TIMEOUT = 10 * 1000;

export const WALLET = {
  FAST_PUBLIC_KEY:
    '04c57b0ee8ede52316d1d403fb8c4411d1c1c0e1e512486266eedac0a43bafb8d2f92a667dc971b2c2c50c06daa4df8668d661791f600100b61b3e96497b87d512',
  FAST_PRIVATE_KEY: 'e8561132e976f93800af9706d0e8e239c79d30ae646f4ecda065aba373f1e216',
  FAST_SEED_PHRASE: 'neck junk hen balance glue brain attitude label salmon hurdle mean discover',
  CANCEL_PUBLIC_KEY:
    '047ca834eb881ff79f468eae4b684b1aaae37f98a565f0b42237356874a3e479a4562dd44ebc3968266a5830783e9d4279094f3e42a4af4ecb575599e44200f71c',
  CANCEL_PRIVATE_KEY: 'e3e262d0639535bcd38c91c6a414fbe046c9519212f074b06d40322130e01dad',
  CANCEL_SEED_PHRASE: 'shy physical adapt notice rapid inside food scrub basic inner save always',
};

/**
 * Checks if current configuration includes "beta" word.
 */
export const isBeta = (): boolean => {
  const argparse = require('detox/src/utils/argparse');

  return argparse.getArgValue('configuration').includes('beta');
};
