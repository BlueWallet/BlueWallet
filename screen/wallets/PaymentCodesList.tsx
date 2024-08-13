import React, { useEffect, useMemo, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import assert from 'assert';
import createHash from 'create-hash';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { satoshiToLocalCurrency } from '../../blue_modules/currency';
import { BlueLoading } from '../../BlueComponents';
import { HDSegwitBech32Wallet } from '../../class';
import { ContactList } from '../../class/contact-list';
import { AbstractHDElectrumWallet } from '../../class/wallets/abstract-hd-electrum-wallet';
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
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useStorage } from '../../hooks/context/useStorage';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

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

function onlyUnique(value: any, index: number, self: any[]) {
  return self.indexOf(value) === index;
}

type PaymentCodeListRouteProp = RouteProp<DetailViewStackParamList, 'PaymentCodeList'>;
type PaymentCodesListNavigationProp = NativeStackNavigationProp<DetailViewStackParamList, 'PaymentCodeList'>;

export default function PaymentCodesList() {
  const navigation = useExtendedNavigation<PaymentCodesListNavigationProp>();
  const route = useRoute<PaymentCodeListRouteProp>();
  const { walletID } = route.params;
  const { wallets, txMetadata, counterpartyMetadata, saveToDisk } = useStorage();
  const [reload, setReload] = useState<number>(0);
  const [data, setData] = useState<DataSection[]>([]);
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('Loading...');
  const state = navigation.getState();
  const previousRouteIndex = state.index - 1;

  let previousRouteName: string | null;
  if (previousRouteIndex >= 0) {
    previousRouteName = state.routes[previousRouteIndex].name;
  }

  useEffect(() => {
    if (!walletID) return;

    const foundWallet = wallets.find(w => w.getID() === walletID) as unknown as AbstractHDElectrumWallet;
    if (!foundWallet) return;

    const newData: DataSection[] = [
      {
        title: '',
        data: foundWallet.getBIP47SenderPaymentCodes().concat(foundWallet.getBIP47ReceiverPaymentCodes()).filter(onlyUnique),
      },
    ];
    setData(newData);
  }, [walletID, wallets, reload]);

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
        const newName = await prompt(loc.bip47.rename, loc.bip47.provide_name, true, 'plain-text');
        if (!newName) return;

        counterpartyMetadata[pc] = { label: newName };
        setReload(Math.random());
        await saveToDisk();
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
        const foundWallet = wallets.find(w => w.getID() === walletID) as unknown as HDSegwitBech32Wallet;
        assert(foundWallet, 'Internal error: cant find walletID ' + walletID);
        const notifTx = foundWallet.getBIP47NotificationTransaction(pc);
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
        counterpartyMetadata[pc] = { label: counterpartyMetadata[pc]?.label, hidden: true };
        setReload(Math.random());
        await saveToDisk();
        break;
      }
      default:
        break;
    }
  };

  const _navigateToSend = (pc: string) => {
    navigation.navigate('SendDetailsRoot', {
      screen: 'SendDetails',
      params: {
        walletID,
        addRecipientParams: {
          address: pc,
        },
      },
      merge: true,
    });
  };

  const renderItem = (pc: string, index: number) => {
    if (counterpartyMetadata?.[pc]?.hidden) return null; // hidden contact, do not render

    const color = createHash('sha256').update(pc).digest().toString('hex').substring(0, 6);

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
        isMenuPrimaryAction={true}
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
      const newPc = await prompt(loc.bip47.add_contact, loc.bip47.provide_payment_code, true, 'plain-text');
      if (!newPc) return;

      await _addContact(newPc);
    } catch (error: any) {
      console.debug(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const _addContact = async (newPc: string) => {
    const foundWallet = wallets.find(w => w.getID() === walletID) as unknown as HDSegwitBech32Wallet;
    assert(foundWallet, 'Internal error: cant find walletID ' + walletID);

    if (counterpartyMetadata[newPc]?.hidden) {
      // contact already present, just need to unhide it
      counterpartyMetadata[newPc].hidden = false;
      await saveToDisk();
      setReload(Math.random());
      return;
    }

    const cl = new ContactList();

    if (cl.isAddressValid(newPc)) {
      // this is not a payment code but a regular onchain address. pretending its a payment code and adding it
      foundWallet.addBIP47Receiver(newPc);
      await saveToDisk();
      setReload(Math.random());
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
      setReload(Math.random());
      return;
    }

    setIsLoading(true);

    const notificationTx = foundWallet.getBIP47NotificationTransaction(newPc);

    if (notificationTx && notificationTx.confirmations > 0) {
      // we previously sent notification transaction to him, so just need to add him to internals
      foundWallet.addBIP47Receiver(newPc);
      await foundWallet.syncBip47ReceiversAddresses(newPc); // so we can unwrap and save all his possible addresses
      // (for a case if already have txs with him, we will now be able to label them on tx list)
      await saveToDisk();
      setReload(Math.random());
      return;
    }

    if (notificationTx && notificationTx.confirmations === 0) {
      // for a rare case when we just sent the confirmation tx and it havent confirmed yet
      presentAlert({ message: loc.bip47.notification_tx_unconfirmed });
      return;
    }

    // need to send notif tx:

    setLoadingText('Fetching UTXO...');
    await foundWallet.fetchUtxo();
    setLoadingText('Fetching fees...');
    const fees = await BlueElectrum.estimateFees();
    setLoadingText('Fetching change address...');
    const changeAddress = await foundWallet.getChangeAddressAsync();
    setLoadingText('Crafting notification transaction...');
    if (foundWallet.getUtxo().length === 0) {
      // no balance..?
      presentAlert({ message: loc.send.details_total_exceeds_balance });
      return;
    }
    const { tx, fee } = foundWallet.createBip47NotificationTransaction(foundWallet.getUtxo(), newPc, fees.fast, changeAddress);

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
      try {
        await foundWallet.broadcastTx(tx.toHex());
        foundWallet.addBIP47Receiver(newPc);
        presentAlert({ message: loc.bip47.notif_tx_sent });
        txMetadata[tx.getId()] = { memo: loc.bip47.notif_tx };
        setReload(Math.random());
        await new Promise(resolve => setTimeout(resolve, 5000)); // tx propagate on backend so our fetch will actually get the new tx
      } catch (_) {}
      setLoadingText('Fetching transactions...');
      await foundWallet.fetchTransactions();
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
  contactRowBody: { flex: 6, justifyContent: 'center', top: -3 },
  contactRowNameText: { marginLeft: 10, fontSize: 16 },
  contactRowContainer: { flexDirection: 'row', padding: 15 },
  stick: { borderStyle: 'solid', borderWidth: 0.5, borderColor: 'gray', opacity: 0.5, top: 0, left: -10, width: '110%' },
});
