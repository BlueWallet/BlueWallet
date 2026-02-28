// Realm-based implementation of SwapRepository from @arkade-os/boltz-swap.
// Vendored from upstream PR arkade-os/boltz-swap#80 (not yet merged).

import type { SwapRepository, PendingSwap } from '@arkade-os/boltz-swap';

// GetSwapsFilter is not exported from @arkade-os/boltz-swap's public API,
// so we vendor the type definition here (mirrors the internal interface).
interface GetSwapsFilter {
  id?: string | string[];
  status?: string | string[];
  type?: PendingSwap['type'] | PendingSwap['type'][];
  orderBy?: 'createdAt';
  orderDirection?: 'asc' | 'desc';
}

// Schema name must match schemas.ts
const SWAP_SCHEMA = 'BoltzSwap';

/**
 * Realm-based implementation of SwapRepository.
 *
 * Each swap is stored as a JSON blob in the `data` column, with the most
 * commonly queried fields (id, type, status, createdAt) lifted into indexed
 * Realm columns for efficient filtering.
 */
export class RealmSwapRepository implements SwapRepository {
  readonly version = 1 as const;
  private readonly realm: any;

  constructor(realm: any) {
    this.realm = realm;
  }

  // ── Save ───────────────────────────────────────────────────────────

  async saveSwap<T extends PendingSwap>(swap: T): Promise<void> {
    this.realm.write(() => {
      this.realm.create(
        SWAP_SCHEMA,
        {
          id: swap.id,
          type: swap.type,
          status: swap.status,
          createdAt: swap.createdAt,
          data: JSON.stringify(swap),
        },
        'modified' as any,
      );
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────

  async deleteSwap(id: string): Promise<void> {
    const row = this.realm.objectForPrimaryKey(SWAP_SCHEMA, id);
    if (row) {
      this.realm.write(() => {
        this.realm.delete(row);
      });
    }
  }

  // ── Query ──────────────────────────────────────────────────────────

  async getAllSwaps<T extends PendingSwap>(filter?: GetSwapsFilter): Promise<T[]> {
    let results = this.realm.objects(SWAP_SCHEMA);

    if (filter) {
      const clauses: string[] = [];
      const args: any[] = [];
      let argIndex = 0;

      if (filter.id !== undefined) {
        const ids = Array.isArray(filter.id) ? filter.id : [filter.id];
        const placeholders = ids.map(() => `$${argIndex++}`).join(', ');
        clauses.push(`id IN {${placeholders}}`);
        args.push(...ids);
      }

      if (filter.status !== undefined) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        const placeholders = statuses.map(() => `$${argIndex++}`).join(', ');
        clauses.push(`status IN {${placeholders}}`);
        args.push(...statuses);
      }

      if (filter.type !== undefined) {
        const types = Array.isArray(filter.type) ? filter.type : [filter.type];
        const placeholders = types.map(() => `$${argIndex++}`).join(', ');
        clauses.push(`type IN {${placeholders}}`);
        args.push(...types);
      }

      if (clauses.length > 0) {
        results = results.filtered(clauses.join(' AND '), ...args);
      }
    }

    // Apply ordering (default: createdAt descending)
    const orderBy = filter?.orderBy ?? 'createdAt';
    const reverse = (filter?.orderDirection ?? 'desc') === 'desc';
    results = results.sorted(orderBy, reverse);

    return Array.from(results).map((row: any) => JSON.parse(row.data) as T);
  }

  // ── Clear ──────────────────────────────────────────────────────────

  async clear(): Promise<void> {
    this.realm.write(() => {
      this.realm.delete(this.realm.objects(SWAP_SCHEMA));
    });
  }

  // ── AsyncDisposable ────────────────────────────────────────────────

  async [Symbol.asyncDispose](): Promise<void> {
    // Realm lifecycle is managed by the caller; nothing to dispose here.
  }
}
