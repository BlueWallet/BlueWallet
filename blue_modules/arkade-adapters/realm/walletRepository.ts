// Realm-based implementation of WalletRepository from @arkade-os/sdk.
// Vendored from upstream PR arkade-os/ts-sdk#318 (not yet merged).

import type { WalletRepository, ArkTransaction, ExtendedCoin, ExtendedVirtualCoin, TxType } from '@arkade-os/sdk';
import { serializeVtxo, serializeUtxo, deserializeVtxo, deserializeUtxo, type SerializedTapLeaf } from './serialization';

// WalletState is defined in @arkade-os/sdk's repositories but not re-exported
// from the public API. We define it locally to match the interface contract.
interface WalletState {
  lastSyncTime?: number;
  settings?: Record<string, any>;
}

// Schema names must match those in schemas.ts
const VTXO_SCHEMA = 'ArkVtxo';
const UTXO_SCHEMA = 'ArkUtxo';
const TX_SCHEMA = 'ArkTransaction';
const STATE_SCHEMA = 'ArkWalletState';

/**
 * Realm-based implementation of WalletRepository.
 *
 * Serialises binary fields (tapTree, tapLeafScripts, extraWitness) to hex
 * strings before persisting, and deserialises them back on reads.
 *
 * The constructor accepts a Realm instance typed as `any` so that the
 * concrete Realm import stays in the caller (avoids bundler issues on
 * platforms that don't support Realm).
 */
export class RealmWalletRepository implements WalletRepository {
  readonly version = 1 as const;
  private readonly realm: any;

  constructor(realm: any) {
    this.realm = realm;
  }

  // ── VTXOs ──────────────────────────────────────────────────────────

  async getVtxos(address: string): Promise<ExtendedVirtualCoin[]> {
    const rows = this.realm.objects(VTXO_SCHEMA).filtered('address == $0', address);
    return Array.from(rows).map((row: any) => this.rowToVtxo(row));
  }

  async saveVtxos(address: string, vtxos: ExtendedVirtualCoin[]): Promise<void> {
    this.realm.write(() => {
      for (const vtxo of vtxos) {
        const s = serializeVtxo(vtxo);
        this.realm.create(
          VTXO_SCHEMA,
          {
            pk: `${vtxo.txid}:${vtxo.vout}`,
            address,
            txid: vtxo.txid,
            vout: vtxo.vout,
            value: vtxo.value,
            tapTree: s.tapTree,
            forfeitCb: s.forfeitTapLeafScript.cb,
            forfeitS: s.forfeitTapLeafScript.s,
            intentCb: s.intentTapLeafScript.cb,
            intentS: s.intentTapLeafScript.s,
            extraWitnessJson: s.extraWitness ? JSON.stringify(s.extraWitness) : null,
            statusJson: JSON.stringify(vtxo.status),
            virtualStatusJson: JSON.stringify(vtxo.virtualStatus),
            spentBy: vtxo.spentBy ?? null,
            settledBy: vtxo.settledBy ?? null,
            arkTxId: vtxo.arkTxId ?? null,
            createdAt: vtxo.createdAt.toISOString(),
            isUnrolled: vtxo.isUnrolled,
            isSpent: vtxo.isSpent ?? null,
            assetsJson: vtxo.assets ? JSON.stringify(vtxo.assets) : null,
          },
          'modified' as any,
        );
      }
    });
  }

  async deleteVtxos(address: string): Promise<void> {
    const rows = this.realm.objects(VTXO_SCHEMA).filtered('address == $0', address);
    this.realm.write(() => {
      this.realm.delete(rows);
    });
  }

  // ── UTXOs ──────────────────────────────────────────────────────────

  async getUtxos(address: string): Promise<ExtendedCoin[]> {
    const rows = this.realm.objects(UTXO_SCHEMA).filtered('address == $0', address);
    return Array.from(rows).map((row: any) => this.rowToUtxo(row));
  }

  async saveUtxos(address: string, utxos: ExtendedCoin[]): Promise<void> {
    this.realm.write(() => {
      for (const utxo of utxos) {
        const s = serializeUtxo(utxo);
        this.realm.create(
          UTXO_SCHEMA,
          {
            pk: `${utxo.txid}:${utxo.vout}`,
            address,
            txid: utxo.txid,
            vout: utxo.vout,
            value: utxo.value,
            tapTree: s.tapTree,
            forfeitCb: s.forfeitTapLeafScript.cb,
            forfeitS: s.forfeitTapLeafScript.s,
            intentCb: s.intentTapLeafScript.cb,
            intentS: s.intentTapLeafScript.s,
            extraWitnessJson: s.extraWitness ? JSON.stringify(s.extraWitness) : null,
            statusJson: JSON.stringify(utxo.status),
          },
          'modified' as any,
        );
      }
    });
  }

  async deleteUtxos(address: string): Promise<void> {
    const rows = this.realm.objects(UTXO_SCHEMA).filtered('address == $0', address);
    this.realm.write(() => {
      this.realm.delete(rows);
    });
  }

  // ── Transactions ───────────────────────────────────────────────────

