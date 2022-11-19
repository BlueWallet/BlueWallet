import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, TextInput, Linking, StatusBar, StyleSheet, Keyboard } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { BlueCard, BlueCopyToClipboardButton, BlueLoading, BlueSpacing20, BlueText } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import HandoffComponent from '../../components/handoff';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import Clipboard from '@react-native-clipboard/clipboard';
import ToolTipMenu from '../../components/TooltipMenu';
import alert from '../../components/Alert';
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
  const { setOptions, navigate } = useNavigation();
  const { hash } = useRoute().params;
  const { saveToDisk, txMetadata, wallets, getTransactions } = useContext(BlueStorageContext);
  const [from, setFrom] = useState();
  const [to, setTo] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const [tx, setTX] = useState();
  const [memo, setMemo] = useState();
  const { colors } = useTheme();
  const stylesHooks = StyleSheet.create({
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
    save: {
      backgroundColor: colors.lightButton,
    },
    saveText: {
      color: colors.buttonTextColor,
    },
  });

  useLayoutEffect(() => {
    setOptions({
      headerRight: () => (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={isLoading}
          style={[styles.save, stylesHooks.save]}
          onPress={handleOnSaveButtonTapped}
        >
          <Text style={[styles.saveText, stylesHooks.saveText]}>{loc.wallets.details_save}</Text>
        </TouchableOpacity>
      ),
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
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          Linking.openURL(url).catch(e => {
            console.log('openURL failed in handleOnOpenTransactionOnBlockExporerTapped');
            console.log(e.message);
            alert(e.message);
          });
        } else {
          console.log('canOpenURL supported is false in handleOnOpenTransactionOnBlockExporerTapped');
          alert(loc.transactions.open_url_error);
        }
      })
      .catch(e => {
        console.log('canOpenURL failed in handleOnOpenTransactionOnBlockExporerTapped');
        console.log(e.message);
        alert(e.message);
      });
  };

  const handleCopyPress = stringToCopy => {
    Clipboard.setString(
      stringToCopy !== TransactionsDetails.actionKeys.CopyToClipboard ? stringToCopy : `https://mempool.space/tx/${tx.hash}`,
    );
  };

  if (isLoading || !tx) {
    return <BlueLoading />;
  }

  const weOwnAddress = address => {
    for (const w of wallets) {
      if (w.weOwnAddress(address)) {
        return w;
      }
    }
    return null;
  };

  const navigateToWallet = wallet => {
    const walletID = wallet.getID();
    navigate('WalletTransactions', {
      walletID,
      walletType: wallet.type,
      key: `WalletTransactions-${walletID}`,
    });
  };

  const renderSection = array => {
    const fromArray = [];

    for (const [index, address] of array.entries()) {
      const actions = [];
      actions.push({
        id: TransactionsDetails.actionKeys.CopyToClipboard,
        text: loc.transactions.details_copy,
        icon: TransactionsDetails.actionIcons.Clipboard,
      });
      const isWeOwnAddress = weOwnAddress(address);
      if (isWeOwnAddress) {
        actions.push({
          id: TransactionsDetails.actionKeys.GoToWallet,
          text: loc.formatString(loc.transactions.view_wallet, { walletLabel: isWeOwnAddress.getLabel() }),
          icon: TransactionsDetails.actionIcons.GoToWallet,
        });
      }

      fromArray.push(
        <ToolTipMenu
          key={address}
          isButton
          title={address}
          isMenuPrimaryAction
          actions={actions}
          onPressMenuItem={id => {
            if (id === TransactionsDetails.actionKeys.CopyToClipboard) {
              handleCopyPress(address);
            } else if (id === TransactionsDetails.actionKeys.GoToWallet) {
              navigateToWallet(isWeOwnAddress);
            }
          }}
        >
          <BlueText style={isWeOwnAddress ? [styles.rowValue, styles.weOwnAddress] : styles.rowValue}>
            {address}
            {index === array.length - 1 ? null : ','}
          </BlueText>
        </ToolTipMenu>,
      );
    }

    return fromArray;
  };

  return (
    <ScrollView style={styles.scroll} automaticallyAdjustContentInsets contentInsetAdjustmentBehavior="automatic">
      <HandoffComponent
        title={loc.transactions.details_title}
        type={HandoffComponent.activityTypes.ViewInBlockExplorer}
        url={`https://mempool.space/tx/${tx.hash}`}
      />
      <StatusBar barStyle="default" />
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
            {renderSection(from.filter(onlyUnique))}
            <View style={styles.marginBottom18} />
          </>
        )}

        {to && (
          <>
            <View style={styles.rowHeader}>
              <BlueText style={styles.rowCaption}>{loc.transactions.details_to}</BlueText>
              <BlueCopyToClipboardButton stringToCopy={to.filter(onlyUnique).join(', ')} />
            </View>
            {renderSection(arrDiff(from, to.filter(onlyUnique)))}
            <View style={styles.marginBottom18} />
          </>
        )}

        {tx.fee && (
          <>
            <BlueText style={styles.rowCaption}>{loc.send.create_fee}</BlueText>
            <BlueText style={styles.rowValue}>{tx.fee + ' sats'}</BlueText>
            <View style={styles.marginBottom18} />
          </>
        )}

        {tx.hash && (
          <>
            <View style={styles.rowHeader}>
              <BlueText style={[styles.txId, stylesHooks.txId]}>{loc.transactions.txid}</BlueText>
              <BlueCopyToClipboardButton stringToCopy={tx.hash} />
            </View>
            <BlueText style={styles.rowValue}>{tx.hash}</BlueText>
            <View style={styles.marginBottom18} />
          </>
        )}

        {tx.received && (
          <>
            <BlueText style={styles.rowCaption}>{loc.transactions.details_received}</BlueText>
            <BlueText style={styles.rowValue}>{dayjs(tx.received).format('LLL')}</BlueText>
            <View style={styles.marginBottom18} />
          </>
        )}

        {tx.block_height > 0 && (
          <>
            <BlueText style={styles.rowCaption}>{loc.transactions.details_block}</BlueText>
            <BlueText style={styles.rowValue}>{tx.block_height}</BlueText>
            <View style={styles.marginBottom18} />
          </>
        )}

        {tx.inputs && (
          <>
            <BlueText style={styles.rowCaption}>{loc.transactions.details_inputs}</BlueText>
            <BlueText style={styles.rowValue}>{tx.inputs.length}</BlueText>
            <View style={styles.marginBottom18} />
          </>
        )}

        {tx.outputs?.length > 0 && (
          <>
            <BlueText style={styles.rowCaption}>{loc.transactions.details_outputs}</BlueText>
            <BlueText style={styles.rowValue}>{tx.outputs.length}</BlueText>
            <View style={styles.marginBottom18} />
          </>
        )}
        <ToolTipMenu
          isButton
          actions={[
            {
              id: TransactionsDetails.actionKeys.CopyToClipboard,
              text: loc.transactions.copy_link,
              icon: TransactionsDetails.actionIcons.Clipboard,
            },
          ]}
          onPressMenuItem={handleCopyPress}
          onPress={handleOnOpenTransactionOnBlockExporerTapped}
        >
          <View style={[styles.greyButton, stylesHooks.greyButton]}>
            <Text style={[styles.Link, stylesHooks.Link]}>{loc.transactions.details_show_in_block_explorer}</Text>
          </View>
        </ToolTipMenu>
      </BlueCard>
    </ScrollView>
  );
};

TransactionsDetails.actionKeys = {
  CopyToClipboard: 'copyToClipboard',
  GoToWallet: 'goToWallet',
};

TransactionsDetails.actionIcons = {
  Clipboard: {
    iconType: 'SYSTEM',
    iconValue: 'doc.on.doc',
  },
  GoToWallet: {
    iconType: 'SYSTEM',
    iconValue: 'wallet.pass',
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
    color: 'grey',
  },
  marginBottom18: {
    marginBottom: 18,
  },
  txId: {
    fontSize: 16,
    fontWeight: '500',
  },
  Link: {
    fontWeight: '600',
    fontSize: 15,
  },
  weOwnAddress: {
    fontWeight: '600',
  },
  save: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    borderRadius: 8,
    height: 34,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
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

TransactionsDetails.navigationOptions = navigationStyle({ headerTitle: loc.transactions.details_title }, (options, { theme }) => {
  return {
    ...options,
    headerStyle: {
      backgroundColor: theme.colors.customHeader,
      borderBottomWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      shadowOffset: { height: 0, width: 0 },
    },
  };
});
