import Clipboard from '@react-native-clipboard/clipboard';
import { useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import assert from 'assert';
import createHash from 'create-hash';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { satoshiToLocalCurrency } from '../../blue_modules/currency';
import { BlueStorageContext } from '../../blue_modules/storage-context';
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
import { PaymentCodeStackParamList } from '../../navigation/PaymentCodeStack';

interface DataSection {
  title: string;
  data: string[];
}
enum Actions {
  pay,
  rename,
  copyToClipboard,
}

const actionKeys: Action[] = [
  {
    id: Actions.pay,
    text: loc.bip47.pay_this_contact,
    icon: {
      iconType: 'SYSTEM',
      iconValue: 'square.and.arrow.up',
    },
  },
  {
    id: Actions.rename,
    text: loc.bip47.rename_contact,
    icon: {
      iconType: 'SYSTEM',
      iconValue: 'note.text',
    },
  },
  {
    id: Actions.copyToClipboard,
    text: loc.bip47.copy_payment_code,
    icon: {
      iconType: 'SYSTEM',
      iconValue: 'doc.on.doc',
    },
  },
];

type Props = NativeStackScreenProps<PaymentCodeStackParamList, 'PaymentCodesList'>;

function onlyUnique(value: any, index: number, self: any[]) {
  return self.indexOf(value) === index;
}

export default function PaymentCodesList() {
  const route = useRoute();
  const { walletID } = route.params as Props['route']['params'];
  const { wallets, txMetadata, counterpartyMetadata, saveToDisk } = useContext(BlueStorageContext);
  const [reload, setReload] = useState<number>(0);
  const [data, setData] = useState<DataSection[]>([]);
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('Loading...');

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
    if (String(id) === String(Actions.copyToClipboard)) {
      Clipboard.setString(pc);
      presentAlert({ message: loc.bip47.copied });
    }

    if (String(id) === String(Actions.rename)) {
      const newName = await prompt(loc.bip47.rename, loc.bip47.provide_name, false, 'plain-text');
      if (!newName) return;

      counterpartyMetadata[pc] = { label: newName };
      setReload(Math.random());
    }

    if (String(id) === String(Actions.pay)) {
      presentAlert({ message: 'Not implemented yet' });
    }
  };

  const renderItem = (pc: string) => {
    const color = createHash('sha256').update(pc).digest().toString('hex').substring(0, 6);

    const displayName = shortenContactName(counterpartyMetadata?.[pc]?.label ?? pc);

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
            <Text style={[styles.contactRowNameText, { color: colors.shadowColor }]}>{displayName}</Text>
          </View>
        </View>
        <View style={styles.stick} />
      </ToolTipMenu>
    );
  };

  const onAddContactPress = async () => {
    try {
      const foundWallet = wallets.find(w => w.getID() === walletID) as unknown as HDSegwitBech32Wallet;
      assert(foundWallet);

      const newPc = await prompt(loc.bip47.add_contact, loc.bip47.provide_payment_code, false, 'plain-text');
      if (!newPc) return;
      const cl = new ContactList(foundWallet);

      if (!cl.isPaymentCodeValid(newPc)) {
        presentAlert({ message: loc.bip47.invalid_pc });
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
      }
    } catch (error: any) {
      presentAlert({ message: error.message });
    } finally {
      setIsLoading(false);
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
    <View style={styles.container}>
      {!walletID ? (
        <Text>Internal error</Text>
      ) : (
        <View style={styles.sectionListContainer}>
          <SectionList sections={data} keyExtractor={(item, index) => item + index} renderItem={({ item }) => renderItem(item)} />
        </View>
      )}

      <Button title={loc.bip47.add_contact} onPress={onAddContactPress} />
    </View>
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
