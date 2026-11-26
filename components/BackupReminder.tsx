/**
 * The reminder to back up a wallet, the first time it is about to receive:
 * a sheet from the bottom, in the app's style, with the wallet's name, why
 * the words matter, "Back up now" (to the words), "I already did" (on to
 * receive) and Cancel. One host is mounted at the root of the app, over
 * everything (not a system modal: on Android those are laid out short of the
 * screen's bottom with the app drawn edge to edge, leaving a gap under the
 * sheet). `askBackupSaved` opens it and resolves when the words are already
 * saved, rejects when the owner wants to back up now, and never settles on
 * Cancel, the backdrop or Back.
 */
import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import loc from '../loc';
import Icon from './Icon';
import { useSettingsPalette } from './settings/SettingsUI';

interface Request {
  walletLabel?: string;
  resolve: () => void;
  reject: (error: Error) => void;
}

let open: ((request: Request) => void) | null = null;

/** Whether the host is mounted, so the reminder can be shown in the app's style. */
export const isBackupReminderReady = (): boolean => open !== null;

export const askBackupSaved = (walletLabel?: string): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    if (!open) {
      reject(new Error('The backup reminder is not mounted'));
      return;
    }
    open({ walletLabel, resolve, reject });
  });

const SHEET_IN = SlideInDown.duration(260).easing(Easing.out(Easing.cubic));
const FADE_IN = FadeIn.duration(180);

export const BackupReminderHost: React.FC = () => {
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState<Request | null>(null);

  useEffect(() => {
    open = setRequest;
    return () => {
      open = null;
    };
  }, []);

  // Android's Back cancels, like the backdrop.
  useEffect(() => {
    if (!request) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setRequest(null);
      return true;
    });
    return () => subscription.remove();
  }, [request]);

  const cancel = () => setRequest(null);
  const saved = () => {
    request?.resolve();
    setRequest(null);
  };
  const backUp = () => {
    request?.reject(new Error('User has denied saving the wallet backup.'));
    setRequest(null);
  };

  if (!request) return null;
  return (
    <View style={styles.root}>
      <Animated.View entering={FADE_IN} style={styles.backdrop}>
        <Pressable style={styles.fill} onPress={cancel} accessibilityRole="button" accessibilityLabel={loc._.cancel} />
      </Animated.View>
      <Animated.View
        entering={SHEET_IN}
        style={[styles.sheet, { backgroundColor: p.card, paddingBottom: insets.bottom + 12 }]}
        accessibilityViewIsModal
        testID="BackupReminder"
      >
        <View style={[styles.grabber, { backgroundColor: p.divider }]} />
        <View style={[styles.icon, { backgroundColor: p.warnBg, borderColor: p.warnBorder }]}>
          <Icon name="vpn-key" type="material" size={30} color={p.accent} />
        </View>
        <Text style={[styles.title, { color: p.ink }]} accessibilityRole="header">
          {loc.pleasebackup.ask_title}
        </Text>
        {request.walletLabel ? (
          <View style={[styles.wallet, { backgroundColor: p.ground }]}>
            <Icon name="account-balance-wallet" type="material" size={15} color={p.mutedOnCard} />
            <Text style={[styles.walletText, { color: p.mutedOnCard }]} numberOfLines={1}>
              {request.walletLabel}
            </Text>
          </View>
        ) : null}
        <Text style={[styles.body, { color: p.mutedOnCard }]}>{loc.pleasebackup.ask_body}</Text>
        <View style={styles.buttons}>
          <Pressable
            onPress={backUp}
            accessibilityRole="button"
            testID="BackupReminderBackUp"
            style={({ pressed }) => [styles.button, { backgroundColor: p.button }, pressed && styles.pressed]}
          >
            <Text style={[styles.buttonText, styles.onButton]}>{loc.pleasebackup.ask_backup}</Text>
          </Pressable>
          <Pressable
            onPress={saved}
            accessibilityRole="button"
            testID="BackupReminderSaved"
            style={({ pressed }) => [styles.button, { backgroundColor: p.ground }, pressed && styles.pressed]}
          >
            <Text style={[styles.buttonText, { color: p.ink }]}>{loc.pleasebackup.ask_saved}</Text>
          </Pressable>
          <Pressable
            onPress={cancel}
            accessibilityRole="button"
            testID="BackupReminderCancel"
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <Text style={[styles.linkText, { color: p.mutedOnCard }]}>{loc._.cancel}</Text>
          </Pressable>
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
    zIndex: 1000,
    elevation: 1000,
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
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
    maxWidth: '100%',
  },
  walletText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 22,
  },
  buttons: { alignSelf: 'stretch', rowGap: 10 },
  button: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
  onButton: { color: '#ffffff' },
  link: { height: 44, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
