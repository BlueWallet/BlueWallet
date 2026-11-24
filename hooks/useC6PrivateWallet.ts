/**
 * Private wallet session of the C7 XNA pool.
 *
 * Port of the web wallet's C6 components: one `C7WorkerClient` per opened
 * private wallet, its proving worker running in the privacy WebView, its
 * encrypted journal in a file store, and RPC through the wallet's own service.
 * Every foreground job goes through `run`, which never overlaps with another
 * job or with the background refresh, and an `epoch` token invalidates late
 * replies after a lock or a wallet switch.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { C7WorkerClient, type ReceivingInfo } from '@neuraiproject/neurai-privacy/client';

import { usePrivacyHost } from '../components/privacy/PrivacyHost';
import { C6ArtifactStore } from '../blue_modules/neurai/privacy/artifacts';
import type { C6Runtime } from '../blue_modules/neurai/privacy/deployment';
import { shortStage, type StageLabels } from '../blue_modules/neurai/privacy/stages';
import { FileCasStore } from '../blue_modules/neurai/privacy/store';
import { privacyTxKind, tagPrivacyTxs } from '../blue_modules/neurai/privacy/txTags';
import { c6BlockedReason, c6Family, createPrivacyRpc, type PrivacyWallet } from '../blue_modules/neurai/privacy/wallet';
import { useC6BackgroundSync } from './useC6BackgroundSync';
import { useStorage } from './context/useStorage';
import loc from '../loc';

export type C6Note = { cm: string; amountAtomic: string; spendable: boolean; reserved: boolean };
export type C6Summary = {
  tip?: { height: number; hash: string };
  balanceAtomic: string;
  spendableAtomic: string;
  reserveAtomic?: string;
  notes: C6Note[];
};
export type C6Operation = {
  id: string;
  action: string;
  phase: string;
  outcome: string | null;
  txid: string | null;
  /** Transaction that carried the operation on chain, once confirmed. */
  confirmedBy?: string | null;
};

/** The C7 journal store, as on the web: keys carry the pool identity. */
let journalStore: FileCasStore | null = null;
const privateJournal = () => (journalStore ??= new FileCasStore('c7-private-journal-v1'));

// The library keeps the C6 wording of this error.
const MISSING_JOURNAL = 'C6 private journal missing';

const stageLabels = (): StageLabels => ({
  syncing: loc.privacy.stage_syncing,
  recovering: loc.privacy.stage_recovering,
  verifyingChain: loc.privacy.stage_verifying_chain,
  synced: loc.privacy.stage_synced,
  saving: loc.privacy.stage_saving,
  loading: loc.privacy.stage_loading,
  witness: loc.privacy.stage_witness,
  proving: loc.privacy.stage_proving,
  verifyingProof: loc.privacy.stage_verifying_proof,
});

