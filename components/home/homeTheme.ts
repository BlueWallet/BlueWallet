/**
 * Colours and wallet-kind helpers shared by the home screen and its side panel.
 *
 * Built on the app theme (same ground, cards and text), plus the few values
 * the home adds: a deeper orange for filled controls (white on #f97316 is too
 * faint for icons and text), an orange that is readable as text, and the
 * incoming / pending colours of the transaction rows.
 */
import { useMemo } from 'react';

import type { MaterialIconName } from '../Icon';
import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import type { TWallet } from '../../class/wallets/types';
import { useTheme } from '../themes';

export interface HomePalette {
  dark: boolean;
  /** Screen ground. */
  ground: string;
  /** Cards, the floating bar and the side panel. */
  card: string;
  /** Main text. */
  ink: string;
  /** Secondary text on the ground. */
  muted: string;
  /** Secondary text on a card. */
  mutedOnCard: string;
  /** Filled controls (avatar, scan button, selected wallet icon). */
  accent: string;
  /** Text and icons on `accent`. */
  onAccent: string;
  /** Orange text and links. */
  accentText: string;
  /** Tinted circle behind tile icons. */
  accentSoft: string;
  /** Selected wallet card in the side panel. */
  selectedBg: string;
  incoming: string;
  pending: string;
  /** Unread DePIN marker, the same green the chat uses. */
  unread: string;
  shadow: string;
}

export function useHomePalette(): HomePalette {
  const { colors, dark } = useTheme();
  return useMemo(
    () => ({
      dark,
      ground: colors.background,
      card: colors.elevated,
      ink: colors.foregroundColor,
      muted: dark ? '#9ca3af' : '#5b616b',
      mutedOnCard: dark ? '#9ca3af' : '#6b7280',
      accent: '#ea580c',
      onAccent: '#ffffff',
      accentText: dark ? '#fb923c' : '#c2410c',
      accentSoft: dark ? 'rgba(249, 115, 22, 0.16)' : '#fff1e6',
      selectedBg: dark ? 'rgba(249, 115, 22, 0.12)' : '#fff7ed',
      incoming: dark ? '#4ade80' : '#047857',
      pending: dark ? '#fbbf24' : '#b45309',
      unread: '#22c55e',
      shadow: '#111827',
    }),
    [colors.background, colors.elevated, colors.foregroundColor, dark],
  );
}

/**
 * Decimals shown on the home and in the wallet panel: the rest are cut, never
 * rounded. The send flow always shows the full amount.
 */
export const HOME_MAX_DECIMALS = 4;

export type HomeWalletKind = 'hd' | 'ecdsa' | 'pq' | 'hardware';

export function homeWalletKind(wallet: TWallet): HomeWalletKind {
  if (isNeuraiWallet(wallet)) {
    if (wallet.use_with_hardware_wallet) return 'hardware';
    if (wallet.walletKind === 'pq') return 'pq';
    if (wallet.walletKind === 'ecdsa') return 'ecdsa';
  }
  return 'hd';
}

/** Product names, not translated. */
const KIND_LABELS: Record<HomeWalletKind, string> = {
  hd: 'Neurai HD',
  ecdsa: 'Neurai ECDSA',
  pq: 'Neurai PostQuantum',
  hardware: 'NeuraiHW',
};

const KIND_ICONS: Record<HomeWalletKind, MaterialIconName> = {
  hd: 'vpn-key',
  ecdsa: 'account-balance-wallet',
  pq: 'verified-user',
  hardware: 'memory',
};

export const walletKindLabel = (wallet: TWallet): string => KIND_LABELS[homeWalletKind(wallet)];
export const walletKindIcon = (wallet: TWallet): MaterialIconName => KIND_ICONS[homeWalletKind(wallet)];
/** Icon of a kind of wallet, for the screens that offer one before it exists. */
export const walletKindIconOf = (kind: HomeWalletKind): MaterialIconName => KIND_ICONS[kind];
