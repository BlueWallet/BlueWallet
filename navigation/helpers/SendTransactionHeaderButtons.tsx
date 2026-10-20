import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BigNumber from 'bignumber.js';
import Icon from '../../components/Icon';
import { useTheme } from '../../components/themes';
import { writeFileAndExport } from '../../blue_modules/fs';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import loc from '../../loc';
import type { SendDetailsStackParamList } from '../SendDetailsStackParamList';

type ConfirmDetailsButtonProps = {
  params: SendDetailsStackParamList['Confirm'];
  navigation: NativeStackNavigationProp<SendDetailsStackParamList, 'Confirm'>;
};

export const ConfirmDetailsButton = ({ params, navigation }: ConfirmDetailsButtonProps) => {
  const { colors } = useTheme();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const onPress = async () => {
    if (await isBiometricUseCapableAndEnabled()) {
      if (!(await unlockWithBiometrics())) return;
    }
    const { fee, recipients, memo, tx, satoshiPerByte } = params;
    navigation.navigate('CreateTransaction', {
      fee,
      recipients,
      memo,
      tx,
      satoshiPerByte,
      feeSatoshi: new BigNumber(fee).multipliedBy(100000000).toNumber(),
    });
  };

  return (
    <Pressable
      accessibilityRole="button"
      testID="TransactionDetailsButton"
      style={({ pressed }) => [styles.details, { backgroundColor: colors.lightButton }, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Text style={[styles.detailsText, { color: colors.buttonTextColor }]}>{loc.send.create_details}</Text>
    </Pressable>
  );
};

export const ExportTransactionButton = ({ tx }: { tx: string }) => {
  const { colors } = useTheme();
  const onPress = async () => {
    await writeFileAndExport(`${Date.now()}.txn`, tx, false);
  };

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.exportPressed}>
      <Icon size={22} name="share-alternative" type="entypo" color={colors.foregroundColor} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  details: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    borderRadius: 8,
    height: 38,
  },
  pressed: { opacity: 0.7 },
  exportPressed: { opacity: 0.6 },
  detailsText: { fontSize: 15, fontWeight: '600' },
});

export const createConfirmDetailsHeaderRight = (props: ConfirmDetailsButtonProps) => () => <ConfirmDetailsButton {...props} />;
export const createExportTransactionHeaderRight = (tx: string) => () => <ExportTransactionButton tx={tx} />;
