/**
 * Operations of an opened private wallet: Deposit, Assign, Withdraw and Join
 * side by side with an icon each, and below them one card holding the step
 * the operation is at — its form, or the review of the transaction it built.
 * A review takes the form's place (the form has nothing left to do until the
 * review is cancelled), and each new step is scrolled into view, so what the
 * next tap should be is always on screen.
 */

import React, { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Keyboard, StyleSheet, Text, View } from 'react-native';
import { formatXna } from '@neuraiproject/neurai-privacy/client';

import type { PrivacyWallet } from '../../blue_modules/neurai/privacy/wallet';
import { AUTO_FEE } from '../../blue_modules/neurai/privacy/fees';
import { triggerSuccessHapticFeedback } from '../../blue_modules/hapticFeedback';
import type { C6Action, C6Operations, CompletedOperation, TxPreview } from '../../hooks/useC6Operations';
import type { C6PrivateWallet } from '../../hooks/useC6PrivateWallet';
import loc from '../../loc';
import Icon, { type MaterialIconName } from '../Icon';
import { SettingsIconCircle, useSettingsPalette } from '../settings/SettingsUI';
import { ActionTabs, Card, Chip, ChipRow, Field, Hint, InfoRow, Label, OutlineButton, PrimaryButton, Segmented, StepSlider } from './C6UI';

export function actionLabel(action: string): string {
  switch (action) {
    case 'deposit':
      return loc.privacy.action_deposit;
    case 'transfer':
      return loc.privacy.action_transfer;
    case 'withdraw':
      return loc.privacy.action_withdraw;
    case 'join':
      return loc.privacy.action_join;
    default:
      return action;
  }
}

function Review(props: {
  title: string;
  preview: TxPreview;
  unit: string;
  busy: boolean;
  onPublish: () => void;
  onCancel: () => void;
  /** Progress or error of the step, right above its buttons. */
  status?: ReactNode;
}) {
  const p = useSettingsPalette();
  const rows: Array<[string, string, boolean?]> = [];
  if (props.preview.form) rows.push([loc.privacy.circuit, props.preview.form]);
  if (props.preview.amount) rows.push([loc.privacy.amount, `${props.preview.amount} ${props.unit}`]);
  rows.push([loc.privacy.network_fee, `${props.preview.fee} XNA`]);
  rows.push(['TxID', props.preview.txid, true]);
  return (
    <Card testID="PrivacyReview">
      <View style={styles.reviewHead} accessibilityLiveRegion="polite">
        <SettingsIconCircle icon="fact-check" />
        <Text style={[styles.reviewTitle, { color: p.ink }]} accessibilityRole="header">
          {props.title}
        </Text>
      </View>
      <View style={[styles.reviewTable, { backgroundColor: p.ground }]}>
        {rows.map(([label, value, mono], index) => (
          <InfoRow key={label} label={label} value={value} mono={mono} divider={index > 0} />
        ))}
      </View>
      {props.status}
      <View style={styles.reviewButtons}>
        <View style={styles.flex}>
          <OutlineButton title={loc.privacy.cancel} onPress={props.onCancel} disabled={props.busy} />
        </View>
        <View style={styles.flex}>
          <PrimaryButton title={loc.privacy.publish} icon="send" onPress={props.onPublish} busy={props.busy} testID="PrivacyPublish" />
        </View>
      </View>
    </Card>
  );
}

const DONE_TITLE: Record<CompletedOperation['kind'], () => string> = {
  funding: () => loc.privacy.done_funding,
  deposit: () => loc.privacy.done_deposit,
  transfer: () => loc.privacy.done_transfer,
  withdraw: () => loc.privacy.done_withdraw,
  join: () => loc.privacy.done_join,
};

