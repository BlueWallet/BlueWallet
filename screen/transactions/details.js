/* global alert */
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, TextInput, Linking, StatusBar, StyleSheet, Keyboard } from 'react-native';
import {
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueLoading,
  BlueSpacing20,
  BlueCopyToClipboardButton,
  BlueNavigationStyle,
} from '../../BlueComponents';
import HandoffSettings from '../../class/handoff';
import Handoff from 'react-native-handoff';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
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
  const [isHandOffUseEnabled, setIsHandOffUseEnabled] = useState(false);
  const [from, setFrom] = useState();
  const [to, setTo] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const [tx, setTX] = useState();
  const [memo, setMemo] = useState();
  const { colors } = useTheme();
  const stylesHooks = StyleSheet.create({
    rowCaption: {
      color: colors.foregroundColor,
    },
    txId: {
      color: colors.foregroundColor,
    },
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
  });

  useEffect(() => {
    setOptions({
      headerRight: () => (
        <TouchableOpacity disabled={isLoading} style={styles.save} onPress={handleOnSaveButtonTapped}>
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
    for (const tx of getTransactions()) {
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
  }, [hash]);

  useEffect(() => {
    HandoffSettings.isHandoffUseEnabled().then(setIsHandOffUseEnabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOnSaveButtonTapped = () => {
    Keyboard.dismiss();
    txMetadata[tx.hash] = { memo };
    saveToDisk().then(_success => alert(loc.transactions.transaction_note_saved));
  };

  const handleOnOpenTransactionOnBlockExporerTapped = () => {
    const url = `https://blockstream.info/tx/${tx.hash}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      }
    });
  };

  if (isLoading || !tx) {
    return <BlueLoading />;
  }

  return (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
      {isHandOffUseEnabled && (
        <Handoff title={`Bitcoin Transaction ${tx.hash}`} type="io.bluewallet.bluewallet" url={`https://blockstream.info/tx/${tx.hash}`} />
      )}
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
                <BlueText style={[styles.rowCaption, stylesHooks.rowCaption]}>{loc.transactions.details_from}</BlueText>
                <BlueCopyToClipboardButton stringToCopy={from.filter(onlyUnique).join(', ')} />
              </View>
              <BlueText style={styles.rowValue}>{from.filter(onlyUnique).join(', ')}</BlueText>
            </>
          )}

          {to && (
            <>
              <View style={styles.rowHeader}>
                <BlueText style={[styles.rowCaption, stylesHooks.rowCaption]}>{loc.transactions.details_to}</BlueText>
                <BlueCopyToClipboardButton stringToCopy={to.filter(onlyUnique).join(', ')} />
              </View>
              <BlueText style={styles.rowValue}>{arrDiff(from, to.filter(onlyUnique)).join(', ')}</BlueText>
            </>
          )}

          {tx.fee && (
            <>
              <BlueText style={[styles.rowCaption, stylesHooks.rowCaption]}>{loc.send.create_fee}</BlueText>
              <BlueText style={styles.rowValue}>{tx.fee + ' sats'}</BlueText>
            </>
          )}

          {tx.hash && (
            <>
              <View style={styles.rowHeader}>
                <BlueText style={[styles.txId, stylesHooks.txId]}>Txid</BlueText>
                <BlueCopyToClipboardButton stringToCopy={tx.hash} />
              </View>
              <BlueText style={styles.txHash}>{tx.hash}</BlueText>
              <TouchableOpacity onPress={handleOnOpenTransactionOnBlockExporerTapped}>
                <BlueText style={[styles.txLink, stylesHooks.txLink]}>{loc.transactions.details_show_in_block_explorer}</BlueText>
              </TouchableOpacity>
            </>
          )}

          {tx.received && (
            <>
              <BlueText style={[styles.rowCaption, stylesHooks.rowCaption]}>{loc.transactions.details_received}</BlueText>
              <BlueText style={styles.rowValue}>{dayjs(tx.received).format('MM/DD/YYYY h:mm A')}</BlueText>
            </>
          )}

          {tx.block_height > 0 && (
            <>
              <BlueText style={[styles.rowCaption, stylesHooks.rowCaption]}>{loc.transactions.details_block}</BlueText>
              <BlueText style={styles.rowValue}>{tx.block_height}</BlueText>
            </>
          )}

          {tx.inputs && (
            <>
              <BlueText style={[styles.rowCaption, stylesHooks.rowCaption]}>{loc.transactions.details_inputs}</BlueText>
              <BlueText style={styles.rowValue}>{tx.inputs.length}</BlueText>
            </>
          )}

          {tx.outputs.length > 0 && (
            <>
              <BlueText style={[styles.rowCaption, stylesHooks.rowCaption]}>{loc.transactions.details_outputs}</BlueText>
              <BlueText style={styles.rowValue}>{tx.outputs.length}</BlueText>
            </>
          )}
        </BlueCard>
      </ScrollView>
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
  txLink: {
    marginBottom: 26,
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
});

export default TransactionsDetails;

TransactionsDetails.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: loc.transactions.details_title,
});
