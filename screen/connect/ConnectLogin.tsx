/**
 * "Sign in with Neurai": the approval screen for `wc_sessionAuthenticate`.
 *
 * Everything this screen shows is required by spec/auth.md section 2.1, and
 * the reasons are worth keeping next to the code:
 *
 * - `domain` and `aud` in large type, plus the time of the request and the
 *   `statement`, because those four are the only facts that distinguish the
 *   login the user started from one an attacker started.
 * - The literal sentence "By approving, the browser that shows this QR code
 *   will be connected to your account". A relayed QR code (section 9) carries
 *   the *correct* domain, so no check the wallet can perform detects it; the
 *   only defence left is telling the user plainly what approving means.
 * - A warning when the requester's metadata origin is not the domain being
 *   signed. What gets signed is always the domain shown, never the metadata.
 * - No verification code, ever. Earlier drafts had a 4-digit one; it was
 *   withdrawn because it does not protect against a relayed QR code and it
 *   would suggest a guarantee that does not exist.
 * - The exact canonical text, before approving. The user signs a specific
 *   string, so the user is shown that specific string.
 *
 * The exact text sits behind one tap ("Text you sign"): spec/auth.md does not
 * require it, the screen is meant to read at a glance, and it stays one tap
 * away for anyone who wants to check it. If it cannot be built, the reason is
 * shown openly, since approval is then unavailable.
 *
 * The address choice (section 8) is the other half of the screen: a per-domain
 * identity that no two sites can correlate, or a real wallet address the site
 * can look up on chain. The site states a preference in `addressPolicy`, which
 * nobody can verify and which therefore only decides which option starts
 * selected.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { buildCacao, buildCacaoPayload, formatAuthMessage } from '@neuraiproject/neurai-connect-wallet';

import presentAlert, { AlertType } from '../../components/Alert';
import { ConnectFooter, ConnectNoticeCard, ConnectOption, ConnectSiteIcon } from '../../components/ConnectUI';
import Icon from '../../components/Icon';
import {
  SettingsBadge,
  SettingsCard,
  SettingsIconCircle,
  SettingsScreenHeader,
  SettingsSectionLabel,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { concludeLogin, connectClient, peekIncoming, takeIncoming } from '../../blue_modules/neurai/connect/client';
import { networkForCaip2 } from '../../blue_modules/neurai/connect/config';
import { deriveDomainIdentity, recordDomainIdentity, type DomainIdentity } from '../../blue_modules/neurai/connect/identity';
import { useConnectApprovalGate } from '../../hooks/useConnectApprovalGate';
import { signConnectMessage } from '../../blue_modules/neurai/connect/signer';
import { useNeuraiHwDevice } from '../../blue_modules/neurai-hw/useNeuraiHwDevice';
import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import { NeuraiHardwareWallet } from '../../class/wallets/neurai-hardware-wallet';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import type { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import {
  CONNECT_EMPTY_FIELD,
  type ConnectAddressKind,
  type ConnectApprovalBlocker,
  defaultAddressKind,
  asConnectWallet,
  describeError,
  loginApproval,
  pickChain,
} from './logic';

type RouteProps = RouteProp<DetailViewStackParamList, 'ConnectLogin'>;
type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'ConnectLogin'>;

/** `11:25` today, `24 Nov, 11:25` another day; never an unreadable date. */
function shortMoment(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const moment = dayjs(value);
  if (!moment.isValid()) return undefined;
  return moment.isSame(dayjs(), 'day') ? moment.format('LT') : moment.format('D MMM, LT');
}

/** The sentence that explains why approval is not available. */
function blockerText(blocker: ConnectApprovalBlocker | undefined): string | undefined {
  switch (blocker) {
    case 'no_wallet':
      return loc.connect.blocked_no_wallet;
    case 'expired':
      return loc.connect.blocked_expired;
    case 'no_identity':
      return loc.connect.blocked_no_identity;
    default:
      return undefined;
  }
}

