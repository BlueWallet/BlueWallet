/**
 * Dedicated Web Worker inside the privacy WebView.
 *
 * Role `pool`: runs `startC7PoolWorker` (witness generation and Groth16 with
 * snarkjs, scanning, journal encryption). Its messages are relayed unchanged
 * to the app, where `C7WorkerClient` handles RPC and storage. Proving files
 * are read from the app chunk by chunk; the library checks their pinned size
 * and SHA-256.
 *
 * Role `util`: slow helpers the app would run poorly on Hermes (Argon2id
 * vaults).
 */

import * as snarkjs from 'snarkjs';
import { startC7PoolWorker } from '@neuraiproject/neurai-privacy/worker';
import { openVault, sealVault } from '@neuraiproject/neurai-privacy/browser';

import { ARTIFACT_CHUNK_BYTES } from '../blue_modules/neurai/privacy/protocol';

/** Messages from the page. */
type PageMessage =
  | { k: 'init'; config: Record<string, unknown> }
  | { k: 'pool'; data: unknown }
  | { k: 'chunk'; id: number; bytes: Uint8Array | null; error?: string }
  | { k: 'call'; id: number; fn: string; args: unknown[] };

interface WorkerGlobal {
  postMessage(message: unknown, transfer?: ArrayBuffer[]): void;
  onmessage: ((event: { data: PageMessage }) => void) | null;
  navigator: unknown;
}

const ctx = self as unknown as WorkerGlobal;

/** The scope `startC7PoolWorker` talks to: its posts go to the page tagged as pool traffic. */
const poolScope: { postMessage(message: unknown): void; onmessage: ((event: { data: unknown }) => unknown) | null; navigator: unknown } = {
  postMessage: message => ctx.postMessage({ k: 'pool', data: message }),
  onmessage: null,
  navigator: ctx.navigator,
};

const pendingChunks = new Map<number, { resolve: (bytes: Uint8Array | null) => void; reject: (error: Error) => void }>();
let nextRead = 0;

function readChunk(path: string, offset: number): Promise<Uint8Array | null> {
  const id = ++nextRead;
  return new Promise((resolve, reject) => {
    pendingChunks.set(id, { resolve, reject });
    ctx.postMessage({ k: 'read', id, path, offset, length: ARTIFACT_CHUNK_BYTES });
  });
}

/** A minimal `Response` for `loadVerifiedArtifact`: `ok` plus a pull reader. */
async function fetchArtifact(path: string) {
  let offset = 0;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async (): Promise<{ done: boolean; value?: Uint8Array }> => {
          const bytes = await readChunk(path, offset);
          if (!bytes) return { done: true };
          offset += bytes.length;
          return { done: false, value: bytes };
        },
      }),
    },
  };
}

const helpers: Record<string, (...args: never[]) => unknown> = {
  sealVault: sealVault as (...args: never[]) => unknown,
  openVault: openVault as (...args: never[]) => unknown,
};

let started = false;

ctx.onmessage = ({ data }) => {
  switch (data?.k) {
    case 'init': {
      if (started) return;
      started = true;
      try {
        // The base URL is the app's concern; the worker gets artifacts through fetchArtifact.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { artifactBaseUrl: _ignored, ...config } = data.config;
        startC7PoolWorker({
          ...(config as unknown as Parameters<typeof startC7PoolWorker>[0]),
          scope: poolScope,
          snarkjs,
          fetchArtifact: fetchArtifact as unknown as (path: string) => Promise<Response>,
          buildTransactions: true,
          durableJournal: true,
          reservations: [],
          singleThread: true,
        });
      } catch (error) {
        ctx.postMessage({ k: 'fatal', message: error instanceof Error ? error.message : String(error) });
      }
      return;
    }
    case 'pool':
      void poolScope.onmessage?.({ data: data.data });
      return;
    case 'chunk': {
      const pending = pendingChunks.get(data.id);
      if (!pending) return;
      pendingChunks.delete(data.id);
      if (data.error !== undefined) pending.reject(new Error(data.error));
      else pending.resolve(data.bytes);
      return;
    }
    case 'call': {
      const { id, fn, args } = data;
      Promise.resolve()
        .then(() => {
          const helper = helpers[fn];
          if (!helper) throw new Error('Unknown privacy helper: ' + fn);
          return helper(...(args as never[]));
        })
        .then(
          result => ctx.postMessage({ k: 'call-result', id, result }),
          error => ctx.postMessage({ k: 'call-result', id, error: error instanceof Error ? error.message : String(error) }),
        );
    }
  }
};
