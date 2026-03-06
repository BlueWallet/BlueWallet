import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Icon } from '@rneui/themed';

import { BlueSpacing10, BlueSpacing20 } from '../../components/BlueSpacing';
import { BlueTextCentered } from '../../BlueComponents';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';

const WalletsAddMultisigVaultKeySheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AddWalletStackParamList, 'WalletsAddMultisigVaultKeySheet'>>();
  const route = useRoute<RouteProp<AddWalletStackParamList, 'WalletsAddMultisigVaultKeySheet'>>();
  const { colors } = useTheme();
  const { keyIndex, seed } = route.params;

  const words = useMemo(() => seed.split(' '), [seed]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.elevated }]} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.vaultKeyCircleSuccess, { backgroundColor: colors.msSuccessBG }]}>
          <Icon size={24} name="check" type="ionicons" color={colors.msSuccessCheck} />
        </View>
        <BlueSpacing20 />
        <BlueTextCentered>{loc.formatString(loc.multisig.vault_key, { number: keyIndex })}</BlueTextCentered>
        <BlueSpacing20 />
        <BlueTextCentered>{loc.multisig.wallet_key_created}</BlueTextCentered>
        <BlueSpacing20 />
        <BlueTextCentered>{loc._.seed}</BlueTextCentered>
        <BlueSpacing10 />
        <View style={[styles.secretContainer, { borderColor: colors.formBorder }]}>
          {words.map((text, index) => (
            <View style={[styles.word, { backgroundColor: colors.inputBackgroundColor }]} key={`${text}${index}`}>
              <BlueTextCentered>{`${index + 1}. ${text}`}</BlueTextCentered>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button testID="VaultKeyDone" title={loc.send.success_done} onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 22,
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  vaultKeyCircleSuccess: {
    width: 42,
    height: 42,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secretContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  word: {
    marginRight: 8,
    marginBottom: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4,
  },
});

export default WalletsAddMultisigVaultKeySheet;
