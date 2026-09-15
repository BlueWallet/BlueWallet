import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation, RouteProp, StackActions, useIsFocused, useRoute } from '@react-navigation/native';
import type { NativeStackHeaderItem } from '@react-navigation/native-stack';
import * as bitcoin from 'bitcoinjs-lib';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import BlueCard from '../../components/BlueCard';
import BlueText from '../../components/BlueText';
import { SettingsFootnote, SettingsListItem, SettingsSection } from '../../components/SettingsSection';
import HandOffComponent from '../../components/HandOffComponent';
import Icon from '../../components/Icon';
import ToolTipMenu from '../../components/ToolTipMenu';
import { HandOffActivityType } from '../../components/types';
import presentAlert from '../../components/Alert';
import CopyToClipboardButton from '../../components/CopyToClipboardButton';
import { DynamicQRCode } from '../../components/DynamicQRCode';
import SaveFileButton from '../../components/SaveFileButton';
import { SecondButton } from '../../components/SecondButton';
import { useTheme } from '../../components/themes';
import { useBiometrics, unlockWithBiometrics } from '../../hooks/useBiometrics';
import loc, { formatBalance } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import { majorTomToGroundControl } from '../../blue_modules/notifications';
import { openSignedTransactionRaw } from '../../blue_modules/fs';
import { BlueSpacing10, BlueSpacing20 } from '../../components/BlueSpacing';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList';
import { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';
import { isIOS26OrHigher } from '../../blue_modules/environment';

const PsbtWithHardwareWallet = () => {
  const { txMetadata, fetchAndSaveWalletTransactions, wallets } = useStorage();
  const { isElectrumDisabled, isHandOffUseEnabled, setIsHandOffUseEnabledAsyncStorage } = useSettings();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<SendDetailsStackParamList, 'PsbtWithHardwareWallet'>>();
  const { walletID, memo, psbt, deepLinkPSBT, launchedBy } = route.params;
  const wallet = wallets.find(w => w.getID() === walletID) as WatchOnlyWallet;
  const routeParamsPSBT = useRef(route.params.psbt);
  const routeParamsTXHex = route.params.txhex;
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [txHex, setTxHex] = useState<string | undefined>(route.params.txhex);
  const [deepLinkedPsbt, setDeepLinkedPsbt] = useState<bitcoin.Psbt | undefined>();
  const openScannerButton = useRef<View | null>(null);
  const dynamicQRCode = useRef<DynamicQRCode | null>(null);
  const isFocused = useIsFocused();

  const toggleHandoff = useCallback(() => {
    void setIsHandOffUseEnabledAsyncStorage(!isHandOffUseEnabled);
  }, [isHandOffUseEnabled, setIsHandOffUseEnabledAsyncStorage]);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !deepLinkedPsbt) return;

    const menuItem: NativeStackHeaderItem = {
      type: 'menu',
      label: loc.settings.general_continuity,
      icon: { type: 'sfSymbol', name: 'arrow.triangle.2.circlepath' },
      menu: {
        items: [
          {
            type: 'action',
            label: loc.settings.general_continuity,
            state: isHandOffUseEnabled ? 'on' : 'off',
            onPress: toggleHandoff,
          },
        ],
      },
    };

    const headerLeft = () => (
      <ToolTipMenu
        actions={[{ id: 'toggleHandoff', text: loc.settings.general_continuity, menuState: isHandOffUseEnabled }]}
        onPressMenuItem={toggleHandoff}
        shouldOpenOnLongPress={false}
        accessibilityLabel={loc.settings.general_continuity}
      >
        <Icon name="repeat" type="font-awesome" size={20} color={colors.foregroundColor} />
      </ToolTipMenu>
    );

    navigation.setOptions(
      isIOS26OrHigher
        ? { headerLeft: undefined, unstable_headerLeftItems: () => [menuItem] }
        : { headerLeft, unstable_headerLeftItems: undefined },
    );
  }, [colors.foregroundColor, deepLinkedPsbt, isHandOffUseEnabled, navigation, toggleHandoff]);

  const stylesHook = StyleSheet.create({
    scrollViewContent: {
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

  const _combinePSBT = useCallback(
    (receivedPSBT: bitcoin.Psbt | string): bitcoin.Transaction | undefined => {
      if (!psbt) {
        throw new Error('No PSBT to combine');
      }
      return wallet.combinePsbt(psbt, receivedPSBT);
    },
    [psbt, wallet],
  );

  const onBarScanned = useCallback(
    (ret: string | { data: string }) => {
      const data = typeof ret === 'string' ? ret : ret.data;
      if (data.toUpperCase().startsWith('UR')) {
        presentAlert({ message: 'BC-UR not decoded. This should never happen' });
      }
      if (data.indexOf('+') === -1 && data.indexOf('=') === -1 && data.indexOf('=') === -1) {
        // this looks like NOT base64, so maybe its transaction's hex
        setTxHex(data);
        return;
      }
      try {
        const Tx = _combinePSBT(data);
        setTxHex(Tx?.toHex());
        if (launchedBy) {
          // we must navigate back to the screen who requested psbt (instead of broadcasting it ourselves)
          // most likely for LN channel opening
          const popToAction = StackActions.popTo(launchedBy, { psbt }, { merge: true });
          navigation.dispatch(popToAction);
          // ^^^ we just use `psbt` variable sinse it was finalized in the above _combinePSBT()
          // (passed by reference)
        }
      } catch (Err) {
        console.log('error in _combinePSBT():', Err);
        const message = Err instanceof Error ? Err.message : typeof Err === 'string' ? Err : 'Unknown error';
        presentAlert({ message });
      }
    },
    [_combinePSBT, launchedBy, navigation, psbt],
  );

  useEffect(() => {
    if (isFocused) {
      dynamicQRCode.current?.startAutoMove();
    } else {
      dynamicQRCode.current?.stopAutoMove();
    }
  }, [isFocused]);

  useEffect(() => {
    if (!psbt && !route.params.txhex && !deepLinkPSBT) {
      presentAlert({ message: loc.send.no_tx_signing_in_progress });
    }

    if (deepLinkPSBT) {
      try {
        const newPsbt = bitcoin.Psbt.fromBase64(deepLinkPSBT);
        setDeepLinkedPsbt(newPsbt);
        if (routeParamsPSBT.current) {
          const Tx = wallet.combinePsbt(routeParamsPSBT.current, newPsbt);
          setTxHex(Tx.toHex());
        }
      } catch (Err) {
        console.log('error in wallet.combinePsbt():', Err);
        const message = Err instanceof Error ? Err.message : typeof Err === 'string' ? Err : 'Unknown error';
        presentAlert({ message });
      }
    } else if (routeParamsTXHex) {
      setTxHex(routeParamsTXHex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkPSBT, routeParamsTXHex]);

  const displayedPsbt = psbt ?? deepLinkedPsbt;

  const renderPsbtDetails = () => {
    if (!displayedPsbt) return null;

    const addressFromScript = (script: Uint8Array): string | undefined => {
      try {
        return bitcoin.address.fromOutputScript(Buffer.from(script));
      } catch {
        return undefined;
      }
    };

    const inputDetails = (index: number): string => {
      const input = displayedPsbt.txInputs[index];
      const psbtInput = displayedPsbt.data.inputs[index];
      let script = psbtInput.witnessUtxo?.script;

      if (!script && psbtInput.nonWitnessUtxo) {
        try {
          script = bitcoin.Transaction.fromBuffer(Buffer.from(psbtInput.nonWitnessUtxo)).outs[input.index]?.script;
        } catch {
          // The outpoint remains useful when a supplied non-witness transaction is malformed.
        }
      }

      const address = script ? addressFromScript(script) : undefined;
      const outpoint = `${Buffer.from(input.hash).reverse().toString('hex')}:${input.index}`;
      return address ? `${loc.transactions.details_to_address}: ${address}\n${outpoint}` : outpoint;
    };

    const totalOutput = displayedPsbt.txOutputs.reduce((total, output) => total + output.value, 0n);
    return (
      <View style={styles.detailsContainer} testID="DeepLinkPsbtDetails">
        <HandOffComponent title={loc.send.psbt_sign} type={HandOffActivityType.Psbt} userInfo={{ psbt: displayedPsbt.toBase64() }} />
        <BlueCard style={[styles.detailsCard, { backgroundColor: colors.elevated }]}>
          <BlueText style={styles.detailsTitle}>{loc.transactions.details_section}</BlueText>
          <BlueText style={[styles.detailsCounts, { color: colors.alternativeTextColor }]}>
            {`${loc.formatString(loc.transactions.details_inputs_count, { count: displayedPsbt.inputCount })} · ${loc.formatString(loc.transactions.details_outputs_count, { count: displayedPsbt.txOutputs.length })}`}
          </BlueText>
          <BlueText selectable style={styles.detailsTotal}>{formatBalance(Number(totalOutput), BitcoinUnit.SATS, true)}</BlueText>
        </BlueCard>

        <SettingsSection
          title={loc.formatString(loc.transactions.details_inputs_count, { count: displayedPsbt.inputCount })}
          containerStyle={styles.settingsSection}
        >
          {displayedPsbt.txInputs.map((input, index) => (
            <SettingsListItem
              key={`${Buffer.from(input.hash).toString('hex')}-${input.index}`}
              title={`${loc.transactions.details_inputs} ${index + 1}`}
              subtitle={inputDetails(index)}
              subtitleNumberOfLines={0}
              subtitleSelectable
              iconName="key"
              noFeedback
              bottomDivider={index < displayedPsbt.txInputs.length - 1}
            />
          ))}
        </SettingsSection>

        <SettingsSection
          title={loc.formatString(loc.transactions.details_outputs_count, { count: displayedPsbt.txOutputs.length })}
          containerStyle={styles.settingsSection}
        >
          {displayedPsbt.txOutputs.map((output, index) => (
            <SettingsListItem
              key={`${index}-${output.value}`}
              title={`${loc.transactions.details_to} ${index + 1}`}
              rightTitle={formatBalance(Number(output.value), BitcoinUnit.SATS, true)}
              rightTitleSelectable
              subtitle={`${addressFromScript(output.script) ?? loc.transactions.details_tx_hex}\n${Buffer.from(output.script).toString('hex')}`}
              subtitleNumberOfLines={0}
              subtitleSelectable
              iconName="paperPlane"
              noFeedback
              bottomDivider={index < displayedPsbt.txOutputs.length - 1}
            />
          ))}
        </SettingsSection>
        <SettingsFootnote style={styles.detailsWarning}>{loc.multisig.provide_signature_next_steps_details}</SettingsFootnote>
      </View>
    );
  };

  const broadcast = async () => {
    setIsLoading(true);
    const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();

    if (isBiometricsEnabled) {
      if (!(await unlockWithBiometrics())) {
        setIsLoading(false);
        return;
      }
    }
    try {
      if (!(await BlueElectrum.ensureConnected())) {
        throw new Error(loc.errors.network);
      }

      if (!txHex) {
        setIsLoading(false);
        presentAlert({ message: 'No transaction hex available' });
        return;
      }

      const result = await wallet.broadcastTx(txHex);
      if (result) {
        setIsLoading(false);
        const txDecoded = bitcoin.Transaction.fromHex(txHex);
        const txid = txDecoded.getId();
        majorTomToGroundControl([], [], [txid]);
        if (memo) {
          txMetadata[txid] = { memo };
        }
        navigation.navigate('Success', { amount: undefined });
        await new Promise(resolve => setTimeout(resolve, 3000)); // sleep to make sure network propagates
        fetchAndSaveWalletTransactions(wallet.getID());
      } else {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        setIsLoading(false);
        presentAlert({ message: loc.errors.broadcast });
      }
    } catch (error) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      setIsLoading(false);
      console.log('error broadcasting:', error);
      const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
      presentAlert({ message });
    }
  };

  const handleOnVerifyPressed = () => {
    Linking.openURL('https://coinb.in/?verify=' + txHex);
  };

  const copyHexToClipboard = () => {
    if (txHex) {
      Clipboard.setString(txHex);
    }
  };

  const _renderBroadcastHex = () => {
    return (
      <View style={[styles.rootPadding, stylesHook.rootPadding]}>
        <BlueCard style={[styles.hexWrap, stylesHook.hexWrap]}>
          <BlueText style={[styles.hexLabel, stylesHook.hexLabel]}>{loc.send.create_this_is_hex}</BlueText>
          <TextInput style={[styles.hexInput, stylesHook.hexInput]} multiline editable={false} value={txHex} />

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

  const saveFileButtonBeforeOnPress = () => {
    dynamicQRCode.current?.stopAutoMove();
  };

  const saveFileButtonAfterOnPress = () => {
    dynamicQRCode.current?.startAutoMove();
  };

  const onOpenSignedTransaction = async () => {
    const file = await openSignedTransactionRaw();
    file && onBarScanned({ data: file });
  };

  useEffect(() => {
    const data = route.params.onBarScanned;
    if (data) {
      onBarScanned({ data });
      navigation.setParams({ onBarScanned: undefined });
    }
  }, [navigation, onBarScanned, route.params.onBarScanned]);

  const openScanner = async () => {
    navigation.navigate('ScanQRCode', {
      showFileImportButton: true,
    });
  };

  if (txHex) return _renderBroadcastHex();

  const renderView = isLoading ? (
    <ActivityIndicator />
  ) : (
    <View style={styles.container}>
      <BlueCard>
        <BlueText testID="TextHelperForPSBT">{loc.send.psbt_this_is_psbt}</BlueText>
        {renderPsbtDetails()}
        <BlueSpacing10 />
        <Text testID="PSBTHex" style={styles.hidden}>
          {psbt?.toHex()}
        </Text>
        {psbt && <DynamicQRCode value={psbt.toHex()} ref={dynamicQRCode} walletID={walletID} />}
        <BlueSpacing10 />
        <SecondButton
          testID="PsbtTxScanButton"
          icon={{
            name: 'qrcode',
            type: 'font-awesome',
            color: colors.secondButtonTextColor,
          }}
          onPress={openScanner}
          ref={openScannerButton}
          title={loc.send.psbt_tx_scan}
        />
        <BlueSpacing10 />
        <SecondButton
          icon={{
            name: 'login',
            type: 'entypo',
            color: colors.secondButtonTextColor,
          }}
          onPress={onOpenSignedTransaction}
          title={loc.send.psbt_tx_open}
        />
        <BlueSpacing10 />
        {psbt && (
          <SecondButton
            testID="PsbtViewRawButton"
            icon={{
              name: 'code',
              type: 'font-awesome',
              color: colors.secondButtonTextColor,
            }}
            onPress={() =>
              navigation.navigate('PsbtRaw', {
                psbtBase64: psbt.toBase64(),
              })
            }
            title={loc.send.psbt_view_raw}
          />
        )}
        <BlueSpacing10 />
        {psbt && (
          <SaveFileButton
            fileName={`${Date.now()}.psbt`}
            fileContent={psbt.toBase64()}
            beforeOnPress={saveFileButtonBeforeOnPress}
            afterOnPress={saveFileButtonAfterOnPress}
            style={styles.exportButton}
          >
            <SecondButton
              icon={{
                name: 'share-alternative',
                type: 'entypo',
                color: colors.secondButtonTextColor,
              }}
              title={loc.send.psbt_tx_export}
            />
          </SaveFileButton>
        )}
        <BlueSpacing10 />
        {psbt && (
          <View style={styles.copyToClipboard}>
            <CopyToClipboardButton stringToCopy={psbt.toBase64()} displayText={loc.send.psbt_clipboard} />
          </View>
        )}
      </BlueCard>
    </View>
  );

  return (
    <ScrollView
      centerContent
      style={stylesHook.scrollViewContent}
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.scrollViewContent, stylesHook.scrollViewContent]}
      testID="PsbtWithHardwareScrollView"
    >
      {renderView}
    </ScrollView>
  );
};

export default PsbtWithHardwareWallet;

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
  detailsContainer: {
    marginTop: 16,
  },
  detailsCard: {
    borderRadius: 12,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  detailsCounts: {
    marginTop: 4,
  },
  detailsTotal: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
  },
  settingsSection: {
    marginHorizontal: 0,
    marginTop: 16,
    marginBottom: 0,
  },
  detailsWarning: {
    fontSize: 12,
    marginTop: 16,
    marginHorizontal: 4,
  },
  exportButton: {
    alignSelf: 'stretch',
    width: '100%',
  },
  rootPadding: {
    flex: 1,
    paddingTop: 20,
  },
  hexWrap: {
    alignItems: 'center',
    flex: 1,
    width: '100%',
  },
  hexLabel: {
    fontWeight: '500',
  },
  hexInput: {
    alignSelf: 'stretch',
    borderRadius: 4,
    marginTop: 20,
    maxHeight: 220,
    minHeight: 120,
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
    marginVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hidden: {
    width: 0,
    height: 0,
  },
});
