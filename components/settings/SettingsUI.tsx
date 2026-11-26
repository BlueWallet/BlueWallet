/**
 * Building blocks of the settings screens in the home's style: white cards on
 * the home ground, orange icons in soft circles, an uppercase label above each
 * group and a round back button in place of the native header.
 */
import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Switch, Text, TextInput, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import loc from '../../loc';
import Icon, { MaterialIconName } from '../Icon';
import { HomePalette, useHomePalette } from '../home/homeTheme';

interface Tone {
  bg: string;
  fg: string;
  dot: string;
}

export interface SettingsPalette extends HomePalette {
  divider: string;
  switchOff: string;
  /** Network status pills. */
  ok: Tone;
  fail: Tone;
  idle: Tone;
  /** Security warning card. */
  warnBg: string;
  warnBorder: string;
  warnIconBg: string;
  /** Small orange pill ("Review", "Recommended"). */
  badgeBg: string;
  badgeText: string;
  /** Filled button: white text needs the deeper orange in both themes. */
  button: string;
  /** State text on a selected quick tile. */
  onText: string;
}

export function useSettingsPalette(): SettingsPalette {
  const p = useHomePalette();
  return useMemo(
    () => ({
      ...p,
      divider: p.dark ? 'rgba(255, 255, 255, 0.08)' : '#ececef',
      switchOff: p.dark ? '#4b5563' : '#d1d5db',
      ok: p.dark ? { bg: 'rgba(34, 197, 94, 0.14)', fg: '#86efac', dot: '#22c55e' } : { bg: '#f0fdf4', fg: '#166534', dot: '#16a34a' },
      fail: p.dark ? { bg: 'rgba(239, 68, 68, 0.16)', fg: '#fca5a5', dot: '#ef4444' } : { bg: '#fef2f2', fg: '#991b1b', dot: '#dc2626' },
      idle: p.dark ? { bg: 'rgba(255, 255, 255, 0.06)', fg: '#9ca3af', dot: '#6b7280' } : { bg: '#f4f4f6', fg: '#5b616b', dot: '#9ca3af' },
      warnBg: p.dark ? 'rgba(249, 115, 22, 0.10)' : '#fff7ed',
      warnBorder: p.dark ? 'rgba(249, 115, 22, 0.35)' : '#fed7aa',
      warnIconBg: p.dark ? 'rgba(249, 115, 22, 0.18)' : '#ffedd5',
      badgeBg: p.dark ? 'rgba(249, 115, 22, 0.18)' : '#ffedd5',
      badgeText: p.dark ? '#fdba74' : '#9a3412',
      button: '#c2410c',
      onText: p.dark ? '#fdba74' : '#9a3412',
    }),
    [p],
  );
}

/** Name of the device's biometrics, as the user knows it. */
export const biometricLabel = (type?: string): string =>
  type === 'FaceID' ? 'Face ID' : type === 'TouchID' ? 'Touch ID' : loc.settings.biometrics;

/**
 * Round back button and a large title, under the status bar. Screens shown as
 * a modal (an approval) pass `icon="close"` and the matching label.
 */
export const SettingsScreenHeader: React.FC<{ title: string; onBack?: () => void; icon?: MaterialIconName; iconLabel?: string }> = ({
  title,
  onBack,
  icon = 'arrow-back',
  iconLabel = loc._.back,
}) => {
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: p.ground }]}>
      {/* No button on a step that must not be left halfway (the words of a new wallet). */}
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={iconLabel}
          testID="SettingsBackButton"
          style={({ pressed }) => [styles.back, { backgroundColor: p.card }, pressed && styles.pressed]}
        >
          <Icon name={icon} type="material" size={22} color={p.ink} />
        </Pressable>
      ) : null}
      <Text style={[styles.title, { color: p.ink }]} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
};

export const SettingsSectionLabel: React.FC<{ children: string }> = ({ children }) => {
  const p = useSettingsPalette();
  return (
    <Text style={[styles.sectionLabel, { color: p.muted }]} accessibilityRole="header">
      {children}
    </Text>
  );
};

/** White card holding a group of rows. */
export const SettingsCard: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }> = ({
  children,
  style,
  testID,
}) => {
  const p = useSettingsPalette();
  return (
    <View style={[styles.card, { backgroundColor: p.card }, style]} testID={testID}>
      {children}
    </View>
  );
};

export const SettingsIconCircle: React.FC<{ icon: MaterialIconName; muted?: boolean }> = ({ icon, muted }) => {
  const p = useSettingsPalette();
  return (
    <View style={[styles.iconCircle, { backgroundColor: muted ? p.ground : p.accentSoft }]}>
      <Icon name={icon} type="material" size={20} color={muted ? p.mutedOnCard : p.accentText} />
    </View>
  );
};

/** `accent` asks for attention ("Review"); `ok` states that something holds ("Always on"). */
export type SettingsBadgeTone = 'accent' | 'ok';

