import React, { useCallback, FC } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '@rneui/themed';
import { MultisigHDWallet } from '../../class';
import ListItem from '../../components/ListItem';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';
import HeaderRightButton from '../../components/HeaderRightButton';
import { BlueSpacing20 } from '../../components/BlueSpacing';

type NavigationProps = NativeStackNavigationProp<AddWalletStackParamList, 'MultisigAdvanced'>;
type RouteProps = RouteProp<AddWalletStackParamList, 'MultisigAdvanced'>;

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
          <Icon name="chevron-up" size={22} type="font-awesome-5" color={n === m || m === 7 ? colors.buttonDisabledTextColor : '#007AFF'} />
        </Pressable>
        <Text style={[styles.textM, { color: colors.outputValue }]}>{m}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={decreaseM}
          disabled={m === 2}
          style={({ pressed }) => [pressed && styles.pressed, styles.chevron]}
        >
          <Icon name="chevron-down" size={22} type="font-awesome-5" color={m === 2 ? colors.buttonDisabledTextColor : '#007AFF'} />
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
          <Icon name="chevron-up" size={22} type="font-awesome-5" color={n === 7 ? colors.buttonDisabledTextColor : '#007AFF'} />
        </Pressable>
        <Text style={[styles.textM, { color: colors.outputValue }]}>{n}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={decreaseN}
          disabled={n === m}
          style={({ pressed }) => [pressed && styles.pressed, styles.chevron]}
          testID="DecreaseN"
        >
          <Icon name="chevron-down" size={22} type="font-awesome-5" color={n === m ? colors.buttonDisabledTextColor : '#007AFF'} />
        </Pressable>
      </View>
    </View>
  );
};

interface FormatSelectorProps {
  format: string;
  onFormatChange: (format: string) => void;
  colors: any;
}

const FormatSelector: FC<FormatSelectorProps> = ({ format, onFormatChange, colors }) => {
  const isP2wsh = useCallback(() => format === MultisigHDWallet.FORMAT_P2WSH, [format]);
  const isP2shP2wsh = useCallback(
    () => format === MultisigHDWallet.FORMAT_P2SH_P2WSH || format === MultisigHDWallet.FORMAT_P2SH_P2WSH_ALT,
    [format],
  );
  const isP2sh = useCallback(() => format === MultisigHDWallet.FORMAT_P2SH, [format]);

  const setFormatP2wsh = useCallback(() => onFormatChange(MultisigHDWallet.FORMAT_P2WSH), [onFormatChange]);
  const setFormatP2shP2wsh = useCallback(() => onFormatChange(MultisigHDWallet.FORMAT_P2SH_P2WSH), [onFormatChange]);
  const setFormatP2sh = useCallback(() => onFormatChange(MultisigHDWallet.FORMAT_P2SH), [onFormatChange]);

  const getItemStyle = useCallback(
    (isSelected: boolean) => [
      styles.borderRadius6,
      styles.item,
      isSelected ? { paddingHorizontal: 8, backgroundColor: colors.elevated } : { paddingHorizontal: 8, backgroundColor: 'transparent' },
    ],
    [colors.elevated],
  );

  return (
    <>
      <ListItem
        bottomDivider={false}
        onPress={setFormatP2wsh}
        title={`${loc.multisig.native_segwit_title} (${MultisigHDWallet.FORMAT_P2WSH})`}
        checkmark={isP2wsh()}
        containerStyle={getItemStyle(isP2wsh())}
      />
      <ListItem
        bottomDivider={false}
        onPress={setFormatP2shP2wsh}
        title={`${loc.multisig.wrapped_segwit_title} (${MultisigHDWallet.FORMAT_P2SH_P2WSH})`}
        checkmark={isP2shP2wsh()}
        containerStyle={getItemStyle(isP2shP2wsh())}
      />
      <ListItem
        bottomDivider={false}
        onPress={setFormatP2sh}
        title={`${loc.multisig.legacy_title} (${MultisigHDWallet.FORMAT_P2SH})`}
        checkmark={isP2sh()}
        containerStyle={getItemStyle(isP2sh())}
      />
    </>
  );
};