/** The transaction went out: what it was, its id, and what happens next. */
function Done(props: { done: CompletedOperation; unit: string; error?: ReactNode; onClose: () => void; onShowActivity: () => void }) {
  const p = useSettingsPalette();
  const funding = props.done.kind === 'funding';
  const title = DONE_TITLE[props.done.kind]();
  const text = funding ? loc.privacy.done_funding_text : loc.privacy.done_text;
  useEffect(() => {
    triggerSuccessHapticFeedback();
    AccessibilityInfo.announceForAccessibility(`${title}. ${text}`);
  }, [title, text]);
  return (
    <Card testID="PrivacyDone">
      <View style={styles.doneHead}>
        <View style={[styles.doneIcon, { backgroundColor: p.ok.bg }]}>
          <Icon name="check" type="material" size={34} color={p.ok.dot} />
        </View>
        <Text style={[styles.doneTitle, { color: p.ink }]} accessibilityRole="header">
          {title}
        </Text>
        <Text style={[styles.doneText, { color: p.mutedOnCard }]}>{text}</Text>
      </View>
      <View style={[styles.reviewTable, { backgroundColor: p.ground }]}>
        {props.done.amount ? <InfoRow label={loc.privacy.amount} value={`${props.done.amount} ${props.unit}`} /> : null}
        <InfoRow label="TxID" value={props.done.txid} mono divider={!!props.done.amount} />
      </View>
      {props.error}
      {funding ? (
        <PrimaryButton title={loc.privacy.done_continue} icon="arrow-forward" onPress={props.onClose} testID="PrivacyDoneContinue" />
      ) : (
        <View style={styles.reviewButtons}>
          <View style={styles.flex}>
            <OutlineButton title={loc.privacy.see_activity} onPress={props.onShowActivity} testID="PrivacyDoneActivity" />
          </View>
          <View style={styles.flex}>
            <PrimaryButton title={loc.privacy.done_ok} onPress={props.onClose} testID="PrivacyDoneOk" />
          </View>
        </View>
      )}
    </Card>
  );
}

/** Quick deposit amounts in XNA (private payments use multiples of 100 XNA). */
const QUICK_DEPOSITS = ['100', '200', '500'];

