import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { PaymentCodeStackParamList } from '../../Navigation';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import loc, { formatBalance } from '../../loc';
import { AbstractHDElectrumWallet } from '../../class/wallets/abstract-hd-electrum-wallet';
import ToolTipMenu from '../../components/TooltipMenu';
import { useTheme } from '../../components/themes';
import createHash from 'create-hash';
import Button from '../../components/Button';
import prompt from '../../helpers/prompt';
import { ContactList } from '../../class/contact-list';
import assert from 'assert';
import { HDSegwitBech32Wallet } from '../../class';
import Clipboard from '@react-native-clipboard/clipboard';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import confirm from '../../helpers/confirm';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { satoshiToLocalCurrency } from '../../blue_modules/currency';
import { BlueLoading } from '../../BlueComponents';

interface DataSection {
  title: string;
  data: string[];
}

const actionIcons = {
  Eye: {
    iconType: 'SYSTEM',
    iconValue: 'eye',
  },
  EyeSlash: {
    iconType: 'SYSTEM',
    iconValue: 'eye.slash',
  },
  Clipboard: {
    iconType: 'SYSTEM',
    iconValue: 'doc.on.doc',
  },
  Link: {
    iconType: 'SYSTEM',
    iconValue: 'link',
  },
  Note: {
    iconType: 'SYSTEM',
    iconValue: 'note.text',
  },
};

interface IActionKey {
  id: Actions;
  text: string;
  icon: any;
}

enum Actions {
  pay,
  rename,
  copyToClipboard,
}

const actionKeys: IActionKey[] = [
  {
    id: Actions.pay,
    text: 'Pay this contact',
    icon: actionIcons.Clipboard,
  },
  {
    id: Actions.rename,
    text: 'Rename contact',
    icon: actionIcons.Clipboard,
  },
  {
    id: Actions.copyToClipboard,
    text: 'Copy PaymentCode',
    icon: actionIcons.Clipboard,
  },
];

type Props = NativeStackScreenProps<PaymentCodeStackParamList, 'PaymentCodesList'>;

function onlyUnique(value: any, index: number, self: any[]) {
  return self.indexOf(value) === index;
}

export default function PaymentCodesList({ route }: Props) {
  const { walletID } = route.params;
  const { wallets, txMetadata, counterpartyMetadata, saveToDisk } = useContext(BlueStorageContext);
  const [reload, setReload] = useState<number>(0);
  const [data, setData] = useState<DataSection[]>([]);
  const menuRef = useRef();
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

  const toolTipActions = useMemo(() => {
    return actionKeys;
  }, []);

  const shortenContactName = (name: string): string => {
    if (name.length < 20) return name;
    return name.substr(0, 10) + '...' + name.substr(name.length - 10, 10);
  };

  const onToolTipPress = async (id: any, pc: string) => {
    if (id === Actions.copyToClipboard) {
      Clipboard.setString(pc);
      alert('Copied');
    }

    if (id === Actions.rename) {
      const newName = await prompt('Rename', 'Provide new name for this contact', false, 'plain-text');
      if (!newName) return;

      counterpartyMetadata[pc] = { label: newName };
      setReload(Math.random());
    }
  };

  const onPress = useCallback(async () => {
    // @ts-ignore: idk how to fix
    menuRef?.current?.dismissMenu?.();
  }, []);

  const renderItem = (pc: string) => {
    const color = createHash('sha256').update(pc).digest().toString('hex').substring(0, 6);

    const displayName = shortenContactName(counterpartyMetadata?.[pc]?.label ?? pc);

    return (
      <View style={styles.itemContainer}>
        <ToolTipMenu
          ref={menuRef}
          actions={toolTipActions}
          onPressMenuItem={(item: any) => onToolTipPress(item, pc)}
          onPress={onPress}
          isButton={true}
          isMenuPrimaryAction={true}
        >
          <View style={styles.contactRowContainer}>
            <View style={[styles.circle, { backgroundColor: '#' + color }]} />
            <View style={styles.contactRowBody}>
              <Text style={[styles.contactRowNameText, { color: colors.shadowColor }]}>{displayName}</Text>
            </View>
          </View>
        </ToolTipMenu>
        <View style={styles.stick} />
      </View>
    );
  };

  const onAddContactPress = async () => {
    try {
      const foundWallet = wallets.find(w => w.getID() === walletID) as unknown as HDSegwitBech32Wallet;
      // foundWallet._send_payment_codes = []; // fixme debug
      assert(foundWallet);

      const newPc = await prompt('Add Contact', 'Contact Payment Code', false, 'plain-text');
      if (!newPc) return;
      const cl = new ContactList(foundWallet);

      if (!cl.isPaymentCodeValid(newPc)) {
        alert('Invalid Payment Code');
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
        alert('Notification transaction is not confirmed yet, please wait');
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
        alert('Failed to create on-chain transaction');
        return;
      }

      setLoadingText('');
      if (
        await confirm(
          'On-chain transaction needed',
          `${loc.send.create_fee}: ${formatBalance(fee, BitcoinUnit.BTC)} (${satoshiToLocalCurrency(fee)}). `,
        )
      ) {
        setLoadingText('Broadcasting...');
        try {
          await foundWallet.broadcastTx(tx.toHex());
          foundWallet.addBIP47Receiver(newPc);
          alert('Notification transaction sent. Please wait for it to confirm');
          txMetadata[tx.getId()] = { memo: 'Notification transaction' };
          setReload(Math.random());
          await new Promise(resolve => setTimeout(resolve, 5000)); // tx propagate on backend so our fetch will actually get the new tx
        } catch (_) {}
        setLoadingText('Fetching transactions...');
        await foundWallet.fetchTransactions();
      }
    } catch (error: any) {
      alert(error.message);
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

      <Button title="Add Contact" onPress={onAddContactPress} />
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
  itemContainer: { flex: 1, paddingLeft: 10, paddingTop: 15, paddingBottom: 15, borderStyle: 'solid', borderWidth: 0, borderColor: 'red' },
  circle: {
    width: 42,
    height: 42,
    borderRadius: 25,
  },
  contactRowBody: { flex: 6 /* borderStyle: 'solid', borderWidth: 1, borderColor: 'red' */, justifyContent: 'center', top: -3 },
  contactRowNameText: { marginLeft: 10, fontSize: 20, fontWeight: 'bold' },
  contactRowContainer: { flexDirection: 'row' },
  stick: { borderStyle: 'solid', borderWidth: 0.5, borderColor: 'gray', opacity: 0.5, top: 15, left: -10, width: '110%' },
});
