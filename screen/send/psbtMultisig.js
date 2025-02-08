import React, { useEffect, useState } from 'react';
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

const PsbtMultisig = () => {
  const { wallets } = useStorage();
  const { navigate, setParams } = useExtendedNavigation();
  const { colors } = useTheme();
  const [flatListHeight, setFlatListHeight] = useState(0);
  const { walletID, psbtBase64, memo, receivedPSBTBase64, launchedBy } = useRoute().params;
  /** @type MultisigHDWallet */
  const wallet = wallets.find(w => w.getID() === walletID);
  const [psbt, setPsbt] = useState(bitcoin.Psbt.fromBase64(psbtBase64));
  const data = new Array(wallet.getM());
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    whitespace: {
      color: colors.elevated,
    },
    textBtc: {
      color: colors.buttonAlternativeTextColor,
    },
    textBtcUnitValue: {
      color: colors.buttonAlternativeTextColor,
    },
    textFiat: {
      color: colors.alternativeTextColor,
    },
    provideSignatureButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    provideSignatureButtonText: {
      color: colors.buttonTextColor,
    },
    vaultKeyCircle: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    vaultKeyText: {
      color: colors.alternativeTextColor,
    },
    feeFiatText: {
      color: colors.alternativeTextColor,
    },
    vaultKeyCircleSuccess: {
      backgroundColor: colors.msSuccessBG,
    },
    vaultKeyTextSigned: {
      color: colors.msSuccessBG,
    },
  });

  // if useFilter is true, include only non-owned addresses.
  const getDestinationData = (useFilter = true) => {
    const addresses = [];
    let totalSat = 0;
    const targets = [];
    for (const output of psbt.txOutputs) {
      if (output.address) {
        if (useFilter && wallet.weOwnAddress(output.address)) continue;
        totalSat += output.value;
        addresses.push(output.address);
        targets.push({ address: output.address, value: output.value });
      }
    }
    return { addresses, totalSat, targets };
  };

  const filteredData = getDestinationData(true);
  const unfilteredData = getDestinationData(false);

  const targets = filteredData.targets;

  // Compute totals for display from unfiltered data.
  const displayTotalBtc = new BigNumber(unfilteredData.totalSat).dividedBy(100000000).toNumber();
  const displayTotalFiat = satoshiToLocalCurrency(unfilteredData.totalSat);

  const getFee = () => {
    return wallet.calculateFeeFromPsbt(psbt);
  };

  const _renderItem = el => {
    if (el.index >= howManySignaturesWeHave) return _renderItemUnsigned(el);
    else return _renderItemSigned(el);
  };

  const navigateToPSBTMultisigQRCode = () => {
    navigate('PsbtMultisigQRCode', { walletID, psbtBase64: psbt.toBase64(), isShowOpenScanner: isConfirmEnabled() });
  };

  const _renderItemUnsigned = el => {
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
  };

  const _renderItemSigned = el => {
    return (
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
    );
  };

  useEffect(() => {
    if (receivedPSBTBase64) {
      _combinePSBT();
      setParams({ receivedPSBTBase64: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivedPSBTBase64]);

  const _combinePSBT = () => {
    try {
      const receivedPSBT = bitcoin.Psbt.fromBase64(receivedPSBTBase64);
      const newPsbt = psbt.combine(receivedPSBT);
      setPsbt(newPsbt);
    } catch (error) {
      presentAlert({ message: error });
    }
  };

  const onConfirm = () => {
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
  };

  const howManySignaturesWeHave = wallet.calculateHowManySignaturesWeHaveFromPsbt(psbt);
  const isConfirmEnabled = () => {
    return howManySignaturesWeHave >= wallet.getM();
  };

  const destinationAddress = (useFilter = true) => {
    const addrs = useFilter ? filteredData.addresses : unfilteredData.addresses;
    const destinationAddressView = [];
    const whitespace = '_';
    const destinations = Object.entries(addrs.join(', ').split(','));
    for (const [index, address] of destinations) {
      if (index > 1) {
        destinationAddressView.push(
          <View style={styles.destinationTextContainer} key={`end-${index}`}>
            <Text numberOfLines={0} style={[styles.textDestinationFirstFour, stylesHook.textFiat]}>
              and {destinations.length - 2} more...
            </Text>
          </View>,
        );
        break;
      } else {
        const currentAddress = address;
        const firstFour = currentAddress.substring(0, 5);
        const lastFour = currentAddress.substring(currentAddress.length - 5);
        const middle = currentAddress.length > 10 ? currentAddress.slice(5, currentAddress.length - 5) : '';
        destinationAddressView.push(
          <View style={styles.destinationTextContainer} key={`${currentAddress}-${index}`}>
            <Text style={styles.textAlignCenter}>
              <Text numberOfLines={2} style={[styles.textDestinationFirstFour, stylesHook.textBtc]}>
                {firstFour}
                <Text style={stylesHook.whitespace}>{whitespace}</Text>
                <Text style={[styles.textDestination, stylesHook.textFiat]}>{middle}</Text>
                <Text style={stylesHook.whitespace}>{whitespace}</Text>
                <Text style={[styles.textDestinationFirstFour, stylesHook.textBtc]}>{lastFour}</Text>
              </Text>
            </Text>
          </View>,
        );
      }
    }
    return destinationAddressView;
  };

  const header = (
    <View style={stylesHook.root}>
      <View style={styles.containerText}>
        <BlueText style={[styles.textBtc, stylesHook.textBtc]}>{displayTotalBtc}</BlueText>
        <View style={styles.textBtcUnit}>
          <BlueText style={[styles.textBtcUnitValue, stylesHook.textBtcUnitValue]}> {BitcoinUnit.BTC}</BlueText>
        </View>
      </View>
      <View style={styles.containerText}>
        <BlueText style={[styles.textFiat, stylesHook.textFiat]}>{displayTotalFiat}</BlueText>
      </View>
      <View>{destinationAddress(false)}</View>
    </View>
  );

  const footer = null;

  const onLayout = event => {
    setFlatListHeight(event.nativeEvent.layout.height);
  };

  return (
    <SafeArea style={stylesHook.root}>
      <View style={styles.flexColumnSpaceBetween}>
        <View style={styles.flexOne}>
          <View style={styles.container}>
            <View style={styles.mstopcontainer}>
              <View style={styles.mscontainer}>
                <View style={[styles.msleft, { height: flatListHeight - 260 }]} />
              </View>
              <View style={styles.msright}>
                <BlueCard>
                  <FlatList
                    data={data}
                    renderItem={_renderItem}
                    keyExtractor={(_item, index) => `${index}`}
                    ListHeaderComponent={header}
                    ListFooterComponent={footer}
                    onLayout={onLayout}
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
        </View>
        <View style={styles.feeConfirmContainer}>
          <View style={styles.feeContainer}>
            <View style={styles.bottomWrapper}>
              <View style={styles.bottomFeesWrapper}>
                <BlueText style={[styles.feeFiatText, stylesHook.feeFiatText]}>
                  {loc.formatString(loc.multisig.fee, { number: satoshiToLocalCurrency(getFee()) })} -{' '}
                </BlueText>
                <BlueText>{loc.formatString(loc.multisig.fee_btc, { number: satoshiToBTC(getFee()) })}</BlueText>
              </View>
            </View>
          </View>
          <View style={styles.flexConfirm}>
            <Button disabled={!isConfirmEnabled()} title={loc.multisig.confirm} onPress={onConfirm} testID="PsbtMultisigConfirmButton" />
          </View>
        </View>
      </View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  mstopcontainer: {
    flex: 1,
    flexDirection: 'row',
  },
  mscontainer: {
    flex: 10,
  },
  flexOne: {
    flex: 1,
  },
  msleft: {
    width: 1,
    borderStyle: 'dashed',
    borderWidth: 0.8,
    borderColor: '#c4c4c4',
    marginLeft: 40,
    marginTop: 160,
  },
  msright: {
    flex: 90,
    marginLeft: '-11%',
  },
  container: {
    flexDirection: 'column',
    flex: 1,
  },
  containerText: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  destinationTextContainer: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingHorizontal: 60,
    fontSize: 14,
    justifyContent: 'center',
  },
  textFiat: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 30,
  },
  textBtc: {
    fontWeight: 'bold',
    fontSize: 30,
  },
  textAlignCenter: {
    textAlign: 'center',
  },
  textDestinationFirstFour: {
    fontSize: 14,
  },
  textDestination: {
    paddingTop: 10,
    paddingBottom: 40,
    fontSize: 14,
    flexWrap: 'wrap',
  },
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
  vaultKeyCircle: {
    width: 42,
    height: 42,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vaultKeyCircleSuccess: {
    width: 42,
    height: 42,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemUnsignedWrapper: { flexDirection: 'row', paddingTop: 16 },
  vaultKeyTextSigned: { fontSize: 18, fontWeight: 'bold' },
  vaultKeyTextSignedWrapper: { justifyContent: 'center', alignItems: 'center', paddingLeft: 16 },
  flexDirectionRow: { flexDirection: 'row', paddingVertical: 12 },
  textBtcUnit: { justifyContent: 'flex-end' },
  bottomFeesWrapper: { justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  bottomWrapper: { marginTop: 16 },
  height80: {
    height: 80,
  },
  flexColumnSpaceBetween: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  flexConfirm: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  feeConfirmContainer: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  feeContainer: {
    marginBottom: 8,
  },
});

export default PsbtMultisig;
