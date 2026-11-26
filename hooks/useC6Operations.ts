/**
 * Pool operations of an opened private wallet: deposit, assign (transfer),
 * withdraw and join in the C7 XNA pool, whose fees are paid from the note.
 * Port of the web wallet's `C6XnaPrivacyPool` logic.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  admitTransaction,
  confirmedPoolCoins,
  formatXna,
  inspectFundingTransaction,
  parseXna,
  publishTransaction,
  withdrawalScript,
  type PoolCoin,
} from '@neuraiproject/neurai-privacy/client';

import type { C6Runtime } from '../blue_modules/neurai/privacy/deployment';
import { AUTO_FEE, autoPoolFee, payablePoolLevels } from '../blue_modules/neurai/privacy/fees';
import { tagPrivacyTxs } from '../blue_modules/neurai/privacy/txTags';
import { c6FundingAddresses, signPoolInputs, type PrivacyWallet } from '../blue_modules/neurai/privacy/wallet';
import { useSettings } from './context/useSettings';
import type { C6PrivateWallet } from './useC6PrivateWallet';
import loc from '../loc';

export type C6Action = 'deposit' | 'transfer' | 'withdraw' | 'join';
export type TxPreview = {
  raw: string;
  txid: string;
  points: Array<{ txid: string; vout: number }>;
  amount?: string;
  fee: string;
  form?: string;
};
type OperationPreview = TxPreview & { operationId: string };

/** Funding outpoint as the circuit reads it: txid bytes reversed, then vout little-endian. */
export const outpointHex = (txid: string, vout: number) => {
  const bytes = txid.match(/../g)!.reverse();
  // eslint-disable-next-line no-bitwise
  for (let i = 0; i < 4; i++) bytes.push(((vout >>> (8 * i)) & 255).toString(16).padStart(2, '0'));
  return bytes.join('');
};

/** A transaction this wallet has just published: the funding coin, or a private operation. */
export interface CompletedOperation {
  kind: 'funding' | C6Action;
  txid: string;
  amount?: string;
}

