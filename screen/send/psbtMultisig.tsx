import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import * as bitcoin from 'bitcoinjs-lib';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import assert from 'assert';

import { satoshiToBTC, satoshiToLocalCurrency } from '../../blue_modules/currency';
import BlueText from '../../components/BlueText';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import MultipleStepsListItem, {
  MultipleStepsListItemButtonType,
  MultipleStepsListItemDashType,
} from '../../components/MultipleStepsListItem';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { useStorage } from '../../hooks/context/useStorage';
import { combinePSBTs } from '../../util/combinePSBTs.ts';
import { MultisigHDWallet } from '../../class/wallets/multisig-hd-wallet';

type RouteParams = {
  params: {
    walletID: string;
    psbtBase64: string;
    memo: string;
    receivedPSBTBase64: string;
    txhex: string;
    launchedBy: string;
  };
};

type DestinationTarget = { address: string; value: number };

const normalizeAddress = (address: string) => address.trim().toLowerCase();

const resolveOutputAddress = (output: bitcoin.Psbt['txOutputs'][number]): string | undefined => {
  if (output.address) return output.address;
  if (!output.script) return undefined;
  try {
    return bitcoin.address.fromOutputScript(output.script);
  } catch {
    return undefined;
  }
};

/** Build the wallet's change-address set the same way Confirm/CreateTransaction do. */
const getChangeAddressSet = (wallet: MultisigHDWallet): Set<string> => {
  const changeAddresses = new Set<string>();
  const limit = (wallet.next_free_change_address_index || 0) + (wallet.gap_limit || 20);
  for (let c = 0; c < limit; c++) {
    try {
      changeAddresses.add(normalizeAddress(wallet._getInternalAddressByIndex(c)));
    } catch {
      // derivation can throw for incomplete cosigner setups; skip
    }
  }
  return changeAddresses;
};

const getDestinationData = (psbt: bitcoin.Psbt, wallet: MultisigHDWallet, excludeChange = true) => {
  // Only strip change outputs (same approach as SendDetails → Confirm), not all owned
  // addresses — sending to your own receive address must still show as a recipient.
  const changeAddresses = excludeChange ? getChangeAddressSet(wallet) : null;
  const addresses: string[] = [];
  let totalSat = 0;
  const targets: DestinationTarget[] = [];
  for (const output of psbt.txOutputs) {
    const address = resolveOutputAddress(output);
    if (!address) continue;
    if (changeAddresses?.has(normalizeAddress(address))) continue;
    const value = Number(output.value);
    totalSat += value;
    addresses.push(address);
    targets.push({ address, value });
  }
  return { addresses, totalSat, targets };
};

const dashType = ({
  index,
  lastIndex,
  isChecked,
  isFocus,
  exportFollows,
}: {
  index: number;
  lastIndex: number;
  isChecked: boolean;
  isFocus: boolean;
  exportFollows: boolean;
}) => {
  if (isChecked) {
    // Keep going into the export row when it is the step that ends the line.
    if (index === lastIndex && !exportFollows) return MultipleStepsListItemDashType.Top;
    return MultipleStepsListItemDashType.TopAndBottom;
  }
  if (index === lastIndex) {
    // The current last key continues into Provide signature, which ends the line.
    // A later last key is the end, so the line stops on its circle.
    return isFocus ? MultipleStepsListItemDashType.TopAndBottom : MultipleStepsListItemDashType.Top;
  }
  return MultipleStepsListItemDashType.TopAndBottom;
};

