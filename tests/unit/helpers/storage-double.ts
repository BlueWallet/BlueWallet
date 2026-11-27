/**
 * A double of the two places BlueApp keeps wallets: the secure store
 * (`getItem`/`setItem`) and the Realm key-value backup (`openRealmKeyValue`).
 *
 * Unlike a plain Map it tells apart the states the store code must not
 * confuse (H04): a missing key (code "404", as react-native-secure-key-store
 * rejects on Android and iOS), a locked or failing read, a write that fails,
 * and a backup that cannot be opened or written. The Realm double commits a
 * `write` transaction only when its callback finishes, so a failure inside it
 * leaves the backup as it was, like Realm does.
 *
 * The backup has two places: Caches (`backup`, in use) and Documents
 * (`legacy`, left by older versions). `superseded` is a Documents copy the app
 * set aside after a newer save; `kept` holds the copies a restore set aside
 * (`keyvalue.realm.kept-*`), by path, with the save time of the original.
 * `resetStash` holds, per reset token, the copies a reset renamed aside
 * (`<name>.reset-<token>`) until it deletes or renames them back.
 */
import { BlueApp } from '../../../class/blue-app';

export type ReadFault = 'missing' | 'locked';

/** What a reset renamed aside, by place, until it is deleted or renamed back. */
type ResetStash = {
  backup: Map<string, string> | null;
  legacy: Map<string, string> | null;
  superseded: Map<string, string>;
  kept: Map<string, { data: Map<string, string>; savedAt: number }>;
  /** Files of an earlier unresolved reset, renamed along with the rest. */
  nested: Map<string, ResetStash>;
};

export class StorageDouble {
  readonly primary = new Map<string, string>();
  readonly backup = new Map<string, string>();
  readonly legacy = new Map<string, string>();
  readonly superseded = new Map<string, string>();
  readonly kept = new Map<string, { data: Map<string, string>; savedAt: number }>();
  /** Whether the Documents Realm file exists. */
  legacyFile = false;
  /** A file that exists but cannot be opened right now, per place. */
  openFaultAt: { cache?: Error; legacy?: Error } = {};
  /** Makes `setAsideBackup` fail, as a rename the file system refuses. */
  setAsideFault: Error | null = null;
  /** Makes `keepStoreCopy` fail, as a new Realm file that cannot be written. */
  keepFault: Error | null = null;
  /** Every `setAsideBackup` call, by place. */
  readonly setAside: string[] = [];
  readonly resetStash = new Map<string, ResetStash>();
  /** Makes one of the reset's file steps fail, as a rename or delete the file system refuses. */
  resetFault: { setAside?: Error; undo?: Error; delete?: Error } = {};
  /** Per-key read faults of the secure store. */
  readFault: Record<string, ReadFault | undefined> = {};
  /** Per-key write faults of the secure store. */
  writeFault: Record<string, Error | undefined> = {};
  /** Holds every secure-store write until it resolves: an operation paused in the middle. */
  writeGate: Promise<void> | null = null;
  backupOpenFault: Error | null = null;
  backupWriteFault: Error | null = null;
  /** Whether the Realm file exists. Opening it for a read must never create it. */
  backupFile = false;
  /** Every `openRealmKeyValue` call, in order. */
  backupOpens = 0;
  /** Every completed write, in order: `primary:data`, `backup:data_encrypted`... */
  readonly log: string[] = [];

