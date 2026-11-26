/**
 * The chat's own surface: a warm squared ground (light) or a dark one, set
 * apart from the wallet's plain ground so a conversation never reads as part
 * of the wallet screens around it, and the bubble colours on top of it.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import { useSettingsPalette } from '../settings/SettingsUI';

export interface ChatPalette {
  dark: boolean;
  wallpaper: string;
  grid: string;
  incoming: string;
  incomingText: string;
  outgoing: string;
  outgoingText: string;
  timeIn: string;
  timeOut: string;
  tick: string;
  /** Day headings and short notes floating on the wallpaper. */
  pill: string;
  pillText: string;
}

export function useChatPalette(): ChatPalette {
  const { dark } = useSettingsPalette();
  return useMemo(
    () =>
      dark
        ? {
            dark,
            wallpaper: '#0d0f13',
            grid: 'rgba(255, 255, 255, 0.05)',
            incoming: '#1f2329',
            incomingText: '#f3f4f6',
            outgoing: '#7c2d12',
            outgoingText: '#ffffff',
            timeIn: '#9ca3af',
            timeOut: 'rgba(255, 255, 255, 0.72)',
            tick: '#fdba74',
            pill: 'rgba(31, 35, 41, 0.92)',
            pillText: '#d1d5db',
          }
        : {
            dark,
            wallpaper: '#f2ebe3',
            grid: 'rgba(194, 65, 12, 0.08)',
            incoming: '#ffffff',
            incomingText: '#111827',
            outgoing: '#ffe1c7',
            outgoingText: '#1c1917',
            timeIn: '#6b7280',
            timeOut: '#9a4a1c',
            tick: '#c2410c',
            pill: 'rgba(255, 255, 255, 0.9)',
            pillText: '#57534e',
          },
    [dark],
  );
}

/** Sender names in a group: the avatar's colour, lighter on the dark bubbles. */
const NAME_ON_DARK: Record<string, string> = {
  '#7c3aed': '#c4b5fd',
  '#0e7490': '#67e8f9',
  '#b45309': '#fcd34d',
  '#be123c': '#fda4af',
  '#15803d': '#86efac',
  '#1d4ed8': '#93c5fd',
  '#a21caf': '#f0abfc',
  '#4d7c0f': '#bef264',
};

export const senderNameColor = (avatar: string, dark: boolean): string => (dark ? (NAME_ON_DARK[avatar] ?? avatar) : avatar);

const CELL = 24;

/** The squared ground behind the conversation. */
export const ChatWallpaper: React.FC = () => {
  const c = useChatPalette();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.wallpaper }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="depinChatGrid" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
            <Path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} stroke={c.grid} strokeWidth={1} fill="none" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#depinChatGrid)" />
      </Svg>
    </View>
  );
};
