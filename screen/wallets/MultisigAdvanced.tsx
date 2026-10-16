import React, { useCallback, useEffect, useRef, useState, FC } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Icon from '../../components/Icon';
import { MultisigHDWallet } from '../../class/wallets/multisig-hd-wallet';
import { SettingsListItem, SettingsSection } from '../../components/SettingsSection';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';
import { BlueSpacing20 } from '../../components/BlueSpacing';

type RouteProps = RouteProp<AddWalletStackParamList, 'MultisigAdvanced'>;

const DIGIT_SLIDE_DISTANCE = 28;

interface AnimatedQuorumValueProps {
  value: number;
  color: string;
}

const AnimatedQuorumValue: FC<AnimatedQuorumValueProps> = ({ value, color }) => {
  const [displayedValue, setDisplayedValue] = useState(value);
  const previousValue = useRef(value);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const commitValue = useCallback((next: number) => {
    setDisplayedValue(next);
  }, []);

  useEffect(() => {
    if (previousValue.current === value) return;

    const increasing = value > previousValue.current;
    previousValue.current = value;
    const exitTo = increasing ? -DIGIT_SLIDE_DISTANCE : DIGIT_SLIDE_DISTANCE;
    const enterFrom = increasing ? DIGIT_SLIDE_DISTANCE : -DIGIT_SLIDE_DISTANCE;

    opacity.value = withTiming(0, { duration: 90, easing: Easing.out(Easing.quad) });
    translateY.value = withTiming(exitTo, { duration: 90, easing: Easing.out(Easing.quad) }, finished => {
      if (!finished) return;
      runOnJS(commitValue)(value);
      translateY.value = enterFrom;
      opacity.value = 0;
      scale.value = 0.92;
      opacity.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) });
      translateY.value = withSpring(0, { damping: 16, stiffness: 220, mass: 0.8 });
      scale.value = withSequence(withSpring(1.04, { damping: 12, stiffness: 260 }), withSpring(1, { damping: 14, stiffness: 220 }));
    });
  }, [value, commitValue, opacity, translateY, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <View style={styles.digitSlot}>
      <Animated.Text style={[styles.textM, styles.digitText, { color }, animatedStyle]}>{displayedValue}</Animated.Text>
    </View>
  );
};

interface QuorumSelectorProps {
  m: number;
  n: number;
  onMChange: (m: number) => void;
  onNChange: (n: number) => void;
  colors: any;
}

const QuorumSelector: FC<QuorumSelectorProps> = ({ m, n, onMChange, onNChange, colors }) => {
  const increaseM = useCallback(() => {
    if (n === m) return;
    if (m === 7) return;
    onMChange(m + 1);
  }, [m, n, onMChange]);

  const decreaseM = useCallback(() => {
    if (m === 2) return;
    onMChange(m - 1);
  }, [m, onMChange]);

  const increaseN = useCallback(() => {
    if (n === 7) return;
    onNChange(n + 1);
  }, [n, onNChange]);

  const decreaseN = useCallback(() => {
    if (n === m) return;
    onNChange(n - 1);
  }, [n, m, onNChange]);

  return (
    <View style={styles.rowCenter}>
      <View style={styles.column}>
        <Pressable
          accessibilityRole="button"
          onPress={increaseM}
          disabled={n === m || m === 7}
          style={({ pressed }) => [pressed && styles.pressed, styles.chevron]}
        >
          <Icon
            name="keyboard-arrow-up"
            size={22}
            type="material"
            color={n === m || m === 7 ? colors.buttonDisabledTextColor : '#007AFF'}
          />
        </Pressable>
        <AnimatedQuorumValue value={m} color={colors.outputValue} />
        <Pressable
          accessibilityRole="button"
          onPress={decreaseM}
          disabled={m === 2}
          style={({ pressed }) => [pressed && styles.pressed, styles.chevron]}
        >
          <Icon name="keyboard-arrow-down" size={22} type="material" color={m === 2 ? colors.buttonDisabledTextColor : '#007AFF'} />
        </Pressable>
      </View>

      <View style={styles.columnOf}>
        <Text style={styles.textOf}>{loc.multisig.of}</Text>
      </View>

      <View style={styles.column}>
        <Pressable
          accessibilityRole="button"
          disabled={n === 7}
          onPress={increaseN}
          style={({ pressed }) => [pressed && styles.pressed, styles.chevron]}
        >
          <Icon name="keyboard-arrow-up" size={22} type="material" color={n === 7 ? colors.buttonDisabledTextColor : '#007AFF'} />
        </Pressable>
        <AnimatedQuorumValue value={n} color={colors.outputValue} />
        <Pressable
          accessibilityRole="button"
          onPress={decreaseN}
          disabled={n === m}
          style={({ pressed }) => [pressed && styles.pressed, styles.chevron]}
          testID="DecreaseN"
        >
          <Icon name="keyboard-arrow-down" size={22} type="material" color={n === m ? colors.buttonDisabledTextColor : '#007AFF'} />
        </Pressable>
      </View>
    </View>
  );
};

