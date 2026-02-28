// Vendored from arkade-os/ts-sdk PR #318 and arkade-os/boltz-swap PR #80
// Remove this file once both PRs merge and import from packages directly.

export const ArkVtxoSchema = {
  name: 'ArkVtxo',
  primaryKey: 'pk',
  properties: {
    pk: 'string',
    address: { type: 'string', indexed: true },
    txid: 'string',
    vout: 'int',
    value: 'int',
    tapTree: 'string',
    forfeitCb: 'string',
    forfeitS: 'string',
    intentCb: 'string',
    intentS: 'string',
    extraWitnessJson: 'string?',
    statusJson: 'string',
    virtualStatusJson: 'string',
    spentBy: 'string?',
    settledBy: 'string?',
    arkTxId: 'string?',
    createdAt: 'string',
    isUnrolled: 'bool',
    isSpent: 'bool?',
    assetsJson: 'string?',
  },
} as const;

export const ArkUtxoSchema = {
  name: 'ArkUtxo',
  primaryKey: 'pk',
  properties: {
    pk: 'string',
    address: { type: 'string', indexed: true },
    txid: 'string',
    vout: 'int',
    value: 'int',
    tapTree: 'string',
    forfeitCb: 'string',
    forfeitS: 'string',
    intentCb: 'string',
    intentS: 'string',
    extraWitnessJson: 'string?',
    statusJson: 'string',
  },
} as const;

export const ArkTransactionSchema = {
  name: 'ArkTransaction',
  primaryKey: 'pk',
  properties: {
    pk: 'string',
    address: { type: 'string', indexed: true },
    boardingTxid: 'string',
    commitmentTxid: 'string',
    arkTxid: 'string',
    type: 'string',
    amount: 'int',
    settled: 'bool',
    createdAt: 'int',
    assetsJson: 'string?',
  },
} as const;

export const ArkWalletStateSchema = {
  name: 'ArkWalletState',
  primaryKey: 'key',
  properties: {
    key: 'string',
    lastSyncTime: 'int?',
    settingsJson: 'string?',
  },
} as const;

export const ArkContractSchema = {
  name: 'ArkContract',
  primaryKey: 'script',
  properties: {
    script: 'string',
    address: 'string',
    type: { type: 'string', indexed: true },
    state: { type: 'string', indexed: true },
    paramsJson: 'string',
    createdAt: 'int',
    expiresAt: 'int?',
    label: 'string?',
    metadataJson: 'string?',
  },
} as const;

export const BoltzSwapSchema = {
  name: 'BoltzSwap',
  primaryKey: 'id',
  properties: {
    id: 'string',
    type: 'string',
    status: 'string',
    createdAt: 'int',
    data: 'string',
  },
};

export const ArkRealmSchemas = [ArkVtxoSchema, ArkUtxoSchema, ArkTransactionSchema, ArkWalletStateSchema, ArkContractSchema];

export const BoltzRealmSchemas = [BoltzSwapSchema];

export const AllArkadeSchemas = [...ArkRealmSchemas, ...BoltzRealmSchemas];
