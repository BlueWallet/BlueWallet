/**
 * Approval of a dApp session (`wc_sessionPropose`, spec/session.md section 3.2).
 *
 * A proposal is a request for standing permission, not for one signature, so
 * the screen has to answer four questions before the user says yes: who is
 * asking, what they will be able to do (methods and events), which account
 * they will see, and for how long. All four are shown; nothing is granted that
 * the dApp did not ask for, because the namespaces settled here are built from
 * the proposal itself. Optional methods are granted only when the chosen
 * wallet implements them (`connectMethodsFor`), which is how the site learns
 * whether it may ask this wallet to sign transactions.
 *
 * The methods and events appear as what the site will be able to do, in plain
 * words with an icon, rather than as protocol names; the chain is the network
 * badge. Methods asked for but not granted are listed by name under them.
 *
 * The account exposed is always a **wallet** address (spec/session.md section
 * 3.3). Per-domain identity addresses exist so that a site cannot look the user
 * up on chain; handing one to a session, where `getAccountAddresses` promises
 * usable addresses, would defeat both purposes at once.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import presentAlert, { AlertType } from '../../components/Alert';
import { ConnectFooter, ConnectNoticeCard, ConnectOption, ConnectSiteIcon } from '../../components/ConnectUI';
import Icon, { MaterialIconName } from '../../components/Icon';
import {
  SettingsBadge,
  SettingsCard,
  SettingsIconCircle,
  SettingsScreenHeader,
  SettingsSectionLabel,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { connectClient, noteSessionApproved, peekIncoming, takeIncoming } from '../../blue_modules/neurai/connect/client';
import { useConnectApprovalGate } from '../../hooks/useConnectApprovalGate';
import { networkForCaip2 } from '../../blue_modules/neurai/connect/config';
import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import { NeuraiHardwareWallet } from '../../class/wallets/neurai-hardware-wallet';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import type { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import {
  CONNECT_EMPTY_FIELD,
  CONNECT_XPUB_METHOD,
  connectMethodsFor,
  describeError,
  hostOf,
  pickChain,
  proposalNamespaces,
  sessionApproval,
  sessionProperties,
} from './logic';

/** What a method or event lets the site do, as the user reads it. */
function permission(name: string): { icon: MaterialIconName; label: string } {
  switch (name) {
    case 'getAccountAddresses':
      return { icon: 'visibility', label: loc.connect.perm_addresses };
    case 'signMessage':
      return { icon: 'draw', label: loc.connect.perm_sign_message };
    case 'signPsbt':
      return { icon: 'receipt-long', label: loc.connect.perm_sign_psbt };
    case 'sendTransfer':
      return { icon: 'north-east', label: loc.connect.perm_send };
    case CONNECT_XPUB_METHOD:
      return { icon: 'key', label: loc.connect.perm_xpub };
    case 'bip122_addressesChanged':
      return { icon: 'sync', label: loc.connect.perm_addresses_changed };
    default:
      return { icon: 'extension', label: name };
  }
}

type RouteProps = RouteProp<DetailViewStackParamList, 'ConnectProposal'>;
type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'ConnectProposal'>;