const PsbtMultisig = () => {
  const { wallets } = useStorage();
  const { navigate, setParams } = useNavigation();
  const { colors } = useTheme();
  const { walletID, psbtBase64, memo, receivedPSBTBase64, txhex, launchedBy } = useRoute<RouteProp<RouteParams>>().params;
  const wallet = wallets.find(w => w.getID() === walletID) as MultisigHDWallet;
  assert(wallet, 'Internal error: MultisigHDWallet not found');

  const [psbt, setPsbt] = useState<bitcoin.Psbt | null>(() => {
    try {
      return bitcoin.Psbt.fromBase64(psbtBase64);
    } catch (error) {
      console.error('Error loading initial PSBT:', error);
      presentAlert({ message: loc.send.invalid_psbt });
      return null;
    }
  });

  const [isFiltered, setIsFiltered] = useState(true);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
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
    feeFiatText: {
      color: colors.alternativeTextColor,
    },
    addressSection: {
      color: colors.alternativeTextColor2,
    },
  });

  const filteredData = useMemo(
    () => (psbt ? getDestinationData(psbt, wallet, true) : { addresses: [], totalSat: 0, targets: [] }),
    [psbt, wallet],
  );
  const unfilteredData = useMemo(
    () => (psbt ? getDestinationData(psbt, wallet, false) : { addresses: [], totalSat: 0, targets: [] }),
    [psbt, wallet],
  );

  // Default: hide change. Tap amount to toggle and include change outputs.
  const targets = filteredData.targets.length > 0 ? filteredData.targets : unfilteredData.targets;
  const preferFiltered = isFiltered && filteredData.addresses.length > 0;
  const displayData = preferFiltered ? filteredData : unfilteredData;
  const displayTotalBtc = new BigNumber(displayData.totalSat).dividedBy(100000000).toNumber();
  const displayTotalFiat = satoshiToLocalCurrency(displayData.totalSat);

  const howManySignaturesWeHave = psbt ? wallet.calculateHowManySignaturesWeHaveFromPsbt(psbt) : 0;
  const confirmEnabled = howManySignaturesWeHave >= wallet.getM();
  const keyIndexes = useMemo(() => Array.from({ length: wallet.getM() }, (_, index) => index), [wallet]);

  const getFee = () => {
    if (!psbt) return 0;
    return wallet.calculateFeeFromPsbt(psbt);
  };

  useEffect(() => {
    if (!psbt || !receivedPSBTBase64 || receivedPSBTBase64 === psbt.toBase64()) return;
    try {
      const combined = combinePSBTs({ psbtBase64: psbt.toBase64(), newPSBTBase64: receivedPSBTBase64 });
      setPsbt(combined);
      setParams({ receivedPSBTBase64: undefined });
    } catch (error: any) {
      console.error('Error during PSBT combination:', error);
      presentAlert({ message: error.message });
    }
  }, [receivedPSBTBase64, psbt, setParams]);

  useEffect(() => {
    if (!txhex || !psbt) return;
    try {
      const tx = bitcoin.Transaction.fromHex(txhex);
      const fee = wallet.calculateFeeFromPsbt(psbt);
      const satoshiPerByte = Math.round(fee / tx.virtualSize());
      navigate('Confirm', {
        fee: new BigNumber(fee).dividedBy(100000000).toNumber(),
        memo,
        walletID,
        tx: txhex,
        recipients: targets,
        satoshiPerByte,
      });
    } catch (error: any) {
      presentAlert({ message: error?.message ?? String(error) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txhex]);

  if (!psbt) return null;

  const navigateToPSBTMultisigQRCode = () => {
    navigate('PsbtMultisigQRCode', { walletID, psbtBase64: psbt.toBase64(), isShowOpenScanner: confirmEnabled });
  };

  const renderKey = (index: number) => {
    const isChecked = index < howManySignaturesWeHave;
    const isCurrentUnsigned = index === howManySignaturesWeHave;
    const lastIndex = keyIndexes.length - 1;

    return (
      <View key={`${index}`} testID={isChecked ? 'ItemSigned' : 'ItemUnsigned'}>
        <MultipleStepsListItem
          checked={isChecked}
          circledText={String(index + 1)}
          leftText={loc.formatString(loc.multisig.vault_key, { number: index + 1 })}
          dashes={dashType({ index, lastIndex, isChecked, isFocus: isCurrentUnsigned, exportFollows: confirmEnabled })}
        />
        {isCurrentUnsigned ? (
          <MultipleStepsListItem
            button={{
              testID: 'ProvideSignature',
              buttonType: MultipleStepsListItemButtonType.Full,
              text: loc.multisig.provide_signature,
              onPress: navigateToPSBTMultisigQRCode,
            }}
            // End the line here only when this key is the last step. Otherwise continue to the next key.
            dashes={index === lastIndex ? MultipleStepsListItemDashType.Top : MultipleStepsListItemDashType.TopAndBottom}
          />
        ) : null}
      </View>
    );
  };

  const onConfirm = () => {
    if (!psbt) return;
    // Finalize a copy: a failure (e.g. an input with more signatures than the quorum) must not leave the PSBT in state
    // half-finalized, or Export would share inputs that already lost their partial signatures.
    let finalized: bitcoin.Psbt;
    try {
      finalized = MultisigHDWallet.finalizedCopy(psbt);
    } catch (err: any) {
      presentAlert({ message: err?.message ?? String(err) });
      return;
    }

    if (launchedBy) {
      navigate(launchedBy, { psbt: finalized });
      return;
    }

    try {
      const extracted = finalized.extractTransaction();
      const tx = extracted.toHex();
      const fee = getFee();
      const satoshiPerByte = Math.round(fee / extracted.virtualSize());
      navigate('Confirm', {
        fee: new BigNumber(fee).dividedBy(100000000).toNumber(),
        memo,
        walletID,
        tx,
        recipients: targets,
        satoshiPerByte,
      });
    } catch (error: any) {
      presentAlert({ message: error?.message ?? String(error) });
    }
  };

  const destinationAddress = () => {
    const addrs = preferFiltered ? filteredData.addresses : unfilteredData.addresses;
    const displayAddrs = preferFiltered ? addrs : [...new Set(addrs)];
    const destinationAddressView = [];
    const destinations = Object.entries(displayAddrs);
    for (const [index, address] of destinations) {
      if (Number(index) > 1) {
        destinationAddressView.push(
          <View style={styles.destinationTextContainer} key={`end-${index}`}>
            <Text numberOfLines={0} style={[styles.addressSection, stylesHook.textFiat]}>
              and {destinations.length - 2} more...
            </Text>
          </View>,
        );
        break;
      } else {
        destinationAddressView.push(
          <View style={styles.destinationTextContainer} key={`${address}-${index}`}>
            <Text style={styles.textAlignCenter} selectable>
              <Text style={[styles.addressSection, stylesHook.addressSection]}>{address.slice(0, 6)}</Text>
              <Text style={[styles.textDestination, stylesHook.textFiat]}>{address.slice(6, -6)}</Text>
              <Text style={[styles.addressSection, stylesHook.addressSection]}>{address?.slice(-6)}</Text>
            </Text>
          </View>,
        );
      }
    }
    return destinationAddressView;
  };

  return (
    <SafeArea style={stylesHook.root} ignoreTopInset>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          <View style={styles.amountHeader}>
            <View style={styles.containerText}>
              <TouchableOpacity onPress={() => setIsFiltered(prev => !prev)}>
                <BlueText selectable style={[styles.textBtc, stylesHook.textBtc]}>
                  {displayTotalBtc}
                </BlueText>
              </TouchableOpacity>
              <View style={styles.textBtcUnit}>
                <BlueText selectable style={stylesHook.textBtcUnitValue}>
                  {' '}
                  {BitcoinUnit.BTC}
                </BlueText>
              </View>
            </View>
            <View style={styles.containerText}>
              <TouchableOpacity onPress={() => setIsFiltered(prev => !prev)}>
                <BlueText selectable style={[styles.textFiat, stylesHook.textFiat]}>
                  {displayTotalFiat}
                </BlueText>
              </TouchableOpacity>
            </View>
            <View style={styles.addresses}>{destinationAddress()}</View>
          </View>

          <View style={styles.stepperSection}>
            {keyIndexes.map(index => renderKey(index))}
            {confirmEnabled ? (
              <View style={styles.exportButton}>
                <MultipleStepsListItem
                  button={{
                    testID: 'ExportSignedPsbt',
                    buttonType: MultipleStepsListItemButtonType.Full,
                    text: loc.multisig.export_signed_psbt,
                    onPress: navigateToPSBTMultisigQRCode,
                  }}
                  dashes={MultipleStepsListItemDashType.Top}
                />
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.feeConfirmContainer}>
          <View style={styles.feeContainer}>
            <View style={styles.bottomFeesWrapper}>
              <BlueText selectable style={stylesHook.feeFiatText}>
                {loc.formatString(loc.multisig.fee, { number: satoshiToLocalCurrency(getFee()) })} -{' '}
              </BlueText>
              <BlueText selectable>{loc.formatString(loc.multisig.fee_btc, { number: satoshiToBTC(getFee()) })}</BlueText>
            </View>
          </View>
          <View style={styles.flexConfirm}>
            <Button disabled={!confirmEnabled} title={loc.multisig.confirm} onPress={onConfirm} testID="PsbtMultisigConfirmButton" />
          </View>
        </View>
      </View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  amountHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: 'center',
  },
  addresses: {
    width: '100%',
    marginTop: 4,
  },
  stepperSection: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  containerText: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  destinationTextContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 4,
    justifyContent: 'center',
  },
  textFiat: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  textBtc: {
    fontWeight: 'bold',
    fontSize: 30,
  },
  textAlignCenter: {
    textAlign: 'center',
  },
  addressSection: {
    fontSize: 14,
    fontWeight: '500',
  },
  textDestination: {
    fontSize: 14,
    flexWrap: 'wrap',
  },
  textBtcUnit: {
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  bottomFeesWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  exportButton: {
    marginTop: 8,
  },
  flexConfirm: {
    paddingTop: 8,
  },
  feeConfirmContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  feeContainer: {
    marginBottom: 8,
  },
});

export default PsbtMultisig;
