/**
 * Checks if current configuration includes "beta" word.
 */
export const isBeta = (): boolean => {
  const argparse = require('detox/src/utils/argparse');

  return argparse.getArgValue('configuration').includes('beta');
};
