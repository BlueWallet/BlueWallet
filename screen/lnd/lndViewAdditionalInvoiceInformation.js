import React, { useContext, useEffect, useState } from 'react';
import { View, Share, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlueCopyTextToClipboard, BlueLoading, BlueSpacing20, BlueText } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import QRCodeComponent from '../../components/QRCodeComponent';
import presentAlert from '../../components/Alert';
import { useTheme } from '../../components/themes';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';

const LNDViewAdditionalInvoiceInformation = () => {
  const { walletID } = useRoute().params;
  const { wallets } = useContext(BlueStorageContext);
  const wallet = wallets.find(w => w.getID() === walletID);
  const [walletInfo, setWalletInfo] = useState();
  const { colors } = useTheme();
  const { goBack } = useNavigation();
  const stylesHook = StyleSheet.create({
    loading: {
      backgroundColor: colors.elevated,
    },
    root: {
      backgroundColor: colors.elevated,
    },
  });

  useEffect(() => {
    if (wallet) {
      wallet
        .fetchInfo()
        .then(_ => {
          setWalletInfo(wallet.info_raw);
        })
        .catch(error => {
          console.log(error);
          presentAlert({ message: loc.errors.network });
          goBack();
        });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  if (walletInfo === undefined) {
    return (
      <SafeArea style={[styles.loading, stylesHook.loading]}>
        <BlueLoading />
      </SafeArea>
    );
  }

  return (
    <SafeArea style={stylesHook.root}>
      <View style={styles.wrapper}>
        <View style={styles.qrcode}>
          <QRCodeComponent value={walletInfo.uris[0]} size={300} />
        </View>
        <BlueSpacing20 />
        <BlueText>{loc.lndViewInvoice.open_direct_channel}</BlueText>
        <BlueCopyTextToClipboard text={walletInfo.uris[0]} />
        <View style={styles.share}>
          <Button
            icon={{
              name: 'share-alternative',
              type: 'entypo',
              color: colors.buttonTextColor,
            }}
            onPress={async () => {
              Share.share({
                message: walletInfo.uris[0],
              });
            }}
            title={loc.receive.details_share}
          />
        </View>
      </View>
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

LNDViewAdditionalInvoiceInformation.navigationOptions = navigationStyle({}, opts => ({
  ...opts,
  title: loc.lndViewInvoice.additional_info,
}));
