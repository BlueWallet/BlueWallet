// Realm-based implementation of ContractRepository from @arkade-os/sdk.
// Vendored from upstream PR arkade-os/ts-sdk#318 (not yet merged).

import type { ContractRepository, Contract, ContractState } from '@arkade-os/sdk';

// ContractFilter is also exported from @arkade-os/sdk (via repositories re-export)
// but we define it locally to avoid import issues if it's only a type re-export.
interface ContractFilter {
  script?: string | string[];
  state?: ContractState | ContractState[];
  type?: string | string[];
}

// Schema name must match schemas.ts
const CONTRACT_SCHEMA = 'ArkContract';

/**
 * Realm-based implementation of ContractRepository.
 *
 * Contract params and metadata are JSON-serialised into string columns.
 * No binary data needs hex encoding — contracts are purely string-keyed.
 */
export class RealmContractRepository implements ContractRepository {
  readonly version = 1 as const;
  private readonly realm: any;

  constructor(realm: any) {
    this.realm = realm;
  }

  // ── Queries ────────────────────────────────────────────────────────

  async getContracts(filter?: ContractFilter): Promise<Contract[]> {
    let results = this.realm.objects(CONTRACT_SCHEMA);

    if (filter) {
      const clauses: string[] = [];
      const args: any[] = [];
      let argIndex = 0;

      if (filter.script !== undefined) {
        const scripts = Array.isArray(filter.script) ? filter.script : [filter.script];
        const placeholders = scripts.map(() => `$${argIndex++}`).join(', ');
        clauses.push(`script IN {${placeholders}}`);
        args.push(...scripts);
      }

      if (filter.state !== undefined) {
        const states = Array.isArray(filter.state) ? filter.state : [filter.state];
        const placeholders = states.map(() => `$${argIndex++}`).join(', ');
        clauses.push(`state IN {${placeholders}}`);
        args.push(...states);
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

    return Array.from(results).map((row: any) => this.rowToContract(row));
  }

  // ── Mutations ──────────────────────────────────────────────────────

  async saveContract(contract: Contract): Promise<void> {
    this.realm.write(() => {
      this.realm.create(
        CONTRACT_SCHEMA,
        {
          script: contract.script,
          address: contract.address,
          type: contract.type,
          state: contract.state,
          paramsJson: JSON.stringify(contract.params),
          createdAt: contract.createdAt,
          expiresAt: contract.expiresAt ?? null,
          label: contract.label ?? null,
          metadataJson: contract.metadata ? JSON.stringify(contract.metadata) : null,
        },
        'modified' as any,
      );
    });
  }

  async deleteContract(script: string): Promise<void> {
    const row = this.realm.objectForPrimaryKey(CONTRACT_SCHEMA, script);
    if (row) {
      this.realm.write(() => {
        this.realm.delete(row);
      });
    }
  }

  // ── Clear ──────────────────────────────────────────────────────────

  async clear(): Promise<void> {
    this.realm.write(() => {
      this.realm.delete(this.realm.objects(CONTRACT_SCHEMA));
    });
  }

  // ── AsyncDisposable ────────────────────────────────────────────────

  async [Symbol.asyncDispose](): Promise<void> {
    // Realm lifecycle is managed by the caller; nothing to dispose here.
  }

  // ── Private helpers ────────────────────────────────────────────────

  private rowToContract(row: any): Contract {
    return {
      script: row.script,
      address: row.address,
      type: row.type,
      state: row.state as ContractState,
      params: JSON.parse(row.paramsJson),
      createdAt: row.createdAt,
      expiresAt: row.expiresAt ?? undefined,
      label: row.label ?? undefined,
      metadata: row.metadataJson ? JSON.parse(row.metadataJson) : undefined,
    };
  }
}
