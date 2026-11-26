/**
 * Building blocks of the privacy tab, in the settings' style: white cards on
 * the home ground, fields and choices in the ground's colour inside them, the
 * deep orange for the action that moves things forward, a stepped slider for
 * the fee and a segmented control for quick values.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  type KeyboardTypeOptions,
} from 'react-native';

import { triggerSelectionHapticFeedback } from '../../blue_modules/hapticFeedback';
import Icon, { MaterialIconName } from '../Icon';
import { SettingsButton, SettingsCard, useSettingsPalette } from '../settings/SettingsUI';

/** White card with its content spaced out. */
export function Card({ children, style, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <SettingsCard style={[styles.card, style]} testID={testID}>
      {children}
    </SettingsCard>
  );
}

/** Small uppercase label above a value or a field, inside a card. */
export function Label({ children }: { children: React.ReactNode }) {
  const p = useSettingsPalette();
  return <Text style={[styles.label, { color: p.mutedOnCard }]}>{children}</Text>;
}

export function Hint({ children, lines }: { children: React.ReactNode; lines?: number }) {
  const p = useSettingsPalette();
  return (
    <Text style={[styles.hint, { color: p.mutedOnCard }]} numberOfLines={lines}>
      {children}
    </Text>
  );
}

/** A choice among a few (a note, a quick action): raised in orange when chosen. */
export function Chip(props: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  icon?: MaterialIconName;
  testID?: string;
}) {
  const p = useSettingsPalette();
  const color = props.active ? p.accentText : p.ink;
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled || !props.onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: props.active ? p.accentSoft : p.ground, borderColor: props.active ? p.accent : 'transparent' },
        props.disabled && styles.muted,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!props.active, disabled: !!props.disabled }}
      testID={props.testID}
    >
      {props.icon ? <Icon name={props.icon} type="material" size={16} color={color} /> : null}
      <Text style={[styles.chipText, { color }]} numberOfLines={1}>
        {props.label}
      </Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

export function PrimaryButton(props: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  icon?: MaterialIconName;
  testID?: string;
}) {
  return (
    <SettingsButton
      title={props.title}
      onPress={props.onPress}
      disabled={props.disabled}
      loading={props.busy}
      icon={props.icon}
      testID={props.testID}
    />
  );
}

export function OutlineButton(props: { title: string; onPress: () => void; disabled?: boolean; danger?: boolean; testID?: string }) {
  return (
    <SettingsButton
      title={props.title}
      onPress={props.onPress}
      disabled={props.disabled}
      variant={props.danger ? 'danger' : 'secondary'}
      testID={props.testID}
    />
  );
}

/** 44-point round button with an icon. */
export function RoundButton(props: {
  icon: MaterialIconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** `ground` inside a card (the default), `card` on the screen ground. */
  surface?: 'ground' | 'card';
  testID?: string;
}) {
  const p = useSettingsPalette();
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: !!props.disabled }}
      hitSlop={4}
      testID={props.testID}
      style={({ pressed }) => [
        styles.round,
        { backgroundColor: props.surface === 'card' ? p.card : p.ground },
        props.disabled && styles.muted,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={props.icon} type="material" size={22} color={p.ink} />
    </Pressable>
  );
}