const ConnectLogin: React.FC = () => {
  const p = useSettingsPalette();
  const route = useRoute<RouteProps>();
  const navigation = useExtendedNavigation<NavigationProps>();
  const { wallets } = useStorage();
  const id = route.params.id;

  const incoming = useMemo(() => peekIncoming(id), [id]);
  const event = incoming?.kind === 'auth' ? incoming.event : undefined;
  const payload = event?.payload;

  // The chain to sign on is the first Neurai chain the site accepts; anything
  // else it lists belongs to another network and this wallet cannot serve it.
  const chainId = useMemo(() => pickChain(payload?.chains, c => networkForCaip2(c) !== undefined), [payload?.chains]);
  const network = chainId ? networkForCaip2(chainId) : undefined;

  // Every Neurai wallet is listed with its network, because "why is my wallet
  // not here" is worse than a disabled row: a login is signed on the chain the
  // site asked for, so a wallet of the other network simply cannot answer it.
  const neuraiWallets = useMemo(() => wallets.filter(isNeuraiWallet), [wallets]);
  const onNetwork = useMemo(
    () => neuraiWallets.filter(w => network !== undefined && w.getNeuraiNetwork() === network),
    [neuraiWallets, network],
  );
  const [walletID, setWalletID] = useState<string | undefined>();
  const wallet = useMemo(() => onNetwork.find(w => w.getID() === walletID) ?? onNetwork[0], [onNetwork, walletID]);
  // A hardware wallet signs on the device: the link is opened when the user
  // approves, and closed once the login is answered either way.
  const isHardware = wallet?.type === NeuraiHardwareWallet.type;
  const hw = useNeuraiHwDevice();

  const { requireUnlock } = useConnectApprovalGate();
  const [identity, setIdentity] = useState<DomainIdentity | undefined>();
  const [walletAddress, setWalletAddress] = useState<string | undefined>();
  const [addressKind, setAddressKind] = useState<ConnectAddressKind | undefined>();
  const [resolving, setResolving] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    if (!wallet || !payload) {
      setResolving(false);
      return;
    }
    let cancelled = false;
    setResolving(true);
    (async () => {
      // `deriveDomainIdentity` answers undefined for the wallets that have no
      // BIP44 account 101 to derive from (post-quantum, hardware); that is the
      // signal that the identity option cannot be offered at all.
      const derived = await deriveDomainIdentity(asConnectWallet(wallet), payload.domain).catch(() => undefined);
      const address = await wallet.getConnectAddressAsync().catch(() => undefined);
      if (cancelled) return;
      setIdentity(derived);
      setWalletAddress(address);
      setAddressKind(current => {
        // Switching to a wallet that cannot derive an identity (post-quantum)
        // must move the choice, not leave it selected on an impossible option.
        if (current === 'identity' && derived === undefined) return 'wallet';
        return current ?? defaultAddressKind(payload.addressPolicy, derived !== undefined);
      });
      setResolving(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet, payload]);

  const chosenAddress = addressKind === 'identity' ? identity?.address : walletAddress;

  const approval = loginApproval({
    hasWallet: onNetwork.length > 0,
    addressKind: addressKind ?? 'identity',
    identityAvailable: identity !== undefined,
    address: chosenAddress,
    expired: event?.verify.expired,
  });

  // The exact string that will be signed. Built from the payload the same way
  // the backend will rebuild it, so what is shown is what is verified.
  const canonical = useMemo(() => {
    if (!payload || !chainId || !chosenAddress) return { text: '', error: undefined as string | undefined };
    try {
      return { text: formatAuthMessage(buildCacaoPayload(payload, chainId, chosenAddress)), error: undefined };
    } catch (error: unknown) {
      return { text: '', error: describeError(error) };
    }
  }, [payload, chainId, chosenAddress]);

  const onApprove = useCallback(async () => {
    if (!payload || !chainId || !chosenAddress || !wallet) return;
    // Producing a signature for a web site is the sensitive act, so the unlock
    // sits here and not on the navigation to this screen (see useConnectApprovalGate).
    if (!(await requireUnlock())) return;
    setBusy(true);
    try {
      const client = connectClient();
      if (!client) throw new Error(loc.connect.error_not_connected);
      const cacaoPayload = buildCacaoPayload(payload, chainId, chosenAddress);
      const signature = await signConnectMessage(asConnectWallet(wallet), chosenAddress, formatAuthMessage(cacaoPayload), {
        connectDevice: isHardware ? hw.connect : undefined,
      });
      await client.approveAuth(id, { cacaos: [buildCacao(cacaoPayload, { t: signature.type, s: signature.signature })] });
      // Only now is the identity really "used": recording it earlier would leave
      // one behind for a login the user rejected.
      if (identity && chosenAddress === identity.address) await recordDomainIdentity(identity);
      // A login is done once answered: note it in the history and drop its pairing.
      if (event) await concludeLogin(event, chosenAddress);
      takeIncoming(id);
      presentAlert({ message: loc.formatString(loc.connect.login_approved, { domain: payload.domain }), type: AlertType.Toast });
      navigation.goBack();
    } catch (error: unknown) {
      presentAlert({ message: describeError(error) });
    } finally {
      if (isHardware) await hw.disconnect().catch(() => {});
      setBusy(false);
    }
  }, [payload, chainId, chosenAddress, wallet, id, navigation, requireUnlock, identity, isHardware, hw, event]);

  const onReject = useCallback(async () => {
    setBusy(true);
    try {
      await connectClient()?.rejectAuth(id);
      takeIncoming(id);
    } catch (error: unknown) {
      console.warn('[neurai-connect] rejectAuth failed', error);
    } finally {
      setBusy(false);
      navigation.goBack();
    }
  }, [id, navigation]);

  const header = (
    <SettingsScreenHeader title={loc.connect.login_title} onBack={navigation.goBack} icon="close" iconLabel={loc.connect.close} />
  );

  if (!event || !payload) {
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

  // Computed once: it is both the reason the button is disabled and the
  // sentence shown next to it, and those two must never disagree.
  const blocked = blockerText(approval.blocker);
  const networkLabel =
    network === 'testnet' ? loc.wallets.neurai_network_testnet : network === 'mainnet' ? loc.wallets.neurai_network_mainnet : undefined;
  const otherNetwork = neuraiWallets.length - onNetwork.length;
  const requestedAt = shortMoment(payload.iat) ?? CONNECT_EMPTY_FIELD;
  const expiresAt = shortMoment(payload.exp);
  const when = expiresAt
    ? String(loc.formatString(loc.connect.field_requested_line, { time: requestedAt, exp: expiresAt }))
    : String(loc.formatString(loc.connect.field_requested_short, { time: requestedAt }));
  const divider = { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider };

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="ConnectLoginScreen">
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        {/* What spec/auth.md section 2.1 asks to show prominently, all in one card. */}
        <SettingsCard style={styles.hero}>
          <View style={styles.heroHead}>
            <ConnectSiteIcon icons={event.requester.metadata.icons} size={56} />
            <View style={styles.texts}>
              <Text style={[styles.domain, { color: p.ink }]} testID="ConnectLoginDomain">
                {payload.domain}
              </Text>
              {event.requester.metadata.name ? (
                <Text style={[styles.subtitle, { color: p.mutedOnCard }]} numberOfLines={1}>
                  {event.requester.metadata.name}
                </Text>
              ) : null}
            </View>
            {networkLabel && <SettingsBadge label={networkLabel} />}
          </View>
          <Text style={[styles.aud, { color: p.mutedOnCard }]} selectable>
            {payload.aud}
          </Text>
          {payload.statement ? <Text style={[styles.statement, { color: p.ink }]}>{`“${payload.statement}”`}</Text> : null}
          <View style={styles.meta}>
            <Icon name="schedule" type="material" size={16} color={p.mutedOnCard} />
            <Text style={[styles.subtitle, styles.texts, { color: p.mutedOnCard }]}>{when}</Text>
          </View>
          <View style={[styles.meta, styles.warning, divider]} testID="ConnectBrowserWarning">
            <Icon name="info-outline" type="material" size={16} color={p.ink} />
            <Text style={[styles.warningText, styles.texts, { color: p.ink }]}>{loc.connect.login_browser_warning}</Text>
          </View>
        </SettingsCard>

        {!event.verify.domainMatchesMetadata && (
          <ConnectNoticeCard
            tone="danger"
            testID="ConnectDomainMismatch"
            text={String(
              loc.formatString(loc.connect.login_domain_mismatch, { url: event.requester.metadata.url, domain: payload.domain }),
            )}
          />
        )}
        {event.verify.expired && <ConnectNoticeCard tone="danger" text={loc.connect.blocked_expired} />}

        {onNetwork.length > 0 && (
          <View>
            <SettingsSectionLabel>{loc.connect.login_select_wallet}</SettingsSectionLabel>
            <SettingsCard>
              {onNetwork.map((candidate, i) => (
                <ConnectOption
                  key={candidate.getID()}
                  divider={i > 0}
                  icon="account-balance-wallet"
                  title={candidate.getLabel()}
                  subtitle={candidate.typeReadable}
                  selected={candidate.getID() === wallet?.getID()}
                  onPress={() => setWalletID(candidate.getID())}
                  testID={`ConnectWalletOption-${candidate.getID()}`}
                />
              ))}
            </SettingsCard>
            {otherNetwork > 0 && networkLabel && (
              <Text style={[styles.note, { color: p.muted }]}>
                {String(loc.formatString(loc.connect.login_wallet_wrong_network, { network: networkLabel }))}
              </Text>
            )}
          </View>
        )}

        <View>
          <SettingsSectionLabel>{loc.connect.login_sign_in_as}</SettingsSectionLabel>
          <SettingsCard>
            {resolving ? (
              <ActivityIndicator style={styles.spinner} color={p.accent} />
            ) : (
              <>
                <ConnectOption
                  icon="badge"
                  title={loc.connect.login_identity_title}
                  subtitle={identity ? loc.connect.login_identity_description : loc.connect.blocked_no_identity}
                  detail={identity?.address}
                  selected={addressKind === 'identity'}
                  disabled={identity === undefined}
                  onPress={() => setAddressKind('identity')}
                  testID="ConnectAddressOption-identity"
                />
                <ConnectOption
                  divider
                  icon="account-balance-wallet"
                  title={loc.connect.login_wallet_title}
                  subtitle={loc.connect.login_wallet_description}
                  detail={walletAddress}
                  selected={addressKind === 'wallet'}
                  disabled={walletAddress === undefined}
                  onPress={() => setAddressKind('wallet')}
                  testID="ConnectAddressOption-wallet"
                />
              </>
            )}
          </SettingsCard>
        </View>

        {canonical.error ? (
          <ConnectNoticeCard tone="danger" text={canonical.error} />
        ) : (
          <SettingsCard>
            <Pressable
              onPress={() => setShowText(open => !open)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showText }}
              testID="ConnectExactTextToggle"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <SettingsIconCircle icon="description" muted />
              <Text style={[styles.title, styles.texts, { color: p.ink }]}>{loc.connect.login_exact_text}</Text>
              <Icon name={showText ? 'expand-less' : 'expand-more'} type="material" size={24} color={p.mutedOnCard} />
            </Pressable>
            {showText && (
              <Text style={[styles.exact, divider, { color: p.ink }]} selectable testID="ConnectCanonicalMessage">
                {canonical.text}
              </Text>
            )}
          </SettingsCard>
        )}

        {blocked !== undefined && <ConnectNoticeCard tone="danger" text={blocked} />}
        {isHardware && <ConnectNoticeCard tone="quiet" text={loc.connect.login_hardware_confirm} testID="ConnectHardwareNotice" />}
      </ScrollView>

      <ConnectFooter
        secondary={{ title: loc.connect.reject, onPress: onReject, disabled: busy, testID: 'ConnectLoginReject' }}
        primary={{
          title: loc.connect.login_approve,
          onPress: onApprove,
          disabled: !approval.canApprove || canonical.error !== undefined,
          loading: busy,
          testID: 'ConnectLoginApprove',
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, rowGap: 16 },
  goneBox: { flex: 1, padding: 16 },
  pressed: { opacity: 0.6 },
  hero: { paddingVertical: 16, rowGap: 10 },
  heroHead: { flexDirection: 'row', alignItems: 'center', columnGap: 14 },
  texts: { flex: 1, rowGap: 2 },
  domain: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  aud: { fontSize: 13 },
  statement: { fontSize: 15, lineHeight: 21 },
  meta: { flexDirection: 'row', alignItems: 'flex-start', columnGap: 8 },
  warning: { paddingTop: 10 },
  warningText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 13, lineHeight: 18 },
  note: { fontSize: 12, lineHeight: 17, marginHorizontal: 4, marginTop: 8 },
  spinner: { paddingVertical: 20 },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 64, paddingVertical: 10 },
  exact: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18, paddingVertical: 12 },
});

export default ConnectLogin;
