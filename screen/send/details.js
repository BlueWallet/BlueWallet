import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { Icon } from 'react-native-elements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import RNFS from 'react-native-fs';
import BigNumber from 'bignumber.js';
import * as bitcoin from 'bitcoinjs-lib';

import {
  BlueButton,
  BlueDismissKeyboardInputAccessory,
  BlueListItem,
  BlueLoading,
  BlueText,
  BlueUseAllFundsButton,
} from '../../BlueComponents';
import { navigationStyleTx } from '../../components/navigationStyle';
import NetworkTransactionFees, { NetworkTransactionFee } from '../../models/networkTransactionFees';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { HDSegwitBech32Wallet, MultisigHDWallet, WatchOnlyWallet } from '../../class';
import DocumentPicker from 'react-native-document-picker';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../../loc';
import CoinsSelected from '../../components/CoinsSelected';
import BottomModal from '../../components/BottomModal';
import AddressInput from '../../components/AddressInput';
import AmountInput from '../../components/AmountInput';
import { AbstractHDElectrumWallet } from '../../class/wallets/abstract-hd-electrum-wallet';
import { BlueStorageContext } from '../../blue_modules/storage-context';
const currency = require('../../blue_modules/currency');
const prompt = require('../../blue_modules/prompt');
const fs = require('../../blue_modules/fs');
const scanqr = require('../../helpers/scan-qr');

const btcAddressRx = /^[a-zA-Z0-9]{26,35}$/;

