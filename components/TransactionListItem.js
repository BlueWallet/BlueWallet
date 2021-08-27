/* eslint react/prop-types: "off" */
import React, { useState, useMemo, useCallback, useContext, useEffect } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { BitcoinUnit } from '../models/bitcoinUnits';
import * as NavigationService from '../NavigationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useTheme } from '@react-navigation/native';
import loc, { formatBalanceWithoutSuffix, transactionTimeToReadable } from '../loc';
import Lnurl from '../class/lnurl';
import { BlueStorageContext } from '../blue_modules/storage-context';
import ToolTipMenu from './TooltipMenu';
import {
  BlueListItem,
  BlueTransactionExpiredIcon,
  BlueTransactionIncomingIcon,
  BlueTransactionOffchainIcon,
  BlueTransactionOffchainIncomingIcon,
  BlueTransactionOnchainIcon,
  BlueTransactionOutgoingIcon,
  BlueTransactionPendingIcon,
} from '../BlueComponents';

export const TransactionListItem = React.memo(({ item, itemPriceUnit = BitcoinUnit.BTC }) => {
  const [subtitleNumberOfLines, setSubtitleNumberOfLines] = useState(1);
  const { colors } = useTheme();
  const { navigate } = useNavigation();
  const { txMetadata, wallets, preferredFiatCurrency, language } = useContext(BlueStorageContext);
  const containerStyle = useMemo(
    () => ({
      backgroundColor: 'transparent',
      borderBottomColor: colors.lightBorder,
      paddingTop: 16,
      paddingBottom: 16,
      paddingRight: 0,
    }),
    [colors.lightBorder],
  );

  const title = useMemo(() => {
    if (item.confirmations === 0) {
      return loc.transactions.pending;
    } else {
      return transactionTimeToReadable(item.received);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.confirmations, item.received, language]);
  const txMemo = txMetadata[item.hash]?.memo ?? '';
  const subtitle = useMemo(() => {
    let sub = item.confirmations < 7 ? loc.formatString(loc.transactions.list_conf, { number: item.confirmations }) : '';
    if (sub !== '') sub += ' ';
    sub += txMemo;
    if (item.memo) sub += item.memo;
    return sub || null;
  }, [txMemo, item.confirmations, item.memo]);

  const rowTitle = useMemo(() => {
    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      if (isNaN(item.value)) {
        item.value = '0';
      }
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0;
      const invoiceExpiration = item.timestamp + item.expire_time;

      if (invoiceExpiration > now) {
        return formatBalanceWithoutSuffix(item.value && item.value, itemPriceUnit, true).toString();
      } else if (invoiceExpiration < now) {
        if (item.ispaid) {
          return formatBalanceWithoutSuffix(item.value && item.value, itemPriceUnit, true).toString();
        } else {
          return loc.lnd.expired;
        }
      }
    } else {
      return formatBalanceWithoutSuffix(item.value && item.value, itemPriceUnit, true).toString();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, itemPriceUnit, preferredFiatCurrency]);

  const rowTitleStyle = useMemo(() => {
    let color = colors.successColor;

    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0;
      const invoiceExpiration = item.timestamp + item.expire_time;

      if (invoiceExpiration > now) {
        color = colors.successColor;
      } else if (invoiceExpiration < now) {
        if (item.ispaid) {
          color = colors.successColor;
        } else {
          color = '#9AA0AA';
        }
      }
    } else if (item.value / 100000000 < 0) {
      color = colors.foregroundColor;
    }

    return {
      color,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'right',
      width: 96,
    };
  }, [item, colors.foregroundColor, colors.successColor]);

  const avatar = useMemo(() => {
    // is it lightning refill tx?
    if (item.category === 'receive' && item.confirmations < 3) {
      return (
        <View style={styles.iconWidth}>
          <BlueTransactionPendingIcon />
        </View>
      );
    }

    if (item.type && item.type === 'bitcoind_tx') {
      return (
        <View style={styles.iconWidth}>
          <BlueTransactionOnchainIcon />
        </View>
      );
    }
    if (item.type === 'paid_invoice') {
      // is it lightning offchain payment?
      return (
        <View style={styles.iconWidth}>
          <BlueTransactionOffchainIcon />
        </View>
      );
    }

    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      if (!item.ispaid) {
        const currentDate = new Date();
        const now = (currentDate.getTime() / 1000) | 0;
        const invoiceExpiration = item.timestamp + item.expire_time;
        if (invoiceExpiration < now) {
          return (
            <View style={styles.iconWidth}>
              <BlueTransactionExpiredIcon />
            </View>
          );
        }
      } else {
        return (
          <View style={styles.iconWidth}>
            <BlueTransactionOffchainIncomingIcon />
          </View>
        );
      }
    }

    if (!item.confirmations) {
      return (
        <View style={styles.iconWidth}>
          <BlueTransactionPendingIcon />
        </View>
      );
    } else if (item.value < 0) {
      return (
        <View style={styles.iconWidth}>
          <BlueTransactionOutgoingIcon />
        </View>
      );
    } else {
      return (
        <View style={styles.iconWidth}>
          <BlueTransactionIncomingIcon />
        </View>
      );
    }
  }, [item]);

  useEffect(() => {
    setSubtitleNumberOfLines(1);
  }, [subtitle]);

  const onPress = useCallback(async () => {
    if (item.hash) {
      navigate('TransactionStatus', { hash: item.hash });
    } else if (item.type === 'user_invoice' || item.type === 'payment_request' || item.type === 'paid_invoice') {
      const lightningWallet = wallets.filter(wallet => wallet?.getID() === item.walletID);
      if (lightningWallet.length === 1) {
        try {
          // is it a successful lnurl-pay?
          const LN = new Lnurl(false, AsyncStorage);
          let paymentHash = item.payment_hash;
          if (typeof paymentHash === 'object') {
            paymentHash = Buffer.from(paymentHash.data).toString('hex');
          }
          const loaded = await LN.loadSuccessfulPayment(paymentHash);
          if (loaded) {
            NavigationService.navigate('ScanLndInvoiceRoot', {
              screen: 'LnurlPaySuccess',
              params: {
                paymentHash,
                justPaid: false,
                fromWalletID: lightningWallet[0].getID(),
              },
            });
            return;
          }
        } catch (e) {
          console.log(e);
        }

        navigate('LNDViewInvoice', {
          invoice: item,
          walletID: lightningWallet[0].getID(),
          isModal: false,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, wallets]);

  const handleOnExpandNote = useCallback(() => {
    setSubtitleNumberOfLines(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtitle]);

  const subtitleProps = useMemo(() => ({ numberOfLines: subtitleNumberOfLines }), [subtitleNumberOfLines]);

  const handleOnCopyAmountTap = useCallback(() => Clipboard.setString(rowTitle.replace(/[\s\\-]/g, '')), [rowTitle]);
  const handleOnCopyTransactionID = useCallback(() => Clipboard.setString(item.hash), [item.hash]);
  const handleOnCopyNote = useCallback(() => Clipboard.setString(subtitle), [subtitle]);
  const handleOnViewOnBlockExplorer = useCallback(() => {
    const url = `https://mempool.space/tx/${item.hash}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      }
    });
  }, [item.hash]);
  const handleCopyOpenInBlockExplorerPress = useCallback(() => {
    Clipboard.setString(`https://mempool.space/tx/${item.hash}`);
  }, [item.hash]);

  const onToolTipPress = useCallback(id => {
    if (id === TransactionListItem.actionKeys.CopyAmount) {
      handleOnCopyAmountTap();
    } else if (id === TransactionListItem.actionKeys.CopyNote) {
      handleOnCopyNote();
    } else if (id === TransactionListItem.actionKeys.OpenInBlockExplorer) {
      handleOnViewOnBlockExplorer();
    } else if (id === TransactionListItem.actionKeys.ExpandNote) {
      handleOnExpandNote();
    } else if (id === TransactionListItem.actionKeys.CopyBlockExplorerLink) {
      handleCopyOpenInBlockExplorerPress();
    } else if (id === TransactionListItem.actionKeys.CopyTXID) {
      handleOnCopyTransactionID();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toolTipActions = useMemo(() => {
    const actions = [];
    if (rowTitle !== loc.lnd.expired) {
      actions.push({
        id: TransactionListItem.actionKeys.CopyAmount,
        text: `${loc.transactions.details_copy} ${loc.send.create_amount}`,
        icon: TransactionListItem.actionIcons.Clipboard,
      });
    }

    if (subtitle) {
      actions.push({
        id: TransactionListItem.actionKeys.CopyNote,
        text: `${loc.transactions.details_copy} ${loc.transactions.note}`,
        icon: TransactionListItem.actionIcons.Clipboard,
      });
    }
    if (item.hash) {
      actions.push(
        {
          id: TransactionListItem.actionKeys.CopyTXID,
          text: `${loc.transactions.details_copy} ${loc.transactions.txid}`,
          icon: TransactionListItem.actionIcons.Clipboard,
        },
        {
          id: TransactionListItem.actionKeys.CopyBlockExplorerLink,
          text: `${loc.transactions.details_copy} ${loc.transactions.block_explorer_link}`,
          icon: TransactionListItem.actionIcons.Clipboard,
        },
      );
    }

    return actions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.hash, subtitle, rowTitle, subtitleNumberOfLines, txMetadata]);

  const toolTipSubMenu = useMemo(() => {
    const submenu = {
      menuOptions: ['displayInline'], // <- set the `menuOptions` property
      menuItems: [],
      menuTitle: '',
    };
    if (item.hash) {
      submenu.menuItems.push({
        actionKey: TransactionListItem.actionKeys.OpenInBlockExplorer,
        actionTitle: loc.transactions.details_show_in_block_explorer,
        icon: TransactionListItem.actionIcons.Link,
      });
    }
    if (subtitle && subtitleNumberOfLines === 1) {
      submenu.menuItems.push({
        actionKey: TransactionListItem.actionKeys.ExpandNote,
        actionTitle: loc.transactions.expand_note,
        icon: TransactionListItem.actionIcons.Note,
      });
    }
    return submenu;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <ToolTipMenu actions={toolTipActions} submenu={toolTipSubMenu} onPress={onToolTipPress}>
        <BlueListItem
          leftAvatar={avatar}
          title={title}
          subtitleNumberOfLines={subtitleNumberOfLines}
          subtitle={subtitle}
          subtitleProps={subtitleProps}
          onPress={onPress}
          chevron={false}
          Component={TouchableOpacity}
          rightTitle={rowTitle}
          rightTitleStyle={rowTitleStyle}
          containerStyle={containerStyle}
        />
      </ToolTipMenu>
    </View>
  );
});

TransactionListItem.actionKeys = {
  CopyTXID: 'copyTX_ID',
  CopyBlockExplorerLink: 'copy_blockExplorer',
  ExpandNote: 'expandNote',
  OpenInBlockExplorer: 'open_in_blockExplorer',
  CopyAmount: 'copyAmount',
  CopyNote: 'copyNote',
};

TransactionListItem.actionIcons = {
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

const styles = StyleSheet.create({
  iconWidth: { width: 25 },
  container: { marginHorizontal: 4 },
});