/** The operations, side by side with an icon each: the chosen one raised on the ground. */
export function ActionTabs<K extends string>(props: {
  tabs: Array<{ key: K; label: string; icon: MaterialIconName }>;
  value: K;
  onChange: (key: K) => void;
  disabled?: boolean;
}) {
  const p = useSettingsPalette();
  return (
    <View style={[styles.tabs, { backgroundColor: p.card }]} accessibilityRole="tablist">
      {props.tabs.map(tab => {
        const selected = tab.key === props.value;
        const color = selected ? p.accentText : p.mutedOnCard;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              if (!selected) triggerSelectionHapticFeedback();
              props.onChange(tab.key);
            }}
            disabled={props.disabled}
            style={({ pressed }) => [
              styles.tab,
              selected && { backgroundColor: p.accentSoft },
              props.disabled && !selected && styles.muted,
              pressed && !selected && styles.pressed,
            ]}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected, disabled: !!props.disabled }}
            testID={`PrivacyTab-${tab.key}`}
          >
            <Icon name={tab.icon} type="material" size={22} color={color} />
            <Text style={[styles.tabText, { color }]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  editable?: boolean;
  secure?: boolean;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  suffix?: string;
  /** Short note on the right of the label (e.g. the available amount). */
  labelRight?: string;
  /** Small action inside the field, after the suffix (e.g. fill the maximum). */
  action?: { label: string; onPress: () => void; disabled?: boolean };
  /** Addresses and other codes: monospace, smaller. */
  mono?: boolean;
  testID?: string;
}) {
  const p = useSettingsPalette();
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: p.mutedOnCard }]}>{props.label}</Text>
        {props.labelRight ? (
          <Text style={[styles.labelRight, { color: p.mutedOnCard }]} numberOfLines={1}>
            {props.labelRight}
          </Text>
        ) : null}
      </View>
      <View style={[styles.inputRow, { backgroundColor: p.ground }, props.editable === false && styles.muted]}>
        <TextInput
          style={[styles.input, props.mono && styles.inputMono, { color: p.ink }]}
          value={props.value}
          onChangeText={props.onChangeText}
          editable={props.editable !== false}
          secureTextEntry={props.secure}
          placeholder={props.placeholder}
          placeholderTextColor={p.mutedOnCard}
          selectionColor={p.accent}
          keyboardType={props.keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={props.label}
          underlineColorAndroid="transparent"
          testID={props.testID}
        />
        {props.suffix ? <Text style={[styles.suffix, { color: p.mutedOnCard }]}>{props.suffix}</Text> : null}
        {props.action ? (
          <Pressable
            onPress={props.action.onPress}
            disabled={props.action.disabled}
            style={[styles.fieldAction, { backgroundColor: p.accentSoft }, props.action.disabled && styles.muted]}
            accessibilityRole="button"
            hitSlop={6}
          >
            <Text style={[styles.fieldActionText, { color: p.accentText }]}>{props.action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const THUMB = 24;
const STOP = 10;
const SLIDER_HEIGHT = 36;
const SEGMENT_PAD = 4;

/**
 * Stepped slider for a few levels (the network fee): a thin track with one
 * stop per level and a thumb that snaps to the nearest stop on tap or drag.
 * The selected value sits on the right of the label.
 */
export function StepSlider(props: {
  label: string;
  levels: string[];
  value: string;
  onChange: (value: string) => void;
  /** Selected value, next to the label. */
  format: (value: string) => string;
  /** Labels under the stops (defaults to `format`). */
  formatStop?: (value: string) => string;
  disabled?: boolean;
  testID?: string;
}) {
  const p = useSettingsPalette();
  const { levels, value, onChange, disabled } = props;
  const formatStop = props.formatStop ?? props.format;
  const selected = levels.indexOf(value);
  const index = Math.max(0, selected);
  const [width, setWidth] = useState(0);
  const step = levels.length > 1 ? Math.max(0, width - THUMB) / (levels.length - 1) : 0;
  const position = useRef(new Animated.Value(index)).current;
  useEffect(() => {
    Animated.spring(position, { toValue: index, useNativeDriver: false, speed: 22, bounciness: 5 }).start();
  }, [index, position]);

  // The responder is created once and reads the latest props from here.
  const live = useRef({ step, levels, value, onChange, disabled });
  live.current = { step, levels, value, onChange, disabled };
  const responder = useMemo(() => {
    let startX = 0;
    const pick = (x: number) => {
      const l = live.current;
      if (l.disabled || !l.step) return;
      const next = l.levels[Math.min(l.levels.length - 1, Math.max(0, Math.round((x - THUMB / 2) / l.step)))];
      if (next === l.value) return;
      l.value = next;
      triggerSelectionHapticFeedback();
      l.onChange(next);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !live.current.disabled,
      onMoveShouldSetPanResponder: () => !live.current.disabled,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: event => {
        startX = event.nativeEvent.locationX;
        pick(startX);
      },
      onPanResponderMove: (_event, gesture) => pick(startX + gesture.dx),
    });
  }, []);

  const offset = Animated.multiply(position, step);
  const valueText = selected >= 0 ? props.format(value) : '—';
  const track = p.dark ? '#374151' : '#e5e7eb';
  return (
    <View style={disabled && styles.muted}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: p.mutedOnCard }]}>{props.label}</Text>
        <Text style={[styles.sliderValue, { color: p.accentText }]}>{valueText}</Text>
      </View>
      {levels.length > 1 ? (
        <>
          <View
            style={styles.sliderArea}
            onLayout={event => setWidth(event.nativeEvent.layout.width)}
            {...responder.panHandlers}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={props.label}
            accessibilityValue={{ text: valueText }}
            accessibilityState={{ disabled: !!disabled }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={event => {
              const next = levels[index + (event.nativeEvent.actionName === 'increment' ? 1 : -1)];
              if (!disabled && next) onChange(next);
            }}
            testID={props.testID}
          >
            <View pointerEvents="none" style={[styles.sliderTrack, { backgroundColor: track }]} />
            <Animated.View pointerEvents="none" style={[styles.sliderFill, { width: offset, backgroundColor: p.accent }]} />
            {width > 0
              ? levels.map((level, i) => (
                  <View
                    key={level}
                    pointerEvents="none"
                    style={[
                      styles.sliderStop,
                      i <= index ? { backgroundColor: p.accent, borderColor: p.accent } : { backgroundColor: p.card, borderColor: track },
                      { left: THUMB / 2 + i * step - STOP / 2 },
                    ]}
                  />
                ))
              : null}
            <Animated.View
              pointerEvents="none"
              style={[styles.sliderThumb, { borderColor: p.accent, transform: [{ translateX: offset }] }]}
            />
          </View>
          <View style={styles.sliderLabels}>
            {levels.map((level, i) => (
              <Text
                key={level}
                style={[
                  styles.sliderLabel,
                  i === index ? [styles.sliderLabelOn, { color: p.ink }] : { color: p.mutedOnCard },
                  i === 0
                    ? styles.sliderLabelFirst
                    : i === levels.length - 1
                      ? styles.sliderLabelLast
                      : { left: THUMB / 2 + i * step - 32 },
                ]}
                numberOfLines={1}
              >
                {formatStop(level)}
              </Text>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

/**
 * Quick values in one segmented control. The highlight slides to the selected
 * option and fades out while the value is one of the user's own.
 */
export function Segmented(props: {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  testID?: string;
}) {
  const p = useSettingsPalette();
  const index = props.options.findIndex(o => o.value === props.value);
  const [width, setWidth] = useState(0);
  const segment = props.options.length ? Math.max(0, width - 2 * SEGMENT_PAD) / props.options.length : 0;
  const position = useRef(new Animated.Value(Math.max(0, index))).current;
  const shown = useRef(new Animated.Value(index >= 0 ? 1 : 0)).current;
  useEffect(() => {
    if (index >= 0) Animated.spring(position, { toValue: index, useNativeDriver: true, speed: 22, bounciness: 5 }).start();
    Animated.timing(shown, { toValue: index >= 0 ? 1 : 0, duration: 150, useNativeDriver: true }).start();
  }, [index, position, shown]);
  return (
    <View
      style={[styles.segmented, { backgroundColor: p.ground }, props.disabled && styles.muted]}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="radiogroup"
      testID={props.testID}
    >
      {segment > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.segmentHighlight,
            { backgroundColor: p.card, width: segment, opacity: shown, transform: [{ translateX: Animated.multiply(position, segment) }] },
          ]}
        />
      ) : null}
      {props.options.map((option, i) => (
        <Pressable
          key={option.value}
          style={styles.segment}
          disabled={props.disabled}
          onPress={() => {
            if (option.value !== props.value) triggerSelectionHapticFeedback();
            props.onChange(option.value);
          }}
          accessibilityRole="radio"
          accessibilityState={{ checked: i === index, disabled: !!props.disabled }}
        >
          <Text
            style={[styles.segmentText, { color: i === index ? p.accentText : p.mutedOnCard }, i === index && styles.segmentTextOn]}
            numberOfLines={1}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Status of a running job: spinner, short phase, seconds and a cancel button. */
export function ProgressLine({
  text,
  seconds,
  onCancel,
  cancelLabel,
}: {
  text: string;
  seconds: number;
  onCancel: () => void;
  cancelLabel: string;
}) {
  const p = useSettingsPalette();
  return (
    <View style={[styles.progress, { backgroundColor: p.ground }]} accessibilityLiveRegion="polite">
      <ActivityIndicator size="small" color={p.accent} />
      <Text style={[styles.progressText, { color: p.ink }]} numberOfLines={2}>
        {text}
      </Text>
      <Text style={[styles.progressSeconds, { color: p.mutedOnCard }]}>{`${seconds}s`}</Text>
      <Pressable
        onPress={onCancel}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={cancelLabel}
        style={({ pressed }) => [styles.progressCancel, { backgroundColor: p.card }, pressed && styles.pressed]}
      >
        <Icon name="close" type="material" size={18} color={p.mutedOnCard} />
      </Pressable>
    </View>
  );
}

export function ErrorBox({ message }: { message: string }) {
  const p = useSettingsPalette();
  return (
    <View style={[styles.errorBox, { backgroundColor: p.fail.bg }]} accessibilityRole="alert">
      <Icon name="error-outline" type="material" size={18} color={p.fail.fg} />
      <Text style={[styles.errorText, { color: p.fail.fg }]} numberOfLines={6}>
        {message}
      </Text>
    </View>
  );
}

/** Label / value line for summaries; `divider` when it follows another. */
export function InfoRow({ label, value, mono, divider }: { label: string; value: string; mono?: boolean; divider?: boolean }) {
  const p = useSettingsPalette();
  return (
    <View
      style={[styles.infoRow, divider && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider }]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={[styles.infoLabel, { color: p.mutedOnCard }]}>{label}</Text>
      <Text style={[mono ? styles.infoMono : styles.infoValue, { color: p.ink }]} numberOfLines={1} ellipsizeMode="middle">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { opacity: 0.5 },
  pressed: { opacity: 0.6 },
  card: { paddingVertical: 16, rowGap: 14 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', flexShrink: 1 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', columnGap: 12, marginBottom: 6 },
  labelRight: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  hint: { fontSize: 13, lineHeight: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    maxWidth: '100%',
  },
  chipText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  tabs: { flexDirection: 'row', columnGap: 4, padding: 6, borderRadius: 24 },
  tab: { flex: 1, minHeight: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', rowGap: 4, paddingHorizontal: 2 },
  tabText: { fontSize: 13, fontWeight: '700' },
  field: { flexGrow: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, minHeight: 50, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  inputMono: { fontFamily: 'monospace', fontSize: 14 },
  suffix: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  fieldAction: { marginLeft: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  fieldActionText: { fontSize: 13, fontWeight: '700' },
  sliderValue: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  sliderArea: { height: SLIDER_HEIGHT, justifyContent: 'center' },
  sliderTrack: { position: 'absolute', left: THUMB / 2, right: THUMB / 2, top: (SLIDER_HEIGHT - 4) / 2, height: 4, borderRadius: 2 },
  sliderFill: { position: 'absolute', left: THUMB / 2, top: (SLIDER_HEIGHT - 4) / 2, height: 4, borderRadius: 2 },
  sliderStop: { position: 'absolute', top: (SLIDER_HEIGHT - STOP) / 2, width: STOP, height: STOP, borderRadius: STOP / 2, borderWidth: 2 },
  sliderThumb: {
    position: 'absolute',
    left: 0,
    top: (SLIDER_HEIGHT - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    elevation: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  sliderLabels: { height: 18, marginTop: 2 },
  sliderLabel: { position: 'absolute', top: 0, width: 64, fontSize: 12, textAlign: 'center', fontVariant: ['tabular-nums'] },
  sliderLabelOn: { fontWeight: '700' },
  sliderLabelFirst: { left: 0, textAlign: 'left' },
  sliderLabelLast: { right: 0, textAlign: 'right' },
  segmented: { flexDirection: 'row', borderRadius: 16, padding: SEGMENT_PAD },
  segmentHighlight: {
    position: 'absolute',
    top: SEGMENT_PAD,
    bottom: SEGMENT_PAD,
    left: SEGMENT_PAD,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#111827',
    shadowOpacity: 0.14,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  segmentText: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  segmentTextOn: { fontWeight: '700' },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    borderRadius: 18,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
  },
  progressText: { flex: 1, fontSize: 14, fontWeight: '600' },
  progressSeconds: { fontSize: 13, fontVariant: ['tabular-nums'] },
  progressCancel: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', columnGap: 8, borderRadius: 16, padding: 12 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 12,
    minHeight: 44,
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 14, flexShrink: 0 },
  infoValue: { fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  infoMono: { fontSize: 12, fontFamily: 'monospace', flexShrink: 1, textAlign: 'right' },
});
