import React, { useEffect, useState } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Share, StyleSheet, View } from 'react-native';
import { BlueLoading, BlueSpacing20, BlueText } from '../../BlueComponents';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import QRCodeComponent from '../../components/QRCodeComponent';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { LightningCustodianWallet } from '../../class';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';

type RouteParams = {
  params: {
    walletID: string;
  };
};

const LNDViewAdditionalInvoiceInformation: React.FC = () => {
  const { walletID } = useRoute<RouteProp<RouteParams>>().params;
  const { wallets } = useStorage();
  const wallet = wallets.find(w => w.getID() === walletID) as LightningCustodianWallet;
  const [walletInfo, setWalletInfo] = useState<{ uris?: string[] } | undefined>();
  const { colors } = useTheme();
  const { goBack } = useExtendedNavigation();
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
  });

  useEffect(() => {
    if (wallet) {
      wallet
        .fetchInfo()
        .then(() => {
          const info = wallet.info_raw;
          // @ts-ignore: idk
          if (info?.uris?.[0]) {
            // @ts-ignore: idk
            setWalletInfo(info);
          } else {
            presentAlert({ message: loc.errors.network });
            goBack();
          }
        })
        .catch((error: Error) => {
          console.error(error);
          presentAlert({ title: loc.errors.network, message: error.message });
          goBack();
        });
    }
  }, [wallet, goBack]);

  return (
    <SafeArea style={[styles.loading, stylesHook.root]}>
      {!walletInfo ? (
        <BlueLoading />
      ) : (
        <View style={styles.wrapper}>
          <View style={styles.qrcode}>
            <QRCodeComponent value={walletInfo.uris?.[0] ?? ''} size={300} />
          </View>
          <BlueSpacing20 />
          <BlueText>{loc.lndViewInvoice.open_direct_channel}</BlueText>
          <CopyTextToClipboard text={walletInfo.uris?.[0] ?? ''} />
          <View style={styles.share}>
            <Button
              icon={{
                name: 'share-alternative',
                type: 'entypo',
                color: colors.buttonTextColor,
              }}
              onPress={async () => {
                Share.share({
                  message: walletInfo.uris?.[0] ?? '',
                });
              }}
              title={loc.receive.details_share}
            />
          </View>
        </View>
      )}
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  loading: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrcode: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  share: {
    marginBottom: 25,
  },
});

export default LNDViewAdditionalInvoiceInformation;
