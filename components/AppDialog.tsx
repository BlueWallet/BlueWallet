/**
 * The app's messages and confirmations in its own style, in place of the
 * system's white dialog: a sheet from the bottom with an icon that tells
 * success, an error, a warning or a notice, the message, an optional value to
 * copy (a transaction ID), and rounded buttons. One host is mounted at the
 * root, over everything, like the backup reminder (not a system modal: on
 * Android those leave a gap under the sheet with the app drawn edge to edge).
 *
 * `presentAlert` and `appAlert` (the same call as React Native's
 * `Alert.alert`) use it; until the host is mounted (or in tests) they fall
 * back to the system dialog. Messages arriving while one is shown wait their
 * turn.
 */
import React, { useEffect, useState } from 'react';
import { Alert, AlertButton, AlertOptions, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Animated, { Easing, FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import loc from '../loc';
import Icon, { type MaterialIconName } from './Icon';
import { SettingsButton, useSettingsPalette, type SettingsPalette } from './settings/SettingsUI';

export type DialogTone = 'success' | 'error' | 'warning' | 'info';

export interface DialogRequest {
  title?: string;
  message?: string;
  tone?: DialogTone;
  /** A value worth keeping, shown apart and copyable: a transaction ID. */
  detail?: { label: string; value: string };
  buttons?: AlertButton[];
  /** The backdrop and Back close it (calling `onDismiss`); otherwise a button must be pressed. */
  cancelable?: boolean;
  onDismiss?: () => void;
  /** `options`: a list of choices (the Android action sheet): same weight, in their order, no icon. */
  layout?: 'dialog' | 'options';
}

let enqueue: ((request: DialogRequest) => void) | null = null;

/** Whether the host is mounted. */
export const isAppDialogReady = (): boolean => enqueue !== null;

/** Shows `request` in the app's style; false when the host is not mounted (the caller falls back). */
export function showAppDialog(request: DialogRequest): boolean {
  if (!enqueue) return false;
  enqueue(request);
  return true;
}

/**
 * React Native's `Alert.alert`, in the app's style: a destructive choice gets
 * the warning icon. Falls back to the system dialog when the host is not mounted.
 */
export function appAlert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions): void {
  const shown = showAppDialog({
    title: title || undefined,
    message,
    buttons,
    tone: buttons?.some(button => button.style === 'destructive') ? 'warning' : 'info',
    cancelable: options?.cancelable ?? false,
    onDismiss: options?.onDismiss,
  });
  if (!shown) Alert.alert(title, message, buttons, options);
}

const TONES: Record<DialogTone, { icon: MaterialIconName; colors: (p: SettingsPalette) => { bg: string; fg: string } }> = {
  success: { icon: 'check-circle', colors: p => ({ bg: p.ok.bg, fg: p.ok.dot }) },
  error: { icon: 'error-outline', colors: p => ({ bg: p.fail.bg, fg: p.fail.dot }) },
  warning: { icon: 'warning-amber', colors: p => ({ bg: p.warnIconBg, fg: p.accent }) },
  info: { icon: 'info-outline', colors: p => ({ bg: p.accentSoft, fg: p.accentText }) },
};

/** A message this short, with no title, reads better as the title. */
const SHORT_MESSAGE = 90;

/**
 * The buttons in the order shown. In a dialog the main choice comes first (the
 * last non-cancel one, as Android puts it on the right), then the others, and
 * Cancel last as a link; in a list of options, their own order.
 */
function arrange(
  buttons: AlertButton[],
  layout: 'dialog' | 'options',
): { main?: AlertButton; others: AlertButton[]; cancels: AlertButton[] } {
  const cancels = buttons.filter(button => button.style === 'cancel');
  const rest = buttons.filter(button => button.style !== 'cancel');
  if (layout === 'options' || rest.length === 0) return { others: rest, cancels };
  return { main: rest[rest.length - 1], others: rest.slice(0, -1), cancels };
}

const SHEET_IN = SlideInDown.duration(240).easing(Easing.out(Easing.cubic));
const FADE_IN = FadeIn.duration(160);

export const AppDialogHost: React.FC = () => {
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const [copied, setCopied] = useState(false);
  const current = queue[0];

  useEffect(() => {
    enqueue = request => setQueue(items => [...items, request]);
    return () => {
      enqueue = null;
    };
  }, []);

  useEffect(() => setCopied(false), [current]);

  const close = () => setQueue(items => items.slice(1));
  const press = (button: AlertButton) => {
    // Closed first: a handler that shows another message queues it after this one.
    close();
    button.onPress?.();
  };
  const dismiss = () => {
    if (!current?.cancelable) return;
    close();
    current.onDismiss?.();
  };

  // Android's Back is the backdrop: it closes what may be closed, and is held otherwise.
  useEffect(() => {
    if (!current) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!current) return null;

  const layout = current.layout ?? 'dialog';
  const buttons = current.buttons?.length ? current.buttons : [{ text: loc._.ok }];
  const { main, others, cancels } = arrange(buttons, layout);
  const tone = TONES[current.tone ?? 'info'];
  const toneColors = tone.colors(p);
  const title = current.title || (current.message && current.message.length <= SHORT_MESSAGE ? current.message : undefined);
  const body = current.title ? current.message : title ? undefined : current.message;

  const copy = () => {
    if (!current.detail) return;
    Clipboard.setString(current.detail.value);
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    setCopied(true);
  };

  const variantOf = (button: AlertButton, isMain: boolean) =>
    button.style === 'destructive' ? 'danger' : isMain ? 'primary' : 'secondary';

  return (
    <View style={styles.root}>
      <Animated.View entering={FADE_IN} style={styles.backdrop}>
        <Pressable
          style={styles.fill}
          onPress={dismiss}
          accessible={!!current.cancelable}
          accessibilityRole="button"
          accessibilityLabel={loc._.cancel}
        />
      </Animated.View>
      <Animated.View
        key={queue.length}
        entering={SHEET_IN}
        style={[styles.sheet, { backgroundColor: p.card, paddingBottom: insets.bottom + 14 }]}
        accessibilityViewIsModal
        accessibilityLiveRegion="polite"
        testID="AppDialog"
      >
        <View style={[styles.grabber, { backgroundColor: p.divider }]} />
        {layout === 'dialog' ? (
          <View style={[styles.icon, { backgroundColor: toneColors.bg }]} testID={`AppDialogIcon-${current.tone ?? 'info'}`}>
            <Icon name={tone.icon} type="material" size={32} color={toneColors.fg} />
          </View>
        ) : null}
        {title ? (
          <Text style={[styles.title, { color: p.ink }]} accessibilityRole="header" testID="AppDialogTitle">
            {title}
          </Text>
        ) : null}
        {body ? (
          <Text style={[styles.body, { color: p.mutedOnCard }]} testID="AppDialogMessage">
            {body}
          </Text>
        ) : null}
        {current.detail ? (
          <View style={[styles.detail, { backgroundColor: p.ground }]}>
            <View style={styles.detailTexts}>
              <Text style={[styles.detailLabel, { color: p.mutedOnCard }]}>{current.detail.label}</Text>
              <Text style={[styles.detailValue, { color: p.ink }]} selectable numberOfLines={2} ellipsizeMode="middle">
                {current.detail.value}
              </Text>
            </View>
            <Pressable
              onPress={copy}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={copied ? loc._.copied : loc.transactions.details_copy}
              testID="AppDialogCopy"
              style={({ pressed }) => [styles.copy, { backgroundColor: p.accentSoft }, pressed && styles.pressed]}
            >
              <Icon name={copied ? 'check' : 'content-copy'} type="material" size={18} color={p.accentText} />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.buttons}>
          {main ? (
            <SettingsButton
              title={main.text ?? loc._.ok}
              variant={variantOf(main, true)}
              onPress={() => press(main)}
              testID="AppDialogMain"
            />
          ) : null}
          {others.map((button, index) => (
            <SettingsButton
              key={`${index}-${button.text}`}
              title={button.text ?? loc._.ok}
              variant={variantOf(button, false)}
              onPress={() => press(button)}
              testID={`AppDialogButton-${index}`}
            />
          ))}
          {cancels.map((button, index) => (
            <Pressable
              key={`cancel-${index}`}
              onPress={() => press(button)}
              accessibilityRole="button"
              testID="AppDialogCancel"
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            >
              <Text style={[styles.linkText, { color: p.mutedOnCard }]}>{button.text ?? loc._.cancel}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    zIndex: 1100,
    elevation: 1100,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  fill: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 10,
    alignItems: 'center',
  },
  grabber: { width: 40, height: 4, borderRadius: 2, marginBottom: 18 },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    alignSelf: 'stretch',
    borderRadius: 16,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 10,
    marginTop: 16,
  },
  detailTexts: { flex: 1, rowGap: 3 },
  detailLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  detailValue: { fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  copy: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  buttons: { alignSelf: 'stretch', rowGap: 10, marginTop: 22 },
  link: { height: 44, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