  attach(app: BlueApp): BlueApp {
    jest.spyOn(app, 'getItem').mockImplementation(async (key: string) => {
      const fault = this.readFault[key];
      if (fault === 'missing') throw Object.assign(new Error(`${key} has not been set`), { code: '404' });
      if (fault === 'locked') throw Object.assign(new Error('Keystore operation failed'), { code: '{"code":1}' });
      return this.primary.has(key) ? this.primary.get(key) : null;
    });
    jest.spyOn(app, 'setItem').mockImplementation(async (key: string, value: string) => {
      if (this.writeGate) await this.writeGate;
      const fault = this.writeFault[key];
      if (fault) throw fault;
      this.primary.set(key, value);
      this.log.push('primary:' + key);
    });
    // react-native-fs's directory constants are jest.fn() in tests and print the
    // same text: give the two backup places distinct paths.
    jest.spyOn(BlueApp, 'realmKeyValuePath').mockReturnValue('/test-cache/keyvalue.realm');
    jest.spyOn(BlueApp, 'legacyRealmKeyValuePath').mockReturnValue('/test-documents/keyvalue.realm');
    const isLegacy = (path?: string) => path === '/test-documents/keyvalue.realm';
    jest.spyOn(app, 'openRealmKeyValue').mockImplementation(async (path?: string) => {
      this.backupOpens++;
      if (this.backupOpenFault) throw this.backupOpenFault;
      const kept = path ? this.kept.get(path) : undefined;
      if (kept) return this.realm(kept.data) as never;
      if (isLegacy(path)) {
        if (this.openFaultAt.legacy) throw this.openFaultAt.legacy;
        this.legacyFile = true;
        return this.realm(this.legacy) as never;
      }
      if (this.openFaultAt.cache) throw this.openFaultAt.cache;
      this.backupFile = true; // Realm creates the file on open
      return this.realm(this.backup) as never;
    });
    jest
      .spyOn(app, 'backupFileExists')
      .mockImplementation(async (path?: string) => (path && this.kept.has(path)) || (isLegacy(path) ? this.legacyFile : this.backupFile));
    jest
      .spyOn(app, 'backupSavedAt')
      .mockImplementation(async (path: string) => this.kept.get(path)?.savedAt ?? (isLegacy(path) ? 1000 : 2000));
    jest.spyOn(app, 'listKeptBackups').mockImplementation(async () => [...this.kept.keys()].sort());
    jest
      .spyOn(app, 'hasOlderBackupCopies')
      .mockImplementation(async () => this.kept.size > 0 || this.superseded.size > 0 || this.legacyFile);
    jest.spyOn(app, 'setAsideBackup').mockImplementation(async (path: string) => {
      if (this.setAsideFault) throw this.setAsideFault;
      const legacy = isLegacy(path);
      const source = legacy ? this.legacy : this.backup;
      this.kept.set(`${path}.kept-${this.kept.size + 1}`, { data: new Map(source), savedAt: legacy ? 1000 : 2000 });
      source.clear();
      if (legacy) this.legacyFile = false;
      else this.backupFile = false;
      // A fault belonged to the file that was moved; a new file at that path opens.
      delete this.openFaultAt[legacy ? 'legacy' : 'cache'];
      this.setAside.push(legacy ? 'legacy' : 'cache');
    });
    jest.spyOn(app, 'keepStoreCopy').mockImplementation(async (raw: string) => {
      if (this.keepFault) throw this.keepFault;
      this.kept.set(`/test-cache/keyvalue.realm.kept-s${this.kept.size + 1}`, { data: new Map([['data', raw]]), savedAt: 3000 });
      this.log.push('kept:store');
    });
    jest.spyOn(app, 'listResetTokens').mockImplementation(async () => [...this.resetStash.keys()].sort());
    jest.spyOn(app, 'setAsideForReset').mockImplementation(async (token: string) => {
      // A failure models "renamed back": nothing changes.
      if (this.resetFault.setAside) throw this.resetFault.setAside;
      const stash: ResetStash = {
        backup: this.backupFile ? new Map(this.backup) : null,
        legacy: this.legacyFile ? new Map(this.legacy) : null,
        superseded: new Map(this.superseded),
        kept: new Map(this.kept),
        nested: new Map(this.resetStash),
      };
      this.resetStash.clear();
      this.resetStash.set(token, stash);
      this.backup.clear();
      this.backupFile = false;
      this.legacy.clear();
      this.legacyFile = false;
      this.superseded.clear();
      this.kept.clear();
      this.log.push('reset:set-aside');
    });
    jest.spyOn(app, 'undoReset').mockImplementation(async (token: string, mode: 'original' | 'kept' = 'original') => {
      if (this.resetFault.undo) throw this.resetFault.undo;
      const stash = this.resetStash.get(token);
      if (!stash) return;
      const keepAside = (data: Map<string, string>, savedAt: number) =>
        this.kept.set(`/test-cache/keyvalue.realm.kept-r${this.kept.size + 1}`, { data, savedAt });
      const giveBack = (data: Map<string, string> | null, place: 'backup' | 'legacy', savedAt: number) => {
        if (!data) return;
        const taken = place === 'backup' ? this.backupFile : this.legacyFile;
        // `kept`: back as a copy set aside; a name taken meanwhile is never written over.
        if (mode === 'kept' || taken) return keepAside(data, savedAt);
        data.forEach((value, key) => this[place].set(key, value));
        if (place === 'backup') this.backupFile = true;
        else this.legacyFile = true;
      };
      giveBack(stash.backup, 'backup', 2000);
      giveBack(stash.legacy, 'legacy', 1000);
      stash.superseded.forEach((value, key) => this.superseded.set(key, value));
      stash.kept.forEach((value, key) => this.kept.set(key, value));
      this.resetStash.delete(token);
      stash.nested.forEach((value, key) => this.resetStash.set(key, value));
      this.log.push(`reset:undone:${mode}`);
    });
    jest.spyOn(app, 'deleteResetFiles').mockImplementation(async (token: string) => {
      if (this.resetFault.delete) throw this.resetFault.delete;
      this.resetStash.delete(token);
      this.log.push('reset:deleted');
    });
    jest.spyOn(app, 'retireLegacyBackup').mockImplementation(async () => {
      if (!this.legacyFile) return;
      this.superseded.clear();
      for (const [key, value] of this.legacy) this.superseded.set(key, value);
      this.legacy.clear();
      this.legacyFile = false;
    });
    jest.spyOn(app, 'moveRealmFilesToCacheDirectory').mockResolvedValue(undefined);
    return app;
  }

  /** Same contents in both places, as after a completed save. */
  seed(entries: Record<string, string>): this {
    for (const [key, value] of Object.entries(entries)) {
      this.primary.set(key, value);
      this.backup.set(key, value);
    }
    this.backupFile = true;
    return this;
  }

  snapshot(): { primary: Record<string, string>; backup: Record<string, string> } {
    return { primary: Object.fromEntries(this.primary), backup: Object.fromEntries(this.backup) };
  }

  private realm(backup: Map<string, string>) {
    const log = this.log;
    const faults = (): Error | null => this.backupWriteFault;
    return {
      objectForPrimaryKey(_schema: string, key: string) {
        return backup.has(key) ? { key, value: backup.get(key) } : null;
      },
      write(transaction: () => void) {
        const staged = new Map<string, string>();
        (this as any)._staged = staged;
        transaction();
        for (const [key, value] of staged) {
          backup.set(key, value);
          log.push('backup:' + key);
        }
      },
      create(_schema: string, { key, value }: { key: string; value: string }) {
        const fault = faults();
        if (fault) throw fault;
        (this as any)._staged.set(key, value);
      },
      close() {},
    };
  }

  /** The `data` held by every copy a restore set aside. */
  keptData(): string[] {
    return [...this.kept.values()].map(copy => copy.data.get('data') ?? '');
  }
}

/** A fresh BlueApp wired to `disk` (a new instance stands for an app restart). */
export function appOn(disk: StorageDouble): BlueApp {
  return disk.attach(new BlueApp());
}
