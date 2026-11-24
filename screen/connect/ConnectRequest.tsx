/**
 * Answering a `wc_sessionRequest` (spec/session.md section 3.4).
 *
 * One screen for four methods, because what changes between them is only how
 * much the user has to be shown before the wallet answers:
 *
 * - `getAccountAddresses` reveals addresses the session already exposed at
 *   settlement, so it is a confirmation and nothing more. Wallet addresses,
 *   never per-domain identities.
 * - `signMessage` shows the message in full. When the SDK's guard says the
 *   text is a sign-in message for a domain other than this session's, the
 *   screen offers no way to sign it at all: a site that could talk the user
 *   into signing one would obtain a login for that other domain. The guard is
 *   enforced in the SDK too (`respondRequest` refuses), so this screen is the
 *   explanation, not the defence.
 * - `sendTransfer` shows destination, amount and memo, as the specification
 *   requires, and then refuses with 4200: this wallet does not build
 *   transactions from a session yet. Showing before refusing is deliberate —
 *   the user should see what was asked for, not just that something was.
 * - `signPsbt` decodes the transaction first (blue_modules/neurai/connect/psbt.ts):
 *   every output with its address and asset, what comes back to this wallet,
 *   what leaves it and the fee. A request that cannot be shown or must not be
 *   signed (foreign inputs, a sighash other than ALL, post-quantum inputs) is
 *   explained and can only be rejected. Legacy and ECDSA software wallets only.
 * - `neurai_getAccountXpub` shows what sharing the account key reveals before
 *   it is sent. Legacy and ECDSA software wallets only.
 *
 * The screen is titled by what is asked ("Sign message", "Sign transaction"…)
 * rather than by the method name, the site is one row at the top and the chain
 * is its network badge. A transaction is shown as rows: what leaves the wallet,
 * the fee, then every output with its amount and where it goes.
 *
 * The refusals are sent as soon as the screen opens rather than on a button,
 * so the dApp gets its answer instead of waiting out the request TTL.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import presentAlert, { AlertType } from '../../components/Alert';
import { ConnectFooter, ConnectInfoRow, ConnectNoticeCard, ConnectSiteIcon } from '../../components/ConnectUI';
import {
  SettingsBadge,
  SettingsCard,
  SettingsScreenHeader,
  SettingsSectionLabel,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { networkForCaip2 } from '../../blue_modules/neurai/connect/config';
import { connectClient, peekIncoming, takeIncoming } from '../../blue_modules/neurai/connect/client';
import { signConnectMessage } from '../../blue_modules/neurai/connect/signer';
import {
  inspectSignPsbt,
  PSBT_ERROR_INVALID,
  PsbtRequestError,
  signPsbtWithWallet,
  type PsbtWallet,
} from '../../blue_modules/neurai/connect/psbt';
import type { ConnectAccountXpub } from '../../blue_modules/neurai/connect/xpub';
import { satsToXna } from '../../blue_modules/neurai/amounts';
import { useNeuraiHwDevice } from '../../blue_modules/neurai-hw/useNeuraiHwDevice';
import { useConnectApprovalGate } from '../../hooks/useConnectApprovalGate';
import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import { NeuraiHardwareWallet } from '../../class/wallets/neurai-hardware-wallet';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import type { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import {
  CONNECT_BASE_METHODS,
  CONNECT_EMPTY_FIELD,
  CONNECT_USER_REJECTED,
  CONNECT_XPUB_METHOD,
  addressFromCaip10,
  asConnectWallet,
  connectMethodsFor,
  describeError,
  describePsbtCancellation,
  hostOf,
  methodHandling,
  shorten,
  signMessageText,
  summariseSendTransfer,
  unsupportedMethodError,
  walletForSessionAddress,
} from './logic';

/** Every method a wallet of this version can answer; used while no wallet is resolved. */
const ALL_METHODS = [...CONNECT_BASE_METHODS, 'signPsbt', CONNECT_XPUB_METHOD];
const formatXna = (sats: bigint): string => satsToXna(sats);

type RouteProps = RouteProp<DetailViewStackParamList, 'ConnectRequest'>;
type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'ConnectRequest'>;