const MultisigAdvanced: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useExtendedNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { m, n, format, onSave } = route.params;

  const [currentM, setCurrentM] = React.useState(m);
  const [currentN, setCurrentN] = React.useState(n);
  const [currentFormat, setCurrentFormat] = React.useState(format);

  // Check if there are unsaved changes
  const hasUnsavedChanges = React.useMemo(() => {
    return currentM !== m || currentN !== n || currentFormat !== format;
  }, [currentM, currentN, currentFormat, m, n, format]);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
      flex: 1,
    },
    textHeader: {
      color: colors.outputValue,
    },
    textSubtitle: {
      color: colors.alternativeTextColor,
    },
  });

  const handleSave = useCallback(() => {
    onSave(currentM, currentN, currentFormat);
    navigation.goBack();
  }, [onSave, currentM, currentN, currentFormat, navigation]);

  const SaveButton = useCallback(
    () => <HeaderRightButton title={loc.send.input_done} onPress={handleSave} disabled={!hasUnsavedChanges} testID="ModalDoneButton" />,
    [handleSave, hasUnsavedChanges],
  );

  React.useLayoutEffect(() => {
    if (Platform.OS !== 'android') {
      navigation.setOptions({
        headerRight: SaveButton,
      });
    }
  }, [navigation, SaveButton]);

  return (
    <SafeArea style={stylesHook.root}>
      {Platform.OS === 'android' && (
        <View style={styles.androidHeader}>
          <View style={styles.androidHeaderContent}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [pressed && styles.pressed, styles.androidBackButton]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Icon name="arrow-back" type="material" size={24} color={colors.foregroundColor} />
            </Pressable>
            <Text style={[styles.androidHeaderTitle, { color: colors.foregroundColor }]}>{loc.multisig.multisig_vault}</Text>
            <View style={styles.androidSaveButton}>
              <HeaderRightButton title={loc.send.input_done} onPress={handleSave} disabled={!hasUnsavedChanges} testID="ModalDoneButton" />
            </View>
          </View>
        </View>
      )}
      <View style={styles.container}>
        <Text style={[styles.textHeader, stylesHook.textHeader]}>{loc.multisig.quorum_header}</Text>
        <Text style={[styles.textSubtitle, stylesHook.textSubtitle]}>{loc.multisig.required_keys_out_of_total}</Text>
        <QuorumSelector m={currentM} n={currentN} onMChange={setCurrentM} onNChange={setCurrentN} colors={colors} />

        <BlueSpacing20 />

        <Text style={[styles.textHeader, stylesHook.textHeader]}>{loc.multisig.wallet_type}</Text>
        <BlueSpacing20 />
        <FormatSelector format={currentFormat} onFormatChange={setCurrentFormat} colors={colors} />
      </View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
  },
  androidHeader: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e1e1e1',
  },
  androidHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  androidBackButton: {
    padding: 8,
    minWidth: 40,
  },
  androidHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  androidSaveButton: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  item: {
    paddingHorizontal: 0,
  },
  borderRadius6: {
    borderRadius: 6,
    minHeight: 54,
  },
  column: {
    paddingRight: 20,
    paddingLeft: 20,
  },
  chevron: {
    paddingBottom: 10,
    paddingTop: 10,
    fontSize: 24,
  },
  columnOf: {
    paddingRight: 20,
    paddingLeft: 20,
    justifyContent: 'center',
  },
  textM: {
    fontSize: 50,
    fontWeight: '700',
  },
  textOf: {
    fontSize: 30,
    color: '#9AA0AA',
  },
  textHeader: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  textSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  rowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  pressed: {
    opacity: 0.6,
  },
});

export default MultisigAdvanced;