export const SettingsBadge: React.FC<{ label: string; tone?: SettingsBadgeTone }> = ({ label, tone = 'accent' }) => {
  const p = useSettingsPalette();
  const bg = tone === 'ok' ? p.ok.bg : p.badgeBg;
  const fg = tone === 'ok' ? p.ok.fg : p.badgeText;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
};

interface RowBase {
  icon: MaterialIconName;
  title: string;
  subtitle?: string;
  /** Not the first row of its card: draws the divider above it. */
  divider?: boolean;
  testID?: string;
}

/** A row that only informs: nothing to press or switch, an optional label at the end. */
export const SettingsStaticRow: React.FC<RowBase & { badge?: string; badgeTone?: SettingsBadgeTone }> = ({
  icon,
  title,
  subtitle,
  badge,
  badgeTone,
  divider,
  testID,
}) => {
  const p = useSettingsPalette();
  return (
    <View
      style={[styles.row, styles.switchRow, divider && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider }]}
      accessible
      accessibilityLabel={[title, subtitle, badge].filter(Boolean).join(', ')}
      testID={testID}
    >
      <SettingsIconCircle icon={icon} />
      <View style={styles.texts}>
        <Text style={[styles.rowTitle, { color: p.ink }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: p.mutedOnCard }]}>{subtitle}</Text> : null}
      </View>
      {badge ? <SettingsBadge label={badge} tone={badgeTone} /> : null}
    </View>
  );
};

interface SettingsRowProps extends RowBase {
  value?: string;
  badge?: string;
  /** Coloured dot before the subtitle (a status). */
  dotColor?: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Leaves the app (system settings, a web page): neutral icon, no chevron. */
  external?: boolean;
}

