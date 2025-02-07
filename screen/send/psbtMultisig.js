import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import * as bitcoin from 'bitcoinjs-lib';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@rneui/themed';

import { satoshiToBTC, satoshiToLocalCurrency } from '../../blue_modules/currency';
import { BlueCard, BlueText } from '../../BlueComponents';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';

const shortenAddress = addr =>
  addr.substr(0, Math.floor(addr.length / 2) - 1) + '\n' + addr.substr(Math.floor(addr.length / 2) - 1, addr.length);

const PsbtMultisig = () => {
  const { wallets } = useStorage();
  const { navigate, setParams } = useExtendedNavigation();
  const { colors } = useTheme();
  const [flatListHeight, setFlatListHeight] = useState(0);
  const { walletID, psbtBase64, memo, receivedPSBTBase64, launchedBy } = useRoute().params;
  /** @type MultisigHDWallet */
  const wallet = wallets.find(w => w.getID() === walletID);
  const psbt = bitcoin.Psbt.fromBase64(psbtBase64);

  const stylesHook = StyleSheet.create({
    root: { backgroundColor: colors.elevated },
    whitespace: { color: colors.elevated },
    textBtc: { color: colors.buttonAlternativeTextColor },
    textBtcUnitValue: { color: colors.buttonAlternativeTextColor },
    textFiat: { color: colors.alternativeTextColor },
    provideSignatureButton: { backgroundColor: colors.buttonDisabledBackgroundColor },
    provideSignatureButtonText: { color: colors.buttonTextColor },
    vaultKeyCircle: { backgroundColor: colors.buttonDisabledBackgroundColor },
    feeFiatText: { color: colors.alternativeTextColor },
    vaultKeyTextSigned: { color: colors.msSuccessBG },

    vaultKeyText: {
      color: colors.alternativeTextColor,
    },

    vaultKeyCircleSuccess: {
      backgroundColor: colors.msSuccessBG,
    },
  });
  const { destinationStr, totalBtc, totalFiat, targets } = useMemo(() => {
    let totalSat = 0;
    const addresses = [];
    const targetList = [];
    psbt.txOutputs.forEach(output => {
      if (output.address && !wallet.weOwnAddress(output.address)) {
        totalSat += output.value;
        addresses.push(output.address);
        targetList.push({ address: output.address, value: output.value });
      }
    });
    return {
      destinationStr: shortenAddress(addresses.join(', ')),
      totalBtc: new BigNumber(totalSat).dividedBy(100000000).toNumber(),
      totalFiat: satoshiToLocalCurrency(totalSat),
      targets: targetList,
    };
  }, [psbt.txOutputs, wallet]);

  const getFee = useCallback(() => wallet.calculateFeeFromPsbt(psbt), [wallet, psbt]);

  const howManySignaturesWeHave = useMemo(() => wallet.calculateHowManySignaturesWeHaveFromPsbt(psbt), [wallet, psbt]);
  const isConfirmEnabled = useCallback(() => howManySignaturesWeHave >= wallet.getM(), [howManySignaturesWeHave, wallet]);

  const navigateToPSBTMultisigQRCode = useCallback(() => {
    navigate('PsbtMultisigQRCode', { walletID, psbtBase64: psbt.toBase64(), isShowOpenScanner: isConfirmEnabled() });
  }, [navigate, walletID, psbt, isConfirmEnabled]);

  const _renderItemUnsigned = useCallback(
    el => {
      const renderProvideSignature = el.index === howManySignaturesWeHave;
      return (
        <View testID="ItemUnsigned">
          <View style={styles.itemUnsignedWrapper}>
            <View style={[styles.vaultKeyCircle, stylesHook.vaultKeyCircle]}>
              <Text style={[styles.vaultKeyText, stylesHook.vaultKeyText]}>{el.index + 1}</Text>
            </View>
            <View style={styles.vaultKeyTextWrapper}>
              <Text style={[styles.vaultKeyText, stylesHook.vaultKeyText]}>
                {loc.formatString(loc.multisig.vault_key, { number: el.index + 1 })}
              </Text>
            </View>
          </View>
          {renderProvideSignature && (
            <View>
              <TouchableOpacity
                accessibilityRole="button"
                testID="ProvideSignature"
                style={[styles.provideSignatureButton, stylesHook.provideSignatureButton]}
                onPress={navigateToPSBTMultisigQRCode}
              >
                <Text style={[styles.provideSignatureButtonText, stylesHook.provideSignatureButtonText]}>
                  {loc.multisig.provide_signature}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    },
    [howManySignaturesWeHave, navigateToPSBTMultisigQRCode, stylesHook],
  );

  const _renderItemSigned = useCallback(
    el => (
      <View style={styles.flexDirectionRow} testID="ItemSigned">
        <View style={[styles.vaultKeyCircleSuccess, stylesHook.vaultKeyCircleSuccess]}>
          <Icon size={24} name="check" type="ionicons" color={colors.msSuccessCheck} />
        </View>
        <View style={styles.vaultKeyTextSignedWrapper}>
          <Text style={[styles.vaultKeyTextSigned, stylesHook.vaultKeyTextSigned]}>
            {loc.formatString(loc.multisig.vault_key, { number: el.index + 1 })}
          </Text>
        </View>
      </View>
    ),
    [colors, stylesHook],
  );

  const _renderItem = useCallback(
    el => {
      return el.index >= howManySignaturesWeHave ? _renderItemUnsigned(el) : _renderItemSigned(el);
    },
    [howManySignaturesWeHave, _renderItemSigned, _renderItemUnsigned],
  );

  const _combinePSBT = useCallback(() => {
    try {
      const receivedPsbt = bitcoin.Psbt.fromBase64(receivedPSBTBase64);
      const newPsbt = psbt.combine(receivedPsbt);
      setParams({ psbtBase64: newPsbt.toBase64(), receivedPSBTBase64: undefined });
    } catch (error) {
      presentAlert({ message: error.message });
    }
  }, [psbt, receivedPSBTBase64, setParams]);

  useEffect(() => {
    if (receivedPSBTBase64) _combinePSBT();
  }, [receivedPSBTBase64, _combinePSBT]);

  const onConfirm = useCallback(() => {
    try {
      psbt.finalizeAllInputs();
    } catch (_) {} // ignore if it is already finalized

    if (launchedBy) {
      // we must navigate back to the screen who requested psbt (instead of broadcasting it ourselves)
      // most likely for LN channel opening
      navigate(launchedBy, { psbt });
      return;
    }
    try {
      const tx = psbt.extractTransaction().toHex();
      const satoshiPerByte = Math.round(getFee() / psbt.extractTransaction().virtualSize());
      navigate('Confirm', {
        fee: new BigNumber(getFee()).dividedBy(100000000).toNumber(),
        memo,
        walletID,
        tx,
        recipients: targets,
        satoshiPerByte,
      });
    } catch (error) {
      presentAlert({ message: error });
    }
  }, [psbt, launchedBy, navigate, getFee, memo, walletID, targets]);

  const destinationAddress = useCallback(() => {
    const whitespace = '_';
    const addressList = destinationStr.split(',');
    return addressList.map((addr, index) => {
      if (index > 1) {
        return (
          <View style={styles.destinationTextContainer} key={`end-${index}`}>
            <Text numberOfLines={0} style={[styles.textDestinationFirstFour, stylesHook.textFiat]}>
              and {addressList.length - 2} more...
            </Text>
          </View>
        );
      }
      const firstFour = addr.substring(0, 5);
      const lastFour = addr.substring(addr.length - 5);
      const middle = addr.split(firstFour)[1]?.split(lastFour)[0] || '';
      return (
        <View style={styles.destinationTextContainer} key={`${addr}-${index}`}>
          <Text style={styles.textAlignCenter}>
            <Text numberOfLines={2} style={[styles.textDestinationFirstFour, stylesHook.textBtc]}>
              {firstFour}
              <Text style={stylesHook.whitespace}>{whitespace}</Text>
              <Text style={[styles.textDestination, stylesHook.textFiat]}>{middle}</Text>
              <Text style={stylesHook.whitespace}>{whitespace}</Text>
              <Text style={[styles.textDestinationFirstFour, stylesHook.textBtc]}>{lastFour}</Text>
            </Text>
          </Text>
        </View>
      );
    });
  }, [destinationStr, stylesHook]);

  const handleLayout = useCallback(e => {
    setFlatListHeight(e.nativeEvent.layout.height);
  }, []);

  const header = useMemo(
    () => (
      <View style={stylesHook.root}>
        <View style={styles.containerText}>
          <BlueText style={[styles.textBtc, stylesHook.textBtc]}>{totalBtc}</BlueText>
          <View style={styles.textBtcUnit}>
            <BlueText style={[styles.textBtcUnitValue, stylesHook.textBtcUnitValue]}> {BitcoinUnit.BTC}</BlueText>
          </View>
        </View>
        <View style={styles.containerText}>
          <BlueText style={[styles.textFiat, stylesHook.textFiat]}>{totalFiat}</BlueText>
        </View>
        <View>{destinationAddress()}</View>
      </View>
    ),
    [totalBtc, totalFiat, destinationAddress, stylesHook],
  );

  const footer = useMemo(
    () => (
      <>
        <View style={styles.bottomWrapper}>
          <View style={styles.bottomFeesWrapper}>
            <BlueText style={[styles.feeFiatText, stylesHook.feeFiatText]}>
              {loc.formatString(loc.multisig.fee, { number: satoshiToLocalCurrency(getFee()) })} -{' '}
            </BlueText>

            <BlueText style={styles.feeFiatText} />
            <BlueText>{loc.formatString(loc.multisig.fee_btc, { number: satoshiToBTC(getFee()) })}</BlueText>
          </View>
        </View>
        <View style={styles.marginConfirmButton}>
          <Button disabled={!isConfirmEnabled()} title={loc.multisig.confirm} onPress={onConfirm} testID="PsbtMultisigConfirmButton" />
        </View>
      </>
    ),
    [getFee, isConfirmEnabled, onConfirm, stylesHook],
  );

  return (
    <SafeArea style={stylesHook.root}>
      <View style={styles.container}>
        <View style={styles.mstopcontainer}>
          <View style={styles.mscontainer}>
            <View style={[styles.msleft, { height: flatListHeight - 260 }]} />
          </View>
          <View style={styles.msright}>
            <BlueCard>
              <FlatList
                data={new Array(wallet.getM())}
                onLayout={handleLayout}
                renderItem={_renderItem}
                keyExtractor={(_item, index) => `${index}`}
                ListHeaderComponent={header}
                ListFooterComponent={footer}
              />
              {isConfirmEnabled() && (
                <View style={styles.height80}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    testID="ExportSignedPsbt"
                    style={[styles.provideSignatureButton, stylesHook.provideSignatureButton]}
                    onPress={navigateToPSBTMultisigQRCode}
                  >
                    <Text style={[styles.provideSignatureButtonText, stylesHook.provideSignatureButtonText]}>
                      {loc.multisig.export_signed_psbt}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </BlueCard>
          </View>
        </View>
      </View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  mstopcontainer: { flex: 1, flexDirection: 'row' },
  mscontainer: { flex: 10 },
  msleft: { width: 1, borderStyle: 'dashed', borderWidth: 0.8, borderColor: '#c4c4c4', marginLeft: 40, marginTop: 130 },
  msright: { flex: 90, marginLeft: '-11%' },
  container: { flexDirection: 'column', paddingTop: 24, flex: 1 },
  containerText: { flexDirection: 'row', justifyContent: 'center' },
  destinationTextContainer: { flexDirection: 'row', marginBottom: 4, paddingHorizontal: 60, fontSize: 14, justifyContent: 'center' },
  textFiat: { fontSize: 16, fontWeight: '500', marginBottom: 30 },
  textBtc: { fontWeight: 'bold', fontSize: 30 },
  textAlignCenter: { textAlign: 'center' },
  textDestinationFirstFour: { fontSize: 14 },
  textDestination: { paddingTop: 10, paddingBottom: 40, fontSize: 14, flexWrap: 'wrap' },
  provideSignatureButton: {
    marginTop: 24,
    marginLeft: 40,
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  provideSignatureButtonText: { fontWeight: '600', fontSize: 15 },
  vaultKeyText: { fontSize: 18, fontWeight: 'bold' },
  vaultKeyTextWrapper: { justifyContent: 'center', alignItems: 'center', paddingLeft: 16 },
  vaultKeyCircle: { width: 42, height: 42, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  vaultKeyCircleSuccess: { width: 42, height: 42, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  itemUnsignedWrapper: { flexDirection: 'row', paddingTop: 16 },
  vaultKeyTextSigned: { fontSize: 18, fontWeight: 'bold' },
  vaultKeyTextSignedWrapper: { justifyContent: 'center', alignItems: 'center', paddingLeft: 16 },
  flexDirectionRow: { flexDirection: 'row', paddingVertical: 12 },
  textBtcUnit: { justifyContent: 'flex-end' },
  bottomFeesWrapper: { justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  bottomWrapper: { marginTop: 16 },
  marginConfirmButton: { marginTop: 16, marginHorizontal: 32, marginBottom: 48 },
  height80: { height: 80 },
});

export default PsbtMultisig;
