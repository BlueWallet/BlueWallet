/**
 * Operations of an opened private wallet: Deposit, Assign, Withdraw and Join
 * side by side with an icon each, the chosen one's short form in a card
 * below, and every transaction reviewed in its own card before it is
 * published.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatXna } from '@neuraiproject/neurai-privacy/client';

import type { PrivacyWallet } from '../../blue_modules/neurai/privacy/wallet';
import { AUTO_FEE } from '../../blue_modules/neurai/privacy/fees';
import type { C6Action, C6Operations, TxPreview } from '../../hooks/useC6Operations';
import type { C6PrivateWallet } from '../../hooks/useC6PrivateWallet';
import loc from '../../loc';
import type { MaterialIconName } from '../Icon';
import { SettingsIconCircle, SettingsSectionLabel, useSettingsPalette } from '../settings/SettingsUI';
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

function Review(props: { title: string; preview: TxPreview; unit: string; busy: boolean; onPublish: () => void; onCancel: () => void }) {
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

/** Quick deposit amounts in XNA (private payments use multiples of 100 XNA). */
const QUICK_DEPOSITS = ['100', '200', '500'];

export function C6OperationsPanel({ wallet, pool, ops }: { wallet: PrivacyWallet; pool: C6PrivateWallet; ops: C6Operations }) {
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

  return (
    <View style={styles.wrap}>
      <View>
        <SettingsSectionLabel>{loc.privacy.operations}</SettingsSectionLabel>
        <ActionTabs
          tabs={tabs}
          value={ops.action}
          onChange={a => {
            ops.setAction(a);
            ops.setAmount('');
            pool.setError('');
          }}
          disabled={busy || pending}
        />
      </View>
      <Card testID="PrivacyOperationForm">{body}</Card>

      {ops.fundingPreview ? (
        <Review
          title={loc.privacy.review_funding}
          preview={ops.fundingPreview}
          unit={unit}
          busy={busy}
          onPublish={ops.publishFunding}
          onCancel={() => ops.setFundingPreview(null)}
        />
      ) : null}
      {ops.preview ? (
        <Review
          title={`${loc.privacy.review} · ${actionLabel(ops.action)}`}
          preview={ops.preview}
          unit={unit}
          busy={busy}
          onPublish={ops.publishXna}
          onCancel={() => ops.setPreview(null)}
        />
      ) : null}
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
});
