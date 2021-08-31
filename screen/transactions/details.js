/* global alert */
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, TextInput, Linking, StatusBar, StyleSheet, Keyboard } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { BlueCard, BlueCopyToClipboardButton, BlueLoading, BlueSpacing20, BlueText, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import HandoffComponent from '../../components/handoff';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import Clipboard from '@react-native-clipboard/clipboard';
import ToolTipMenu from '../../components/TooltipMenu';
const dayjs = require('dayjs');

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function arrDiff(a1, a2) {
  const ret = [];
  for (const v of a2) {
    if (a1.indexOf(v) === -1) {
      ret.push(v);
    }
  }
  return ret;
}

const TransactionsDetails = () => {
  const { setOptions } = useNavigation();
  const { hash } = useRoute().params;
  const { saveToDisk, txMetadata, wallets, getTransactions } = useContext(BlueStorageContext);
  const [from, setFrom] = useState();
  const [to, setTo] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const [tx, setTX] = useState();
  const [memo, setMemo] = useState();
  const { colors } = useTheme();
  const stylesHooks = StyleSheet.create({
    txLink: {
      color: colors.alternativeTextColor2,
    },
    saveText: {
      color: colors.alternativeTextColor2,
    },
    memoTextInput: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    greyButton: {
      backgroundColor: colors.lightButton,
    },
    Link: {
      color: colors.buttonTextColor,
    },
  });

  useEffect(() => {
    setOptions({
      headerRight: () => (
        <TouchableOpacity accessibilityRole="button" disabled={isLoading} style={styles.save} onPress={handleOnSaveButtonTapped}>
          <Text style={stylesHooks.saveText}>{loc.wallets.details_save}</Text>
        </TouchableOpacity>
      ),
      headerStyle: {
        borderBottomWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
        shadowOffset: { height: 0, width: 0 },
        backgroundColor: colors.customHeader,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors, isLoading, memo]);

  useEffect(() => {
    let foundTx = {};
    let from = [];
    let to = [];
    for (const tx of getTransactions(null, Infinity, true)) {
      if (tx.hash === hash) {
        foundTx = tx;
        for (const input of foundTx.inputs) {
          from = from.concat(input.addresses);
        }
        for (const output of foundTx.outputs) {
          if (output.addresses) to = to.concat(output.addresses);
          if (output.scriptPubKey && output.scriptPubKey.addresses) to = to.concat(output.scriptPubKey.addresses);
        }
      }
    }

    for (const w of wallets) {
      for (const t of w.getTransactions()) {
        if (t.hash === hash) {
          console.log('tx', hash, 'belongs to', w.getLabel());
        }
      }
    }
    if (txMetadata[foundTx.hash]) {
      if (txMetadata[foundTx.hash].memo) {
        setMemo(txMetadata[foundTx.hash].memo);
      }
    }

    setTX(foundTx);
    setFrom(from);
    setTo(to);
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, wallets]);

  const handleOnSaveButtonTapped = () => {
    Keyboard.dismiss();
    txMetadata[tx.hash] = { memo };
    saveToDisk().then(_success => alert(loc.transactions.transaction_note_saved));
  };

  const handleOnOpenTransactionOnBlockExporerTapped = () => {
    const url = `https://mempool.space/tx/${tx.hash}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      }
    });
  };

  const handleCopyPress = () => {
    Clipboard.setString(`https://mempool.space/tx/${tx.hash}`);
  };

  if (isLoading || !tx) {
    return <BlueLoading />;
  }

  return (
    <SafeBlueArea>
      <HandoffComponent
        title={`Bitcoin Transaction ${tx.hash}`}
        type="io.bluewallet.bluewallet"
        url={`https://blockstream.info/tx/${tx.hash}`}
      />
      <StatusBar barStyle="default" />
      <ScrollView style={styles.scroll}>
        <BlueCard>
          <View>
            <TextInput
              placeholder={loc.send.details_note_placeholder}
              value={memo}
              placeholderTextColor="#81868e"
              style={[styles.memoTextInput, stylesHooks.memoTextInput]}
              onChangeText={setMemo}
            />
            <BlueSpacing20 />
          </View>

          {from && (
            <>
              <View style={styles.rowHeader}>
                <BlueText style={styles.rowCaption}>{loc.transactions.details_from}</BlueText>
                <BlueCopyToClipboardButton stringToCopy={from.filter(onlyUnique).join(', ')} />
              </View>
              <BlueText style={styles.rowValue}>{from.filter(onlyUnique).join(', ')}</BlueText>
            </>
          )}

          {to && (
            <>
              <View style={styles.rowHeader}>
                <BlueText style={styles.rowCaption}>{loc.transactions.details_to}</BlueText>
                <BlueCopyToClipboardButton stringToCopy={to.filter(onlyUnique).join(', ')} />
              </View>
              <BlueText style={styles.rowValue}>{arrDiff(from, to.filter(onlyUnique)).join(', ')}</BlueText>
            </>
          )}

          {tx.fee && (
            <>
              <BlueText style={styles.rowCaption}>{loc.send.create_fee}</BlueText>
              <BlueText style={styles.rowValue}>{tx.fee + ' sats'}</BlueText>
            </>
          )}

          {tx.hash && (
            <>
              <View style={styles.rowHeader}>
                <BlueText style={[styles.txId, stylesHooks.txId]}>{loc.transactions.txid}</BlueText>
                <BlueCopyToClipboardButton stringToCopy={tx.hash} />
              </View>
              <BlueText style={styles.rowValue}>{tx.hash}</BlueText>
            </>
          )}

          {tx.received && (
            <>
              <BlueText style={styles.rowCaption}>{loc.transactions.details_received}</BlueText>
              <BlueText style={styles.rowValue}>{dayjs(tx.received).format('LLL')}</BlueText>
            </>
          )}

          {tx.block_height > 0 && (
            <>
              <BlueText style={styles.rowCaption}>{loc.transactions.details_block}</BlueText>
              <BlueText style={styles.rowValue}>{tx.block_height}</BlueText>
            </>
          )}

          {tx.inputs && (
            <>
              <BlueText style={styles.rowCaption}>{loc.transactions.details_inputs}</BlueText>
              <BlueText style={styles.rowValue}>{tx.inputs.length}</BlueText>
            </>
          )}

          {tx.outputs?.length > 0 && (
            <>
              <BlueText style={styles.rowCaption}>{loc.transactions.details_outputs}</BlueText>
              <BlueText style={styles.rowValue}>{tx.outputs.length}</BlueText>
            </>
          )}
          <ToolTipMenu
            actions={[
              {
                id: TransactionsDetails.actionKeys.CopyToClipboard,
                text: loc.transactions.details_copy,
                icon: TransactionsDetails.actionIcons.Clipboard,
              },
            ]}
            onPress={handleCopyPress}
          >
            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleOnOpenTransactionOnBlockExporerTapped}
              style={[styles.greyButton, stylesHooks.greyButton]}
            >
              <Text style={[styles.Link, stylesHooks.Link]}>{loc.transactions.details_show_in_block_explorer}</Text>
            </TouchableOpacity>
          </ToolTipMenu>
        </BlueCard>
      </ScrollView>
    </SafeBlueArea>
  );
};

TransactionsDetails.actionKeys = {
  CopyToClipboard: 'copyToClipboard',
};

TransactionsDetails.actionIcons = {
  Clipboard: {
    iconType: 'SYSTEM',
    iconValue: 'doc.on.doc',
  },
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  rowHeader: {
    flex: 1,
    flexDirection: 'row',
    marginBottom: 4,
    justifyContent: 'space-between',
  },
  rowCaption: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  rowValue: {
    marginBottom: 26,
    color: 'grey',
  },
  txId: {
    fontSize: 16,
    fontWeight: '500',
  },
  txHash: {
    marginBottom: 8,
    color: 'grey',
  },
  Link: {
    fontWeight: '600',
    fontSize: 15,
  },
  save: {
    marginHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memoTextInput: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
    paddingHorizontal: 8,
    color: '#81868e',
  },
  greyButton: {
    borderRadius: 9,
    minHeight: 49,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'auto',
    flexGrow: 1,
    marginHorizontal: 4,
  },
});

export default TransactionsDetails;

TransactionsDetails.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.transactions.details_title }));
