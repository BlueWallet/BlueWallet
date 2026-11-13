/** Written by @arkade-os/boltz-swap's RealmSwapRepository; `data` holds the whole swap as JSON. */
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
