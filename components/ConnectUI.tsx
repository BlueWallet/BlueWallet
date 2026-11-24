/**
 * Building blocks of the Neurai Connect screens in the settings style: the
 * site's own icon, notices, option rows chosen like radio buttons, and the
 * approve / reject buttons fixed at the bottom of an approval.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon, { MaterialIconName } from './Icon';
import { SettingsIconCircle, useSettingsPalette } from './settings/SettingsUI';

/** The site's own icon when it sends one over https, else a globe. */
export const ConnectSiteIcon: React.FC<{ icons?: string[]; size?: number }> = ({ icons, size = 40 }) => {
  const p = useSettingsPalette();
  const uri = icons?.find(icon => icon.startsWith('https://'));
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (!uri || failed) {
    if (size === 40) return <SettingsIconCircle icon="language" />;
    return (
      <View style={[styles.center, box, { backgroundColor: p.accentSoft }]}>
        <Icon name="language" type="material" size={size / 2} color={p.accentText} />
      </View>
    );
  }
  return (
    <View style={[styles.center, styles.clip, box, { backgroundColor: p.ground }]}>
      <Image source={{ uri }} style={box} onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
    </View>
  );
};

/** One short line that must be seen: `quiet` informs, `danger` warns. */
export const ConnectNoticeCard: React.FC<{ tone: 'quiet' | 'danger'; text: string; testID?: string }> = ({ tone, text, testID }) => {
  const p = useSettingsPalette();
  const danger = tone === 'danger';
  return (
    <View
      style={[styles.notice, { backgroundColor: danger ? p.fail.bg : p.card }]}
      accessibilityRole={danger ? 'alert' : undefined}
      testID={testID}
    >
      <Icon name={danger ? 'warning-amber' : 'info-outline'} type="material" size={20} color={danger ? p.fail.dot : p.mutedOnCard} />
      <Text style={[styles.noticeText, { color: danger ? p.fail.fg : p.mutedOnCard }]}>{text}</Text>
    </View>
  );
};

interface ConnectOptionProps {
  icon: MaterialIconName;
  title: string;
  subtitle?: string;
  /** An address or similar, in small monospace, shortened in the middle. */
  detail?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  /** Not the first row of its card: draws the divider above it. */
  divider?: boolean;
  testID?: string;
}

/** A row picked like a radio button. */
export const ConnectOption: React.FC<ConnectOptionProps> = ({
  icon,
  title,
  subtitle,
  detail,
  selected,
  disabled,
  onPress,
  divider,
  testID,
}) => {
  const p = useSettingsPalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      accessibilityLabel={[title, subtitle, detail].filter(Boolean).join(', ')}
      testID={testID}
      style={({ pressed }) => [
        styles.option,
        divider && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider },
        pressed && styles.pressed,
      ]}
    >
      <SettingsIconCircle icon={icon} muted={disabled} />
      <View style={styles.texts}>
        <Text style={[styles.title, { color: disabled ? p.mutedOnCard : p.ink }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: p.mutedOnCard }]}>{subtitle}</Text> : null}
        {detail ? (
          <Text style={[styles.detail, { color: p.mutedOnCard }]} numberOfLines={1} ellipsizeMode="middle">
            {detail}
          </Text>
        ) : null}
      </View>
      <Icon
        name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
        type="material"
        size={24}
        color={disabled ? p.switchOff : selected ? p.accent : p.mutedOnCard}
      />
    </Pressable>
  );
};

interface ConnectInfoRowProps {
  icon: MaterialIconName;
  title: string;
  subtitle?: string;
  /** An address or similar, in small monospace, shortened in the middle. */
  detail?: string;
  /** Colour of the icon: `accent` (default), `ok` for what comes back, `muted` for the secondary. */
  tone?: 'accent' | 'ok' | 'muted';
  divider?: boolean;
  testID?: string;
}

/** A row that only shows something: what a transaction pays, which address answers. */
export const ConnectInfoRow: React.FC<ConnectInfoRowProps> = ({ icon, title, subtitle, detail, tone = 'accent', divider, testID }) => {
  const p = useSettingsPalette();
  const circle =
    tone === 'ok'
      ? { bg: p.ok.bg, fg: p.ok.dot }
      : tone === 'muted'
        ? { bg: p.ground, fg: p.mutedOnCard }
        : { bg: p.accentSoft, fg: p.accentText };
  return (
    <View
      style={[styles.option, divider && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider }]}
      accessible
      accessibilityLabel={[title, subtitle, detail].filter(Boolean).join(', ')}
      testID={testID}
    >
      <View style={[styles.center, styles.circle, { backgroundColor: circle.bg }]}>
        <Icon name={icon} type="material" size={20} color={circle.fg} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.title, { color: p.ink }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: p.mutedOnCard }]}>{subtitle}</Text> : null}
        {detail ? (
          <Text style={[styles.detail, { color: p.mutedOnCard }]} numberOfLines={1} ellipsizeMode="middle" selectable>
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

interface FooterButton {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

/** The decision, fixed at the bottom: the secondary choice on the left, the primary on the right. */
export const ConnectFooter: React.FC<{ primary: FooterButton; secondary?: FooterButton }> = ({ primary, secondary }) => {
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: p.ground, borderTopColor: p.divider }]}>
      {secondary && (
        <Pressable
          onPress={secondary.onPress}
          disabled={secondary.disabled}
          accessibilityRole="button"
          testID={secondary.testID}
          style={({ pressed }) => [
            styles.button,
            styles.secondary,
            { backgroundColor: p.card },
            (pressed || secondary.disabled) && styles.pressed,
          ]}
        >
          <Text style={[styles.buttonText, { color: p.ink }]}>{secondary.title}</Text>
        </Pressable>
      )}
      <Pressable
        onPress={primary.onPress}
        disabled={primary.disabled || primary.loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!primary.disabled, busy: !!primary.loading }}
        testID={primary.testID}
        style={({ pressed }) => [
          styles.button,
          styles.primary,
          { backgroundColor: p.button },
          primary.disabled && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        {primary.loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={[styles.buttonText, styles.onButton]}>{primary.title}</Text>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  clip: { overflow: 'hidden' },
  circle: { width: 40, height: 40, borderRadius: 20 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', columnGap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  option: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 64, paddingVertical: 10 },
  texts: { flex: 1, rowGap: 2 },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 13, lineHeight: 18 },
  detail: { fontFamily: 'monospace', fontSize: 12 },
  footer: {
    flexDirection: 'row',
    columnGap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondary: { flex: 1 },
  primary: { flex: 2 },
  buttonText: { fontSize: 15, fontWeight: '600' },
  onButton: { color: '#ffffff' },
});
