/**
 * H22 · The C7 journal store keeps a complete revision through any crash.
 *
 * The file system double has three move semantics: iOS rename (refuses an
 * existing target), Android rename (replaces it) and the RNFS Android copy
 * fallback (writes the target piece by piece, then deletes the source). Every
 * mutating step is a point where the process can die; after each one a
 * restart must read exactly the old or the new revision, also when the
 * recovery itself is interrupted.
 */
type Mode = 'ios-rename' | 'android-rename' | 'android-copy';

const files = new Map<string, string>();
const fs = { mode: 'ios-rename' as Mode, step: 0, crashAt: 0, dead: false };

class Crash extends Error {}
/** One mutating step; the process dies at step `crashAt`. */
const tick = () => {
  if (fs.dead) throw new Crash('process is gone');
  fs.step++;
  if (fs.crashAt && fs.step === fs.crashAt) {
    fs.dead = true;
    throw new Crash('process died');
  }
};
const alive = () => {
  if (fs.dead) throw new Crash('process is gone');
};

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/docs',
  mkdir: jest.fn(async () => undefined),
  exists: jest.fn(async (path: string) => {
    alive();
    return files.has(path);
  }),
  readFile: jest.fn(async (path: string) => {
    alive();
    if (!files.has(path)) throw new Error('ENOENT ' + path);
    return files.get(path);
  }),
  writeFile: jest.fn(async (path: string, value: string) => {
    tick();
    files.set(path, value.slice(0, Math.ceil(value.length / 2))); // a torn write
    tick();
    files.set(path, value);
  }),
  moveFile: jest.fn(async (from: string, to: string) => {
    alive();
    if (!files.has(from)) throw new Error('ENOENT ' + from);
    const value = files.get(from)!;
    if (fs.mode === 'android-copy') {
      tick();
      files.set(to, value.slice(0, Math.ceil(value.length / 2)));
      tick();
      files.set(to, value);
      tick();
      files.delete(from);
      return;
    }
    if (fs.mode === 'ios-rename' && files.has(to)) throw new Error('EEXIST ' + to);
    tick();
    files.set(to, value);
    files.delete(from);
  }),
  unlink: jest.fn(async (path: string) => {
    tick();
    if (!files.has(path)) throw new Error('ENOENT ' + path);
    files.delete(path);
  }),
}));

// eslint-disable-next-line import/first
import { FileCasStore } from '../../blue_modules/neurai/privacy/store';

const KEY = 'journal';
const REV1 = 'sealed-revision-1:' + 'a'.repeat(64);
const REV2 = 'sealed-revision-2:' + 'b'.repeat(64);
const REV3 = 'sealed-revision-3:' + 'c'.repeat(64);
const store = () => new FileCasStore('c7-private-journal-v1');
const helperFiles = () => [...files.keys()].filter(path => /\.(tmp|bak|installing|restoring)$/.test(path));

function restart() {
  fs.dead = false;
  fs.crashAt = 0;
  fs.step = 0;
}

/** Number of mutating steps of one successful write from REV1 to REV2. */
async function stepsOfOneWrite(): Promise<number> {
  files.clear();
  restart();
  await store().compareAndSwap(KEY, null, REV1);
  fs.step = 0;
  await store().compareAndSwap(KEY, REV1, REV2);
  return fs.step;
}

beforeEach(() => {
  files.clear();
  restart();
});

describe.each(['ios-rename', 'android-rename', 'android-copy'] as const)('H22 · C7 journal store (%s)', mode => {
  beforeEach(() => {
    fs.mode = mode;
  });

  it('commits v1, replaces it with v2 and leaves no helper files', async () => {
    expect(await store().compareAndSwap(KEY, null, REV1)).toBe(true);
    expect(await store().compareAndSwap(KEY, REV1, REV2)).toBe(true);
    expect(await store().read(KEY)).toBe(REV2);
    expect(helperFiles()).toEqual([]);
  });

  it('lets only one of two writers based on v1 win', async () => {
    const s = store();
    await s.compareAndSwap(KEY, null, REV1);
    expect(await Promise.all([s.compareAndSwap(KEY, REV1, REV2), s.compareAndSwap(KEY, REV1, REV3)])).toEqual([true, false]);
    expect(await s.read(KEY)).toBe(REV2);
  });

  it('reads a complete revision after the process dies at any step, also inside the recovery', async () => {
    const total = await stepsOfOneWrite();
    expect(total).toBeGreaterThan(3);
    for (let crashAt = 1; crashAt <= total; crashAt++) {
      for (let recoveryCrash = 0; recoveryCrash <= 6; recoveryCrash++) {
        files.clear();
        restart();
        await store().compareAndSwap(KEY, null, REV1);
        fs.step = 0;
        fs.crashAt = crashAt;
        await expect(store().compareAndSwap(KEY, REV1, REV2)).rejects.toThrow(Crash);

        if (recoveryCrash) {
          // The next launch dies too, while recovering.
          restart();
          fs.crashAt = recoveryCrash;
          await store()
            .read(KEY)
            .catch(() => undefined);
        }

        restart();
        const value = await store().read(KEY);
        expect([REV1, REV2]).toContain(value);
        expect(helperFiles()).toEqual([]);
        expect(await store().compareAndSwap(KEY, value, REV3)).toBe(true);
        expect(await store().read(KEY)).toBe(REV3);
      }
    }
  });

  it('rolls a first revision that never committed back to nothing', async () => {
    fs.crashAt = 6; // inside the install of the very first revision
    await expect(store().compareAndSwap(KEY, null, REV1)).rejects.toThrow(Crash);
    restart();
    const value = await store().read(KEY);
    expect([null, REV1]).toContain(value);
    expect(await store().compareAndSwap(KEY, value, REV2)).toBe(true);
  });
});
