const SENSITIVE_LINKING_PARAM_NAMES = new Set([
  'walletID',
  'walletType',
  'address',
  'txid',
  'hash',
  'xpub',
  'uri',
  'bitcoin',
  'lndInvoice',
  'deepLinkPSBTFilePath',
  'deepLinkPSBT',
  'label',
]);

export const redactSensitiveString = (value: string): string => {
  return value
    .replace(/(file:\/\/|content:\/\/)([^?\s]+)/gi, '$1<redacted>')
    .replace(
      /([?&])(walletID|walletType|address|txid|hash|xpub|uri|bitcoin|lndInvoice|deepLinkPSBTFilePath|deepLinkPSBT|label)=([^&]*)/gi,
      (_match, prefix, key) => `${prefix}${key}=<redacted>`,
    );
};

export const redactSensitiveValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return redactSensitiveString(value);
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactSensitiveString(value.message),
    };
  }

  if (Array.isArray(value)) {
    return value.map(item => redactSensitiveValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        SENSITIVE_LINKING_PARAM_NAMES.has(key) && nestedValue !== undefined ? '<redacted>' : redactSensitiveValue(nestedValue),
      ]),
    );
  }

  return value;
};

export const linkingDebugLog = (message: string, ...values: unknown[]): void => {
  if (!__DEV__) {
    return;
  }

  console.log(message, ...values.map(value => redactSensitiveValue(value)));
};

export const linkingDebugWarn = (message: string, ...values: unknown[]): void => {
  if (!__DEV__) {
    return;
  }

  console.warn(message, ...values.map(value => redactSensitiveValue(value)));
};