export function useC6Operations(wallet: PrivacyWallet, runtime: C6Runtime, pool: C6PrivateWallet) {
  const { rpc, live } = pool;
  const { isPQAddressReuseEnabled } = useSettings();
  const unit = 'XNA';
  const genesis = useMemo(() => ({ genesis: runtime.config.deployment.genesis }), [runtime]);

  const [action, setAction] = useState<C6Action>('deposit');
  const [amount, setAmount] = useState('');
  // AUTO_FEE or one of the form's pinned levels.
  const [feeChoice, setFee] = useState(AUTO_FEE);
  const [notes, setNotes] = useState<string[]>([]);
  const [destination, setDestination] = useState('');
  const [recipients, setRecipients] = useState([{ recipient: '', amount: '' }]);
  const [fundingPreview, setFundingPreview] = useState<TxPreview | null>(null);
  const [preview, setPreview] = useState<OperationPreview | null>(null);
  const [fundingSent, setFundingSent] = useState<string | null>(null);
  // XNA: the exact confirmed coin of amount + fee, when it exists.
  const [fundingCoin, setFundingCoin] = useState<PoolCoin | null>(null);
  const [fundingChecked, setFundingChecked] = useState(false);
  // Transactions published in this session: shown as pending until confirmed.
  const [publishedTxids, setPublishedTxids] = useState<string[]>([]);
  /** The transaction just published, until the user moves on: says it went out. */
  const [completed, setCompleted] = useState<CompletedOperation | null>(null);

  const form =
    action === 'deposit' ? 'D' : action === 'withdraw' ? 'W' : action === 'join' ? 'J2' : 'T' + Math.min(3, recipients.length + 1);
  const levels: string[] = useMemo(
    () => ((runtime.config.manifest.fees as Record<string, string[]>)[form] ?? []).map(String),
    [runtime, form],
  );
  // Auto: the lowest level that covers the transaction's policy size (NIP-028 work included).
  const autoFee = useMemo(() => autoPoolFee(form, levels), [form, levels]);
  // A level under the node's relay floor would be refused before proving, so it is not offered.
  const payable = useMemo(() => payablePoolLevels(form, levels), [form, levels]);
  const manual = feeChoice !== AUTO_FEE && payable.includes(feeChoice);
  const fee = manual ? feeChoice : autoFee;
  const feeOptions = useMemo(() => [AUTO_FEE, ...payable], [payable]);
  const feeSelection = manual ? fee : AUTO_FEE;

  // Locking or switching discards everything captured for review.
  useEffect(() => {
    if (pool.open) return;
    setPreview(null);
    setFundingPreview(null);
    setFundingCoin(null);
    setFundingSent(null);
    setCompleted(null);
  }, [pool.open]);
  useEffect(() => setNotes([]), [action]);

  const parseAmount = useCallback((value: string) => parseXna(value), []);

  /** Smallest multiple the pool accepts: 100 XNA. */
  const quantum = 10000000000n;

  /**
   * Why an amount breaks the pool's rules, or null: deposits and recipient
   * amounts are multiples of the quantum; an XNA withdrawal below 100 XNA must
   * empty the note (amount + fee = note).
   */
  const amountIssue = useCallback(
    (value: string, use: 'deposit' | 'recipient' | 'withdraw', noteAtomic?: string): string | null => {
      if (!value) return null;
      let atomic: bigint;
      try {
        atomic = parseAmount(value);
      } catch {
        return loc.privacy.rule_invalid;
      }
      if (atomic <= 0n) return loc.privacy.rule_invalid;
      if (use === 'withdraw' && atomic < quantum) {
        return noteAtomic !== undefined && atomic + BigInt(fee || '0') !== BigInt(noteAtomic) ? loc.privacy.rule_small_withdraw : null;
      }
      return atomic % quantum === 0n ? null : loc.privacy.rule_multiple;
    },
    [parseAmount, quantum, fee],
  );

  // XNA deposit needs amount + fee in one exact coin.
  let requiredFunding: string | null = null;
  try {
    if (fee && amount) requiredFunding = String(parseXna(amount) + BigInt(fee));
  } catch {
    // Incomplete amounts are not ready to deposit.
  }

  const ownXnaCoins = useCallback(async () => {
    const [own, rows, baseCurrency] = await Promise.all([wallet.listOwnAddresses(), wallet.listOwnUtxos(), wallet.getBaseCurrencyName()]);
    const coins = await confirmedPoolCoins(rpc!, rows.filter(c => own.includes(c.address)) as never, { baseCurrency });
    return { own, coins: coins.filter(c => !!c.address && own.includes(c.address)) };
  }, [wallet, rpc]);

  const exactXnaCoin = useCallback(
    async (value: string) => (await ownXnaCoins()).coins.find(c => String(c.valueSats) === value) ?? null,
    [ownXnaCoins],
  );

  // XNA deposit: watch for the exact confirmed funding coin (every 20 s).
  const ownCoinsRef = useRef(exactXnaCoin);
  ownCoinsRef.current = exactXnaCoin;
  useEffect(() => {
    setFundingCoin(null);
    setFundingChecked(false);
    if (!pool.open || action !== 'deposit' || !requiredFunding || !rpc) return;
    let cancelled = false;
    let pending = false;
    const wanted = requiredFunding;
    const poll = async () => {
      if (cancelled || pending || AppState.currentState !== 'active') return;
      pending = true;
      try {
        const coin = await ownCoinsRef.current(wanted);
        if (cancelled) return;
        setFundingCoin(coin);
        setFundingChecked(true);
        if (coin) setFundingSent(null);
      } catch {
        // Next poll retries; preparing a coin stays possible meanwhile.
        if (!cancelled) setFundingChecked(true);
      } finally {
        pending = false;
      }
    };
    const first = setTimeout(() => void poll(), 300);
    const timer = setInterval(() => void poll(), 20_000);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [pool.open, action, requiredFunding, rpc]);

  const checkedRpc = useCallback(
    (token: number) => async (method: string, params?: unknown[]) => {
      live(token);
      const result = await rpc!(method, params ?? []);
      live(token);
      return result;
    },
    [rpc, live],
  );

  /** Create the exact funding coin (amount + fee) to the wallet itself. */
  const prepareFunding = useCallback(
    () =>
      pool.run(loc.privacy.preparing_funding, async token => {
        const { to, change } = await c6FundingAddresses(wallet, isPQAddressReuseEnabled);
        if (!to) throw new Error(loc.privacy.error_no_address);
        const sendAmount = formatXna(parseXna(amount) + BigInt(fee));
        const built = await wallet.buildSendTransaction([{ address: to, amount: sendAmount }], { forcedChangeAddress: change });
        live(token);
        const admitted = await admitTransaction(rpc!, built.signedHex);
        live(token);
        const checked = await inspectFundingTransaction(rpc!, built.signedHex);
        live(token);
        setFundingPreview({
          raw: built.signedHex,
          txid: admitted.txid,
          points: checked.points,
          amount: sendAmount,
          fee: formatXna(checked.feeAtomic),
        });
      }),
    [pool, wallet, isPQAddressReuseEnabled, amount, fee, rpc, live],
  );

  const publishFunding = useCallback(
    () =>
      pool.run(loc.privacy.publishing, async token => {
        const p = fundingPreview;
        if (!p) return;
        await publishTransaction(checkedRpc(token), genesis, p);
        tagPrivacyTxs(wallet.getID(), [[p.txid, 'other']]);
        live(token);
        setFundingSent(p.txid);
        setFundingPreview(null);
        setCompleted({ kind: 'funding', txid: p.txid, amount: p.amount });
      }),
    [pool, wallet, fundingPreview, checkedRpc, genesis, live],
  );

  /** The operation request the worker proves, from the current form. */
  const buildRequest = useCallback(
    async (token: number, coin?: { txid: string; vout: number; value: string }) => {
      const request: Record<string, unknown> = { action, fee };
      if (action === 'deposit') {
        if (!coin) throw new Error(loc.privacy.error_no_funding);
        Object.assign(request, {
          amountAtomic: String(parseAmount(amount)),
          funding: outpointHex(coin.txid, coin.vout),
          fundingPoint: `${coin.txid}:${coin.vout}`,
          fundingValue: coin.value,
        });
      } else if (action === 'join') {
        if (notes.length !== 2) throw new Error(loc.privacy.error_two_notes);
        request.notes = notes;
      } else {
        if (!notes[0]) throw new Error(loc.privacy.error_pick_note);
        request.note = notes[0];
        if (action === 'transfer') {
          request.recipients = recipients.map(r => ({ recipient: r.recipient.trim(), amountAtomic: String(parseAmount(r.amount)) }));
        } else {
          request.amountAtomic = String(parseAmount(amount));
          request.payoutScript = await withdrawalScript(rpc!, destination.trim());
          live(token);
        }
      }
      return request;
    },
    [action, fee, parseAmount, amount, notes, recipients, rpc, destination, live],
  );

  /** Sign the funding input (deposits), record it, check admission and show the review. */
  const reviewXna = useCallback(
    async (result: any, token: number, shownAmount?: string) => {
      const client = pool.requireClient();
      let raw: string = result.transaction.raw;
      if (result.transaction.funding) {
        const coin = await exactXnaCoin(result.transaction.funding.valueAtomic);
        live(token);
        if (!coin || `${coin.txid}:${coin.vout}` !== result.transaction.funding.point) throw new Error(loc.privacy.error_original_funding);
        raw = await signPoolInputs(
          wallet,
          raw,
          [
            {
              address: coin.address!,
              assetName: await wallet.getBaseCurrencyName(),
              txid: coin.txid,
              outputIndex: coin.vout,
              script: coin.scriptHex,
              satoshis: String(coin.valueSats),
              value: String(coin.valueSats),
            },
          ],
          { [result.transaction.funding.index]: 1 },
        );
        live(token);
      }
      const signed = await client.recordSigned(result.operationId, raw);
      live(token);
      await admitTransaction(rpc!, raw);
      live(token);
      pool.update(signed);
      pool.setSaved(false);
      setPreview({
        operationId: signed.operationId,
        raw: signed.raw,
        txid: signed.txid,
        points: signed.inputPoints,
        form: result.transaction.form,
        fee: formatXna(result.transaction.feeAtomic),
        amount: shownAmount,
      });
    },
    [pool, exactXnaCoin, wallet, rpc, live],
  );

  /** Prove the selected operation and show its review. */
  const prepareXna = useCallback(
    () =>
      pool.run(loc.privacy.stage_proving, async token => {
        if (!pool.historyReady) throw new Error(loc.privacy.error_history_first);
        let coin;
        if (action === 'deposit') {
          const found = requiredFunding ? await exactXnaCoin(requiredFunding) : null;
          live(token);
          if (!found) throw new Error(loc.privacy.error_no_funding);
          coin = { txid: found.txid, vout: found.vout, value: String(found.valueSats) };
        }
        const result = await pool.requireClient().prepare(await buildRequest(token, coin));
        live(token);
        await reviewXna(result, token, action === 'deposit' || action === 'withdraw' ? amount : undefined);
      }),
    [pool, action, requiredFunding, exactXnaCoin, live, buildRequest, reviewXna, amount],
  );

  const publishXna = useCallback(
    () =>
      pool.run(loc.privacy.publishing, async token => {
        const p = preview;
        if (!p) return;
        await pool.requireClient().broadcastAttempt(p.operationId);
        live(token);
        await publishTransaction(checkedRpc(token), genesis, { raw: p.raw, txid: p.txid, points: p.points });
        live(token);
        setPublishedTxids(list => [...list, p.txid]);
        setPreview(null);
        // Out on the network: say so now, while the wallet rescans its notes.
        setCompleted({ kind: action, txid: p.txid, amount: p.amount });
        // A published form must not be sent again by accident.
        setAmount('');
        setRecipients([{ recipient: '', amount: '' }]);
        setNotes([]);
        pool.update(await pool.requireClient().scan());
        live(token);
      }),
    [pool, preview, live, checkedRpc, genesis, action],
  );

  const dismissCompleted = useCallback(() => setCompleted(null), []);

  const resumeXna = useCallback(
    (id: string) =>
      pool.run(loc.privacy.stage_proving, async token => {
        const result = await pool.requireClient().rebuild(id);
        live(token);
        await reviewXna(result, token);
      }),
    [pool, live, reviewXna],
  );

  const releaseDraft = useCallback(
    (id: string) =>
      pool.run(loc.privacy.releasing, async token => {
        pool.update(await pool.requireClient().releaseDraft(id));
        live(token);
      }),
    [pool, live],
  );

  return {
    unit,
    form,
    levels,
    action,
    setAction,
    amount,
    setAmount,
    fee,
    setFee,
    autoFee,
    feeOptions,
    feeSelection,
    notes,
    setNotes,
    destination,
    setDestination,
    recipients,
    setRecipients,
    requiredFunding,
    fundingCoin,
    fundingChecked,
    fundingSent,
    fundingPreview,
    setFundingPreview,
    preview,
    setPreview,
    publishedTxids,
    completed,
    dismissCompleted,
    parseAmount,
    quantum,
    amountIssue,
    prepareFunding,
    publishFunding,
    prepareXna,
    publishXna,
    resumeXna,
    releaseDraft,
  };
}

export type C6Operations = ReturnType<typeof useC6Operations>;