/** A row that opens another screen. */
export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  title,
  subtitle,
  value,
  badge,
  dotColor,
  divider,
  onPress,
  disabled,
  external,
  testID,
}) => {
  const p = useSettingsPalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={[title, subtitle, value, badge].filter(Boolean).join(', ')}
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        divider && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider },
        pressed && styles.pressed,
      ]}
    >
      <SettingsIconCircle icon={icon} muted={disabled || external} />
      <View style={styles.texts}>
        <Text style={[styles.rowTitle, { color: disabled ? p.mutedOnCard : p.ink }]}>{title}</Text>
        {subtitle ? (
          <View style={styles.subtitleRow}>
            {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
            <Text style={[styles.subtitle, { color: p.mutedOnCard }]}>{subtitle}</Text>
          </View>
        ) : null}
      </View>
      {value ? (
        <Text style={[styles.value, { color: p.mutedOnCard }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {badge ? <SettingsBadge label={badge} /> : null}
      {disabled || external ? null : <Icon name="chevron-right" type="material" size={22} color={p.mutedOnCard} />}
    </Pressable>
  );
};

export interface SettingsSegment<T extends string> {
  value: T;
  label: string;
  icon: MaterialIconName;
  testID?: string;
}

/** A few mutually exclusive options side by side, the chosen one raised. */
export function SettingsSegmented<T extends string>({
  segments,
  value,
  onChange,
  testID,
}: {
  segments: SettingsSegment<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}) {
  const p = useSettingsPalette();
  return (
    <View style={[styles.segmented, { backgroundColor: p.ground }]} accessibilityRole="radiogroup" testID={testID}>
      {segments.map(segment => {
        const on = segment.value === value;
        const color = on ? p.ink : p.mutedOnCard;
        return (
          <Pressable
            key={segment.value}
            onPress={() => onChange(segment.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={segment.label}
            testID={segment.testID}
            style={({ pressed }) => [
              styles.segment,
              on && [styles.segmentOn, { backgroundColor: p.card }],
              pressed && !on && styles.pressed,
            ]}
          >
            <Icon name={segment.icon} type="material" size={18} color={color} />
            <Text style={[styles.segmentText, { color }]} numberOfLines={1}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface SettingsSwitchRowProps extends RowBase {
  value: boolean;
  onValueChange: (value: boolean) => void;
  badge?: string;
  disabled?: boolean;
  loading?: boolean;
  switchTestID?: string;
}

/** A row with a switch. */
export const SettingsSwitchRow: React.FC<SettingsSwitchRowProps> = ({
  icon,
  title,
  subtitle,
  badge,
  divider,
  value,
  onValueChange,
  disabled,
  loading,
  testID,
  switchTestID,
}) => {
  const p = useSettingsPalette();
  return (
    <View
      style={[styles.row, styles.switchRow, divider && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider }]}
      testID={testID}
    >
      <SettingsIconCircle icon={icon} />
      <View style={styles.texts}>
        <View style={styles.titleRow}>
          <Text style={[styles.rowTitle, { color: p.ink }]}>{title}</Text>
          {badge ? <SettingsBadge label={badge} /> : null}
        </View>
        {subtitle ? <Text style={[styles.subtitle, { color: p.mutedOnCard }]}>{subtitle}</Text> : null}
      </View>
      {loading ? (
        <ActivityIndicator color={p.accent} style={styles.spinner} />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          accessibilityLabel={title}
          testID={switchTestID}
          trackColor={{ false: p.switchOff, true: p.accent }}
          thumbColor="#ffffff"
          ios_backgroundColor={p.switchOff}
        />
      )}
    </View>
  );
};

/** A search box under the header, for the long lists (currencies, languages). */
export const SettingsSearchField: React.FC<{
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  testID?: string;
}> = ({ value, onChangeText, placeholder, testID }) => {
  const p = useSettingsPalette();
  return (
    <View style={[styles.search, { backgroundColor: p.card }]}>
      <Icon name="search" type="material" size={20} color={p.mutedOnCard} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={p.mutedOnCard}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={[styles.searchInput, { color: p.ink }]}
        underlineColorAndroid="transparent"
        testID={testID}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityRole="button" accessibilityLabel={loc._.cancel}>
          <Icon name="close" type="material" size={18} color={p.mutedOnCard} />
        </Pressable>
      )}
    </View>
  );
};

export type SettingsStatusTone = 'ok' | 'fail' | 'idle';

/** A coloured dot and the words for it: the colour is never the only signal. */
export const SettingsStatusLine: React.FC<{
  tone: SettingsStatusTone;
  text: string;
  busy?: boolean;
  /** Smaller dot and text, for a line under a title. */
  compact?: boolean;
  testID?: string;
}> = ({ tone, text, busy, compact, testID }) => {
  const p = useSettingsPalette();
  const colors = p[tone];
  return (
    <View style={[styles.statusLine, compact && styles.statusLineCompact]} accessibilityLiveRegion="polite" testID={testID}>
      {busy ? (
        <ActivityIndicator size="small" color={colors.dot} style={compact && styles.statusSpinnerCompact} />
      ) : (
        <View style={[compact ? styles.dotCompact : styles.dot, { backgroundColor: colors.dot }]} />
      )}
      <Text
        style={[styles.statusText, compact && styles.statusTextCompact, { color: p.mutedOnCard }]}
        numberOfLines={compact ? 1 : undefined}
      >
        {text}
      </Text>
    </View>
  );
};

/**
 * Wide button inside a card: filled for the action that moves things forward,
 * `secondary` (the ground's colour) for the other choice, `danger` for what
 * cannot be undone.
 */
export const SettingsButton: React.FC<{
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: MaterialIconName;
  variant?: 'primary' | 'secondary' | 'danger';
  testID?: string;
}> = ({ title, onPress, disabled, loading, icon, variant = 'primary', testID }) => {
  const p = useSettingsPalette();
  const filled = variant === 'primary';
  const fg = filled ? '#ffffff' : variant === 'danger' ? p.fail.fg : p.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.wideButton,
        { backgroundColor: filled ? p.button : variant === 'danger' ? p.fail.bg : p.ground },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} type="material" size={20} color={fg} /> : null}
          <Text style={[styles.wideButtonText, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
};

/** Small tinted button with an icon (copy, QR). */
export const SettingsPillButton: React.FC<{
  icon: MaterialIconName;
  title: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}> = ({ icon, title, onPress, disabled, testID }) => {
  const p = useSettingsPalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={({ pressed }) => [styles.pill, { backgroundColor: p.accentSoft }, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Icon name={icon} type="material" size={18} color={p.accentText} />
      <Text style={[styles.pillText, { color: p.accentText }]}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', columnGap: 8, height: 46, borderRadius: 23, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  header: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingHorizontal: 16, paddingBottom: 8, minHeight: 44 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.4, flexShrink: 1 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.45 },
  statusLine: { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
  statusText: { fontSize: 13, lineHeight: 18, flexShrink: 1 },
  statusLineCompact: { columnGap: 6 },
  statusTextCompact: { fontSize: 12, lineHeight: 16 },
  statusSpinnerCompact: { transform: [{ scale: 0.7 }], marginHorizontal: -4 },
  dotCompact: { width: 6, height: 6, borderRadius: 3 },
  wideButton: {
    flexDirection: 'row',
    columnGap: 8,
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideButtonText: { fontSize: 15, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', columnGap: 6, height: 40, borderRadius: 20, paddingHorizontal: 14 },
  pillText: { fontSize: 14, fontWeight: '600' },
  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginLeft: 4, marginBottom: 8 },
  card: { borderRadius: 24, paddingHorizontal: 16, paddingVertical: 2 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  badge: { height: 24, paddingHorizontal: 9, borderRadius: 12, justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 64, paddingVertical: 10 },
  switchRow: { paddingVertical: 14 },
  texts: { flex: 1, rowGap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 4 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  subtitle: { fontSize: 13, lineHeight: 18, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  value: { fontSize: 14, maxWidth: 140 },
  spinner: { width: 52 },
  segmented: { flexDirection: 'row', columnGap: 4, padding: 4, borderRadius: 16 },
  segment: { flex: 1, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', rowGap: 4, paddingHorizontal: 4 },
  segmentOn: {
    shadowColor: '#111827',
    shadowOpacity: 0.14,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentText: { fontSize: 13, fontWeight: '600' },
});
