import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BlueSpacing10, BlueSpacing20 } from '../../components/BlueSpacing';
import BlueTextCentered from '../../components/BlueTextCentered';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import SquareEnumeratedWords, { SquareEnumeratedWordsContentAlign } from '../../components/SquareEnumeratedWords';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import AuthenticatedFileDragSource from '../../components/AuthenticatedFileDragSource';
import { makeLabelFileName } from '../../blue_modules/dragFileName';
import { useStorage } from '../../hooks/context/useStorage';

const ViewEditMultisigCosignerViewSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<DetailViewStackParamList, 'ViewEditMultisigCosignerViewSheet'>>();
  const route = useRoute<RouteProp<DetailViewStackParamList, 'ViewEditMultisigCosignerViewSheet'>>();
  const { colors } = useTheme();
  const { wallets } = useStorage();
  const { vaultKeyData, walletID } = route.params;
  const hasXpub = Boolean(vaultKeyData.xpub);
  const hasSeed = Boolean(vaultKeyData.seed);

  const seedWords = useMemo(() => (vaultKeyData.seed ? vaultKeyData.seed.split(' ') : []), [vaultKeyData.seed]);
  const seedFileName = useMemo(() => {
    const walletLabel = wallets.find(wallet => wallet.getID() === walletID)?.getLabel() || 'multisig-wallet';
    return makeLabelFileName(`${walletLabel}-cosigner-${vaultKeyData.keyIndex}`, 'txt');
  }, [vaultKeyData.keyIndex, walletID, wallets]);

  const handleShare = () => {
    if (!vaultKeyData.xpub || !vaultKeyData.cosignerXpubURv2 || !vaultKeyData.exportFilename) return;
    navigation.navigate(
      'ViewEditMultisigShareCosignerSheet',
      {
        walletID,
        cosignerXpub: vaultKeyData.xpub,
        cosignerXpubURv2: vaultKeyData.cosignerXpubURv2,
        exportFilename: vaultKeyData.exportFilename,
      },
      { merge: true },
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.elevated }]} edges={['bottom', 'left', 'right']}>
      <View style={styles.content}>
        <View style={[styles.vaultKeyCircleSuccess, { backgroundColor: colors.msSuccessBG }]}>
          <Icon size={24} name="checkmark" type="ionicons" color={colors.msSuccessCheck} />
        </View>
        <BlueSpacing20 />
        <BlueTextCentered>{loc.formatString(loc.multisig.vault_key, { number: vaultKeyData.keyIndex })}</BlueTextCentered>
        {hasXpub && (
          <>
            <BlueSpacing20 />
            <BlueTextCentered>{loc._.wallet_key}</BlueTextCentered>
            <BlueSpacing10 />
            <AuthenticatedFileDragSource
              fileName={vaultKeyData.exportFilename}
              mimeType="application/json"
              content={vaultKeyData.exportString || vaultKeyData.xpub}
            >
              <SquareEnumeratedWords
                contentAlign={SquareEnumeratedWordsContentAlign.left}
                entries={[vaultKeyData.xpub as string, vaultKeyData.fp ?? '', vaultKeyData.path ?? '']}
                appendNumber={false}
              />
            </AuthenticatedFileDragSource>
          </>
        )}
        {hasSeed && (
          <>
            <BlueSpacing20 />
            <BlueTextCentered>{loc._.seed}</BlueTextCentered>
            <BlueSpacing10 />
            <AuthenticatedFileDragSource fileName={seedFileName} mimeType="text/plain" content={vaultKeyData.seed}>
              <SquareEnumeratedWords contentAlign={SquareEnumeratedWordsContentAlign.left} entries={seedWords} appendNumber />
            </AuthenticatedFileDragSource>
            {vaultKeyData.passphrase ? <BlueTextCentered>{vaultKeyData.passphrase}</BlueTextCentered> : null}
          </>
        )}
      </View>
      <View style={styles.footer}>
        {vaultKeyData.xpub && vaultKeyData.cosignerXpubURv2 && vaultKeyData.exportFilename ? (
          <Button testID="VaultCosignerViewShare" title={loc.multisig.share} onPress={handleShare} />
        ) : (
          <Button testID="VaultCosignerViewDone" title={loc.send.success_done} onPress={() => navigation.goBack()} />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 22,
    alignItems: 'center',
  },
  vaultKeyCircleSuccess: {
    width: 42,
    height: 42,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
});

export default ViewEditMultisigCosignerViewSheet;
