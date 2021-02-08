import React, { useContext, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Share from 'react-native-share';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import * as bitcoin from 'bitcoinjs-lib';
import BigNumber from 'bignumber.js';

import loc from '../../loc';
import navigationStyle from '../../components/navigationStyle';
import {
  BlueCard,
  BlueCopyToClipboardButton,
  BlueSpacing20,
  BlueText,
  DynamicQRCode,
  SafeBlueArea,
  SecondButton,
} from '../../BlueComponents';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { isCatalyst, isMacCatalina } from '../../blue_modules/environment';
const fs = require('../../blue_modules/fs');

const PsbtSign = () => {
  const { wallets } = useContext(BlueStorageContext);
  const { colors } = useTheme();
  const route = useRoute();
  const { walletId, dismissed } = route.params;
  const wallet = useMemo(() => wallets.find(item => item.getID() === walletId), [walletId]); // eslint-disable-line react-hooks/exhaustive-deps
  const { navigate, goBack } = useNavigation();
  const { width, height } = useWindowDimensions();
  const [psbt, setPsbt] = useState();
  const [tx, setTx] = useState();

  const stylesHook = StyleSheet.create({
    rootPadding: {
      backgroundColor: colors.elevated,
    },
  });

  // open qr-code scanner on component mount
  useEffect(() => {
    openScanner();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // go back if qrcode scanned was dismissed and nothig was scanned
  useEffect(() => {
    if (dismissed) goBack();
  }, [dismissed, goBack]);

  const onBarScanned = ret => {
    if (ret && !ret.data) ret = { data: ret };
    let tx;
    let psbt;
    try {
      psbt = bitcoin.Psbt.fromBase64(ret.data);
      tx = wallet.cosignPsbt(psbt).tx;
    } catch (e) {
      Alert.alert(e.message);
    }

    if (!psbt) return;
    if (tx) setTx(tx);
    setPsbt(psbt);
  };

  const openScanner = () => {
    if (isMacCatalina) {
      fs.showActionSheet().then(data => onBarScanned({ data }));
    } else {
      navigate('ScanQRCodeRoot', {
        screen: 'ScanQRCode',
        params: {
          launchedBy: route.name,
          showFileImportButton: true,
          onBarScanned,
        },
      });
    }
  };

  const handleBroadcast = () => {
    // we need to remove change address from recipients, so that Confirm screen show more accurate info
    const changeAddresses = [];
    for (let c = 0; c < wallet.next_free_change_address_index + wallet.gap_limit; c++) {
      changeAddresses.push(wallet._getInternalAddressByIndex(c));
    }
    const recipients = psbt.txOutputs.filter(({ address }) => !changeAddresses.includes(address));

    navigate('Confirm', {
      fee: new BigNumber(psbt.getFee()).dividedBy(100000000).toNumber(),
      fromWallet: wallet,
      tx: tx.toHex(),
      recipients,
      satoshiPerByte: psbt.getFeeRate(),
      psbt,
    });
  };

  const exportPSBT = async () => {
    const fileName = `${Date.now()}.psbt`;
    if (Platform.OS === 'ios') {
      const filePath = RNFS.TemporaryDirectoryPath + `/${fileName}`;
      await RNFS.writeFile(filePath, psbt.toBase64());
      Share.open({
        url: 'file://' + filePath,
        saveToFiles: isCatalyst,
      })
        .catch(error => {
          console.log(error);
        })
        .finally(() => {
          RNFS.unlink(filePath);
        });
    } else if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
        title: loc.send.permission_storage_title,
        message: loc.send.permission_storage_message,
        buttonNeutral: loc.send.permission_storage_later,
        buttonNegative: loc._.cancel,
        buttonPositive: loc._.ok,
      });

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Storage Permission: Granted');
        const filePath = RNFS.DownloadDirectoryPath + `/${fileName}`;
        try {
          await RNFS.writeFile(filePath, psbt.toBase64());
          Alert.alert(loc.formatString(loc.send.txSaved, { filePath: fileName }));
        } catch (e) {
          console.log(e);
          Alert.alert(e.message);
        }
      } else {
        console.log('Storage Permission: Denied');
        Alert.alert(loc.send.permission_storage_title, loc.send.permission_storage_denied_message, [
          {
            text: loc.send.open_settings,
            onPress: () => {
              Linking.openSettings();
            },
            style: 'default',
          },
          { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
        ]);
      }
    }
  };

  if (tx)
    return (
      <SafeBlueArea style={[styles.rootPadding, stylesHook.rootPadding]}>
        <ScrollView centerContent contentContainerStyle={styles.scrollViewContent}>
          <BlueCard>
            <BlueText testID="thisIsHex">{loc.send.create_this_is_hex}</BlueText>
            <BlueSpacing20 />
            <QRCode
              value={tx.toHex()}
              logo={require('../../img/qr-code.png')}
              size={height > width ? width - 40 : width / 2}
              logoSize={70}
              color="#000000"
              logoBackgroundColor={colors.brandingColor}
              backgroundColor="#FFFFFF"
              ecl="H"
            />
            <BlueSpacing20 />
            <BlueSpacing20 />
            <SecondButton onPress={handleBroadcast} title={loc.send.confirm_sendNow} />
            <BlueSpacing20 />
            <BlueSpacing20 />
            <View style={styles.copyToClipboard}>
              <BlueCopyToClipboardButton stringToCopy={tx.toHex()} displayText={loc.send.create_copy} />
            </View>
          </BlueCard>
        </ScrollView>
      </SafeBlueArea>
    );

  if (psbt)
    return (
      <SafeBlueArea style={[styles.rootPadding, stylesHook.rootPadding]}>
        <ScrollView centerContent contentContainerStyle={styles.scrollViewContent}>
          <BlueCard>
            <BlueText testID="thisIsPSBT">
              {loc.formatString(loc.send.psbt_this_is_psbt_inputs, {
                m: wallet.calculateHowManySignaturesWeHaveFromPsbt(psbt),
                n: psbt.inputCount,
              })}
            </BlueText>
            <DynamicQRCode value={psbt.toHex()} capacity={200} />
            <BlueSpacing20 />
            <SecondButton
              icon={{
                name: 'share-alternative',
                type: 'entypo',
                color: colors.buttonTextColor,
              }}
              onPress={exportPSBT}
              title={loc.send.psbt_tx_export}
            />
            <BlueSpacing20 />
            <View style={styles.copyToClipboard}>
              <BlueCopyToClipboardButton stringToCopy={psbt.toBase64()} displayText={loc.send.psbt_clipboard} />
            </View>
          </BlueCard>
        </ScrollView>
      </SafeBlueArea>
    );

  return (
    <View style={[styles.rootPadding, stylesHook.rootPadding]}>
      <ActivityIndicator />
    </View>
  );
};

PsbtSign.navigationOptions = navigationStyle({
  title: loc.send.psbt_sign,
});

export default PsbtSign;

const styles = StyleSheet.create({
  rootPadding: {
    flex: 1,
    paddingTop: 20,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  copyToClipboard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