export function useC6PrivateWallet(wallet: PrivacyWallet | undefined, runtime: C6Runtime, hidden = false) {
  const bridge = usePrivacyHost();
  const artifacts = useMemo(() => new C6ArtifactStore(runtime), [runtime]);
  const family = wallet ? c6Family(wallet) : null;
  const blockedReason = c6BlockedReason(wallet);
  const valid = blockedReason === null && !!family;
  const rpc = useMemo(() => (wallet && valid ? createPrivacyRpc(wallet) : null), [wallet, valid]);

  const [open, setOpen] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhaseState] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<C6Summary | null>(null);
  const [receiving, setReceiving] = useState<ReceivingInfo | null>(null);
  const [operations, setOperations] = useState<C6Operation[]>([]);
  const [saved, setSaved] = useState(false);

  const client = useRef<C7WorkerClient | null>(null);
  const epoch = useRef(0);
  const running = useRef(false);

  const setPhase = useCallback((message: string) => setPhaseState(shortStage(message, stageLabels())), []);

  const live = useCallback((token: number) => {
    if (token !== epoch.current) throw new Error(loc.privacy.error_switched);
  }, []);

  const update = useCallback((messages: any) => {
    if (messages?.scan) {
      setSummary(messages.scan.result);
      setReceiving(messages.scan.addresses);
    }
    if (messages?.identity) setReceiving(messages.identity.addresses);
    if (messages?.addresses) setReceiving(messages.addresses.addresses);
    if (messages?.journal) setOperations(messages.journal.operations);
  }, []);

  // The home shows the last private balance read here, until the pool is read again.
  const { saveToDisk } = useStorage();
  useEffect(() => {
    if (!wallet || !summary) return;
    if (wallet.notePrivacyPoolBalance(runtime.id, summary.balanceAtomic, summary.tip?.height ?? 0)) {
      saveToDisk().catch(e => console.debug('[privacy] saving the pool balance failed', e));
    }
  }, [wallet, runtime, summary, saveToDisk]);

  // The transaction list marks the journal's pool transactions.
  const walletId = wallet?.getID() ?? '';
  useEffect(() => {
    tagPrivacyTxs(
      walletId,
      operations.flatMap(op => [
        [op.txid, privacyTxKind(op.action)],
        [op.confirmedBy, privacyTxKind(op.action)],
      ]),
    );
  }, [walletId, operations]);

  const sync = useC6BackgroundSync({
    active: open && !!summary?.tip,
    // Not on screen: no scans, so a tap on return never queues behind one.
    paused: busy || hidden,
    tip: summary?.tip,
    rpc,
    canStart: () => !running.current && !!client.current,
    scan: async () => {
      const token = epoch.current;
      const result = await client.current!.scan();
      live(token);
      return result;
    },
    apply: update,
  });
  const syncRef = useRef(sync);
  syncRef.current = sync;

  const lock = useCallback(() => {
    epoch.current++;
    running.current = false;
    syncRef.current.reset();
    client.current?.terminate();
    client.current = null;
    setOpen(false);
    setHistoryReady(false);
    setSummary(null);
    setReceiving(null);
    setOperations([]);
    setSaved(false);
    setBusy(false);
    setPhaseState('');
  }, []);

  /** Invalidate late replies and stop the worker (unmount or wallet switch). */
  const release = useCallback(() => {
    epoch.current++;
    client.current?.terminate();
    client.current = null;
  }, []);

  // A different wallet or pool is a different private wallet.
  useEffect(() => {
    lock();
    setError('');
    return release;
  }, [wallet, runtime, lock, release]);

  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    setElapsed(0);
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);

  /** Run one foreground job; errors keep pending reservations and are shown. */
  const run = useCallback(
    async (label: string, job: (token: number) => Promise<void>) => {
      if (running.current) return;
      running.current = true;
      const token = epoch.current;
      setBusy(true);
      setPhaseState(label);
      setError('');
      try {
        if (syncRef.current.isRunning()) setPhaseState(loc.privacy.stage_syncing);
        await syncRef.current.wait();
        live(token);
        await job(token);
        live(token);
      } catch (e) {
        if (token === epoch.current) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (token === epoch.current) {
          running.current = false;
          setBusy(false);
          setPhaseState('');
        }
      }
    },
    [live],
  );

  /**
   * Derive the private wallet from the words, open its journal and scan.
   * Without a journal on this device the wallet opens read-only; if the scan
   * finds no notes at all (an unused private wallet) a new history is created
   * right away, since there is nothing a backup could restore.
   */
  const unlock = useCallback(
    async (options: { create?: boolean; backup?: unknown; zkPassphrase: string }) => {
      if (!wallet || !valid || !family || !rpc) throw new Error(blockedReason ?? loc.privacy.error_unsupported);
      const token = epoch.current;
      client.current?.terminate();
      const worker = bridge.createWorker(runtime.config as unknown as Record<string, unknown>, (path, offset, length) =>
        artifacts.read(path, offset, length, percent => {
          if (token === epoch.current) setPhaseState(`${loc.privacy.stage_downloading} ${percent}%`);
        }),
      );
      const c = new C7WorkerClient({
        worker,
        store: privateJournal(),
        rpc: async (method: string, params?: unknown[]) => {
          live(token);
          const result = await rpc(method, params ?? []);
          live(token);
          return result;
        },
        onStage: (message: string) => {
          if (token === epoch.current && !syncRef.current.isRunning()) setPhase(message);
        },
        onCrash: (e: Error) => {
          if (token === epoch.current) {
            lock();
            setError(e.message);
          }
        },
      });
      client.current = c;
      let opened = false;
      try {
        update(
          await c.derive({ family, mnemonic: wallet.secret, passphrase: wallet.passphrase ?? '', zkPassphrase: options.zkPassphrase }),
        );
        live(token);
        let ready = false;
        try {
          update(await c.openJournal({ create: !!options.create, backup: options.backup }));
          live(token);
          ready = true;
          setSaved(!!options.backup);
        } catch (e) {
          if (options.create || options.backup || !(e instanceof Error) || !e.message.startsWith(MISSING_JOURNAL)) throw e;
          live(token);
        }
        opened = true;
        setOpen(true);
        const scanned = await c.scan();
        live(token);
        update(scanned);
        if (!ready && (scanned?.scan?.result?.notes?.length ?? 0) === 0) {
          update(await c.openJournal({ create: true }));
          live(token);
          ready = true;
          update(await c.scan());
          live(token);
        }
        setHistoryReady(ready);
      } catch (e) {
        if (!opened) {
          c.terminate();
          if (client.current === c) client.current = null;
        }
        throw e;
      }
    },
    [wallet, valid, family, rpc, blockedReason, bridge, runtime, artifacts, live, update, lock, setPhase],
  );

  const requireClient = useCallback(() => {
    if (!client.current) throw new Error(loc.privacy.error_locked);
    return client.current;
  }, []);

  return {
    // state
    artifacts,
    blockedReason,
    family,
    valid,
    rpc,
    open,
    historyReady,
    busy,
    phase,
    elapsed,
    error,
    summary,
    receiving,
    operations,
    saved,
    sync,
    // helpers
    epoch,
    running,
    live,
    update,
    setError,
    setSaved,
    setBusy,
    setPhase,
    requireClient,
    // actions
    run,
    lock,
    unlock,
  };
}

export type C6PrivateWallet = ReturnType<typeof useC6PrivateWallet>;