const ConnectProposal: React.FC = () => {
  const p = useSettingsPalette();
  const route = useRoute<RouteProps>();
  const navigation = useExtendedNavigation<NavigationProps>();
  const { wallets } = useStorage();
  const id = route.params.id;

  const incoming = useMemo(() => peekIncoming(id), [id]);
  const event = incoming?.kind === 'proposal' ? incoming.event : undefined;
  const asked = event?.namespaces.bip122;
  const ask = useMemo(
    () => ({ required: event?.requiredNamespaces?.bip122, optional: event?.optionalNamespaces?.bip122 }),
    [event?.requiredNamespaces, event?.optionalNamespaces],
  );

  const chainId = useMemo(() => pickChain(asked?.chains, c => networkForCaip2(c) !== undefined), [asked?.chains]);
  const network = chainId ? networkForCaip2(chainId) : undefined;

  const candidates = useMemo(
    () => wallets.filter(isNeuraiWallet).filter(w => network !== undefined && w.getNeuraiNetwork() === network),
    [wallets, network],
  );
  const [walletID, setWalletID] = useState<string | undefined>();
  const wallet = useMemo(() => candidates.find(w => w.getID() === walletID) ?? candidates[0], [candidates, walletID]);

  const [address, setAddress] = useState<string | undefined>();
  const [resolving, setResolving] = useState(true);
  const { requireUnlock } = useConnectApprovalGate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!wallet) {
      setResolving(false);
      return;
    }
    let cancelled = false;
    setResolving(true);
    (async () => {
      // The account a session exposes must be one the wallet can later sign
      // for: a hardware wallet resolves this to the device's signing address.
      const resolved = await wallet.getConnectAddressAsync().catch(() => undefined);
      if (cancelled) return;
      setAddress(resolved);
      setResolving(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  const approval = sessionApproval({ hasWallet: wallet !== undefined, address });
  const supported = useMemo(
    () => (wallet ? connectMethodsFor({ walletKind: wallet.walletKind, isHardware: wallet.type === NeuraiHardwareWallet.type }) : []),
    [wallet],
  );
  // What will be granted depends on the wallet, not on its address: computed
  // up front, so the list does not wait for the address to resolve.
  const grant = useMemo(() => proposalNamespaces(ask, chainId ?? '', '', supported).bip122, [ask, chainId, supported]);
  const notGranted = (asked?.methods ?? []).filter(method => !grant.methods.includes(method));

  const onApprove = useCallback(async () => {
    if (!chainId || !address) return;
    // Approving exposes an account and opens a seven-day session, so it asks for the
    // same unlock as a signature (this screen is reached with `replace`, which does not
    // pass through the navigation-level biometrics list).
    if (!(await requireUnlock())) return;
    setBusy(true);
    try {
      const client = connectClient();
      if (!client) throw new Error(loc.connect.error_not_connected);
      await client.approveSession(id, {
        namespaces: proposalNamespaces(ask, chainId, address, supported),
        sessionProperties: sessionProperties([{ address }]),
      });
      if (event) await noteSessionApproved(event, address);
      takeIncoming(id);
      presentAlert({
        message: loc.formatString(loc.connect.proposal_approved, { name: event?.proposer.metadata.name ?? CONNECT_EMPTY_FIELD }),
        type: AlertType.Toast,
      });
      navigation.goBack();
    } catch (error: unknown) {
      presentAlert({ message: describeError(error) });
    } finally {
      setBusy(false);
    }
  }, [ask, chainId, address, supported, id, event, navigation, requireUnlock]);

  const onReject = useCallback(async () => {
    setBusy(true);
    try {
      await connectClient()?.rejectSession(id);
      takeIncoming(id);
    } catch (error: unknown) {
      console.warn('[neurai-connect] rejectSession failed', error);
    } finally {
      setBusy(false);
      navigation.goBack();
    }
  }, [id, navigation]);

  const header = (
    <SettingsScreenHeader title={loc.connect.proposal_title} onBack={navigation.goBack} icon="close" iconLabel={loc.connect.close} />
  );

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

  const networkLabel =
    network === 'testnet' ? loc.wallets.neurai_network_testnet : network === 'mainnet' ? loc.wallets.neurai_network_mainnet : undefined;
  const metadata = event.proposer.metadata;
  const abilities = [...grant.methods, ...grant.events];

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="ConnectProposalScreen">
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsCard style={styles.hero}>
          <View style={styles.heroHead}>
            <ConnectSiteIcon icons={metadata.icons} size={56} />
            <View style={styles.texts}>
              <Text style={[styles.name, { color: p.ink }]}>{metadata.name || hostOf(metadata.url)}</Text>
              <Text style={[styles.subtitle, { color: p.mutedOnCard }]} numberOfLines={1}>
                {hostOf(metadata.url)}
              </Text>
            </View>
            {networkLabel && <SettingsBadge label={networkLabel} />}
          </View>
          <View style={styles.meta}>
            <Icon name="schedule" type="material" size={16} color={p.mutedOnCard} />
            <Text style={[styles.subtitle, styles.texts, { color: p.mutedOnCard }]}>{loc.connect.proposal_seven_days}</Text>
          </View>
        </SettingsCard>

        <View>
          <SettingsSectionLabel>{loc.connect.proposal_permissions}</SettingsSectionLabel>
          <SettingsCard testID="ConnectProposalPermissions">
            {abilities.map((name, i) => {
              const { icon, label } = permission(name);
              return (
                <View key={name} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider }]}>
                  <SettingsIconCircle icon={icon} />
                  <Text style={[styles.title, styles.texts, { color: p.ink }]}>{label}</Text>
                </View>
              );
            })}
            {abilities.length === 0 && <Text style={[styles.subtitle, styles.empty, { color: p.mutedOnCard }]}>{CONNECT_EMPTY_FIELD}</Text>}
          </SettingsCard>
          <Text style={[styles.note, { color: p.muted }]}>
            {[
              loc.connect.proposal_each_request,
              notGranted.length > 0 ? String(loc.formatString(loc.connect.proposal_not_supported, { methods: notGranted.join(', ') })) : '',
            ]
              .filter(Boolean)
              .join(' ')}
          </Text>
        </View>

        {candidates.length > 0 && (
          <View>
            <SettingsSectionLabel>{loc.connect.login_select_wallet}</SettingsSectionLabel>
            <SettingsCard>
              {candidates.map((candidate, i) => {
                const selected = candidate.getID() === wallet?.getID();
                return (
                  <ConnectOption
                    key={candidate.getID()}
                    divider={i > 0}
                    icon="account-balance-wallet"
                    title={candidate.getLabel()}
                    subtitle={candidate.typeReadable}
                    detail={selected && !resolving ? address : undefined}
                    selected={selected}
                    onPress={() => setWalletID(candidate.getID())}
                    testID={`ConnectWalletOption-${candidate.getID()}`}
                  />
                );
              })}
              {resolving && <ActivityIndicator style={styles.spinner} color={p.accent} />}
            </SettingsCard>
            <Text style={[styles.note, { color: p.muted }]}>{loc.connect.proposal_which_wallet_hint}</Text>
          </View>
        )}

        {approval.blocker === 'no_wallet' && <ConnectNoticeCard tone="danger" text={loc.connect.blocked_no_wallet} />}
      </ScrollView>

      <ConnectFooter
        secondary={{ title: loc.connect.reject, onPress: onReject, disabled: busy, testID: 'ConnectProposalReject' }}
        primary={{
          title: loc.connect.proposal_approve,
          onPress: onApprove,
          disabled: !approval.canApprove,
          loading: busy,
          testID: 'ConnectProposalApprove',
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, rowGap: 16 },
  goneBox: { flex: 1, padding: 16 },
  hero: { paddingVertical: 16, rowGap: 12 },
  heroHead: { flexDirection: 'row', alignItems: 'center', columnGap: 14 },
  texts: { flex: 1, rowGap: 2 },
  name: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 13, lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'flex-start', columnGap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 56, paddingVertical: 8 },
  empty: { paddingVertical: 16 },
  note: { fontSize: 12, lineHeight: 17, marginHorizontal: 4, marginTop: 8 },
  spinner: { paddingVertical: 12 },
});

export default ConnectProposal;
