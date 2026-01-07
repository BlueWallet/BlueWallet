import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { BlueSpacing20 } from '../../components/BlueSpacing';
import { BlueTextCentered } from '../../BlueComponents';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import QRCodeComponent from '../../components/QRCodeComponent';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

const ViewEditMultisigShareCosignerSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<DetailViewStackParamList, 'ViewEditMultisigShareCosignerSheet'>>();
  const route = useRoute<RouteProp<DetailViewStackParamList, 'ViewEditMultisigShareCosignerSheet'>>();
  const { colors } = useTheme();
  const { cosignerXpub, cosignerXpubURv2 } = route.params;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.elevated }]} edges={['bottom', 'left', 'right']}>
      <View style={styles.content}>
        <BlueTextCentered>
          {Platform.OS === 'ios'
            ? `${loc.multisig.this_is_cosigners_xpub} ${loc.multisig.this_is_cosigners_xpub_airdrop}`
            : loc.multisig.this_is_cosigners_xpub}
        </BlueTextCentered>
        <BlueSpacing20 />
        <View style={styles.qrContainer}>
          <QRCodeComponent value={cosignerXpubURv2} size={260} />
        </View>
        <BlueSpacing20 />
        <CopyTextToClipboard text={cosignerXpub} truncated={false} />
      </View>
      <View style={styles.footer}>
        <Button title={loc.send.success_done} onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrContainer: {
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
});

export default ViewEditMultisigShareCosignerSheet;
