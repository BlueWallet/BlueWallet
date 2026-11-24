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
 * The account exposed is always a **wallet** address (spec/session.md section
 * 3.3). Per-domain identity addresses exist so that a site cannot look the user
 * up on chain; handing one to a session, where `getAccountAddresses` promises
 * usable addresses, would defeat both purposes at once.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import presentAlert, { AlertType } from '../../components/Alert';
import Button from '../../components/Button';
import {
  ConnectActions,
  ConnectCard,
  ConnectChoice,
  ConnectHeader,
  ConnectNotice,
  ConnectRow,
  ConnectSectionTitle,
  connectStyles,
} from '../../components/ConnectParts';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useTheme } from '../../components/themes';
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
  caip10Account,
  connectMethodsFor,
  describeError,
  formatMoment,
  pickChain,
  proposalNamespaces,
  sessionApproval,
  sessionProperties,
} from './logic';

type RouteProps = RouteProp<DetailViewStackParamList, 'ConnectProposal'>;
type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'ConnectProposal'>;

const ConnectProposal: React.FC = () => {
  const { colors } = useTheme();
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
  const granted = useMemo(
    () => (chainId && address ? proposalNamespaces(ask, chainId, address, supported).bip122.methods : []),
    [ask, chainId, address, supported],
  );

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

  if (!event) {
    return (
      <SafeAreaScrollView contentContainerStyle={connectStyles.centered}>
        <Text style={[styles.gone, { color: colors.alternativeTextColor }]}>{loc.connect.request_gone}</Text>
        <Button title={loc.connect.close} onPress={navigation.goBack} />
      </SafeAreaScrollView>
    );
  }

  const networkLabel =
    network === 'testnet' ? loc.wallets.neurai_network_testnet : network === 'mainnet' ? loc.wallets.neurai_network_mainnet : undefined;

  return (
    <SafeAreaScrollView contentContainerStyle={connectStyles.content}>
      <ConnectHeader title={event.proposer.metadata.name} subtitle={event.proposer.metadata.url} badge={networkLabel} />

      <ConnectNotice tone="info" text={loc.connect.proposal_wallet_addresses_note} />

      <ConnectCard>
        <ConnectRow
          label={loc.connect.proposal_account}
          value={address && chainId ? caip10Account(chainId, address) : CONNECT_EMPTY_FIELD}
          mono
        />
        <ConnectRow label={loc.connect.proposal_methods} value={(asked?.methods ?? []).join(', ') || CONNECT_EMPTY_FIELD} />
        <ConnectRow label={loc.connect.proposal_methods_granted} value={granted.join(', ') || CONNECT_EMPTY_FIELD} />
        <ConnectRow label={loc.connect.proposal_events} value={(asked?.events ?? []).join(', ') || CONNECT_EMPTY_FIELD} />
        <ConnectRow label={loc.connect.proposal_session_length} value={loc.connect.proposal_seven_days} />
        <ConnectRow
          label={loc.connect.proposal_request_expires}
          value={formatMoment(event.expiryTimestamp ? event.expiryTimestamp * 1000 : undefined)}
        />
        <ConnectRow label={loc.connect.field_chain} value={chainId ?? CONNECT_EMPTY_FIELD} mono />
      </ConnectCard>

      {candidates.length > 1 && (
        <>
          <ConnectSectionTitle title={loc.connect.login_select_wallet} hint={loc.connect.proposal_which_wallet_hint} />
          {candidates.map(candidate => (
            <ConnectChoice
              key={candidate.getID()}
              selected={candidate.getID() === wallet?.getID()}
              title={candidate.getLabel()}
              onPress={() => setWalletID(candidate.getID())}
            />
          ))}
        </>
      )}

      {resolving && <ActivityIndicator />}
      {approval.blocker === 'no_wallet' && <ConnectNotice tone="danger" text={loc.connect.blocked_no_wallet} />}

      <ConnectActions
        primary={{
          title: loc.connect.proposal_approve,
          onPress: onApprove,
          disabled: !approval.canApprove || busy,
          testID: 'ConnectProposalApprove',
        }}
        secondary={{ title: loc.connect.reject, onPress: onReject, disabled: busy, testID: 'ConnectProposalReject' }}
      />
    </SafeAreaScrollView>
  );
};

const styles = StyleSheet.create({
  gone: { fontSize: 15, textAlign: 'center', marginBottom: 20 },
});

export default ConnectProposal;