interface FormatSelectorProps {
  format: string;
  onFormatChange: (format: string) => void;
}

const FormatSelector: FC<FormatSelectorProps> = ({ format, onFormatChange }) => {
  const isP2wsh = format === MultisigHDWallet.FORMAT_P2WSH;
  const isP2shP2wsh = format === MultisigHDWallet.FORMAT_P2SH_P2WSH || format === MultisigHDWallet.FORMAT_P2SH_P2WSH_ALT;
  const isP2sh = format === MultisigHDWallet.FORMAT_P2SH;

  return (
    <>
      <SettingsListItem
        onPress={() => onFormatChange(MultisigHDWallet.FORMAT_P2WSH)}
        title={`${loc.multisig.native_segwit_title} (${MultisigHDWallet.FORMAT_P2WSH})`}
        checkmark={isP2wsh}
        bottomDivider
      />
      <SettingsListItem
        onPress={() => onFormatChange(MultisigHDWallet.FORMAT_P2SH_P2WSH)}
        title={`${loc.multisig.wrapped_segwit_title} (${MultisigHDWallet.FORMAT_P2SH_P2WSH})`}
        checkmark={isP2shP2wsh}
        bottomDivider
      />
      <SettingsListItem
        onPress={() => onFormatChange(MultisigHDWallet.FORMAT_P2SH)}
        title={`${loc.multisig.legacy_title} (${MultisigHDWallet.FORMAT_P2SH})`}
        checkmark={isP2sh}
        bottomDivider={false}
      />
    </>
  );
};

const MultisigAdvanced: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProps>();
  const { m, n, format, onSave } = route.params;

  const [currentM, setCurrentM] = useState(m);
  const [currentN, setCurrentN] = useState(n);
  const [currentFormat, setCurrentFormat] = useState(format);
  const [isWalletTypeExpanded, setIsWalletTypeExpanded] = useState(false);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
      // Form sheets on Android often report insets.bottom as 0; keep a comfortable floor.
      paddingBottom: Math.max(insets.bottom, 24) + 16,
    },
    textHeader: {
      color: colors.outputValue,
    },
    textSubtitle: {
      color: colors.alternativeTextColor,
    },
  });

  const handleMChange = useCallback(
    (nextM: number) => {
      setCurrentM(nextM);
      onSave(nextM, currentN, currentFormat);
    },
    [onSave, currentN, currentFormat],
  );

  const handleNChange = useCallback(
    (nextN: number) => {
      setCurrentN(nextN);
      onSave(currentM, nextN, currentFormat);
    },
    [onSave, currentM, currentFormat],
  );

  const handleFormatChange = useCallback(
    (nextFormat: string) => {
      setCurrentFormat(nextFormat);
      onSave(currentM, currentN, nextFormat);
    },
    [onSave, currentM, currentN],
  );

  return (
    <View style={stylesHook.root}>
      <View style={styles.container}>
        <Text style={[styles.textHeader, stylesHook.textHeader]}>{loc.multisig.quorum_header}</Text>
        <Text style={[styles.textSubtitle, stylesHook.textSubtitle]}>{loc.multisig.required_keys_out_of_total}</Text>
        <QuorumSelector m={currentM} n={currentN} onMChange={handleMChange} onNChange={handleNChange} colors={colors} />

        <BlueSpacing20 />

        <SettingsSection
          title={loc.multisig.wallet_type}
          containerStyle={styles.walletTypeSection}
          onHeaderPress={() => setIsWalletTypeExpanded(prev => !prev)}
          headerRight={
            <Icon
              name={isWalletTypeExpanded ? 'chevron-up' : 'chevron-down'}
              type="font-awesome"
              size={16}
              color={colors.alternativeTextColor}
            />
          }
        >
          {isWalletTypeExpanded ? <FormatSelector format={currentFormat} onFormatChange={handleFormatChange} /> : null}
        </SettingsSection>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
  },
  walletTypeSection: {
    marginBottom: 0,
  },
  column: {
    width: 56,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  chevron: {
    width: 56,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnOf: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitSlot: {
    width: 56,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textM: {
    fontSize: 50,
    fontWeight: '700',
  },
  digitText: {
    width: 56,
    textAlign: 'center',
    lineHeight: 60,
  },
  textOf: {
    fontSize: 30,
    color: '#9AA0AA',
    textAlign: 'center',
  },
  textHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 20,
  },
  textSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  pressed: {
    opacity: 0.6,
  },
});

export default MultisigAdvanced;
