import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp, StackActions, useFocusEffect, useRoute } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import * as bitcoin from 'bitcoinjs-lib';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  I18nManager,
  Keyboard,
  LayoutAnimation,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { Icon } from '@rneui/themed';
import RNFS from 'react-native-fs';

import { btcToSatoshi, fiatToBTC } from '../../blue_modules/currency';
import * as fs from '../../blue_modules/fs';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueDismissKeyboardInputAccessory, BlueText } from '../../BlueComponents';
import { HDSegwitBech32Wallet, MultisigHDWallet, WatchOnlyWallet } from '../../class';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { AbstractHDElectrumWallet } from '../../class/wallets/abstract-hd-electrum-wallet';
import AddressInput from '../../components/AddressInput';
import presentAlert from '../../components/Alert';
import AmountInput from '../../components/AmountInput';
import { BottomModalHandle } from '../../components/BottomModal';
import Button from '../../components/Button';
import CoinsSelected from '../../components/CoinsSelected';
import InputAccessoryAllFunds from '../../components/InputAccessoryAllFunds';
import { useTheme } from '../../components/themes';
import ToolTipMenu from '../../components/TooltipMenu';
import { requestCameraAuthorization, scanQrHelper } from '../../helpers/scan-qr';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import NetworkTransactionFees, { NetworkTransactionFee } from '../../models/networkTransactionFees';
import { CreateTransactionTarget, CreateTransactionUtxo, TWallet } from '../../class/wallets/types';
import { TOptions } from 'bip21';
import assert from 'assert';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { ContactList } from '../../class/contact-list';
import { useStorage } from '../../hooks/context/useStorage';
import { Action } from '../../components/types';
import SelectFeeModal from '../../components/SelectFeeModal';

interface IPaymentDestinations {
  address: string; // btc address or payment code
  amountSats?: number | string;
  amount?: string | number | 'MAX';
  key: string; // random id to look up this record
}

interface IFee {
  current: number | null;
  slowFee: number | null;
  mediumFee: number | null;
  fastestFee: number | null;
}
type NavigationProps = NativeStackNavigationProp<SendDetailsStackParamList, 'SendDetails'>;
type RouteProps = RouteProp<SendDetailsStackParamList, 'SendDetails'>;

