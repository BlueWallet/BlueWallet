// Local-notification posting for actionable Ark swaps. Imported from headless
// background runtimes (no React dependency).
//
// Design notes:
// - Suppression state lives per-wallet in the Arkade Realm
//   (RealmNotificationSuppressionRepository), not in a global AsyncStorage
//   key — bucket-scoped and encrypted, so the suppression record never
//   leaks a stable handle outside the wallet's encryption boundary.
// - Permission and app-level opt-out are checked read-only before each post
//   (no prompting from headless context). Suppression is NOT recorded when
//   the post is skipped, so a later state where the user grants permission
//   triggers a fresh post on the next wake.
// - Notification payload deliberately does NOT include `namespace`. The OS
//   notification database persists payloads and is global across BlueWallet
//   encryption buckets; embedding a deterministic per-wallet identifier
//   would tie a stable handle to the OS-visible record.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { Notification, Notifications } from 'react-native-notifications';
import { checkNotifications, RESULTS } from 'react-native-permissions';

import { isChainSwapClaimable, isChainSwapRefundable, isReverseSwapClaimable, isSubmarineSwapRefundable } from '@arkade-os/boltz-swap';
import type { BoltzSwap } from '@arkade-os/boltz-swap';

import loc from '../loc';
import { NOTIFICATIONS_NO_AND_DONT_ASK_FLAG } from './notifications';
import type {
  RealmNotificationSuppressionRepository,
  ArkSwapNotificationAction,
} from './arkade-adapters/realm/notificationSuppressionRepository';

export const ARK_SWAP_NOTIFICATION_TYPE = 100;

const ANDROID_NOTIFICATION_CHANNEL_ID = 'channel_01';
let channelEnsured = false;

export function ensureArkNotificationChannel(): void {
  if (Platform.OS !== 'android') return;
  if (channelEnsured) return;
  channelEnsured = true;
  // Reuses the BlueWallet channel from blue_modules/notifications.ts:80-91 so
  // headless runs do not register a second channel under a different name.
  Notifications.setNotificationChannel({
    channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
    name: 'BlueWallet notifications',
    description: 'Notifications about incoming payments',
    importance: 4,
    enableVibration: true,
    showBadge: true,
  });
}

// Channel registration runs lazily on the first post (see notifyArkSwapActionable).
// Calling it at module-top would invoke the native bridge during JS bundle
// evaluation, which racy-blocks RN bootstrap on some devices and breaks
// Detox's RN-context wait. The existing blue_modules/notifications.ts pattern
// also defers channel setup to lazy invocation.

export function resolveActionableAction(swap: BoltzSwap): ArkSwapNotificationAction | null {
  if (isReverseSwapClaimable(swap) || isChainSwapClaimable(swap)) return 'claim';
  if (isSubmarineSwapRefundable(swap) || isChainSwapRefundable(swap)) return 'refund';
  return null;
}

const interpolate = (template: string, walletLabel: string): string => template.replace('{walletLabel}', walletLabel);

// Static references so scripts/find-unused-loc.js can detect these keys.
const titleFor = (): string => loc.lndViewInvoice.notification_action_title;
const bodyFor = (action: ArkSwapNotificationAction): string =>
  action === 'claim' ? loc.lndViewInvoice.notification_claim_body : loc.lndViewInvoice.notification_refund_body;

let appStateOverrideForTest: string | null = null;
let permissionResultOverrideForTest: string | null = null;
let optOutFlagOverrideForTest: string | null | undefined;

function currentAppState(): string {
  return appStateOverrideForTest ?? AppState.currentState;
}

async function isOsNotificationPermissionGranted(): Promise<boolean> {
  if (permissionResultOverrideForTest !== null) {
    return permissionResultOverrideForTest === RESULTS.GRANTED;
  }
  try {
    const { status } = await checkNotifications();
    return status === RESULTS.GRANTED;
  } catch {
    return false;
  }
}

async function isAppLevelOptedOut(): Promise<boolean> {
  if (optOutFlagOverrideForTest !== undefined) {
    return optOutFlagOverrideForTest === 'true';
  }
  try {
    const flag = await AsyncStorage.getItem(NOTIFICATIONS_NO_AND_DONT_ASK_FLAG);
    return flag === 'true';
  } catch {
    return false;
  }
}

export async function notifyArkSwapActionable(
  swap: BoltzSwap,
  suppression: RealmNotificationSuppressionRepository,
  walletID: string,
  walletLabel: string,
): Promise<void> {
  const action = resolveActionableAction(swap);
  if (!action) return;

  if (currentAppState() === 'active') return;

  if (suppression.has(swap.id, action)) return;

  if (!(await isOsNotificationPermissionGranted())) return;
  if (await isAppLevelOptedOut()) return;

  ensureArkNotificationChannel();

  const title = titleFor();
  const body = interpolate(bodyFor(action), walletLabel);

  try {
    Notifications.postLocalNotification(
      // namespace is intentionally omitted; tap routing re-derives it from the loaded wallet.
      new Notification({
        title,
        body,
        type: ARK_SWAP_NOTIFICATION_TYPE,
        walletID,
        swapId: swap.id,
        action,
      }),
    );
  } catch (e: any) {
    console.warn('[ArkNotifications] postLocalNotification failed:', e?.message ?? e);
    return;
  }

  try {
    suppression.record(swap.id, action);
  } catch (e: any) {
    console.warn('[ArkNotifications] suppression.record failed:', e?.message ?? e);
  }
}

export const __testing__ = {
  resetChannel: (): void => {
    channelEnsured = false;
  },
  setAppStateForTest: (state: string | null): void => {
    appStateOverrideForTest = state;
  },
  setPermissionResultForTest: (result: string | null): void => {
    permissionResultOverrideForTest = result;
  },
  setOptOutFlagForTest: (value: string | null | undefined): void => {
    optOutFlagOverrideForTest = value;
  },
};
