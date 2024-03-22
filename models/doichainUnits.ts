export const DoichainUnit = {
  DOI: 'DOI',
  SWARTZ: 'swartz',
  LOCAL_CURRENCY: 'local_currency',
  MAX: 'MAX',
} as const;
export type DoichainUnit = typeof DoichainUnit[keyof typeof DoichainUnit];

export const Chain = {
  ONCHAIN: 'ONCHAIN',
  OFFCHAIN: 'OFFCHAIN',
} as const;
export type Chain = typeof Chain[keyof typeof Chain];