const SendDetails = () => {
  const { wallets, setSelectedWalletID, sleep, txMetadata, saveToDisk } = useStorage();
  const navigation = useExtendedNavigation<NavigationProps>();
  const setParams = navigation.setParams;
  const route = useRoute<RouteProps>();
  const name = route.name;
  const routeParams = route.params;
  const scrollView = useRef<FlatList<any>>(null);
  const scrollIndex = useRef(0);
  const { colors } = useTheme();
  const popAction = StackActions.pop(1);

  // state
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const [isLoading, setIsLoading] = useState(false);
  const [wallet, setWallet] = useState<TWallet | null>(null);
  const feeModalRef = useRef<BottomModalHandle>(null);
  const [walletSelectionOrCoinsSelectedHidden, setWalletSelectionOrCoinsSelectedHidden] = useState(false);
  const [isAmountToolbarVisibleForAndroid, setIsAmountToolbarVisibleForAndroid] = useState(false);
  const [isTransactionReplaceable, setIsTransactionReplaceable] = useState<boolean | undefined>(false);
  const [addresses, setAddresses] = useState<IPaymentDestinations[]>([]);
  const [units, setUnits] = useState<BitcoinUnit[]>([]);
  const [transactionMemo, setTransactionMemo] = useState<string>('');
  const [networkTransactionFees, setNetworkTransactionFees] = useState(new NetworkTransactionFee(3, 2, 1));
  const [networkTransactionFeesIsLoading, setNetworkTransactionFeesIsLoading] = useState(false);
  const [customFee, setCustomFee] = useState<string | null>(null);
  const [feePrecalc, setFeePrecalc] = useState<IFee>({ current: null, slowFee: null, mediumFee: null, fastestFee: null });
  const [feeUnit, setFeeUnit] = useState<BitcoinUnit>();
  const [amountUnit, setAmountUnit] = useState<BitcoinUnit>();
  const [utxo, setUtxo] = useState<CreateTransactionUtxo[] | null>(null);
  const [frozenBalance, setFrozenBlance] = useState<number>(0);
  const [payjoinUrl, setPayjoinUrl] = useState<string | null>(null);
  const [changeAddress, setChangeAddress] = useState<string | null>(null);
  const [dumb, setDumb] = useState(false);
  const { isEditable } = routeParams;
  // if utxo is limited we use it to calculate available balance
  const balance: number = utxo ? utxo.reduce((prev, curr) => prev + curr.value, 0) : wallet?.getBalance() ?? 0;
  const allBalance = formatBalanceWithoutSuffix(balance, BitcoinUnit.BTC, true);

  // if cutomFee is not set, we need to choose highest possible fee for wallet balance
  // if there are no funds for even Slow option, use 1 sat/vbyte fee
  const feeRate = useMemo(() => {
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

  useEffect(() => {
    console.log('send/details - useEffect');
    if (wallet) {
      setHeaderRightOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors, wallet, isTransactionReplaceable, balance, addresses, isEditable, isLoading]);

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

    const showSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', _keyboardDidShow);
    const hideSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', _keyboardDidHide);
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    // decode route params
    const currentAddress = addresses[scrollIndex.current];
    if (routeParams.uri) {
      try {
        const { address, amount, memo, payjoinUrl: pjUrl } = DeeplinkSchemaMatch.decodeBitcoinUri(routeParams.uri);

        setUnits(u => {
          u[scrollIndex.current] = BitcoinUnit.BTC; // also resetting current unit to BTC
          return [...u];
        });

        setAddresses(addrs => {
          if (currentAddress) {
            currentAddress.address = address;
            if (Number(amount) > 0) {
              currentAddress.amount = amount!;
              currentAddress.amountSats = btcToSatoshi(amount!);
            }
            addrs[scrollIndex.current] = currentAddress;
            return [...addrs];
          } else {
            return [...addrs, { address, amount, amountSats: btcToSatoshi(amount!), key: String(Math.random()) } as IPaymentDestinations];
          }
        });

        if (memo?.trim().length > 0) {
          setTransactionMemo(memo);
        }
        setAmountUnit(BitcoinUnit.BTC);
        setPayjoinUrl(pjUrl);
      } catch (error) {
        console.log(error);
        presentAlert({ title: loc.errors.error, message: loc.send.details_error_decode });
      }
    } else if (routeParams.address) {
      const { amount, amountSats, unit = BitcoinUnit.BTC } = routeParams;
      // @ts-ignore: needs fix
      setAddresses(value => {
        if (currentAddress && currentAddress.address && routeParams.address) {
          currentAddress.address = routeParams.address;
          value[scrollIndex.current] = currentAddress;
          return [...value];
        } else {
          return [...value, { address: routeParams.address, key: String(Math.random()), amount, amountSats }];
        }
      });
      if (routeParams.memo && routeParams.memo?.trim().length > 0) {
        setTransactionMemo(routeParams.memo);
      }
      setUnits(u => {
        u[scrollIndex.current] = unit;
        return [...u];
      });
    } else if (routeParams.addRecipientParams) {
      const index = addresses.length === 0 ? 0 : scrollIndex.current;
      const { address, amount } = routeParams.addRecipientParams;

      setAddresses(prevAddresses => {
        const updatedAddresses = [...prevAddresses];
        if (address) {
          updatedAddresses[index] = {
            ...updatedAddresses[index],
            address,
            amount: amount ?? updatedAddresses[index].amount,
            amountSats: amount ? btcToSatoshi(amount) : updatedAddresses[index].amountSats,
          } as IPaymentDestinations;
        }
        return updatedAddresses;
      });

      // @ts-ignore: Fix later
      setParams(prevParams => ({ ...prevParams, addRecipientParams: undefined }));
    } else {
      setAddresses([{ address: '', key: String(Math.random()) } as IPaymentDestinations]); // key is for the FlatList
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeParams.uri, routeParams.address, routeParams.addRecipientParams]);

  useEffect(() => {
    // check if we have a suitable wallet
    const suitable = wallets.filter(w => w.chain === Chain.ONCHAIN && w.allowSend());
    if (suitable.length === 0) {
      presentAlert({ title: loc.errors.error, message: loc.send.details_wallet_before_tx });
      navigation.goBack();
      return;
    }
    const newWallet = (routeParams.walletID && wallets.find(w => w.getID() === routeParams.walletID)) || suitable[0];
    setWallet(newWallet);
    setFeeUnit(newWallet.getPreferredBalanceUnit());
    setAmountUnit(newWallet.preferredBalanceUnit); // default for whole screen

    // we are ready!
    setIsLoading(false);

    // load cached fees
    AsyncStorage.getItem(NetworkTransactionFee.StorageKey)
      .then(res => {
        if (!res) return;
        const fees = JSON.parse(res);
        if (!fees?.fastestFee) return;
        setNetworkTransactionFees(fees);
      })
      .catch(e => console.log('loading cached recommendedFees error', e));

    // load fresh fees from servers

    setNetworkTransactionFeesIsLoading(true);
    NetworkTransactionFees.recommendedFees()
      .then(async fees => {
        if (!fees?.fastestFee) return;
        setNetworkTransactionFees(fees);
        await AsyncStorage.setItem(NetworkTransactionFee.StorageKey, JSON.stringify(fees));
      })
      .catch(e => console.log('loading recommendedFees error', e))
      .finally(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setNetworkTransactionFeesIsLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // change header and reset state on wallet change
  useEffect(() => {
    if (!wallet) return;
    setSelectedWalletID(wallet.getID());

    // reset other values
    setUtxo(null);
    setChangeAddress(null);
    setIsTransactionReplaceable(wallet.type === HDSegwitBech32Wallet.type && !routeParams.noRbf ? true : undefined);
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
    const requestedSatPerByte = Number(feeRate);
    const lutxo = utxo || wallet.getUtxo();
    let frozen = 0;
    if (!utxo) {
      // if utxo is not limited search for frozen outputs and calc it's balance
      frozen = wallet
        .getUtxo(true)
        .filter(o => !lutxo.some(i => i.txid === o.txid && i.vout === o.vout))
        .reduce((prev, curr) => prev + curr.value, 0);
    }

    const options = [
      { key: 'current', fee: requestedSatPerByte },
      { key: 'slowFee', fee: fees.slowFee },
      { key: 'mediumFee', fee: fees.mediumFee },
      { key: 'fastestFee', fee: fees.fastestFee },
    ];

    const newFeePrecalc: /* Record<string, any> */ IFee = { ...feePrecalc };

    for (const opt of options) {
      let targets = [];
      for (const transaction of addresses) {
        if (transaction.amount === BitcoinUnit.MAX) {
          // single output with MAX
          targets = [{ address: transaction.address }];
          break;
        }
        const value = transaction.amountSats;
        if (Number(value) > 0) {
          targets.push({ address: transaction.address, value });
        } else if (transaction.amount) {
          if (btcToSatoshi(transaction.amount) > 0) {
            targets.push({ address: transaction.address, value: btcToSatoshi(transaction.amount) });
          }
        }
      }

      // if targets is empty, insert dust
      if (targets.length === 0) {
        targets.push({ address: '36JxaUrpDzkEerkTf1FzwHNE1Hb7cCjgJV', value: 546 });
      }

      // replace wrong addresses with dump
      targets = targets.map(t => {
        if (!wallet.isAddressValid(t.address)) {
          return { ...t, address: '36JxaUrpDzkEerkTf1FzwHNE1Hb7cCjgJV' };
        } else {
          return t;
        }
      });

      let flag = false;
      while (true) {
        try {
          const { fee } = wallet.coinselect(lutxo, targets, opt.fee);

          // @ts-ignore options& opt are used only to iterate keys we predefined and we know exist
          newFeePrecalc[opt.key] = fee;
          break;
        } catch (e: any) {
          if (e.message.includes('Not enough') && !flag) {
            flag = true;
            // if we don't have enough funds, construct maximum possible transaction
            targets = targets.map((t, index) => (index > 0 ? { ...t, value: 546 } : { address: t.address }));
            continue;
          }

          // @ts-ignore options& opt are used only to iterate keys we predefined and we know exist
          newFeePrecalc[opt.key] = null;
          break;
        }
      }
    }

    setFeePrecalc(newFeePrecalc);
    setFrozenBlance(frozen);
  }, [wallet, networkTransactionFees, utxo, addresses, feeRate, dumb]); // eslint-disable-line react-hooks/exhaustive-deps

  // we need to re-calculate fees if user opens-closes coin control
  useFocusEffect(
    useCallback(() => {
      setIsLoading(false);
      setDumb(v => !v);
      return () => {
        feeModalRef.current?.dismiss();
      };
    }, []),
  );

  const getChangeAddressAsync = async () => {
    if (changeAddress) return changeAddress; // cache

    let change;
    if (WatchOnlyWallet.type === wallet?.type && !wallet.isHd()) {
      // plain watchonly - just get the address
      change = wallet.getAddress();
    } else {
      // otherwise, lets call widely-used getChangeAddressAsync()
      try {
        change = await Promise.race([sleep(2000), wallet?.getChangeAddressAsync()]);
      } catch (_) {}

      if (!change) {
        // either sleep expired or getChangeAddressAsync threw an exception
        if (wallet instanceof AbstractHDElectrumWallet) {
          change = wallet._getInternalAddressByIndex(wallet.getNextFreeChangeAddressIndex());
        } else {
          // legacy wallets
          change = wallet?.getAddress();
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

  const processAddressData = (data: string | { data?: any }) => {
    assert(wallet, 'Internal error: wallet not set');
    if (typeof data !== 'string') {
      data = String(data.data);
    }
    const currentIndex = scrollIndex.current;
    setIsLoading(true);
    if (!data.replace) {
      // user probably scanned PSBT and got an object instead of string..?
      setIsLoading(false);
      return presentAlert({ title: loc.errors.error, message: loc.send.details_address_field_is_not_valid });
    }

    const cl = new ContactList();

    const dataWithoutSchema = data.replace('bitcoin:', '').replace('BITCOIN:', '');
    if (wallet.isAddressValid(dataWithoutSchema) || cl.isPaymentCodeValid(dataWithoutSchema)) {
      setAddresses(addrs => {
        addrs[scrollIndex.current].address = dataWithoutSchema;
        return [...addrs];
      });
      setIsLoading(false);
      setTimeout(() => scrollView.current?.scrollToIndex({ index: currentIndex, animated: false }), 50);
      return;
    }

    let address = '';
    let options: TOptions;
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
    if (wallet.isAddressValid(address)) {
      setAddresses(addrs => {
        addrs[scrollIndex.current].address = address;
        addrs[scrollIndex.current].amount = options?.amount ?? 0;
        addrs[scrollIndex.current].amountSats = new BigNumber(options?.amount ?? 0).multipliedBy(100000000).toNumber();
        return [...addrs];
      });
      setUnits(u => {
        u[scrollIndex.current] = BitcoinUnit.BTC; // also resetting current unit to BTC
        return [...u];
      });
      setTransactionMemo(options.label || ''); // there used to be `options.message` here as well. bug?
      setAmountUnit(BitcoinUnit.BTC);
      setPayjoinUrl(options.pj || '');
      // RN Bug: contentOffset gets reset to 0 when state changes. Remove code once this bug is resolved.
      setTimeout(() => scrollView.current?.scrollToIndex({ index: currentIndex, animated: false }), 50);
    }

    setIsLoading(false);
  };

  const createTransaction = async () => {
    assert(wallet, 'Internal error: wallet is not set');
    Keyboard.dismiss();
    setIsLoading(true);
    const requestedSatPerByte = feeRate;
    for (const [index, transaction] of addresses.entries()) {
      let error;
      if (!transaction.amount || Number(transaction.amount) < 0 || parseFloat(String(transaction.amount)) === 0) {
        error = loc.send.details_amount_field_is_not_valid;
        console.log('validation error');
      } else if (parseFloat(String(transaction.amountSats)) <= 500) {
        error = loc.send.details_amount_field_is_less_than_minimum_amount_sat;
        console.log('validation error');
      } else if (!requestedSatPerByte || parseFloat(requestedSatPerByte) < 1) {
        error = loc.send.details_fee_field_is_not_valid;
        console.log('validation error');
      } else if (!transaction.address) {
        error = loc.send.details_address_field_is_not_valid;
        console.log('validation error');
      } else if (balance - Number(transaction.amountSats) < 0) {
        // first sanity check is that sending amount is not bigger than available balance
        error = frozenBalance > 0 ? loc.send.details_total_exceeds_balance_frozen : loc.send.details_total_exceeds_balance;
        console.log('validation error');
      } else if (transaction.address) {
        const address = transaction.address.trim().toLowerCase();
        if (address.startsWith('lnb') || address.startsWith('lightning:lnb')) {
          error = loc.send.provided_address_is_invoice;
          console.log('validation error');
        }
      }

      if (!error) {
        const cl = new ContactList();
        if (!wallet.isAddressValid(transaction.address) && !cl.isPaymentCodeValid(transaction.address)) {
          console.log('validation error');
          error = loc.send.details_address_field_is_not_valid;
        }
      }

      // validating payment codes, if any
      if (!error) {
        if (transaction.address.startsWith('sp1')) {
          if (!wallet.allowSilentPaymentSend()) {
            console.log('validation error');
            error = loc.send.cant_send_to_silentpayment_adress;
          }
        }

        if (transaction.address.startsWith('PM')) {
          if (!wallet.allowBIP47()) {
            console.log('validation error');
            error = loc.send.cant_send_to_bip47;
          } else if (!(wallet as unknown as AbstractHDElectrumWallet).getBIP47NotificationTransaction(transaction.address)) {
            console.log('validation error');
            error = loc.send.cant_find_bip47_notification;
          } else {
            // BIP47 is allowed, notif tx is in place, lets sync joint addresses with the receiver
            await (wallet as unknown as AbstractHDElectrumWallet).syncBip47ReceiversAddresses(transaction.address);
          }
        }
      }

      if (error) {
        scrollView.current?.scrollToIndex({ index });
        setIsLoading(false);
        presentAlert({ title: loc.errors.error, message: error });
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        return;
      }
    }

    try {
      await createPsbtTransaction();
    } catch (Err: any) {
      setIsLoading(false);
      presentAlert({ title: loc.errors.error, message: Err.message });
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
    }
  };

  const createPsbtTransaction = async () => {
    if (!wallet) return;
    const change = await getChangeAddressAsync();
    assert(change, 'Could not get change address');
    const requestedSatPerByte = Number(feeRate);
    const lutxo: CreateTransactionUtxo[] = utxo || (wallet?.getUtxo() ?? []);
    console.log({ requestedSatPerByte, lutxo: lutxo.length });

    const targets: CreateTransactionTarget[] = [];
    for (const transaction of addresses) {
      if (transaction.amount === BitcoinUnit.MAX) {
        // output with MAX
        targets.push({ address: transaction.address });
        continue;
      }
      const value = parseInt(String(transaction.amountSats), 10);
      if (value > 0) {
        targets.push({ address: transaction.address, value });
      } else if (transaction.amount) {
        if (btcToSatoshi(transaction.amount) > 0) {
          targets.push({ address: transaction.address, value: btcToSatoshi(transaction.amount) });
        }
      }
    }

    const targetsOrig = JSON.parse(JSON.stringify(targets));
    // preserving original since it will be mutated

    // without forcing `HDSegwitBech32Wallet` i had a weird ts error, complaining about last argument (fp)
    const { tx, outputs, psbt, fee } = (wallet as HDSegwitBech32Wallet)?.createTransaction(
      lutxo,
      targets,
      requestedSatPerByte,
      change,
      isTransactionReplaceable ? HDSegwitBech32Wallet.defaultRBFSequence : HDSegwitBech32Wallet.finalRBFSequence,
      false,
      0,
    );

    if (tx && routeParams.launchedBy && psbt) {
      console.warn('navigating back to ', routeParams.launchedBy);
      feeModalRef.current?.dismiss();

      // @ts-ignore idk how to fix FIXME?

      navigation.navigate(routeParams.launchedBy, { psbt });
    }

    if (wallet?.type === WatchOnlyWallet.type) {
      feeModalRef.current?.dismiss();

      // watch-only wallets with enabled HW wallet support have different flow. we have to show PSBT to user as QR code
      // so he can scan it and sign it. then we have to scan it back from user (via camera and QR code), and ask
      // user whether he wants to broadcast it
      navigation.navigate('PsbtWithHardwareWallet', {
        memo: transactionMemo,
        fromWallet: wallet,
        psbt,
        launchedBy: routeParams.launchedBy,
      });
      setIsLoading(false);
      return;
    }

    if (wallet?.type === MultisigHDWallet.type) {
      feeModalRef.current?.dismiss();

      navigation.navigate('PsbtMultisig', {
        memo: transactionMemo,
        psbtBase64: psbt.toBase64(),
        walletID: wallet.getID(),
        launchedBy: routeParams.launchedBy,
      });
      setIsLoading(false);
      return;
    }

    assert(tx, 'createTRansaction failed');

    txMetadata[tx.getId()] = {
      memo: transactionMemo,
    };
    await saveToDisk();

    let recipients = outputs.filter(({ address }) => address !== change);

    if (recipients.length === 0) {
      // special case. maybe the only destination in this transaction is our own change address..?
      // (ez can be the case for single-address wallet when doing self-payment for consolidation)
      recipients = outputs;
    }
    feeModalRef.current?.dismiss();

    navigation.navigate('Confirm', {
      fee: new BigNumber(fee).dividedBy(100000000).toNumber(),
      memo: transactionMemo,
      walletID: wallet.getID(),
      tx: tx.toHex(),
      targets: targetsOrig,
      recipients,
      satoshiPerByte: requestedSatPerByte,
      payjoinUrl,
      psbt,
    });
    setIsLoading(false);
  };

  useEffect(() => {
    const newWallet = wallets.find(w => w.getID() === routeParams.walletID);
    if (newWallet) {
      setWallet(newWallet);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeParams.walletID]);

  /**
   * same as `importTransaction`, but opens camera instead.
   *
   * @returns {Promise<void>}
   */
  const importQrTransaction = () => {
    if (wallet?.type !== WatchOnlyWallet.type) {
      return presentAlert({ title: loc.errors.error, message: 'Importing transaction in non-watchonly wallet (this should never happen)' });
    }

    requestCameraAuthorization().then(() => {
      feeModalRef.current?.dismiss();

      navigation.navigate('ScanQRCodeRoot', {
        screen: 'ScanQRCode',
        params: {
          onBarScanned: importQrTransactionOnBarScanned,
          showFileImportButton: false,
        },
      });
    });
  };

  const importQrTransactionOnBarScanned = (ret: any) => {
    navigation.getParent()?.getParent()?.dispatch(popAction);
    if (!wallet) return;
    if (!ret.data) ret = { data: ret };
    if (ret.data.toUpperCase().startsWith('UR')) {
      presentAlert({ title: loc.errors.error, message: 'BC-UR not decoded. This should never happen' });
    } else if (ret.data.indexOf('+') === -1 && ret.data.indexOf('=') === -1 && ret.data.indexOf('=') === -1) {
      // this looks like NOT base64, so maybe its transaction's hex
      // we dont support it in this flow
    } else {
      feeModalRef.current?.dismiss();

      // psbt base64?

      // we construct PSBT object and pass to next screen
      // so user can do smth with it:
      const psbt = bitcoin.Psbt.fromBase64(ret.data);

      navigation.navigate('PsbtWithHardwareWallet', {
        memo: transactionMemo,
        fromWallet: wallet,
        psbt,
      });
      setIsLoading(false);
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
    if (wallet?.type !== WatchOnlyWallet.type) {
      return presentAlert({ title: loc.errors.error, message: 'Importing transaction in non-watchonly wallet (this should never happen)' });
    }

    try {
      const res = await DocumentPicker.pickSingle({
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
        navigation.navigate('PsbtWithHardwareWallet', { memo: transactionMemo, fromWallet: wallet, txhex });
        setIsLoading(false);

        return;
      }

      if (DeeplinkSchemaMatch.isPossiblyPSBTFile(res.uri)) {
        // looks like transaction is UNsigned, so we construct PSBT object and pass to next screen
        // so user can do smth with it:
        const file = await RNFS.readFile(res.uri, 'ascii');
        const psbt = bitcoin.Psbt.fromBase64(file);
        navigation.navigate('PsbtWithHardwareWallet', { memo: transactionMemo, fromWallet: wallet, psbt });
        setIsLoading(false);

        return;
      }

      if (DeeplinkSchemaMatch.isTXNFile(res.uri)) {
        // plain text file with txhex ready to broadcast
        const file = (await RNFS.readFile(res.uri, 'ascii')).replace('\n', '').replace('\r', '');
        navigation.navigate('PsbtWithHardwareWallet', { memo: transactionMemo, fromWallet: wallet, txhex: file });
        setIsLoading(false);

        return;
      }

      presentAlert({ title: loc.errors.error, message: loc.send.details_unrecognized_file_format });
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        presentAlert({ title: loc.errors.error, message: loc.send.details_no_signed_tx });
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

  const _importTransactionMultisig = async (base64arg: string | false) => {
    try {
      const base64 = base64arg || (await fs.openSignedTransaction());
      if (!base64) return;
      const psbt = bitcoin.Psbt.fromBase64(base64); // if it doesnt throw - all good, its valid

      if ((wallet as MultisigHDWallet)?.howManySignaturesCanWeMake() > 0 && (await askCosignThisTransaction())) {
        setIsLoading(true);
        await sleep(100);
        (wallet as MultisigHDWallet).cosignPsbt(psbt);
        setIsLoading(false);
        await sleep(100);
      }

      if (wallet) {
        navigation.navigate('PsbtMultisig', {
          memo: transactionMemo,
          psbtBase64: psbt.toBase64(),
          walletID: wallet.getID(),
        });
      }
    } catch (error: any) {
      presentAlert({ title: loc.send.problem_with_psbt, message: error.message });
    }
    setIsLoading(false);
  };

  const importTransactionMultisig = () => {
    return _importTransactionMultisig(false);
  };

  const onBarScanned = (ret: any) => {
    navigation.getParent()?.dispatch(popAction);
    if (!ret.data) ret = { data: ret };
    if (ret.data.toUpperCase().startsWith('UR')) {
      presentAlert({ title: loc.errors.error, message: 'BC-UR not decoded. This should never happen' });
    } else if (ret.data.indexOf('+') === -1 && ret.data.indexOf('=') === -1 && ret.data.indexOf('=') === -1) {
      // this looks like NOT base64, so maybe its transaction's hex
      // we dont support it in this flow
    } else {
      // psbt base64?
      return _importTransactionMultisig(ret.data);
    }
  };

  const importTransactionMultisigScanQr = async () => {
    await requestCameraAuthorization().then(() => {
      navigation.navigate('ScanQRCodeRoot', {
        screen: 'ScanQRCode',
        params: {
          onBarScanned,
          showFileImportButton: true,
        },
      });
    });
  };

  const handleAddRecipient = () => {
    setAddresses(prevAddresses => [...prevAddresses, { address: '', key: String(Math.random()) } as IPaymentDestinations]);

    // Wait for the state to update before scrolling
    setTimeout(() => {
      scrollIndex.current = addresses.length; // New index is at the end of the list
      scrollView.current?.scrollToIndex({
        index: scrollIndex.current,
        animated: true,
      });
    }, 0);
  };

  const handleRemoveRecipient = () => {
    if (addresses.length > 1) {
      const newAddresses = [...addresses];
      newAddresses.splice(scrollIndex.current, 1);

      // Adjust the current index if the last item was removed
      const newIndex = scrollIndex.current >= newAddresses.length ? newAddresses.length - 1 : scrollIndex.current;

      setAddresses(newAddresses);

      // Wait for the state to update before scrolling
      setTimeout(() => {
        scrollView.current?.scrollToIndex({
          index: newIndex,
          animated: true,
        });
      }, 0);

      // Update the scroll index reference
      scrollIndex.current = newIndex;
    }
  };

  const handleCoinControl = async () => {
    if (!wallet) return;
    navigation.navigate('CoinControl', {
      walletID: wallet?.getID(),
      onUTXOChoose: (u: CreateTransactionUtxo[]) => setUtxo(u),
    });
  };

  const handleInsertContact = async () => {
    if (!wallet) return;
    navigation.navigate('PaymentCodeList', { walletID: wallet.getID() });
  };

  const handlePsbtSign = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 100)); // sleep for animations

    const scannedData = await scanQrHelper(name, true, undefined);
    if (!scannedData) return setIsLoading(false);

    let tx;
    let psbt;
    try {
      psbt = bitcoin.Psbt.fromBase64(scannedData);
      tx = (wallet as MultisigHDWallet).cosignPsbt(psbt).tx;
    } catch (e: any) {
      presentAlert({ title: loc.errors.error, message: e.message });
      return;
    } finally {
      setIsLoading(false);
    }

    if (!tx || !wallet) return setIsLoading(false);

    // we need to remove change address from recipients, so that Confirm screen show more accurate info
    const changeAddresses: string[] = [];
    // @ts-ignore hacky
    for (let c = 0; c < wallet.next_free_change_address_index + wallet.gap_limit; c++) {
      // @ts-ignore hacky
      changeAddresses.push(wallet._getInternalAddressByIndex(c));
    }
    const recipients = psbt.txOutputs.filter(({ address }) => !changeAddresses.includes(String(address)));

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

  // Header Right Button

  const headerRightOnPress = (id: string) => {
    if (id === SendDetails.actionKeys.AddRecipient) {
      handleAddRecipient();
    } else if (id === SendDetails.actionKeys.RemoveRecipient) {
      handleRemoveRecipient();
    } else if (id === SendDetails.actionKeys.SignPSBT) {
      handlePsbtSign();
    } else if (id === SendDetails.actionKeys.SendMax) {
      onUseAllPressed();
    } else if (id === SendDetails.actionKeys.AllowRBF) {
      onReplaceableFeeSwitchValueChanged(!isTransactionReplaceable);
    } else if (id === SendDetails.actionKeys.ImportTransaction) {
      importTransaction();
    } else if (id === SendDetails.actionKeys.ImportTransactionQR) {
      importQrTransaction();
    } else if (id === SendDetails.actionKeys.ImportTransactionMultsig) {
      importTransactionMultisig();
    } else if (id === SendDetails.actionKeys.CoSignTransaction) {
      importTransactionMultisigScanQr();
    } else if (id === SendDetails.actionKeys.CoinControl) {
      handleCoinControl();
    } else if (id === SendDetails.actionKeys.InsertContact) {
      handleInsertContact();
    }
  };

  const headerRightActions = () => {
    const actions: Action[] & Action[][] = [];
    if (isEditable) {
      if (wallet?.allowBIP47() && wallet?.isBIP47Enabled()) {
        actions.push([
          { id: SendDetails.actionKeys.InsertContact, text: loc.send.details_insert_contact, icon: SendDetails.actionIcons.InsertContact },
        ]);
      }

      if (Number(wallet?.getBalance()) > 0) {
        const isSendMaxUsed = addresses.some(element => element.amount === BitcoinUnit.MAX);

        actions.push([{ id: SendDetails.actionKeys.SendMax, text: loc.send.details_adv_full, disabled: balance === 0 || isSendMaxUsed }]);
      }
      if (wallet?.type === HDSegwitBech32Wallet.type && isTransactionReplaceable !== undefined) {
        actions.push([{ id: SendDetails.actionKeys.AllowRBF, text: loc.send.details_adv_fee_bump, menuState: !!isTransactionReplaceable }]);
      }
      const transactionActions = [];
      if (wallet?.type === WatchOnlyWallet.type && wallet.isHd()) {
        transactionActions.push(
          {
            id: SendDetails.actionKeys.ImportTransaction,
            text: loc.send.details_adv_import,
            icon: SendDetails.actionIcons.ImportTransaction,
          },
          {
            id: SendDetails.actionKeys.ImportTransactionQR,
            text: loc.send.details_adv_import_qr,
            icon: SendDetails.actionIcons.ImportTransactionQR,
          },
        );
      }
      if (wallet?.type === MultisigHDWallet.type) {
        transactionActions.push({
          id: SendDetails.actionKeys.ImportTransactionMultsig,
          text: loc.send.details_adv_import,
          icon: SendDetails.actionIcons.ImportTransactionMultsig,
        });
      }
      if (wallet?.type === MultisigHDWallet.type && wallet.howManySignaturesCanWeMake() > 0) {
        transactionActions.push({
          id: SendDetails.actionKeys.CoSignTransaction,
          text: loc.multisig.co_sign_transaction,
          icon: SendDetails.actionIcons.SignPSBT,
        });
      }
      if ((wallet as MultisigHDWallet)?.allowCosignPsbt()) {
        transactionActions.push({ id: SendDetails.actionKeys.SignPSBT, text: loc.send.psbt_sign, icon: SendDetails.actionIcons.SignPSBT });
      }
      actions.push(transactionActions, [
        {
          id: SendDetails.actionKeys.AddRecipient,
          text: loc.send.details_add_rec_add,
          icon: SendDetails.actionIcons.AddRecipient,
        },
        {
          id: SendDetails.actionKeys.RemoveRecipient,
          text: loc.send.details_add_rec_rem,
          disabled: addresses.length < 2,
          icon: SendDetails.actionIcons.RemoveRecipient,
        },
      ]);
    }

    actions.push({ id: SendDetails.actionKeys.CoinControl, text: loc.cc.header, icon: SendDetails.actionIcons.CoinControl });

    return actions;
  };

  const setHeaderRightOptions = () => {
    navigation.setOptions({
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <ToolTipMenu
          disabled={isLoading}
          isButton
          isMenuPrimaryAction
          onPressMenuItem={headerRightOnPress}
          actions={headerRightActions()}
          testID="advancedOptionsMenuButton"
        >
          <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} style={styles.advancedOptions} />
        </ToolTipMenu>
      ),
    });
  };

  const onReplaceableFeeSwitchValueChanged = (value: boolean) => {
    setIsTransactionReplaceable(value);
  };

  const handleRecipientsScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = e.nativeEvent.contentOffset;
    const viewSize = e.nativeEvent.layoutMeasurement;
    const index = Math.floor(contentOffset.x / viewSize.width);
    scrollIndex.current = index;
  };

  const onUseAllPressed = () => {
    triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
    const message = frozenBalance > 0 ? loc.send.details_adv_full_sure_frozen : loc.send.details_adv_full_sure;
    Alert.alert(
      loc.send.details_adv_full,
      message,
      [
        {
          text: loc._.ok,
          onPress: () => {
            Keyboard.dismiss();
            setAddresses(addrs => {
              addrs[scrollIndex.current].amount = BitcoinUnit.MAX;
              addrs[scrollIndex.current].amountSats = BitcoinUnit.MAX;
              return [...addrs];
            });
            setUnits(u => {
              u[scrollIndex.current] = BitcoinUnit.BTC;
              return [...u];
            });
          },
          style: 'default',
        },
        {
          text: loc._.cancel,
          onPress: () => {},
          style: 'cancel',
        },
      ],
      { cancelable: false },
    );
  };

  const formatFee = (fee: number) => formatBalance(fee, feeUnit!, true);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
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

  const calculateTotalAmount = () => {
    const totalAmount = addresses.reduce((total, item) => total + Number(item.amountSats || 0), 0);
    const totalWithFee = totalAmount + (feePrecalc.current || 0);
    return totalWithFee;
  };

  const renderCreateButton = () => {
    const totalWithFee = calculateTotalAmount();
    const isDisabled = totalWithFee === 0 || totalWithFee > balance || balance === 0 || isLoading || addresses.length === 0;

    return (
      <View style={styles.createButton}>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <Button onPress={createTransaction} disabled={isDisabled} title={loc.send.details_next} testID="CreateTransactionButton" />
        )}
      </View>
    );
  };

  const renderWalletSelectionOrCoinsSelected = () => {
    if (walletSelectionOrCoinsSelectedHidden) return null;
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
        {!isLoading && isEditable && (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.selectTouch}
            onPress={() => {
              feeModalRef.current?.dismiss();

              navigation.navigate('SelectWallet', { chainType: Chain.ONCHAIN });
            }}
          >
            <Text style={styles.selectText}>{loc.wallets.select_wallet.toLowerCase()}</Text>
            <Icon name={I18nManager.isRTL ? 'angle-left' : 'angle-right'} size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={styles.selectWrap}>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.selectTouch}
            onPress={() => {
              navigation.navigate('SelectWallet', { chainType: Chain.ONCHAIN });
            }}
            disabled={!isEditable || isLoading}
          >
            <Text style={[styles.selectLabel, stylesHook.selectLabel]}>{wallet?.getLabel()}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderBitcoinTransactionInfoFields = (params: { item: IPaymentDestinations; index: number }) => {
    const { item, index } = params;
    return (
      <View style={{ width }} testID={'Transaction' + index}>
        <AmountInput
          isLoading={isLoading}
          amount={item.amount ? item.amount.toString() : null}
          onAmountUnitChange={(unit: BitcoinUnit) => {
            setAddresses(addrs => {
              const addr = addrs[index];

              switch (unit) {
                case BitcoinUnit.SATS:
                  addr.amountSats = parseInt(String(addr.amount), 10);
                  break;
                case BitcoinUnit.BTC:
                  addr.amountSats = btcToSatoshi(String(addr.amount));
                  break;
                case BitcoinUnit.LOCAL_CURRENCY:
                  // also accounting for cached fiat->sat conversion to avoid rounding error
                  addr.amountSats = AmountInput.getCachedSatoshis(addr.amount) || btcToSatoshi(fiatToBTC(Number(addr.amount)));
                  break;
              }

              addrs[index] = addr;
              return [...addrs];
            });
            setUnits(u => {
              u[index] = unit;
              return [...u];
            });
          }}
          onChangeText={(text: string) => {
            setAddresses(addrs => {
              item.amount = text;
              switch (units[index] || amountUnit) {
                case BitcoinUnit.BTC:
                  item.amountSats = btcToSatoshi(item.amount);
                  break;
                case BitcoinUnit.LOCAL_CURRENCY:
                  item.amountSats = btcToSatoshi(fiatToBTC(Number(item.amount)));
                  break;
                case BitcoinUnit.SATS:
                default:
                  item.amountSats = parseInt(text, 10);
                  break;
              }
              addrs[index] = item;
              return [...addrs];
            });
          }}
          unit={units[index] || amountUnit}
          editable={isEditable}
          disabled={!isEditable}
          inputAccessoryViewID={InputAccessoryAllFunds.InputAccessoryViewID}
        />

        {frozenBalance > 0 && (
          <TouchableOpacity accessibilityRole="button" style={styles.frozenContainer} onPress={handleCoinControl}>
            <BlueText>
              {loc.formatString(loc.send.details_frozen, { amount: formatBalanceWithoutSuffix(frozenBalance, BitcoinUnit.BTC, true) })}
            </BlueText>
          </TouchableOpacity>
        )}

        <AddressInput
          onChangeText={text => {
            text = text.trim();
            const { address, amount, memo, payjoinUrl: pjUrl } = DeeplinkSchemaMatch.decodeBitcoinUri(text);
            setAddresses(addrs => {
              item.address = address || text;
              item.amount = amount || item.amount;
              addrs[index] = item;
              return [...addrs];
            });
            setTransactionMemo(memo || transactionMemo);
            setIsLoading(false);
            setPayjoinUrl(pjUrl);
          }}
          onBarScanned={processAddressData}
          address={item.address}
          isLoading={isLoading}
          /* @ts-ignore marcos fixme */
          inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
          launchedBy={name}
          editable={isEditable}
        />
        {addresses.length > 1 && (
          <Text style={[styles.of, stylesHook.of]}>{loc.formatString(loc._.of, { number: index + 1, total: addresses.length })}</Text>
        )}
      </View>
    );
  };

  const getItemLayout = (_: any, index: number) => ({
    length: width,
    offset: width * index,
    index,
  });

  return (
    <View style={[styles.root, stylesHook.root]} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      <View>
        <FlatList
          keyboardShouldPersistTaps="always"
          scrollEnabled={addresses.length > 1}
          data={addresses}
          renderItem={renderBitcoinTransactionInfoFields}
          horizontal
          ref={scrollView}
          automaticallyAdjustKeyboardInsets
          pagingEnabled
          removeClippedSubviews={false}
          onMomentumScrollBegin={Keyboard.dismiss}
          onScroll={handleRecipientsScroll}
          scrollEventThrottle={16}
          scrollIndicatorInsets={styles.scrollViewIndicator}
          contentContainerStyle={styles.scrollViewContent}
          getItemLayout={getItemLayout}
        />
        <View style={[styles.memo, stylesHook.memo]}>
          <TextInput
            onChangeText={setTransactionMemo}
            placeholder={loc.send.details_note_placeholder}
            placeholderTextColor="#81868e"
            value={transactionMemo}
            numberOfLines={1}
            style={styles.memoText}
            editable={!isLoading}
            onSubmitEditing={Keyboard.dismiss}
            /* @ts-ignore marcos fixme */
            inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
          />
        </View>
        <TouchableOpacity
          testID="chooseFee"
          accessibilityRole="button"
          onPress={() => feeModalRef.current?.present()}
          disabled={isLoading}
          style={styles.fee}
        >
          <Text style={[styles.feeLabel, stylesHook.feeLabel]}>{loc.send.create_fee}</Text>

          {networkTransactionFeesIsLoading ? (
            <ActivityIndicator />
          ) : (
            <View style={[styles.feeRow, stylesHook.feeRow]}>
              <Text style={stylesHook.feeValue}>
                {feePrecalc.current ? formatFee(feePrecalc.current) : feeRate + ' ' + loc.units.sat_vbyte}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {renderCreateButton()}
        <SelectFeeModal
          ref={feeModalRef}
          networkTransactionFees={networkTransactionFees}
          feePrecalc={feePrecalc}
          feeRate={feeRate}
          setCustomFee={setCustomFee}
          setFeePrecalc={setFeePrecalc}
          feeUnit={feeUnit || BitcoinUnit.BTC}
        />
      </View>
      <BlueDismissKeyboardInputAccessory />
      {Platform.select({
        ios: <InputAccessoryAllFunds canUseAll={balance > 0} onUseAllPressed={onUseAllPressed} balance={String(allBalance)} />,
        android: isAmountToolbarVisibleForAndroid && (
          <InputAccessoryAllFunds canUseAll={balance > 0} onUseAllPressed={onUseAllPressed} balance={String(allBalance)} />
        ),
      })}

      {renderWalletSelectionOrCoinsSelected()}
    </View>
  );
};

export default SendDetails;

SendDetails.actionKeys = {
  InsertContact: 'InsertContact',
  SignPSBT: 'SignPSBT',
  SendMax: 'SendMax',
  AddRecipient: 'AddRecipient',
  RemoveRecipient: 'RemoveRecipient',
  AllowRBF: 'AllowRBF',
  ImportTransaction: 'ImportTransaction',
  ImportTransactionMultsig: 'ImportTransactionMultisig',
  ImportTransactionQR: 'ImportTransactionQR',
  CoinControl: 'CoinControl',
  CoSignTransaction: 'CoSignTransaction',
};

SendDetails.actionIcons = {
  InsertContact: { iconValue: 'at.badge.plus' },
  SignPSBT: { iconValue: 'signature' },
  SendMax: 'SendMax',
  AddRecipient: { iconValue: 'person.badge.plus' },
  RemoveRecipient: { iconValue: 'person.badge.minus' },
  AllowRBF: 'AllowRBF',
  ImportTransaction: { iconValue: 'square.and.arrow.down' },
  ImportTransactionMultsig: { iconValue: 'square.and.arrow.down.on.square' },
  ImportTransactionQR: { iconValue: 'qrcode.viewfinder' },
  CoinControl: { iconValue: 'switch.2' },
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollViewContent: {
    flexDirection: 'row',
  },
  scrollViewIndicator: {
    top: 0,
    left: 8,
    bottom: 0,
    right: 8,
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
  frozenContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
});
