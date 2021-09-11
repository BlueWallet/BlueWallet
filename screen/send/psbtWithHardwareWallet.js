/* global alert */
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  View,
  TextInput,
  Linking,
  Platform,
  Text,
  StyleSheet,
  findNodeHandle,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import DocumentPicker from 'react-native-document-picker';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { isMacCatalina } from '../../blue_modules/environment';
import RNFS from 'react-native-fs';
import Biometric from '../../class/biometrics';

import { SecondButton, BlueText, SafeBlueArea, BlueCard, BlueSpacing20, BlueCopyToClipboardButton } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import Notifications from '../../blue_modules/notifications';
import { DynamicQRCode } from '../../components/DynamicQRCode';
const BlueElectrum = require('../../blue_modules/BlueElectrum');
const bitcoin = require('bitcoinjs-lib');
const fs = require('../../blue_modules/fs');

const PsbtWithHardwareWallet = () => {
  const { txMetadata, fetchAndSaveWalletTransactions, isElectrumDisabled } = useContext(BlueStorageContext);
  const navigation = useNavigation();
  const route = useRoute();
  const { fromWallet, memo, psbt, deepLinkPSBT, launchedBy } = route.params;
  const routeParamsPSBT = useRef(route.params.psbt);
  const routeParamsTXHex = route.params.txhex;
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [txHex, setTxHex] = useState(route.params.txhex);
  const openScannerButton = useRef();
  const dynamicQRCode = useRef();

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    rootPadding: {
      backgroundColor: colors.elevated,
    },
    hexWrap: {
      backgroundColor: colors.elevated,
    },
    hexLabel: {
      color: colors.foregroundColor,
    },
    hexInput: {
      borderColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
      color: colors.foregroundColor,
    },
    hexText: {
      color: colors.foregroundColor,
    },
  });

  const _combinePSBT = receivedPSBT => {
    return fromWallet.combinePsbt(psbt, receivedPSBT);
  };

  const onBarScanned = ret => {
    if (ret && !ret.data) ret = { data: ret };
    if (ret.data.toUpperCase().startsWith('UR')) {
      alert('BC-UR not decoded. This should never happen');
    }
    if (ret.data.indexOf('+') === -1 && ret.data.indexOf('=') === -1 && ret.data.indexOf('=') === -1) {
      // this looks like NOT base64, so maybe its transaction's hex
      setTxHex(ret.data);
      return;
    }
    try {
      const Tx = _combinePSBT(ret.data);
      setTxHex(Tx.toHex());
      if (launchedBy) {
        // we must navigate back to the screen who requested psbt (instead of broadcasting it ourselves)
        // most likely for LN channel opening
        navigation.navigate(launchedBy, { psbt });
        // ^^^ we just use `psbt` variable sinse it was finalized in the above _combinePSBT()
        // (passed by reference)
      }
    } catch (Err) {
      alert(Err);
    }
  };

  useEffect(() => {
    if (!psbt && !route.params.txhex) {
      alert(loc.send.no_tx_signing_in_progress);
    }

    if (deepLinkPSBT) {
      const psbt = bitcoin.Psbt.fromBase64(deepLinkPSBT);
      try {
        const Tx = fromWallet.combinePsbt(routeParamsPSBT.current, psbt);
        setTxHex(Tx.toHex());
      } catch (Err) {
        alert(Err);
      }
    } else if (routeParamsTXHex) {
      setTxHex(routeParamsTXHex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkPSBT, routeParamsTXHex]);

  const broadcast = async () => {
    setIsLoading(true);
    const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

    if (isBiometricsEnabled) {
      if (!(await Biometric.unlockWithBiometrics())) {
        setIsLoading(false);
        return;
      }
    }
    try {
      await BlueElectrum.ping();
      await BlueElectrum.waitTillConnected();
      const result = await fromWallet.broadcastTx(txHex);
      if (result) {
        setIsLoading(false);
        const txDecoded = bitcoin.Transaction.fromHex(txHex);
        const txid = txDecoded.getId();
        Notifications.majorTomToGroundControl([], [], [txid]);
        if (memo) {
          txMetadata[txid] = { memo };
        }
        navigation.navigate('Success', { amount: undefined });
        await new Promise(resolve => setTimeout(resolve, 3000)); // sleep to make sure network propagates
        fetchAndSaveWalletTransactions(fromWallet.getID());
      } else {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        setIsLoading(false);
        alert(loc.errors.broadcast);
      }
    } catch (error) {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      setIsLoading(false);
      alert(error.message);
    }
  };

  const handleOnVerifyPressed = () => {
    Linking.openURL('https://coinb.in/?verify=' + txHex);
  };

  const copyHexToClipboard = () => {
    Clipboard.setString(txHex);
  };

  const _renderBroadcastHex = () => {
    return (
      <View style={[styles.rootPadding, stylesHook.rootPadding]}>
        <BlueCard style={[styles.hexWrap, stylesHook.hexWrap]}>
          <BlueText style={[styles.hexLabel, stylesHook.hexLabel]}>{loc.send.create_this_is_hex}</BlueText>
          <TextInput style={[styles.hexInput, stylesHook.hexInput]} height={112} multiline editable value={txHex} />

          <TouchableOpacity accessibilityRole="button" style={styles.hexTouch} onPress={copyHexToClipboard}>
            <Text style={[styles.hexText, stylesHook.hexText]}>{loc.send.create_copy}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.hexTouch} onPress={handleOnVerifyPressed}>
            <Text style={[styles.hexText, stylesHook.hexText]}>{loc.send.create_verify}</Text>
          </TouchableOpacity>
          <BlueSpacing20 />
          <SecondButton
            disabled={isElectrumDisabled}
            onPress={broadcast}
            title={loc.send.confirm_sendNow}
            testID="PsbtWithHardwareWalletBroadcastTransactionButton"
          />
        </BlueCard>
      </View>
    );
  };

  const exportPSBT = () => {
    const fileName = `${Date.now()}.psbt`;
    dynamicQRCode.current?.stopAutoMove();
    fs.writeFileAndExport(fileName, typeof psbt === 'string' ? psbt : psbt.toBase64()).finally(() => {
      dynamicQRCode.current?.startAutoMove();
    });
  };

  const openSignedTransaction = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: Platform.OS === 'ios' ? ['io.bluewallet.psbt', 'io.bluewallt.psbt.txn'] : [DocumentPicker.types.allFiles],
      });
      const file = await RNFS.readFile(res.uri);
      if (file) {
        onBarScanned({ data: file });
      } else {
        throw new Error();
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        alert(loc.send.details_no_signed_tx);
      }
    }
  };

  const openScanner = () => {
    if (isMacCatalina) {
      fs.showActionSheet({ anchor: findNodeHandle(openScannerButton.current) }).then(data => onBarScanned({ data }));
    } else {
      navigation.navigate('ScanQRCodeRoot', {
        screen: 'ScanQRCode',
        params: {
          launchedBy: route.name,
          showFileImportButton: false,
          onBarScanned,
        },
      });
    }
  };

  if (txHex) return _renderBroadcastHex();

  return isLoading ? (
    <View style={[styles.rootPadding, stylesHook.rootPadding]}>
      <ActivityIndicator />
    </View>
  ) : (
    <SafeBlueArea style={stylesHook.root}>
      <ScrollView centerContent contentContainerStyle={styles.scrollViewContent} testID="PsbtWithHardwareScrollView">
        <View style={styles.container}>
          <BlueCard>
            <BlueText testID="TextHelperForPSBT">{loc.send.psbt_this_is_psbt}</BlueText>
            <BlueSpacing20 />
            <Text testID="PSBTHex" style={styles.hidden}>
              {psbt.toHex()}
            </Text>
            <DynamicQRCode value={psbt.toHex()} ref={dynamicQRCode} />
            <BlueSpacing20 />
            <SecondButton
              testID="PsbtTxScanButton"
              icon={{
                name: 'qrcode',
                type: 'font-awesome',
                color: colors.buttonTextColor,
              }}
              onPress={openScanner}
              ref={openScannerButton}
              title={loc.send.psbt_tx_scan}
            />
            <BlueSpacing20 />
            <SecondButton
              icon={{
                name: 'file-import',
                type: 'material-community',
                color: colors.buttonTextColor,
              }}
              onPress={openSignedTransaction}
              title={loc.send.psbt_tx_open}
            />
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
              <BlueCopyToClipboardButton
                stringToCopy={typeof psbt === 'string' ? psbt : psbt.toBase64()}
                displayText={loc.send.psbt_clipboard}
              />
            </View>
          </BlueCard>
        </View>
      </ScrollView>
    </SafeBlueArea>
  );
};

export default PsbtWithHardwareWallet;

PsbtWithHardwareWallet.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.send.header }));

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 16,
  },
  rootPadding: {
    flex: 1,
    paddingTop: 20,
  },
  hexWrap: {
    alignItems: 'center',
    flex: 1,
  },
  hexLabel: {
    fontWeight: '500',
  },
  hexInput: {
    borderRadius: 4,
    marginTop: 20,
    fontWeight: '500',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
  },
  hexTouch: {
    marginVertical: 24,
  },
  hexText: {
    fontSize: 15,
    fontWeight: '500',
    alignSelf: 'center',
  },
  copyToClipboard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  hidden: {
    width: 0,
    height: 0,
  },
});