  async getTransactionHistory(address: string): Promise<ArkTransaction[]> {
    const rows = this.realm.objects(TX_SCHEMA).filtered('address == $0', address);
    return Array.from(rows).map((row: any) => this.rowToTx(row));
  }

  async saveTransactions(address: string, txs: ArkTransaction[]): Promise<void> {
    this.realm.write(() => {
      for (const tx of txs) {
        this.realm.create(
          TX_SCHEMA,
          {
            pk: `${address}:${tx.key.boardingTxid}:${tx.key.commitmentTxid}:${tx.key.arkTxid}`,
            address,
            boardingTxid: tx.key.boardingTxid,
            commitmentTxid: tx.key.commitmentTxid,
            arkTxid: tx.key.arkTxid,
            type: tx.type,
            amount: tx.amount,
            settled: tx.settled,
            createdAt: tx.createdAt,
            assetsJson: tx.assets ? JSON.stringify(tx.assets) : null,
          },
          'modified' as any,
        );
      }
    });
  }

  async deleteTransactions(address: string): Promise<void> {
    const rows = this.realm.objects(TX_SCHEMA).filtered('address == $0', address);
    this.realm.write(() => {
      this.realm.delete(rows);
    });
  }

  // ── Wallet State ───────────────────────────────────────────────────

  async getWalletState(): Promise<WalletState | null> {
    const row = this.realm.objectForPrimaryKey(STATE_SCHEMA, 'state');
    if (!row) return null;
    const state: WalletState = {};
    if (row.lastSyncTime != null) {
      state.lastSyncTime = row.lastSyncTime;
    }
    if (row.settingsJson) {
      state.settings = JSON.parse(row.settingsJson);
    }
    return state;
  }

  async saveWalletState(state: WalletState): Promise<void> {
    this.realm.write(() => {
      this.realm.create(
        STATE_SCHEMA,
        {
          key: 'state',
          lastSyncTime: state.lastSyncTime ?? null,
          settingsJson: state.settings ? JSON.stringify(state.settings) : null,
        },
        'modified' as any,
      );
    });
  }

  // ── Clear ──────────────────────────────────────────────────────────

  async clear(): Promise<void> {
    this.realm.write(() => {
      this.realm.delete(this.realm.objects(VTXO_SCHEMA));
      this.realm.delete(this.realm.objects(UTXO_SCHEMA));
      this.realm.delete(this.realm.objects(TX_SCHEMA));
      this.realm.delete(this.realm.objects(STATE_SCHEMA));
    });
  }

  // ── AsyncDisposable ────────────────────────────────────────────────

  async [Symbol.asyncDispose](): Promise<void> {
    // Realm lifecycle is managed by the caller; nothing to dispose here.
  }

  // ── Private helpers ────────────────────────────────────────────────

  private rowToVtxo(row: any): ExtendedVirtualCoin {
    const forfeitTapLeafScript: SerializedTapLeaf = { cb: row.forfeitCb, s: row.forfeitS };
    const intentTapLeafScript: SerializedTapLeaf = { cb: row.intentCb, s: row.intentS };
    const extraWitness: string[] | undefined = row.extraWitnessJson ? JSON.parse(row.extraWitnessJson) : undefined;

    return deserializeVtxo({
      txid: row.txid,
      vout: row.vout,
      value: row.value,
      tapTree: row.tapTree,
      forfeitTapLeafScript,
      intentTapLeafScript,
      extraWitness,
      status: JSON.parse(row.statusJson),
      virtualStatus: JSON.parse(row.virtualStatusJson),
      spentBy: row.spentBy ?? undefined,
      settledBy: row.settledBy ?? undefined,
      arkTxId: row.arkTxId ?? undefined,
      createdAt: new Date(row.createdAt),
      isUnrolled: row.isUnrolled,
      isSpent: row.isSpent ?? undefined,
      assets: row.assetsJson ? JSON.parse(row.assetsJson) : undefined,
    });
  }

  private rowToUtxo(row: any): ExtendedCoin {
    const forfeitTapLeafScript: SerializedTapLeaf = { cb: row.forfeitCb, s: row.forfeitS };
    const intentTapLeafScript: SerializedTapLeaf = { cb: row.intentCb, s: row.intentS };
    const extraWitness: string[] | undefined = row.extraWitnessJson ? JSON.parse(row.extraWitnessJson) : undefined;

    return deserializeUtxo({
      txid: row.txid,
      vout: row.vout,
      value: row.value,
      tapTree: row.tapTree,
      forfeitTapLeafScript,
      intentTapLeafScript,
      extraWitness,
      status: JSON.parse(row.statusJson),
    });
  }

  private rowToTx(row: any): ArkTransaction {
    return {
      key: {
        boardingTxid: row.boardingTxid,
        commitmentTxid: row.commitmentTxid,
        arkTxid: row.arkTxid,
      },
      type: row.type as TxType,
      amount: row.amount,
      settled: row.settled,
      createdAt: row.createdAt,
      assets: row.assetsJson ? JSON.parse(row.assetsJson) : undefined,
    };
  }
}
