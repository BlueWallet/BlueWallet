import React, { useMemo, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation, RouteProp, StackActions, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { sha256 } from '@noble/hashes/sha256';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { satoshiToLocalCurrency } from '../../blue_modules/currency';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { ContactList } from '../../class/contact-list';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import ToolTipMenu from '../../components/TooltipMenu';
import { Action } from '../../components/types';
import confirm from '../../helpers/confirm';
import prompt from '../../helpers/prompt';
import loc, { formatBalance } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import SafeArea from '../../components/SafeArea';
import { useStorage, useWallet } from '../../hooks/context/useStorage';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { BlueLoading } from '../../components/BlueLoading';
import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';
import {
  findWalletTransactionByOutputAddress,
  queryWalletUtxos,
  utxoRowToUtxo,
  utxoToCreateTransactionInput,
} from '../../blue_modules/realm/appDataRepository';
import { useCounterpartyMetadata, useSetTransactionMemo } from '../../hooks/useRealmMetadata';
import { useAppDataRealm } from '../../blue_modules/realm/AppDataRealmProvider';

interface DataSection {
  title: string;
  data: string[];
}

enum Actions {
  pay,
  rename,
  copyToClipboard,
  hide,
}

const actionKeys: Action[] = [
  {
    id: Actions.pay,
    text: loc.bip47.pay_this_contact,
    icon: {
      iconValue: 'paperplane',
    },
  },
  {
    id: Actions.rename,
    text: loc.bip47.rename_contact,
    icon: {
      iconValue: 'pencil',
    },
  },
  {
    id: Actions.copyToClipboard,
    text: loc.bip47.copy_payment_code,
    icon: {
      iconValue: 'doc.on.doc',
    },
  },
  {
    id: Actions.hide,
    text: loc.bip47.hide_contact,
    icon: {
      iconValue: 'eye.slash',
    },
  },
];

type PaymentCodeListRouteProp = RouteProp<DetailViewStackParamList, 'PaymentCodeList'>;
type PaymentCodesListNavigationProp = NativeStackNavigationProp<DetailViewStackParamList, 'PaymentCodeList'>;

export default function PaymentCodesList() {
  const navigation = useNavigation<PaymentCodesListNavigationProp>();
  const route = useRoute<PaymentCodeListRouteProp>();
  const { walletID } = route.params;
  const { saveToDisk, fetchWalletUtxos, fetchAndSaveWalletTransactions } = useStorage();
  const foundWallet = useWallet(walletID) as unknown as HDSegwitBech32Wallet;
  const realm = useAppDataRealm();
  const { metadata: counterpartyMetadata, setCounterparty } = useCounterpartyMetadata();
  const setTransactionMemo = useSetTransactionMemo();
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('Loading...');
  const state = navigation.getState();
  const previousRouteIndex = state.index - 1;

  let previousRouteName: string | null;
  if (previousRouteIndex >= 0) {
    previousRouteName = state.routes[previousRouteIndex].name;
  }

  const data: DataSection[] = [
    {
      title: '',
      data: Array.from(new Set(foundWallet.getBIP47SenderPaymentCodes().concat(foundWallet.getBIP47ReceiverPaymentCodes()))),
    },
  ];

  const toolTipActions = useMemo(() => actionKeys, []);

  const shortenContactName = (name: string): string => {
    if (name.length < 20) return name;
    return name.substr(0, 10) + '...' + name.substr(name.length - 10, 10);
  };

  const onToolTipPress = async (id: any, pc: string) => {
    try {
      setIsLoading(true);
      await _onToolTipPress(id, pc);
    } catch (error: any) {
      presentAlert({ message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const _onToolTipPress = async (id: any, pc: string) => {
    switch (String(id)) {
      case String(Actions.copyToClipboard): {
        Clipboard.setString(pc);
        break;
      }
      case String(Actions.rename): {
        const newName = await prompt(loc.bip47.rename, loc.bip47.provide_name, {
          type: 'plain-text',
        });
        if (!newName) return;

        await setCounterparty(pc, { label: newName });
        break;
      }
      case String(Actions.pay): {
        const cl = new ContactList();
        // ok its a SilentPayments code/regular address, no need to check for notif tx, ok to just send
        if (cl.isBip352PaymentCodeValid(pc) || cl.isAddressValid(pc)) {
          _navigateToSend(pc);
          return;
        }
        // check if notif tx is in place and has confirmations
        const notificationAddress = foundWallet.getBIP47NotificationAddressForPaymentCode(pc);
        const notifTx = findWalletTransactionByOutputAddress(realm, walletID, notificationAddress);
        if (!notifTx) {
          await _addContact(pc);
          return;
        }
        if (!notifTx.confirmations) {
          // when we just sent the confirmation tx and it havent confirmed yet
          presentAlert({ message: loc.bip47.notification_tx_unconfirmed });
          return;
        }
        _navigateToSend(pc);
        break;
      }
      case String(Actions.hide): {
        if (!(await confirm(loc.wallets.details_are_you_sure))) {
          return;
        }
        await setCounterparty(pc, {
          label: counterpartyMetadata[pc]?.label ?? pc,
          hidden: true,
        });
        break;
      }
      default:
        break;
    }
  };

  const _navigateToSend = (pc: string) => {
    const previousRoute = state.routes[state.routes.length - 2];

    if (previousRoute.name === ('SendDetails' as string)) {
      const popToAction = StackActions.popTo('SendDetails', {
        walletID,
        addRecipientParams: {
          address: pc,
        },
        merge: true,
      });
      navigation.dispatch(popToAction);
    } else {
      navigation.navigate('SendDetailsRoot', {
        paymentCode: pc,
        walletID,
      });
    }
  };

  const renderItem = (pc: string, index: number) => {
    if (counterpartyMetadata?.[pc]?.hidden) return null; // hidden contact, do not render

    const color = uint8ArrayToHex(sha256(pc)).substring(0, 6);

    const displayName = shortenContactName(counterpartyMetadata?.[pc]?.label || pc);

    if (previousRouteName === 'SendDetails') {
      return (
        <TouchableOpacity onPress={() => onToolTipPress(Actions.pay, pc)}>
          <View style={styles.contactRowContainer}>
            <View style={[styles.circle, { backgroundColor: '#' + color }]} />
            <View style={styles.contactRowBody}>
              <Text testID={`ContactListItem${index}`} style={[styles.contactRowNameText, { color: colors.labelText }]}>
                {displayName}
              </Text>
            </View>
          </View>
          <View style={styles.stick} />
        </TouchableOpacity>
      );
    }

    return (
      <ToolTipMenu
        actions={toolTipActions}
        onPressMenuItem={(item: any) => onToolTipPress(item, pc)}
        isButton={true}
        shouldOpenOnLongPress={false}
        buttonStyle={styles.tooltipButton}
      >
        <View style={styles.contactRowContainer}>
          <View style={[styles.circle, { backgroundColor: '#' + color }]} />
          <View style={styles.contactRowBody}>
            <Text testID={`ContactListItem${index}`} style={[styles.contactRowNameText, { color: colors.labelText }]}>
              {displayName}
            </Text>
          </View>
        </View>
        <View style={styles.stick} />
      </ToolTipMenu>
    );
  };

  const onAddContactPress = async () => {
    try {
      const newPc = await prompt(loc.bip47.add_contact, loc.bip47.provide_payment_code, { type: 'plain-text' });
      if (!newPc) return;

      await _addContact(newPc);
    } catch (error: any) {
      console.debug(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const _addContact = async (newPc: string) => {
    if (counterpartyMetadata[newPc]?.hidden) {
      // contact already present, just need to unhide it
      await setCounterparty(newPc, {
        ...counterpartyMetadata[newPc],
        hidden: false,
      });
      return;
    }

    const cl = new ContactList();

    if (cl.isAddressValid(newPc)) {
      // this is not a payment code but a regular onchain address. pretending its a payment code and adding it
      foundWallet.addBIP47Receiver(newPc);
      await saveToDisk();
      return;
    }

    if (!cl.isPaymentCodeValid(newPc)) {
      presentAlert({ message: loc.bip47.invalid_pc });
      return;
    }

    if (cl.isBip352PaymentCodeValid(newPc)) {
      // ok its a SilentPayments code, notification tx is not needed, just add it to recipients:
      foundWallet.addBIP47Receiver(newPc);
      await saveToDisk();
      return;
    }

    setIsLoading(true);

    const notificationAddress = foundWallet.getBIP47NotificationAddressForPaymentCode(newPc);
    const notificationTx = findWalletTransactionByOutputAddress(realm, walletID, notificationAddress);
    // Normalize once so both branches treat a mempool tx (undefined confirmations) as 0.
    // Without this, a fresh mempool notification tx falls through to creating a duplicate.
    const notificationTxConfirmations = notificationTx?.confirmations ?? 0;

    if (notificationTx && notificationTxConfirmations > 0) {
      // we previously sent notification transaction to him, so just need to add him to internals
      foundWallet.addBIP47Receiver(newPc);
      await foundWallet.syncBip47ReceiversAddresses(newPc); // so we can unwrap and save all his possible addresses
      // (for a case if already have txs with him, we will now be able to label them on tx list)
      await saveToDisk();
      return;
    }

    if (notificationTx && notificationTxConfirmations === 0) {
      // for a rare case when we just sent the confirmation tx and it havent confirmed yet
      presentAlert({ message: loc.bip47.notification_tx_unconfirmed });
      return;
    }

    // need to send notif tx:

    setLoadingText('Fetching UTXO...');
    await fetchWalletUtxos(foundWallet.getID());
    const spendableUtxos = Array.from(queryWalletUtxos(realm, walletID, { frozen: false }), utxoRowToUtxo).map(utxo =>
      utxoToCreateTransactionInput(utxo, foundWallet),
    );
    setLoadingText('Fetching fees...');
    const fees = await BlueElectrum.estimateFees();
    setLoadingText('Fetching change address...');
    const changeAddress = await foundWallet.getChangeAddressAsync();
    setLoadingText('Crafting notification transaction...');
    if (spendableUtxos.length === 0) {
      // no balance..?
      presentAlert({ message: loc.send.details_total_exceeds_balance });
      return;
    }
    const { tx, fee } = foundWallet.createBip47NotificationTransaction(spendableUtxos, newPc, fees.fast, changeAddress);

    if (!tx) {
      presentAlert({ message: loc.bip47.failed_create_notif_tx });
      return;
    }

    setLoadingText('');
    if (
      await confirm(
        loc.bip47.onchain_tx_needed,
        `${loc.send.create_fee}: ${formatBalance(fee, BitcoinUnit.BTC)} (${satoshiToLocalCurrency(fee)}). `,
      )
    ) {
      setLoadingText('Broadcasting...');
      await foundWallet.broadcastTx(tx.toHex());
      foundWallet.addBIP47Receiver(newPc);
      presentAlert({ message: loc.bip47.notif_tx_sent });
      await setTransactionMemo(tx.getId(), loc.bip47.notif_tx);
      await new Promise(resolve => setTimeout(resolve, 5000)); // tx propagate on backend so our fetch will actually get the new tx
      setLoadingText('Fetching transactions...');
      await fetchAndSaveWalletTransactions(foundWallet.getID());
      setLoadingText('');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <BlueLoading />
        <Text>{loadingText}</Text>
      </View>
    );
  }

  return (
    <SafeArea style={styles.container}>
      {!walletID ? (
        <Text>Internal error</Text>
      ) : (
        <View style={styles.sectionListContainer}>
          <SectionList
            sections={data}
            keyExtractor={(item, index) => item + index}
            renderItem={({ item, index }) => renderItem(item, index)}
          />
        </View>
      )}

      <Button title={loc.bip47.add_contact} onPress={onAddContactPress} />
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionListContainer: { flex: 1, width: '100%' },
  circle: {
    width: 35,
    height: 35,
    borderRadius: 25,
  },
  contactRowBody: {
    justifyContent: 'center',
    top: -3,
    marginLeft: 10,
    flexShrink: 1,
  },
  contactRowNameText: { fontSize: 16 },
  contactRowContainer: { flexDirection: 'row', padding: 15 },
  stick: {
    borderStyle: 'solid',
    borderWidth: 0.5,
    borderColor: 'gray',
    opacity: 0.5,
    top: 0,
    left: -10,
    width: '110%',
  },
  tooltipButton: { width: '100%', alignSelf: 'stretch' },
});