const SendDetails = () => {
  const { wallets, setSelectedWallet, sleep, txMetadata, saveToDisk } = useContext(BlueStorageContext);
  const navigation = useNavigation();
  const { name, params: routeParams } = useRoute(); // FIXME refactor to use walletID
  const scrollView = useRef();
  const { colors } = useTheme();

  // state
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const [isLoading, setIsLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const [walletSelectionOrCoinsSelectedHidden, setWalletSelectionOrCoinsSelectedHidden] = useState(true);
  const [isAmountToolbarVisibleForAndroid, setIsAmountToolbarVisibleForAndroid] = useState(true);
  const [isFeeSelectionModalVisible, setIsFeeSelectionModalVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [isTransactionReplaceable, setIsTransactionReplaceable] = useState(false);
  const [recipientsScrollIndex, setRecipientsScrollIndex] = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [units, setUnits] = useState([]);
  const [memo, setMemo] = useState('');
  const [networkTransactionFees, setNetworkTransactionFees] = useState(new NetworkTransactionFee(3, 2, 1));
  const [customFee, setCustomFee] = useState(null);
  const [feePrecalc, setFeePrecalc] = useState({ current: null, slowFee: null, mediumFee: null, fastestFee: null });
  const [feeUnit, setFeeUnit] = useState();
  const [amountUnit, setAmountUnit] = useState();
  const [utxo, setUtxo] = useState(null);
  const [payjoinUrl, setPayjoinUrl] = useState(null);
  const [changeAddress, setChangeAddress] = useState();
  const [dumb, setDumb] = useState(false);

  // if cutomFee is not set, we need to choose highest possible fee for wallet balance
  // if there are no funds for even Slow option, use 1 sat/byte fee
  const fee = useMemo(() => {
    if (customFee) return customFee;
    if (feePrecalc.slowFee === null) return '1'; // wait for precalculated fees
    let initialFee;
    if (feePrecalc.fastestFee !== null) {
      initialFee = String(networkTransactionFees.fastestFee);
    } else if (feePrecalc.mediumFee !== null) {
      initialFee = String(networkTransactionFees.mediumFee);
    } else {
      initialFee = String(networkTransactionFees.slowFee);
    }
    return initialFee;
  }, [customFee, feePrecalc, networkTransactionFees]);

  // keyboad effects
  useEffect(() => {
    const _keyboardDidShow = () => {
      setWalletSelectionOrCoinsSelectedHidden(true);
      setIsAmountToolbarVisibleForAndroid(true);
    };

    const _keyboardDidHide = () => {
      setWalletSelectionOrCoinsSelectedHidden(false);
      setIsAmountToolbarVisibleForAndroid(false);
    };

    Keyboard.addListener('keyboardDidShow', _keyboardDidShow);
    Keyboard.addListener('keyboardDidHide', _keyboardDidHide);
    return () => {
      Keyboard.removeListener('keyboardDidShow', _keyboardDidShow);
      Keyboard.removeListener('keyboardDidHide', _keyboardDidHide);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // check if we have a suitable wallet
    const suitable = wallets.filter(wallet => wallet.chain === Chain.ONCHAIN && wallet.allowSend());
    if (suitable.length === 0) {
      Alert.alert(loc.errors.error, loc.send.details_wallet_before_tx);
      navigation.goBack();
      return;
    }
    const wallet = routeParams.fromWallet || suitable[0];
    setWallet(wallet);
    setFeeUnit(wallet.getPreferredBalanceUnit());
    setAmountUnit(wallet.preferredBalanceUnit); // default for whole screen

    // decode route params
    const addresses = [];
    let initialMemo = '';
    if (routeParams.uri) {
      try {
        const { address, amount, memo, payjoinUrl } = DeeplinkSchemaMatch.decodeBitcoinUri(routeParams.uri);
        addresses.push({ address, amount, amountSats: currency.btcToSatoshi(amount) });
        initialMemo = memo;
        setAddresses(addresses);
        setMemo(initialMemo);
        setAmountUnit(BitcoinUnit.BTC);
        setPayjoinUrl(payjoinUrl);
      } catch (error) {
        console.log(error);
        Alert.alert(loc.errors.error, loc.send.details_error_decode);
      }
    } else if (routeParams.address) {
      addresses.push({ address: routeParams.address });
      if (routeParams.memo) initialMemo = routeParams.memo;
      setAddresses(addresses);
      setMemo(initialMemo);
      setAmountUnit(BitcoinUnit.BTC);
    } else {
      setAddresses([{ address: '' }]);
    }

    // we are ready!
    setIsLoading(false);

    // load cached fees
    AsyncStorage.getItem(NetworkTransactionFee.StorageKey)
      .then(async res => {
        const fees = JSON.parse(res);
        if (!fees?.fastestFee) return;
        setNetworkTransactionFees(fees);
      })
      .catch(e => console.log('loading cached recommendedFees error', e));

    // load fresh fees from servers
    NetworkTransactionFees.recommendedFees()
      .then(async fees => {
        if (!fees?.fastestFee) return;
        setNetworkTransactionFees(fees);
        await AsyncStorage.setItem(NetworkTransactionFee.StorageKey, JSON.stringify(fees));
      })
      .catch(e => console.log('loading recommendedFees error', e));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // change header and reset state on wallet change
  useEffect(() => {
    if (!wallet) return;
    setSelectedWallet(wallet.getID());
    navigation.setParams({
      withAdvancedOptionsMenuButton: wallet.allowBatchSend() || wallet.allowSendMax(),
      advancedOptionsMenuButtonAction: () => {
        Keyboard.dismiss();
        setOptionsVisible(true);
      },
    });

    // reset other values
    setUtxo(null);
    setChangeAddress(null);
    setIsTransactionReplaceable(wallet.type === HDSegwitBech32Wallet.type);

    // update wallet UTXO
    wallet
      .fetchUtxo()
      .then(() => {
        // we need to re-calculate fees
        setDumb(v => !v);
      })
      .catch(e => console.log('fetchUtxo error', e));
  }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps

  // recalc fees in effect so we don't block render
  useEffect(() => {
    if (!wallet) return; // wait for it
    const fees = networkTransactionFees;
    const changeAddress = getChangeAddressFast();
    const requestedSatPerByte = Number(fee);
    const lutxo = utxo || wallet.getUtxo();

    const options = [
      { key: 'current', fee: requestedSatPerByte },
      { key: 'slowFee', fee: fees.slowFee },
      { key: 'mediumFee', fee: fees.mediumFee },
      { key: 'fastestFee', fee: fees.fastestFee },
    ];

    const newFeePrecalc = { ...feePrecalc };

    for (const opt of options) {
      let targets = [];
      for (const transaction of addresses) {
        if (transaction.amount === BitcoinUnit.MAX) {
          // single output with MAX
          targets = [{ address: transaction.address }];
          break;
        }
        const value = parseInt(transaction.amountSats);
        if (value > 0) {
          targets.push({ address: transaction.address, value });
        } else if (transaction.amount) {
          if (currency.btcToSatoshi(transaction.amount) > 0) {
            targets.push({ address: transaction.address, value: currency.btcToSatoshi(transaction.amount) });
          }
        }
      }

      // if targets is empty, insert dust
      if (targets.length === 0) {
        targets.push({ address: '36JxaUrpDzkEerkTf1FzwHNE1Hb7cCjgJV', value: 546 });
      }

      // replace wrong addresses with dump
      targets = targets.map(t => {
        try {
          bitcoin.address.toOutputScript(t.address);
          return t;
        } catch (e) {
          return { ...t, address: '36JxaUrpDzkEerkTf1FzwHNE1Hb7cCjgJV' };
        }
      });

      let flag = false;
      while (true) {
        try {
          const { fee } = wallet.coinselect(lutxo, targets, opt.fee, changeAddress);

          newFeePrecalc[opt.key] = fee;
          break;
        } catch (e) {
          if (e.message.includes('Not enough') && !flag) {
            flag = true;
            // if we don't have enough funds, construct maximum possible transaction
            targets = targets.map((t, index) => (index > 0 ? { ...t, value: 546 } : { address: t.address }));
            continue;
          }

          newFeePrecalc[opt.key] = null;
          break;
        }
      }
    }

    setFeePrecalc(newFeePrecalc);
  }, [wallet, networkTransactionFees, utxo, addresses, fee, dumb]); // eslint-disable-line react-hooks/exhaustive-deps

  const getChangeAddressFast = () => {
    if (changeAddress) return changeAddress; // cache

    let change;
    if (WatchOnlyWallet.type === wallet.type && !wallet.isHd()) {
      // plain watchonly - just get the address
      change = wallet.getAddress();
    } else if (WatchOnlyWallet.type === wallet.type || wallet instanceof AbstractHDElectrumWallet) {
      change = wallet._getInternalAddressByIndex(wallet.getNextFreeChangeAddressIndex());
    } else {
      // legacy wallets
      change = wallet.getAddress();
    }

    return change;
  };

  const getChangeAddressAsync = async () => {
    if (changeAddress) return changeAddress; // cache

    let change;
    if (WatchOnlyWallet.type === wallet.type && !wallet.isHd()) {
      // plain watchonly - just get the address
      change = wallet.getAddress();
    } else {
      // otherwise, lets call widely-used getChangeAddressAsync()
      try {
        change = await Promise.race([sleep(2000), wallet.getChangeAddressAsync()]);
      } catch (_) {}

      if (!change) {
        // either sleep expired or getChangeAddressAsync threw an exception
        if (wallet instanceof AbstractHDElectrumWallet) {
          change = wallet._getInternalAddressByIndex(wallet.getNextFreeChangeAddressIndex());
        } else {
          // legacy wallets
          change = wallet.getAddress();
        }
      }
    }

    if (change) setChangeAddress(change); // cache

    return change;
  };

  /**
   * TODO: refactor this mess, get rid of regexp, use https://github.com/bitcoinjs/bitcoinjs-lib/issues/890 etc etc
   *
   * @param data {String} Can be address or `bitcoin:xxxxxxx` uri scheme, or invalid garbage
   */
  const processAddressData = async data => {
    setIsLoading(true);
    if (!data.replace) {
      // user probably scanned PSBT and got an object instead of string..?
      setIsLoading(false);
      return Alert.alert(loc.errors.error, loc.send.details_address_field_is_not_valid);
    }

    const recipients = [...addresses];
    const unitsCopy = [...units];
    const dataWithoutSchema = data.replace('bitcoin:', '').replace('BITCOIN:', '');
    if (wallet.isAddressValid(dataWithoutSchema)) {
      recipients[recipientsScrollIndex].address = dataWithoutSchema;
      unitsCopy[recipientsScrollIndex] = amountUnit;
      setAddresses(recipients);
      setUnits(unitsCopy);
      setIsLoading(false);
      return;
    }

    let address = '';
    let options;
    try {
      if (!data.toLowerCase().startsWith('bitcoin:')) data = `bitcoin:${data}`;
      const decoded = DeeplinkSchemaMatch.bip21decode(data);
      address = decoded.address;
      options = decoded.options;
    } catch (error) {
      data = data.replace(/(amount)=([^&]+)/g, '').replace(/(amount)=([^&]+)&/g, '');
      const decoded = DeeplinkSchemaMatch.bip21decode(data);
      decoded.options.amount = 0;
      address = decoded.address;
      options = decoded.options;
    }

    console.log('options', options);
    if (btcAddressRx.test(address) || address.startsWith('bc1') || address.startsWith('BC1')) {
      unitsCopy[recipientsScrollIndex] = BitcoinUnit.BTC; // also resetting current unit to BTC
      recipients[recipientsScrollIndex].address = address;
      recipients[recipientsScrollIndex].amount = options.amount;
      recipients[recipientsScrollIndex].amountSats = new BigNumber(options.amount).multipliedBy(100000000).toNumber();
      setAddresses(recipients);
      setMemo(options.label || options.message);
      setUnits(unitsCopy);
      setAmountUnit(BitcoinUnit.BTC);
      setPayjoinUrl(options.pj || '');
    }

    setIsLoading(false);
  };

  const createTransaction = async () => {
    Keyboard.dismiss();
    setIsLoading(true);
    const requestedSatPerByte = fee;
    for (const [index, transaction] of addresses.entries()) {
      let error;
      if (!transaction.amount || transaction.amount < 0 || parseFloat(transaction.amount) === 0) {
        error = loc.send.details_amount_field_is_not_valid;
        console.log('validation error');
      } else if (parseFloat(transaction.amountSats) <= 500) {
        error = loc.send.details_amount_field_is_less_than_minimum_amount_sat;
        console.log('validation error');
      } else if (!requestedSatPerByte || parseFloat(requestedSatPerByte) < 1) {
        error = loc.send.details_fee_field_is_not_valid;
        console.log('validation error');
      } else if (!transaction.address) {
        error = loc.send.details_address_field_is_not_valid;
        console.log('validation error');
      } else if (wallet.getBalance() - transaction.amountSats < 0) {
        // first sanity check is that sending amount is not bigger than available balance
        error = loc.send.details_total_exceeds_balance;
        console.log('validation error');
      } else if (transaction.address) {
        const address = transaction.address.trim().toLowerCase();
        if (address.startsWith('lnb') || address.startsWith('lightning:lnb')) {
          error =
            'This address appears to be for a Lightning invoice. Please, go to your Lightning wallet in order to make a payment for this invoice.';
          console.log('validation error');
        }
      }

      if (!error) {
        try {
          bitcoin.address.toOutputScript(transaction.address);
        } catch (err) {
          console.log('validation error');
          console.log(err);
          error = loc.send.details_address_field_is_not_valid;
        }
      }

      if (error) {
        scrollView.current.scrollToIndex({ index });
        setIsLoading(false);
        Alert.alert(loc.errors.error, error);
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        return;
      }
    }

    try {
      await createPsbtTransaction();
    } catch (Err) {
      setIsLoading(false);
      Alert.alert(loc.errors.error, Err.message);
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    }
  };

  const createPsbtTransaction = async () => {
    const changeAddress = await getChangeAddressAsync();
    const requestedSatPerByte = Number(fee);
    const lutxo = utxo || wallet.getUtxo();
    console.log({ requestedSatPerByte, utxo });

    let targets = [];
    for (const transaction of addresses) {
      if (transaction.amount === BitcoinUnit.MAX) {
        // single output with MAX
        targets = [{ address: transaction.address }];
        break;
      }
      const value = parseInt(transaction.amountSats);
      if (value > 0) {
        targets.push({ address: transaction.address, value });
      } else if (transaction.amount) {
        if (currency.btcToSatoshi(transaction.amount) > 0) {
          targets.push({ address: transaction.address, value: currency.btcToSatoshi(transaction.amount) });
        }
      }
    }

    const { tx, outputs, psbt } = wallet.createTransaction(
      lutxo,
      targets,
      requestedSatPerByte,
      changeAddress,
      isTransactionReplaceable ? HDSegwitBech32Wallet.defaultRBFSequence : HDSegwitBech32Wallet.finalRBFSequence,
    );

    if (wallet.type === WatchOnlyWallet.type) {
      // watch-only wallets with enabled HW wallet support have different flow. we have to show PSBT to user as QR code
      // so he can scan it and sign it. then we have to scan it back from user (via camera and QR code), and ask
      // user whether he wants to broadcast it
      navigation.navigate('PsbtWithHardwareWallet', {
        memo,
        fromWallet: wallet,
        psbt,
      });
      setIsLoading(false);
      return;
    }

    if (wallet.type === MultisigHDWallet.type) {
      navigation.navigate('PsbtMultisig', {
        memo,
        psbtBase64: psbt.toBase64(),
        walletID: wallet.getID(),
      });
      setIsLoading(false);
      return;
    }

    txMetadata[tx.getId()] = {
      txhex: tx.toHex(),
      memo,
    };
    await saveToDisk();

    const recipients = outputs.filter(({ address }) => address !== changeAddress);

    navigation.navigate('Confirm', {
      fee: new BigNumber(fee).dividedBy(100000000).toNumber(),
      memo,
      fromWallet: wallet,
      tx: tx.toHex(),
      recipients,
      satoshiPerByte: requestedSatPerByte,
      payjoinUrl,
      psbt,
    });
    setIsLoading(false);
  };

  const onWalletSelect = wallet => {
    const changeWallet = () => {
      setWallet(wallet);
      navigation.pop();
    };

    if (addresses.length > 1 && !wallet.allowBatchSend()) {
      ReactNativeHapticFeedback.trigger('notificationWarning');
      Alert.alert(
        loc.send.details_wallet_selection,
        loc.send.details_no_multiple,
        [
          {
            text: loc._.ok,
            onPress: async () => {
              const firstTransaction =
                addresses.find(element => {
                  const feeSatoshi = new BigNumber(element.amount).multipliedBy(100000000);
                  return element.address.length > 0 && feeSatoshi > 0;
                }) || addresses[0];
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setAddresses([firstTransaction]);
              changeWallet();
            },
            style: 'default',
          },
          { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
        ],
        { cancelable: false },
      );
    } else if (addresses.some(element => element.amount === BitcoinUnit.MAX) && !wallet.allowSendMax()) {
      ReactNativeHapticFeedback.trigger('notificationWarning');
      Alert.alert(
        loc.send.details_wallet_selection,
        loc.send.details_no_maximum,
        [
          {
            text: loc._.ok,
            onPress: async () => {
              const firstTransaction = addresses.find(element => element.amount === BitcoinUnit.MAX) || addresses[0];
              firstTransaction.amount = 0;
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setAddresses([firstTransaction]);
              changeWallet();
            },
            style: 'default',
          },
          { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
        ],
        { cancelable: false },
      );
    } else {
      changeWallet();
    }
  };

  /**
   * same as `importTransaction`, but opens camera instead.
   *
   * @returns {Promise<void>}
   */
  const importQrTransaction = async () => {
    if (wallet.type !== WatchOnlyWallet.type) {
      return Alert.alert(loc.errors.error, 'Error: importing transaction in non-watchonly wallet (this should never happen)');
    }

    setOptionsVisible(false);

    navigation.navigate('ScanQRCodeRoot', {
      screen: 'ScanQRCode',
      params: {
        onBarScanned: importQrTransactionOnBarScanned,
        showFileImportButton: false,
      },
    });
  };

  const importQrTransactionOnBarScanned = async ret => {
    navigation.dangerouslyGetParent().pop();
    if (!ret.data) ret = { data: ret };
    if (ret.data.toUpperCase().startsWith('UR')) {
      Alert.alert(loc.errors.error, 'BC-UR not decoded. This should never happen');
    } else if (ret.data.indexOf('+') === -1 && ret.data.indexOf('=') === -1 && ret.data.indexOf('=') === -1) {
      // this looks like NOT base64, so maybe its transaction's hex
      // we dont support it in this flow
    } else {
      // psbt base64?

      // we construct PSBT object and pass to next screen
      // so user can do smth with it:
      const psbt = bitcoin.Psbt.fromBase64(ret.data);
      navigation.navigate('PsbtWithHardwareWallet', {
        memo,
        fromWallet: wallet,
        psbt,
      });
      setIsLoading(false);
      setOptionsVisible(false);
    }
  };

  /**
   * watch-only wallets with enabled HW wallet support have different flow. we have to show PSBT to user as QR code
   * so he can scan it and sign it. then we have to scan it back from user (via camera and QR code), and ask
   * user whether he wants to broadcast it.
   * alternatively, user can export psbt file, sign it externally and then import it
   *
   * @returns {Promise<void>}
   */
  const importTransaction = async () => {
    if (wallet.type !== WatchOnlyWallet.type) {
      return Alert.alert(loc.errors.error, 'Importing transaction in non-watchonly wallet (this should never happen)');
    }

    try {
      const res = await DocumentPicker.pick({
        type:
          Platform.OS === 'ios'
            ? ['io.bluewallet.psbt', 'io.bluewallet.psbt.txn', DocumentPicker.types.plainText, 'public.json']
            : [DocumentPicker.types.allFiles],
      });

      if (DeeplinkSchemaMatch.isPossiblySignedPSBTFile(res.uri)) {
        // we assume that transaction is already signed, so all we have to do is get txhex and pass it to next screen
        // so user can broadcast:
        const file = await RNFS.readFile(res.uri, 'ascii');
        const psbt = bitcoin.Psbt.fromBase64(file);
        const txhex = psbt.extractTransaction().toHex();
        navigation.navigate('PsbtWithHardwareWallet', { memo, fromWallet: wallet, txhex });
        setIsLoading(false);
        setOptionsVisible(false);
        return;
      }

      if (DeeplinkSchemaMatch.isPossiblyPSBTFile(res.uri)) {
        // looks like transaction is UNsigned, so we construct PSBT object and pass to next screen
        // so user can do smth with it:
        const file = await RNFS.readFile(res.uri, 'ascii');
        const psbt = bitcoin.Psbt.fromBase64(file);
        navigation.navigate('PsbtWithHardwareWallet', { memo, fromWallet: wallet, psbt });
        setIsLoading(false);
        setOptionsVisible(false);
        return;
      }

      if (DeeplinkSchemaMatch.isTXNFile(res.uri)) {
        // plain text file with txhex ready to broadcast
        const file = (await RNFS.readFile(res.uri, 'ascii')).replace('\n', '').replace('\r', '');
        navigation.navigate('PsbtWithHardwareWallet', { memo, fromWallet: wallet, txhex: file });
        setIsLoading(false);
        setOptionsVisible(false);
        return;
      }

      Alert.alert(loc.errors.error, loc.send.details_unrecognized_file_format);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert(loc.errors.error, loc.send.details_no_signed_tx);
      }
    }
  };

  const askCosignThisTransaction = async () => {
    return new Promise(resolve => {
      Alert.alert(
        '',
        loc.multisig.cosign_this_transaction,
        [
          {
            text: loc._.no,
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: loc._.yes,
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false },
      );
    });
  };

  const _importTransactionMultisig = async base64arg => {
    try {
      const base64 = base64arg || (await fs.openSignedTransaction());
      if (!base64) return;
      const psbt = bitcoin.Psbt.fromBase64(base64); // if it doesnt throw - all good, its valid

      if (wallet.howManySignaturesCanWeMake() > 0 && (await askCosignThisTransaction())) {
        hideOptions();
        setIsLoading(true);
        await sleep(100);
        wallet.cosignPsbt(psbt);
        setIsLoading(false);
        await sleep(100);
      }

      navigation.navigate('PsbtMultisig', {
        memo,
        psbtBase64: psbt.toBase64(),
        walletID: wallet.getID(),
      });
    } catch (error) {
      Alert.alert(loc.send.problem_with_psbt, error.message);
    }
    setIsLoading(false);
    setOptionsVisible(false);
  };

  const importTransactionMultisig = async () => {
    return _importTransactionMultisig();
  };

  const onBarScanned = ret => {
    navigation.dangerouslyGetParent().pop();
    if (!ret.data) ret = { data: ret };
    if (ret.data.toUpperCase().startsWith('UR')) {
      Alert.alert(loc.errors.error, 'BC-UR not decoded. This should never happen');
    } else if (ret.data.indexOf('+') === -1 && ret.data.indexOf('=') === -1 && ret.data.indexOf('=') === -1) {
      // this looks like NOT base64, so maybe its transaction's hex
      // we dont support it in this flow
    } else {
      // psbt base64?
      return _importTransactionMultisig(ret.data);
    }
  };

  const importTransactionMultisigScanQr = async () => {
    setOptionsVisible(false);
    navigation.navigate('ScanQRCodeRoot', {
      screen: 'ScanQRCode',
      params: {
        onBarScanned,
        showFileImportButton: true,
      },
    });
  };

  const handleAddRecipient = () => {
    addresses.push({ address: '' });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut, () => scrollView.current.scrollToEnd());
    setAddresses(addresses);
    setOptionsVisible(false);
    scrollView.current.scrollToEnd();
    if (addresses.length > 1) scrollView.current.flashScrollIndicators();
    setRecipientsScrollIndex(addresses.length - 1);
  };

  const handleRemoveRecipient = () => {
    addresses.splice(recipientsScrollIndex, 1);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAddresses(addresses);
    setOptionsVisible(false);
    if (addresses.length > 1) scrollView.current.flashScrollIndicators();
    // after deletion it automatically scrolls to the last one
    setRecipientsScrollIndex(addresses.length - 1);
  };

  const handleCoinControl = () => {
    setOptionsVisible(false);
    navigation.navigate('CoinControl', {
      walletId: wallet.getID(),
      onUTXOChoose: utxo => setUtxo(utxo),
    });
  };

  const handlePsbtSign = async () => {
    setIsLoading(true);
    setOptionsVisible(false);
    await new Promise(resolve => setTimeout(resolve, 100)); // sleep for animations
    const scannedData = await scanqr(navigation.navigate, name);
    if (!scannedData) return setIsLoading(false);

    let tx;
    let psbt;
    try {
      psbt = bitcoin.Psbt.fromBase64(scannedData);
      tx = wallet.cosignPsbt(psbt).tx;
    } catch (e) {
      Alert.alert(loc.errors.error, e.message);
      return;
    } finally {
      setIsLoading(false);
    }

    if (!tx) return setIsLoading(false);

    // we need to remove change address from recipients, so that Confirm screen show more accurate info
    const changeAddresses = [];
    for (let c = 0; c < wallet.next_free_change_address_index + wallet.gap_limit; c++) {
      changeAddresses.push(wallet._getInternalAddressByIndex(c));
    }
    const recipients = psbt.txOutputs.filter(({ address }) => !changeAddresses.includes(address));

    navigation.navigate('CreateTransaction', {
      fee: new BigNumber(psbt.getFee()).dividedBy(100000000).toNumber(),
      feeSatoshi: psbt.getFee(),
      wallet,
      tx: tx.toHex(),
      recipients,
      satoshiPerByte: psbt.getFeeRate(),
      showAnimatedQr: true,
      psbt,
    });
  };

  const hideOptions = () => {
    Keyboard.dismiss();
    setOptionsVisible(false);
  };

  const onReplaceableFeeSwitchValueChanged = value => {
    setIsTransactionReplaceable(value);
  };

  const scrollViewCurrentIndex = () => {
    Keyboard.dismiss();
    const offset = scrollView.current.contentOffset;
    if (offset) {
      const page = Math.round(offset.x / Dimensions.get('window').width);
      return page;
    }
    return 0;
  };

  const onUseAllPressed = () => {
    ReactNativeHapticFeedback.trigger('notificationWarning');
    Alert.alert(
      loc.send.details_adv_full,
      loc.send.details_adv_full_sure + ' ' + (addresses.length > 1 ? loc.send.details_adv_full_remove : ''),
      [
        {
          text: loc._.ok,
          onPress: async () => {
            Keyboard.dismiss();
            const recipient = addresses[scrollViewCurrentIndex()];
            recipient.amount = BitcoinUnit.MAX;
            recipient.amountSats = BitcoinUnit.MAX;
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setAddresses([recipient]);
            setUnits([BitcoinUnit.BTC]);
            setOptionsVisible(false);
          },
          style: 'default',
        },
        { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
      ],
      { cancelable: false },
    );
  };

  const formatFee = fee => formatBalance(fee, feeUnit, true);

  const stylesHook = StyleSheet.create({
    loading: {
      backgroundColor: colors.background,
    },
    root: {
      backgroundColor: colors.elevated,
    },
    modalContent: {
      backgroundColor: colors.modal,
      borderTopColor: colors.borderTopColor,
      borderWidth: colors.borderWidth,
    },
    optionsContent: {
      backgroundColor: colors.modal,
      borderTopColor: colors.borderTopColor,
      borderWidth: colors.borderWidth,
    },
    feeModalItemActive: {
      backgroundColor: colors.feeActive,
    },
    feeModalLabel: {
      color: colors.successColor,
    },
    feeModalTime: {
      backgroundColor: colors.successColor,
    },
    feeModalTimeText: {
      color: colors.background,
    },
    feeModalValue: {
      color: colors.successColor,
    },
    feeModalCustomText: {
      color: colors.buttonAlternativeTextColor,
    },
    selectLabel: {
      color: colors.buttonTextColor,
    },
    of: {
      color: colors.feeText,
    },
    memo: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    feeLabel: {
      color: colors.feeText,
    },
    feeRow: {
      backgroundColor: colors.feeLabel,
    },
    feeValue: {
      color: colors.feeValue,
    },
  });

  const renderFeeSelectionModal = () => {
    const nf = networkTransactionFees;
    const options = [
      {
        label: loc.send.fee_fast,
        time: loc.send.fee_10m,
        fee: feePrecalc.fastestFee,
        rate: nf.fastestFee,
        active: Number(fee) === nf.fastestFee,
      },
      {
        label: loc.send.fee_medium,
        time: loc.send.fee_3h,
        fee: feePrecalc.mediumFee,
        rate: nf.mediumFee,
        active: Number(fee) === nf.mediumFee,
      },
      {
        label: loc.send.fee_slow,
        time: loc.send.fee_1d,
        fee: feePrecalc.slowFee,
        rate: nf.slowFee,
        active: Number(fee) === nf.slowFee,
      },
    ];

    return (
      <BottomModal
        deviceWidth={width + width / 2}
        isVisible={isFeeSelectionModalVisible}
        onClose={() => setIsFeeSelectionModalVisible(false)}
      >
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={[styles.modalContent, stylesHook.modalContent]}>
            {options.map(({ label, time, fee, rate, active }, index) => (
              <TouchableOpacity
                key={label}
                onPress={() => {
                  setFeePrecalc(fp => ({ ...fp, current: fee }));
                  setIsFeeSelectionModalVisible(false);
                  setCustomFee(rate.toString());
                }}
                style={[styles.feeModalItem, active && styles.feeModalItemActive, active && stylesHook.feeModalItemActive]}
              >
                <View style={styles.feeModalRow}>
                  <Text style={[styles.feeModalLabel, stylesHook.feeModalLabel]}>{label}</Text>
                  <View style={[styles.feeModalTime, stylesHook.feeModalTime]}>
                    <Text style={stylesHook.feeModalTimeText}>~{time}</Text>
                  </View>
                </View>
                <View style={styles.feeModalRow}>
                  <Text style={stylesHook.feeModalValue}>{fee && formatFee(fee)}</Text>
                  <Text style={stylesHook.feeModalValue}>
                    {rate} {loc.units.sat_byte}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              testID="feeCustom"
              style={styles.feeModalCustom}
              onPress={async () => {
                let error = loc.send.fee_satbyte;
                while (true) {
                  let fee;

                  try {
                    fee = await prompt(loc.send.create_fee, error, true, 'numeric');
                  } catch (_) {
                    return;
                  }

                  if (!/^\d+$/.test(fee)) {
                    error = loc.send.details_fee_field_is_not_valid;
                    continue;
                  }

                  if (fee < 1) fee = '1';
                  fee = Number(fee).toString(); // this will remove leading zeros if any
                  setCustomFee(fee);
                  setIsFeeSelectionModalVisible(false);
                  return;
                }
              }}
            >
              <Text style={[styles.feeModalCustomText, stylesHook.feeModalCustomText]}>{loc.send.fee_custom}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  const renderOptionsModal = () => {
    const isSendMaxUsed = addresses.some(element => element.amount === BitcoinUnit.MAX);

    return (
      <BottomModal deviceWidth={width + width / 2} isVisible={optionsVisible} onClose={hideOptions}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={[styles.optionsContent, stylesHook.optionsContent]}>
            {wallet.allowSendMax() && (
              <BlueListItem
                testID="sendMaxButton"
                disabled={!(wallet.getBalance() > 0) || isSendMaxUsed}
                title={loc.send.details_adv_full}
                hideChevron
                component={TouchableOpacity}
                onPress={onUseAllPressed}
              />
            )}
            {wallet.type === HDSegwitBech32Wallet.type && (
              <BlueListItem
                title={loc.send.details_adv_fee_bump}
                Component={TouchableWithoutFeedback}
                switch={{ value: isTransactionReplaceable, onValueChange: onReplaceableFeeSwitchValueChanged }}
              />
            )}
            {wallet.type === WatchOnlyWallet.type && wallet.isHd() && wallet.getSecret().startsWith('zpub') && (
              <BlueListItem title={loc.send.details_adv_import} hideChevron component={TouchableOpacity} onPress={importTransaction} />
            )}
            {wallet.type === WatchOnlyWallet.type && wallet.isHd() && wallet.getSecret().startsWith('zpub') && (
              <BlueListItem
                testID="ImportQrTransactionButton"
                title={loc.send.details_adv_import + ' (QR)'}
                hideChevron
                component={TouchableOpacity}
                onPress={importQrTransaction}
              />
            )}
            {wallet.type === MultisigHDWallet.type && (
              <BlueListItem
                title={loc.send.details_adv_import}
                hideChevron
                component={TouchableOpacity}
                onPress={importTransactionMultisig}
              />
            )}
            {wallet.type === MultisigHDWallet.type && wallet.howManySignaturesCanWeMake() > 0 && (
              <BlueListItem
                title={loc.multisig.co_sign_transaction}
                hideChevron
                component={TouchableOpacity}
                onPress={importTransactionMultisigScanQr}
              />
            )}
            {wallet.allowBatchSend() && (
              <>
                <BlueListItem
                  testID="AddRecipient"
                  disabled={isSendMaxUsed}
                  title={loc.send.details_add_rec_add}
                  hideChevron
                  component={TouchableOpacity}
                  onPress={handleAddRecipient}
                />
                <BlueListItem
                  testID="RemoveRecipient"
                  title={loc.send.details_add_rec_rem}
                  hideChevron
                  disabled={addresses.length < 2}
                  component={TouchableOpacity}
                  onPress={handleRemoveRecipient}
                />
              </>
            )}
            <BlueListItem testID="CoinControl" title={loc.cc.header} hideChevron component={TouchableOpacity} onPress={handleCoinControl} />
            {wallet.allowCosignPsbt() && (
              <BlueListItem
                testID="PsbtSign"
                title={loc.send.psbt_sign}
                hideChevron
                component={TouchableOpacity}
                onPress={handlePsbtSign}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  const renderCreateButton = () => {
    return (
      <View style={styles.createButton}>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <BlueButton onPress={() => createTransaction()} title={loc.send.details_next} testID="CreateTransactionButton" />
        )}
      </View>
    );
  };

  const renderWalletSelectionOrCoinsSelected = () => {
    if (walletSelectionOrCoinsSelectedHidden) return;

    if (utxo !== null) {
      return (
        <View style={styles.select}>
          <CoinsSelected
            number={utxo.length}
            onContainerPress={handleCoinControl}
            onClose={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setUtxo(null);
            }}
          />
        </View>
      );
    }

    return (
      <View style={styles.select}>
        {!isLoading && (
          <TouchableOpacity
            style={styles.selectTouch}
            onPress={() => navigation.navigate('SelectWallet', { onWalletSelect, chainType: Chain.ONCHAIN })}
          >
            <Text style={styles.selectText}>{loc.wallets.select_wallet.toLowerCase()}</Text>
            <Icon name="angle-right" size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={styles.selectWrap}>
          <TouchableOpacity
            style={styles.selectTouch}
            onPress={() => navigation.navigate('SelectWallet', { onWalletSelect, chainType: Chain.ONCHAIN })}
          >
            <Text style={[styles.selectLabel, stylesHook.selectLabel]}>{wallet.getLabel()}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderBitcoinTransactionInfoFields = params => {
    const { item, index } = params;
    return (
      <View style={{ width }} testID={'Transaction' + index}>
        <AmountInput
          isLoading={isLoading}
          amount={item.amount ? item.amount.toString() : null}
          onAmountUnitChange={unit => {
            units[index] = unit;
            const item = addresses[index];

            switch (unit) {
              case BitcoinUnit.SATS:
                item.amountSats = parseInt(item.amount);
                break;
              case BitcoinUnit.BTC:
                item.amountSats = currency.btcToSatoshi(item.amount);
                break;
              case BitcoinUnit.LOCAL_CURRENCY:
                // also accounting for cached fiat->sat conversion to avoid rounding error
                item.amountSats = AmountInput.getCachedSatoshis(item.amount) || currency.btcToSatoshi(currency.fiatToBTC(item.amount));
                break;
            }

            addresses[index] = item;
            setUnits([...units]);
            setAddresses([...addresses]);
          }}
          onChangeText={text => {
            item.amount = text;
            switch (units[index] || amountUnit) {
              case BitcoinUnit.BTC:
                item.amountSats = currency.btcToSatoshi(item.amount);
                break;
              case BitcoinUnit.LOCAL_CURRENCY:
                item.amountSats = currency.btcToSatoshi(currency.fiatToBTC(item.amount));
                break;
              default:
              case BitcoinUnit.SATS:
                item.amountSats = parseInt(text);
                break;
            }
            addresses[index] = item;
            setAddresses([...addresses]);
          }}
          unit={units[index] || amountUnit}
          inputAccessoryViewID={wallet.allowSendMax() ? BlueUseAllFundsButton.InputAccessoryViewID : null}
        />
        <AddressInput
          onChangeText={async text => {
            text = text.trim();
            const transactions = [...addresses];
            const { address, amount, memo: lmemo, payjoinUrl } = DeeplinkSchemaMatch.decodeBitcoinUri(text);
            item.address = address || text;
            item.amount = amount || item.amount;
            transactions[index] = item;
            setAddresses(transactions);
            setMemo(lmemo || memo);
            setIsLoading(false);
            setPayjoinUrl(payjoinUrl);
          }}
          onBarScanned={processAddressData}
          address={item.address}
          isLoading={isLoading}
          inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
          launchedBy={name}
        />
        {addresses.length > 1 && (
          <BlueText style={[styles.of, stylesHook.of]}>
            {loc.formatString(loc._.of, { number: index + 1, total: addresses.length })}
          </BlueText>
        )}
      </View>
    );
  };

  if (isLoading || !wallet) {
    return (
      <View style={[styles.loading, stylesHook.loading]}>
        <BlueLoading />
      </View>
    );
  }

  // if utxo is limited we use it to calculate available balance
  const balance = utxo ? utxo.reduce((prev, curr) => prev + curr.value, 0) : wallet.getBalance();
  const allBalance = formatBalanceWithoutSuffix(balance, BitcoinUnit.BTC, true);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.root, stylesHook.root]} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
        <StatusBar barStyle="light-content" />
        <View>
          <KeyboardAvoidingView enabled={!Platform.isPad} behavior="position">
            <FlatList
              keyboardShouldPersistTaps="always"
              scrollEnabled={addresses.length > 1}
              data={addresses}
              renderItem={renderBitcoinTransactionInfoFields}
              keyExtractor={(_item, index) => `${index}`}
              ref={scrollView}
              horizontal
              pagingEnabled
              removeClippedSubviews={false}
              onMomentumScrollBegin={Keyboard.dismiss}
              scrollIndicatorInsets={{ top: 0, left: 8, bottom: 0, right: 8 }}
              contentContainerStyle={styles.scrollViewContent}
            />
            <View style={[styles.memo, stylesHook.memo]}>
              <TextInput
                onChangeText={text => setMemo(text)}
                placeholder={loc.send.details_note_placeholder}
                placeholderTextColor="#81868e"
                value={memo}
                numberOfLines={1}
                style={styles.memoText}
                editable={!isLoading}
                onSubmitEditing={Keyboard.dismiss}
                inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
              />
            </View>
            <TouchableOpacity
              testID="chooseFee"
              onPress={() => setIsFeeSelectionModalVisible(true)}
              disabled={isLoading}
              style={styles.fee}
            >
              <Text style={[styles.feeLabel, stylesHook.feeLabel]}>{loc.send.create_fee}</Text>
              <View style={[styles.feeRow, stylesHook.feeRow]}>
                <Text style={stylesHook.feeValue}>
                  {feePrecalc.current ? formatFee(feePrecalc.current) : fee + ' ' + loc.units.sat_byte}
                </Text>
              </View>
            </TouchableOpacity>
            {renderCreateButton()}
            {renderFeeSelectionModal()}
            {renderOptionsModal()}
          </KeyboardAvoidingView>
        </View>
        <BlueDismissKeyboardInputAccessory />
        {Platform.select({
          ios: (
            <BlueUseAllFundsButton
              canUseAll={wallet.allowSendMax() && allBalance > 0}
              onUseAllPressed={onUseAllPressed}
              balance={allBalance}
            />
          ),
          android: isAmountToolbarVisibleForAndroid && (
            <BlueUseAllFundsButton
              canUseAll={wallet.allowSendMax() && allBalance > 0}
              onUseAllPressed={onUseAllPressed}
              balance={allBalance}
            />
          ),
        })}

        {renderWalletSelectionOrCoinsSelected()}
      </View>
    </TouchableWithoutFeedback>
  );
};

export default SendDetails;

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    paddingTop: 20,
  },
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollViewContent: {
    flexDirection: 'row',
  },
  modalContent: {
    padding: 22,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: 200,
  },
  optionsContent: {
    padding: 22,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: 130,
  },
  feeModalItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 10,
  },
  feeModalItemActive: {
    borderRadius: 8,
  },
  feeModalRow: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeModalLabel: {
    fontSize: 22,
    fontWeight: '600',
  },
  feeModalTime: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  feeModalCustom: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feeModalCustomText: {
    fontSize: 15,
    fontWeight: '600',
  },
  createButton: {
    marginVertical: 16,
    marginHorizontal: 16,
    alignContent: 'center',
    minHeight: 44,
  },
  select: {
    marginBottom: 24,
    marginHorizontal: 24,
    alignItems: 'center',
  },
  selectTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectText: {
    color: '#9aa0aa',
    fontSize: 14,
    marginRight: 8,
  },
  selectWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  selectLabel: {
    fontSize: 14,
  },
  of: {
    alignSelf: 'flex-end',
    marginRight: 18,
    marginVertical: 8,
  },
  memo: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
  },
  memoText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
    color: '#81868e',
  },
  fee: {
    flexDirection: 'row',
    marginHorizontal: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 14,
  },
  feeRow: {
    minWidth: 40,
    height: 25,
    borderRadius: 4,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  advancedOptions: {
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
  },
});

SendDetails.navigationOptions = navigationStyleTx({}, (options, { theme, navigation, route }) => {
  let headerRight;
  if (route.params.withAdvancedOptionsMenuButton) {
    headerRight = () => (
      <TouchableOpacity
        style={styles.advancedOptions}
        onPress={route.params.advancedOptionsMenuButtonAction}
        testID="advancedOptionsMenuButton"
      >
        <Icon size={22} name="kebab-horizontal" type="octicon" color={theme.colors.foregroundColor} />
      </TouchableOpacity>
    );
  } else {
    headerRight = null;
  }
  return {
    ...options,
    headerRight,
    title: loc.send.header,
  };
});
