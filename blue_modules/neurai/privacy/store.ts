/**
 * Durable compare-and-swap string store for the C7 journal.
 *
 * Replaces the web wallet's `IndexedDbJournalStore`: same `read` /
 * `compareAndSwap` contract, one file per key under the app's documents
 * directory. Values are written to a temporary file and renamed into place,
 * and every operation on a store is serialized, which is enough inside the
 * app's single JS context. The private journal values are already encrypted
 * by the library with a key derived from the wallet words.
 *
 * Replacing a revision (H22). Neither platform's move can be trusted to
 * replace a file atomically: iOS's `moveItemAtPath` refuses an existing
 * target, and RNFS on Android falls back to copying into the target when a
 * rename fails, which a crash can leave half written. So the committed file is
 * never written in place:
 *
 *   1. write the new revision to `<file>.tmp`
 *   2. move the committed revision aside to `<file>.bak`
 *   3. create the `<file>.installing` marker
 *   4. move `<file>.tmp` to `<file>`
 *   5. remove the marker, then `<file>.bak`
 *
 * Every read first finishes or rolls back an interrupted write (`recover`),
 * relying only on which files exist. A rollback marks itself with
 * `<file>.restoring` and can be interrupted and repeated. An interrupted
 * write never reported success, so going back to the previous revision is
 * the right answer. The stored value itself is unchanged.
 *
 * AsyncStorage is not used: its Android rows are limited to about 2 MB and a
 * journal may reach 8 MB.
 */

import RNFS from 'react-native-fs';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

const ROOT = `${RNFS.DocumentDirectoryPath}/neurai-privacy/stores`;

export class FileCasStore {
  private readonly dir: string;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(name: 'c7-private-journal-v1') {
    this.dir = `${ROOT}/${name}`;
  }

  private file(key: string): string {
    if (typeof key !== 'string' || !key) throw new Error('Invalid journal key');
    return `${this.dir}/${bytesToHex(sha256(utf8ToBytes(key)))}`;
  }

  private serialize<T>(job: () => Promise<T>): Promise<T> {
    const run = this.tail.then(job, job);
    this.tail = run.catch(() => {});
    return run;
  }

  private async readFile(path: string): Promise<string | null> {
    await this.recover(path);
    if (!(await RNFS.exists(path))) return null;
    return RNFS.readFile(path, 'utf8');
  }

  private async removeIfPresent(path: string): Promise<void> {
    if (await RNFS.exists(path)) await RNFS.unlink(path);
  }

  /** Puts the revision in `<file>.bak` back; safe to repeat after an interruption. */
  private async restoreAside(path: string): Promise<void> {
    const aside = `${path}.bak`;
    if (await RNFS.exists(aside)) {
      await this.removeIfPresent(path); // possibly half written
      await RNFS.moveFile(aside, path); // a copy fallback deletes the source only once complete
    }
    await this.removeIfPresent(`${path}.tmp`);
    await this.removeIfPresent(`${path}.installing`);
    await this.removeIfPresent(`${path}.restoring`);
  }

  /** Leaves `<file>` as the last complete revision (or absent), whatever step a write died at. */
  private async recover(path: string): Promise<void> {
    const [temp, aside, installing, restoring] = [`${path}.tmp`, `${path}.bak`, `${path}.installing`, `${path}.restoring`];
    if (await RNFS.exists(restoring)) {
      await this.restoreAside(path);
      return;
    }
    if (await RNFS.exists(installing)) {
      if (!(await RNFS.exists(temp))) {
        // Step 4 completed: the new revision is in place.
        await this.removeIfPresent(installing);
        await this.removeIfPresent(aside);
        return;
      }
      // Step 4 did not complete: roll back to the previous revision, if any.
      if (await RNFS.exists(aside)) {
        await RNFS.writeFile(restoring, '', 'utf8');
        await this.restoreAside(path);
      } else {
        await this.removeIfPresent(path); // a first revision never committed
        await this.removeIfPresent(temp);
        await this.removeIfPresent(installing);
      }
      return;
    }
    if (await RNFS.exists(aside)) {
      if (await RNFS.exists(path)) {
        await RNFS.unlink(aside); // step 2 was a copy cut short, or step 5 was: `<file>` is complete
      } else {
        await RNFS.writeFile(restoring, '', 'utf8'); // step 2 done, step 3 not reached
        await this.restoreAside(path);
        return;
      }
    }
    await this.removeIfPresent(temp); // a new revision that was never installed
  }

  /** Installs `<file>.tmp` as the new revision (steps 2–5). */
  private async install(path: string): Promise<void> {
    const aside = `${path}.bak`;
    const installing = `${path}.installing`;
    if (await RNFS.exists(path)) await RNFS.moveFile(path, aside);
    await RNFS.writeFile(installing, '', 'utf8');
    await RNFS.moveFile(`${path}.tmp`, path);
    await RNFS.unlink(installing);
    await this.removeIfPresent(aside);
  }

  read(key: string): Promise<string | null> {
    const path = this.file(key);
    return this.serialize(() => this.readFile(path));
  }

  compareAndSwap(key: string, expected: string | null, replacement: string): Promise<boolean> {
    const path = this.file(key);
    return this.serialize(async () => {
      if ((await this.readFile(path)) !== expected) return false;
      await RNFS.mkdir(this.dir);
      await RNFS.writeFile(`${path}.tmp`, replacement, 'utf8');
      await this.install(path);
      return true;
    });
  }

  /** Nothing to release; present for parity with the IndexedDB store. */
  async close(): Promise<void> {}
}