export function C6OperationsPanel({
  wallet,
  pool,
  ops,
  progress,
  error,
  onReveal,
  onShowActivity,
}: {
  wallet: PrivacyWallet;
  pool: C6PrivateWallet;
  ops: C6Operations;
  /** Progress of the running step, shown in its card, next to the buttons that started it. */
  progress?: ReactNode;
  /** Error of the last step, in the same place. */
  error?: ReactNode;
  /** A new step is on screen at this height within the panel: bring it into view. */
  onReveal?: (y: number) => void;
  /** Show the activity list (after an operation went out). */
  onShowActivity: () => void;
}) {
  const busy = pool.busy;
  const pending = !!ops.preview || !!ops.fundingPreview;
  const locked = busy || pending || !pool.historyReady;
  const unit = ops.unit;
  const spendable = (pool.summary?.notes ?? []).filter(n => n.spendable);

  const tabs: Array<{ key: C6Action; label: string; icon: MaterialIconName }> = [
    { key: 'deposit', label: loc.privacy.action_deposit, icon: 'login' },
    { key: 'transfer', label: loc.privacy.action_transfer, icon: 'swap-horiz' },
    { key: 'withdraw', label: loc.privacy.action_withdraw, icon: 'logout' },
    { key: 'join', label: loc.privacy.action_join, icon: 'call-merge' },
  ];

  const toggleNote = (cm: string) =>
    ops.setNotes(current => {
      if (ops.action !== 'join') return [cm];
      if (current.includes(cm)) return current.filter(n => n !== cm);
      return [...current, cm].slice(-2);
    });

  const noteChips =
    ops.action === 'deposit' ? null : (
      <View>
        <Label>{ops.action === 'join' ? loc.privacy.pick_two_notes : loc.privacy.pick_note}</Label>
        {spendable.length ? (
          <ChipRow>
            {spendable.map(n => (
              <Chip
                key={n.cm}
                label={`${formatXna(n.amountAtomic)} ${unit}`}
                icon={ops.notes.includes(n.cm) ? 'check-circle' : 'radio-button-unchecked'}
                active={ops.notes.includes(n.cm)}
                disabled={locked}
                onPress={() => toggleNote(n.cm)}
              />
            ))}
          </ChipRow>
        ) : (
          <Hint>{loc.privacy.no_notes}</Hint>
        )}
      </View>
    );

  const feeChips = (
    <StepSlider
      label={loc.privacy.fee}
      levels={ops.feeOptions}
      value={ops.feeSelection}
      onChange={ops.setFee}
      format={level => (level === AUTO_FEE ? `${loc.privacy.fee_auto} · ${formatXna(ops.autoFee)} XNA` : `${formatXna(level)} XNA`)}
      formatStop={level => (level === AUTO_FEE ? loc.privacy.fee_auto : formatXna(level))}
      disabled={locked}
      testID="PrivacyFee"
    />
  );

  const prove = ops.prepareXna;
  // Editing the form clears the last operation's error.
  const setAmount = (value: string) => {
    ops.setAmount(value);
    if (pool.error) pool.setError('');
  };

  let body: React.ReactNode;
  if (ops.action === 'deposit') {
    const fundingReady = !!ops.fundingCoin;
    const waiting = !fundingReady && !!ops.fundingSent;
    const issue = ops.amountIssue(ops.amount, 'deposit');
    const amountOk = !!ops.amount && !issue;
    body = (
      <>
        <Field
          label={loc.privacy.amount}
          value={ops.amount}
          onChangeText={setAmount}
          editable={!locked}
          keyboardType="decimal-pad"
          placeholder="100"
          suffix={unit}
          testID="PrivacyAmount"
        />
        <Segmented
          options={QUICK_DEPOSITS.map(v => ({ label: v, value: v }))}
          value={ops.amount}
          onChange={setAmount}
          disabled={locked}
          testID="PrivacyQuickAmount"
        />
        {issue ? <Hint>{issue}</Hint> : null}
        {feeChips}
        {fundingReady ? (
          <PrimaryButton
            title={`2/2 · ${loc.privacy.action_deposit}`}
            icon="login"
            onPress={prove}
            disabled={locked || !amountOk}
            busy={busy}
            testID="PrivacyDeposit"
          />
        ) : waiting ? (
          <PrimaryButton title={loc.privacy.waiting_confirmation} onPress={() => {}} busy />
        ) : (
          <PrimaryButton
            title={`1/2 · ${loc.privacy.prepare_funding}`}
            icon="build"
            onPress={ops.prepareFunding}
            disabled={locked || !amountOk || !ops.fundingChecked}
            busy={busy}
            testID="PrivacyPrepareFunding"
          />
        )}
      </>
    );
  } else if (ops.action === 'transfer') {
    body = (
      <>
        {noteChips}
        {ops.recipients.map((r, i) => (
          <View key={i} style={styles.recipient}>
            <Field
              label={`${loc.privacy.recipient} ${ops.recipients.length > 1 ? i + 1 : ''}`}
              value={r.recipient}
              placeholder="tnzk1…"
              mono
              editable={!locked}
              onChangeText={value => ops.setRecipients(rows => rows.map((row, j) => (j === i ? { ...row, recipient: value } : row)))}
            />
            <Field
              label={loc.privacy.amount}
              value={r.amount}
              placeholder="100"
              editable={!locked}
              keyboardType="decimal-pad"
              suffix={unit}
              onChangeText={value => ops.setRecipients(rows => rows.map((row, j) => (j === i ? { ...row, amount: value } : row)))}
            />
            {ops.amountIssue(r.amount, 'recipient') ? <Hint>{ops.amountIssue(r.amount, 'recipient')}</Hint> : null}
          </View>
        ))}
        <ChipRow>
          {ops.recipients.length < 2 ? (
            <Chip
              label={loc.privacy.recipient}
              icon="person-add"
              disabled={locked}
              onPress={() => ops.setRecipients(rows => [...rows, { recipient: '', amount: '' }])}
            />
          ) : null}
          {ops.recipients.length > 1 ? (
            <Chip
              label={loc.privacy.recipient}
              icon="person-remove"
              disabled={locked}
              onPress={() => ops.setRecipients(rows => rows.slice(0, -1))}
            />
          ) : null}
        </ChipRow>
        {feeChips}
        <PrimaryButton
          title={loc.privacy.action_transfer}
          icon="swap-horiz"
          onPress={prove}
          disabled={
            locked ||
            !ops.notes[0] ||
            ops.recipients.some(r => !r.recipient.trim() || !r.amount || !!ops.amountIssue(r.amount, 'recipient'))
          }
          busy={busy}
          testID="PrivacyAssign"
        />
      </>
    );
  } else if (ops.action === 'withdraw') {
    const note = spendable.find(n => n.cm === ops.notes[0]);
    const issue = ops.amountIssue(ops.amount, 'withdraw', note?.amountAtomic);
    const all =
      note && BigInt(note.amountAtomic) > BigInt(ops.fee || '0')
        ? formatXna(String(BigInt(note.amountAtomic) - BigInt(ops.fee || '0')))
        : null;
    body = (
      <>
        {noteChips}
        <Field
          label={loc.privacy.amount}
          value={ops.amount}
          onChangeText={setAmount}
          editable={!locked}
          keyboardType="decimal-pad"
          placeholder="0"
          suffix={unit}
          labelRight={all ? `${loc.privacy.available} ${all} ${unit}` : undefined}
          action={all ? { label: loc.privacy.all, onPress: () => setAmount(all), disabled: locked } : undefined}
        />
        {issue ? <Hint>{issue}</Hint> : null}
        <Field
          label={loc.privacy.to_address}
          value={ops.destination}
          onChangeText={ops.setDestination}
          editable={!locked}
          placeholder="t… / tnq1r… / tpq1z…"
          mono
        />
        <ChipRow>
          <Chip
            label={loc.privacy.my_address}
            icon="account-balance-wallet"
            disabled={locked}
            onPress={async () => {
              const [own] = await wallet.listOwnAddresses();
              if (own) ops.setDestination(own);
            }}
          />
        </ChipRow>
        {feeChips}
        <PrimaryButton
          title={loc.privacy.action_withdraw}
          icon="logout"
          onPress={prove}
          disabled={locked || !ops.notes[0] || !ops.amount || !!issue || !ops.destination}
          busy={busy}
          testID="PrivacyWithdraw"
        />
      </>
    );
  } else {
    body = (
      <>
        {noteChips}
        {feeChips}
        <PrimaryButton
          title={loc.privacy.action_join}
          icon="call-merge"
          onPress={prove}
          disabled={locked || ops.notes.length !== 2}
          busy={busy}
          testID="PrivacyJoin"
        />
      </>
    );
  }

  // Which step the operation is at. A review stands in for the form while it
  // waits for Publish or Cancel, and once published a confirmation stands in
  // for the review until the user moves on.
  const step = ops.completed ? 'done' : ops.fundingPreview ? 'funding' : ops.preview ? 'review' : 'form';
  const status =
    progress || error ? (
      <>
        {progress}
        {error}
      </>
    ) : null;
  const lastStep = useRef(step);
  const revealNext = useRef(false);
  if (lastStep.current !== step) {
    lastStep.current = step;
    revealNext.current = true;
  }
  // A review has nothing to type: the keyboard would only hide its buttons.
  useEffect(() => {
    if (step !== 'form') Keyboard.dismiss();
  }, [step]);

  return (
    <View style={styles.wrap}>
      <View>
        <ActionTabs
          tabs={tabs}
          value={ops.action}
          onChange={a => {
            ops.setAction(a);
            ops.setAmount('');
            ops.dismissCompleted();
            pool.setError('');
          }}
          disabled={busy || pending}
        />
      </View>

      {/* Keyed by step: each step mounts afresh, and its first layout says where to scroll. */}
      <View
        key={step}
        onLayout={event => {
          if (!revealNext.current) return;
          revealNext.current = false;
          onReveal?.(event.nativeEvent.layout.y);
        }}
      >
        {ops.completed ? (
          // The rescan after publishing runs on: its progress would read as if the send were still going.
          <Done
            done={ops.completed}
            unit={unit}
            error={error}
            onClose={ops.dismissCompleted}
            onShowActivity={() => {
              ops.dismissCompleted();
              onShowActivity();
            }}
          />
        ) : ops.fundingPreview ? (
          <Review
            title={loc.privacy.review_funding}
            preview={ops.fundingPreview}
            unit={unit}
            busy={busy}
            onPublish={ops.publishFunding}
            onCancel={() => ops.setFundingPreview(null)}
            status={status}
          />
        ) : ops.preview ? (
          <Review
            title={`${loc.privacy.review} · ${actionLabel(ops.action)}`}
            preview={ops.preview}
            unit={unit}
            busy={busy}
            onPublish={ops.publishXna}
            onCancel={() => ops.setPreview(null)}
            status={status}
          />
        ) : (
          <Card testID="PrivacyOperationForm">
            {body}
            {status}
          </Card>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { rowGap: 10 },
  recipient: { rowGap: 10 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', columnGap: 12 },
  reviewTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  reviewTable: { borderRadius: 18, paddingHorizontal: 14 },
  reviewButtons: { flexDirection: 'row', columnGap: 10 },
  doneHead: { alignItems: 'center', rowGap: 8, paddingTop: 4 },
  doneIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  doneText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
