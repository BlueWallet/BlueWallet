/**
 * End-to-end check of the privacy WebView bridge in headless Chromium.
 *
 * Node plays the app: the real PrivacyHostBridge, the library's
 * C7WorkerClient, an in-memory CAS store and the pinned proving files from a
 * local directory. Chromium loads the generated privacy-host page from an
 * https origin, as the WebView does with its base URL. RPC goes to a public
 * testnet node.
 *
 * Covers: helper calls (Argon2id vault), private wallet
 * derivation, journal creation, a real pool scan, and a real Groth16 deposit
 * proof whose proving files cross the bridge chunk by chunk. The deposit then
 * stops where it must: the fake funding coin does not exist on chain.
 *
 * Run (see privacy-host/e2e/run.sh):
 *   PRIVACY_ARTIFACTS=/path/to/privacy-c7 node dist/host.e2e.mjs
 * PRIVACY_RPC points it at another node of the reset testnet.
 */

import { readFileSync, openSync, readSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { C7WorkerClient } from '@neuraiproject/neurai-privacy/client';

import { PrivacyHostBridge } from '../../blue_modules/neurai/privacy/bridge';
import c7File from '../../blue_modules/neurai/privacy/c7-testnet.json';

const RPC_URL = process.env.PRIVACY_RPC ?? 'https://rpc-testnet.neurai.org/rpc';
const ARTIFACTS = process.env.PRIVACY_ARTIFACTS ?? '';
const HOST_HTML = process.env.PRIVACY_HOST_HTML ?? 'privacy-host/dist/privacy-host.html';
const ORIGIN = 'https://privacy-host.neurai.invalid/';
const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const config = (c7File as { config: Record<string, any> }).config;

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('CHECK FAILED: ' + message);
}

async function rpc(method: string, params: unknown[] = []): Promise<any> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '1.0', id: method, method, params }),
  });
  const body = (await response.json()) as { result?: unknown; error?: { message?: string } | null };
  if (body.error) throw new Error(body.error.message ?? 'RPC error');
  return body.result;
}

function readArtifact(path: string, offset: number, length: number): Promise<string> {
  const meta = config.artifacts.files[path];
  if (!meta) throw new Error('unpinned artifact ' + path);
  const size = meta.bytes as number;
  if (offset >= size) return Promise.resolve('');
  const out = Buffer.alloc(Math.min(length, size - offset));
  const fd = openSync(join(ARTIFACTS, path), 'r');
  try {
    readSync(fd, out, 0, out.length, offset);
  } finally {
    closeSync(fd);
  }
  return Promise.resolve(out.toString('base64'));
}

const memoryStore = () => {
  const values = new Map<string, string>();
  return {
    read: async (key: string) => values.get(key) ?? null,
    compareAndSwap: async (key: string, expected: string | null, replacement: string) => {
      if ((values.get(key) ?? null) !== expected) return false;
      values.set(key, replacement);
      return true;
    },
  };
};

async function main() {
  check(ARTIFACTS, 'set PRIVACY_ARTIFACTS to the directory with the pinned XNA proving files');
  console.log(`pool: ${config.manifest.profile} ${config.manifest.identity}`);
  const html = readFileSync(HOST_HTML, 'utf8');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.log('[page error]', e.message));
  await page.route(ORIGIN, route => route.fulfill({ body: html, contentType: 'text/html' }));

  let chunks = 0;
  const bridge = new PrivacyHostBridge({
    // Like injectJavaScript: fire and forget (late messages after close are dropped).
    send: text => void page.evaluate(t => (window as any).__neuraiPrivacyHost.receive(t), text).catch(() => {}),
  });
  await page.exposeFunction('__appReceive', (text: string) => bridge.receive(text));
  await page.addInitScript(() => {
    (window as any).ReactNativeWebView = { postMessage: (text: string) => (window as any).__appReceive(text) };
  });
  await page.goto(ORIGIN);
  await bridge.whenReady();
  console.log('host ready');

  // Helpers in the util worker.
  const sealed = await bridge.call<string>('sealVault', [{ hello: 'vault', n: 1 }, 'correct horse battery']);
  const opened = await bridge.call<{ hello: string }>('openVault', [sealed, 'correct horse battery']);
  check(opened.hello === 'vault', 'vault round trip');
  await bridge.call('openVault', [sealed, 'wrong password!!']).then(
    () => check(false, 'wrong vault password must fail'),
    () => undefined,
  );
  console.log('helpers ok');

  const stages: string[] = [];
  const worker = bridge.createWorker(config, async (path, offset, length) => {
    chunks++;
    return readArtifact(path, offset, length);
  });
  const client = new C7WorkerClient({
    worker,
    rpc: (method: string, params?: unknown[]) => rpc(method, params ?? []),
    store: memoryStore(),
    onStage: (message: string) => {
      stages.push(message);
      if (!/^Loading/.test(message) || /100%$/.test(message)) console.log('  stage:', message);
    },
    onCrash: (error: Error) => console.log('worker crashed:', error.message),
  });

  let t = Date.now();
  const identity = await client.derive({ family: 'legacy', mnemonic: MNEMONIC, passphrase: '', zkPassphrase: '' });
  const address = identity.identity?.addresses?.current?.address as string;
  check(/^tnzk1/.test(address ?? ''), 'derived a tnzk1 receiving address: ' + JSON.stringify(identity).slice(0, 200));
  console.log(`derive ok in ${Date.now() - t} ms: ${address.slice(0, 24)}…`);

  const journal = await client.openJournal({ create: true });
  check(journal.journal, 'journal opened');
  t = Date.now();
  const scanned = await client.scan();
  const summary = scanned.scan?.result;
  check(summary?.tip?.height > 0, 'scan reached the chain tip');
  console.log(`scan ok in ${Date.now() - t} ms: tip ${summary.tip.height}, balance ${summary.balanceAtomic}, pool ${summary.reserveAtomic}`);

  const fee = config.manifest.fees.D[0] as string;
  const amount = '10000000000';
  const fakeTxid = 'ab'.repeat(32);
  const funding = fakeTxid.match(/../g)!.reverse().join('') + '00000000';
  t = Date.now();
  let failure = '';
  try {
    await client.prepare({
      action: 'deposit',
      fee,
      amountAtomic: amount,
      funding,
      fundingPoint: fakeTxid + ':0',
      fundingValue: String(BigInt(amount) + BigInt(fee)),
    });
  } catch (error) {
    failure = (error as Error).message;
  }
  console.log(`prepare stopped after ${Date.now() - t} ms: ${failure}`);
  check(/funding coin unavailable/i.test(failure), 'deposit stops at the missing funding coin, after proving');
  check(
    stages.some(s => s === 'Loading D.zkey · 100%'),
    'D.zkey crossed the bridge',
  );
  check(chunks >= 5, 'proving files were read in chunks: ' + chunks);
  check(
    stages.some(s => /proof|prov/i.test(s)),
    'the worker reported proving stages: ' + stages.filter(s => !/^Loading/.test(s)).join(' | '),
  );

  worker.terminate();
  bridge.dispose();
  await browser.close();
  console.log('PRIVACY HOST E2E OK');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
