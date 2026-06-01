// Per-wallet Realm storage for notification-suppression entries.
//
// Lives inside the per-wallet Arkade Realm so suppression state is
// bucket-scoped, encrypted by the wallet's existing Realm key, and removed
// automatically when the wallet is deleted (deleteArkadeRealm tears down the
// whole file). Avoids leaking a stable per-wallet handle into a global
// AsyncStorage key.

export type ArkSwapNotificationAction = 'claim' | 'refund';

// Realm schema. `realm` is a peer dependency we don't import here directly;
// the schema is a plain object consumed by realmInstance.ts via the schemas
// array. Pattern matches BoltzSwapSchema in @arkade-os/boltz-swap.
export const ArkSwapNotificationSuppressionSchema = {
  name: 'ArkSwapNotificationSuppression',
  primaryKey: 'id',
  properties: {
    id: 'string',
    swapId: 'string',
    action: 'string',
    postedAt: 'int',
  },
};

const compositeId = (swapId: string, action: ArkSwapNotificationAction): string => `${swapId}:${action}`;

interface ArkSwapNotificationSuppressionRow {
  id: string;
  swapId: string;
  action: ArkSwapNotificationAction;
  postedAt: number;
}

export class RealmNotificationSuppressionRepository {
  private readonly realm: any;

  constructor(realm: any) {
    this.realm = realm;
  }

  has(swapId: string, action: ArkSwapNotificationAction): boolean {
    const row = this.realm.objectForPrimaryKey('ArkSwapNotificationSuppression', compositeId(swapId, action));
    return Boolean(row);
  }

  record(swapId: string, action: ArkSwapNotificationAction): void {
    this.realm.write(() => {
      const row: ArkSwapNotificationSuppressionRow = {
        id: compositeId(swapId, action),
        swapId,
        action,
        postedAt: Date.now(),
      };
      this.realm.create('ArkSwapNotificationSuppression', row, 'modified');
    });
  }

  clearForSwap(swapId: string): void {
    this.realm.write(() => {
      const matches = this.realm.objects('ArkSwapNotificationSuppression').filtered('swapId == $0', swapId);
      this.realm.delete(matches);
    });
  }

  clearForSwapAction(swapId: string, action: ArkSwapNotificationAction): void {
    this.realm.write(() => {
      const row = this.realm.objectForPrimaryKey('ArkSwapNotificationSuppression', compositeId(swapId, action));
      if (row) this.realm.delete(row);
    });
  }
}