const ConnectRequest: React.FC = () => {
  const p = useSettingsPalette();
  const route = useRoute<RouteProps>();
  const navigation = useExtendedNavigation<NavigationProps>();
  const { wallets } = useStorage();
  const id = route.params.id;

  const incoming = useMemo(() => peekIncoming(id), [id]);
  const event = incoming?.kind === 'request' ? incoming.event : undefined;
  const method = event?.method ?? '';

  // The account the session exposed at settlement is the one that answers: a
  // session request must never be served by an address the dApp never saw.
  const sessionAddress = addressFromCaip10(event?.session.namespaces.bip122?.accounts?.[0]);
  const neuraiWallets = useMemo(() => wallets.filter(isNeuraiWallet), [wallets]);
  // Resolved once the wallets' address engines are up (see walletForSessionAddress).
  const [wallet, setWallet] = useState<(typeof neuraiWallets)[number] | undefined>();
  const [resolvingWallet, setResolvingWallet] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    walletForSessionAddress(neuraiWallets, sessionAddress).then(found => {
      console.debug('[neurai-connect] request wallet resolved', { found: found !== undefined, ms: Date.now() - started });
      if (cancelled) return;
      setWallet(found);
      setResolvingWallet(false);
    });
    return () => {
      cancelled = true;
    };
  }, [neuraiWallets, sessionAddress]);

  // A hardware wallet signs on the device; the link is opened for the
  // signature and closed once the request is answered.
  const isHardware = wallet?.type === NeuraiHardwareWallet.type;
  const hw = useNeuraiHwDevice();

  // What this wallet implements decides the handling, whatever the session
  // settled: a post-quantum or hardware wallet refuses signPsbt with 4200.
  const supported = useMemo(
    () => (wallet ? connectMethodsFor({ walletKind: wallet.walletKind, isHardware }) : ALL_METHODS),
    [wallet, isHardware],
  );
  const handling = methodHandling(method, supported);
  const testnet = wallet?.getNeuraiNetwork() === 'testnet';

  const psbtWallet = useMemo<PsbtWallet | undefined>(
    () =>
      wallet
        ? {
            weOwnAddress: address => wallet.weOwnAddress(address),
            getMessageSigningMaterial: address => wallet.getMessageSigningMaterial(address),
          }
        : undefined,
    [wallet],
  );
  // Decoded once: what the screen shows is exactly what gets checked again and signed.
  const psbt = useMemo(() => {
    if (handling !== 'sign-psbt' || !event || !psbtWallet) return undefined;
    try {
      return { inspection: inspectSignPsbt(event.params, psbtWallet, testnet) };
    } catch (error: unknown) {
      return { error: error instanceof PsbtRequestError ? error : new PsbtRequestError(PSBT_ERROR_INVALID, describeError(error)) };
    }
  }, [handling, event, psbtWallet, testnet]);

  const [xpub, setXpub] = useState<ConnectAccountXpub | false | undefined>();
  useEffect(() => {
    if (handling !== 'share-xpub' || !wallet) return;
    let cancelled = false;
    wallet
      .getConnectAccountXpub()
      .then(value => !cancelled && setXpub(value))
      .catch(() => !cancelled && setXpub(false));
    return () => {
      cancelled = true;
    };
  }, [handling, wallet]);

  const { requireUnlock } = useConnectApprovalGate();
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | undefined>();
  const answered = useRef(false);

  const finish = useCallback(() => {
    takeIncoming(id);
    navigation.goBack();
  }, [id, navigation]);

  // A method this version does not implement has nothing for the user to
  // decide, so its 4200 goes out as soon as the screen opens instead of making
  // the dApp wait out the request TTL for an answer that is already certain.
  // A *blocked* sign-in message is different: it is refused only when the user
  // presses Reject, so the screen never answers on their behalf in the one case
  // where the answer is about their own account.
  useEffect(() => {
    if (!event || answered.current || handling !== 'unsupported') return;
    answered.current = true;
    const error = unsupportedMethodError(method);
    setRefusal(error.message);
    connectClient()
      ?.rejectRequest(id, error)
      .then(() => takeIncoming(id))
      .catch((e: unknown) => console.warn('[neurai-connect] rejectRequest failed', e));
  }, [event, handling, method, id]);

  const onAnswerAddresses = useCallback(async () => {
    if (!sessionAddress) return;
    setBusy(true);
    try {
      const client = connectClient();
      if (!client) throw new Error(loc.connect.error_not_connected);
      await client.respondRequest(id, [{ address: sessionAddress }]);
      presentAlert({ message: loc.connect.request_addresses_sent, type: AlertType.Toast });
      finish();
    } catch (error: unknown) {
      presentAlert({ message: describeError(error) });
    } finally {
      setBusy(false);
    }
  }, [id, sessionAddress, finish]);

  const onSign = useCallback(async () => {
    if (!wallet || !sessionAddress || !event) return;
    // The unlock guards the signature itself: this screen can be reached with
    // `replace` or from a notification, neither of which passes through the
    // navigation-level biometrics list.
    if (!(await requireUnlock())) return;
    setBusy(true);
    try {
      const client = connectClient();
      if (!client) throw new Error(loc.connect.error_not_connected);
      const signature = await signConnectMessage(asConnectWallet(wallet), sessionAddress, signMessageText(event.params), {
        connectDevice: isHardware ? hw.connect : undefined,
      });
      await client.respondRequest(id, { signature: signature.signature });
      presentAlert({ message: loc.connect.request_signed, type: AlertType.Toast });
      finish();
    } catch (error: unknown) {
      presentAlert({ message: describeError(error) });
    } finally {
      if (isHardware) await hw.disconnect().catch(() => {});
      setBusy(false);
    }
  }, [wallet, sessionAddress, event, id, finish, requireUnlock, isHardware, hw]);

  const onSignPsbt = useCallback(async () => {
    if (!event || !psbtWallet || !psbt?.inspection) return;
    if (!(await requireUnlock())) return;
    setBusy(true);
    try {
      const client = connectClient();
      if (!client) throw new Error(loc.connect.error_not_connected);
      const signed = await signPsbtWithWallet(event.params, psbtWallet, testnet);
      answered.current = true;
      await client.respondRequest(id, { psbt: signed });
      presentAlert({ message: loc.connect.request_psbt_signed, type: AlertType.Toast });
      finish();
    } catch (error: unknown) {
      presentAlert({ message: describeError(error) });
    } finally {
      setBusy(false);
    }
  }, [event, psbtWallet, psbt, testnet, id, finish, requireUnlock]);

  const onShareXpub = useCallback(async () => {
    if (!xpub) return;
    // Not a signature, but it opens the whole account to the site: same unlock.
    if (!(await requireUnlock())) return;
    setBusy(true);
    try {
      const client = connectClient();
      if (!client) throw new Error(loc.connect.error_not_connected);
      answered.current = true;
      await client.respondRequest(id, xpub);
      presentAlert({ message: loc.connect.request_xpub_sent, type: AlertType.Toast });
      finish();
    } catch (error: unknown) {
      presentAlert({ message: describeError(error) });
    } finally {
      setBusy(false);
    }
  }, [xpub, id, finish, requireUnlock]);

  const onReject = useCallback(async () => {
    setBusy(true);
    try {
      if (!answered.current) {
        answered.current = true;
        // A blocked sign-in message is refused with the guard's own reason, so
        // the site is told what it did rather than just that it was refused;
        // a transaction that cannot be signed, with the reason it cannot.
        const guard = event?.guard;
        await connectClient()?.rejectRequest(
          id,
          guard?.blocked === true
            ? { code: CONNECT_USER_REJECTED, message: guard.reason ?? 'sign-in message for another domain' }
            : psbt?.error
              ? { code: psbt.error.code, message: psbt.error.message }
              : undefined,
        );
      }
    } catch (error: unknown) {
      console.warn('[neurai-connect] rejectRequest failed', error);
    } finally {
      setBusy(false);
      finish();
    }
  }, [event, psbt, id, finish]);

  const title =
    handling === 'answer'
      ? loc.connect.request_title_addresses
      : handling === 'sign'
        ? loc.connect.request_title_message
        : handling === 'sign-psbt'
          ? loc.connect.request_sign_transaction
          : handling === 'share-xpub'
            ? loc.connect.request_title_xpub
            : loc.connect.request_title;
  const header = <SettingsScreenHeader title={title} onBack={navigation.goBack} icon="close" iconLabel={loc.connect.close} />;

  if (!event) {
    return (
      <View style={[styles.root, { backgroundColor: p.ground }]}>
        {header}
        <View style={styles.goneBox}>
          <ConnectNoticeCard tone="quiet" text={loc.connect.request_gone} />
        </View>
        <ConnectFooter primary={{ title: loc.connect.close, onPress: navigation.goBack }} />
      </View>
    );
  }

  const blocked = event.guard?.blocked === true;
  const transfer = method === 'sendTransfer' ? summariseSendTransfer(event.params) : undefined;
  const network = networkForCaip2(event.chainId);
  const networkLabel =
    network === 'testnet' ? loc.wallets.neurai_network_testnet : network === 'mainnet' ? loc.wallets.neurai_network_mainnet : undefined;
  const peer = event.session.peerMetadata;
  const resolving = (handling === 'sign' || handling === 'sign-psbt') && resolvingWallet;
  const noWallet = (handling === 'sign' || handling === 'sign-psbt') && !resolvingWallet && !wallet && !blocked;
  const primaryAction =
    handling === 'answer'
      ? { title: loc.connect.request_addresses_confirm, onPress: onAnswerAddresses, disabled: !sessionAddress }
      : handling === 'sign' && !blocked
        ? { title: loc.connect.request_sign, onPress: onSign, disabled: !wallet, testID: 'ConnectRequestSign' }
        : handling === 'sign-psbt' && psbt?.inspection
          ? { title: loc.connect.request_sign_transaction, onPress: onSignPsbt, testID: 'ConnectRequestSignPsbt' }
          : handling === 'share-xpub' && xpub
            ? { title: loc.connect.request_xpub_share, onPress: onShareXpub, testID: 'ConnectRequestShareXpub' }
            : undefined;
  const reject = {
    title: handling === 'unsupported' ? loc.connect.close : loc.connect.reject,
    onPress: onReject,
    disabled: busy,
    testID: 'ConnectRequestReject',
  };

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="ConnectRequestScreen">
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Who is asking: the site of the session, and the network it asks on. */}
        <SettingsCard>
          <View style={styles.site}>
            <ConnectSiteIcon icons={peer.icons} />
            <View style={styles.texts}>
              <Text style={[styles.title, { color: p.ink }]} numberOfLines={1}>
                {peer.name || hostOf(peer.url)}
              </Text>
              <Text style={[styles.subtitle, { color: p.mutedOnCard }]} numberOfLines={1}>
                {hostOf(peer.url)}
              </Text>
            </View>
            {networkLabel && <SettingsBadge label={networkLabel} />}
          </View>
        </SettingsCard>

        {blocked && <ConnectNoticeCard tone="danger" testID="ConnectSignMessageBlocked" text={loc.connect.request_signmessage_blocked} />}
        {handling === 'sign' && !blocked && event.guard?.looksLikeLogin === true && (
          <ConnectNoticeCard tone="danger" text={loc.connect.request_signmessage_login} />
        )}
        {handling === 'unsupported' && (
          <ConnectNoticeCard tone="quiet" text={String(loc.formatString(loc.connect.request_unsupported, { method }))} />
        )}

        {handling === 'answer' && (
          <SettingsCard>
            <ConnectInfoRow
              icon="visibility"
              title={loc.connect.request_account}
              subtitle={loc.connect.request_addresses_explanation}
              detail={sessionAddress}
            />
          </SettingsCard>
        )}

        {handling === 'sign' && (
          <View>
            <SettingsSectionLabel>{loc.connect.request_message}</SettingsSectionLabel>
            <SettingsCard>
              <Text style={[styles.message, { color: p.ink }]} selectable testID="ConnectRequestMessage">
                {signMessageText(event.params)}
              </Text>
            </SettingsCard>
          </View>
        )}

        {resolving && (
          <SettingsCard testID="ConnectRequestResolving">
            <View style={styles.site}>
              <ActivityIndicator color={p.accent} />
              <Text style={[styles.subtitle, styles.texts, { color: p.mutedOnCard }]}>
                {String(
                  loc.formatString(loc.connect.request_resolving_wallet, { address: shorten(sessionAddress ?? CONNECT_EMPTY_FIELD) }),
                )}
              </Text>
            </View>
          </SettingsCard>
        )}
        {noWallet && <ConnectNoticeCard tone="danger" text={loc.connect.blocked_no_wallet} />}

        {handling === 'sign-psbt' && psbt?.error && (
          <ConnectNoticeCard
            tone="danger"
            testID="ConnectPsbtInvalid"
            text={String(loc.formatString(loc.connect.request_psbt_invalid, { reason: psbt.error.message }))}
          />
        )}
        {handling === 'sign-psbt' && psbt?.inspection && (
          <>
            <SettingsCard>
              <ConnectInfoRow
                icon="north-east"
                title={`${formatXna(psbt.inspection.spentSats)} XNA`}
                subtitle={loc.connect.request_psbt_spent}
              />
              <ConnectInfoRow
                divider
                tone="muted"
                icon="local-gas-station"
                title={`${formatXna(psbt.inspection.feeSats)} XNA`}
                subtitle={loc.connect.request_psbt_fee}
              />
              <ConnectInfoRow
                divider
                tone="muted"
                icon="draw"
                title={`${psbt.inspection.toSign.length} / ${psbt.inspection.inputCount}`}
                subtitle={loc.connect.request_psbt_inputs}
              />
            </SettingsCard>

            {psbt.inspection.cancellations.length > 0 && (
              <View>
                <SettingsSectionLabel>{loc.connect.request_psbt_cancel_title}</SettingsSectionLabel>
                <SettingsCard testID="ConnectRequestPsbtCancellations">
                  {psbt.inspection.cancellations.map((cancellation, i) => (
                    <ConnectInfoRow
                      key={cancellation.index}
                      divider={i > 0}
                      tone="ok"
                      icon="undo"
                      title={describePsbtCancellation(cancellation)}
                      subtitle={String(loc.formatString(loc.connect.request_psbt_cancel_locked, { index: cancellation.index }))}
                      detail={cancellation.address}
                    />
                  ))}
                </SettingsCard>
                <Text style={[styles.note, { color: p.muted }]}>{loc.connect.request_psbt_cancel_explanation}</Text>
              </View>
            )}

            <View>
              <SettingsSectionLabel>{loc.connect.request_psbt_outputs}</SettingsSectionLabel>
              <SettingsCard testID="ConnectRequestPsbtOutputs">
                {psbt.inspection.outputs.map((output, i) => {
                  const xna = `${formatXna(output.sats)} XNA`;
                  const asset = output.asset ? `${output.asset.amount ?? '1'} ${output.asset.name}` : undefined;
                  const amount = asset ? (output.sats > 0n ? `${asset} + ${xna}` : asset) : xna;
                  const where = output.address ?? `script ${shorten(output.scriptHex, 12)}`;
                  return (
                    <ConnectInfoRow
                      key={output.index}
                      divider={i > 0}
                      tone={output.ownAddress ? 'ok' : 'accent'}
                      icon={output.ownAddress ? 'south-west' : 'north-east'}
                      title={amount}
                      subtitle={
                        output.ownAddress
                          ? loc.connect.request_psbt_change
                          : String(loc.formatString(loc.connect.request_psbt_output, { index: output.index }))
                      }
                      detail={where}
                    />
                  );
                })}
              </SettingsCard>
              <Text style={[styles.note, { color: p.muted }]}>{loc.connect.request_psbt_explanation}</Text>
            </View>
          </>
        )}

        {handling === 'share-xpub' && (
          <>
            <ConnectNoticeCard tone="danger" text={loc.connect.request_xpub_explanation} />
            {xpub === false && <ConnectNoticeCard tone="danger" text={loc.connect.request_xpub_unavailable} />}
            {xpub && (
              <SettingsCard testID="ConnectRequestXpub">
                <ConnectInfoRow icon="key" title={loc.connect.request_xpub_key} detail={xpub.xpub} />
                <ConnectInfoRow
                  divider
                  tone="muted"
                  icon="account-tree"
                  title={loc.connect.request_xpub_path}
                  subtitle={`${xpub.path} · ${xpub.addressType === 'ecdsa' ? 'ECDSA witness v3' : 'Legacy'}`}
                />
              </SettingsCard>
            )}
          </>
        )}

        {transfer && (
          <SettingsCard>
            <ConnectInfoRow
              icon="north-east"
              title={transfer.amount}
              subtitle={loc.connect.transfer_destination}
              detail={transfer.destination}
            />
            {transfer.memo !== CONNECT_EMPTY_FIELD && (
              <ConnectInfoRow divider tone="muted" icon="notes" title={transfer.memo} subtitle={loc.connect.transfer_memo} />
            )}
          </SettingsCard>
        )}

        {(handling === 'sign' || handling === 'sign-psbt' || handling === 'share-xpub') && sessionAddress && (
          <SettingsCard>
            <ConnectInfoRow tone="muted" icon="account-balance-wallet" title={loc.connect.request_account} detail={sessionAddress} />
          </SettingsCard>
        )}
        {refusal !== undefined && <Text style={[styles.note, { color: p.muted }]}>{`${loc.connect.request_answer_sent}: ${refusal}`}</Text>}
        {isHardware && primaryAction && <ConnectNoticeCard tone="quiet" text={loc.connect.login_hardware_confirm} />}
      </ScrollView>

      <ConnectFooter
        secondary={primaryAction ? reject : undefined}
        primary={primaryAction ? { ...primaryAction, loading: busy } : { ...reject, disabled: busy }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, rowGap: 16 },
  goneBox: { flex: 1, padding: 16 },
  site: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 64, paddingVertical: 10 },
  texts: { flex: 1, rowGap: 2 },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 13, lineHeight: 18 },
  message: { fontFamily: 'monospace', fontSize: 13, lineHeight: 19, paddingVertical: 14 },
  note: { fontSize: 12, lineHeight: 17, marginHorizontal: 4, marginTop: 8 },
});

export default ConnectRequest;
