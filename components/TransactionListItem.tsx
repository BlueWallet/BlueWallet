import React, { useCallback, useMemo, useRef, memo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import { uint8ArrayToHex } from '../blue_modules/uint8array-extras';
import { Linking, Text, View, ViewStyle, StyleSheet } from 'react-native';
import Lnurl from '../class/lnurl';
import { LightningTransaction, Transaction } from '../class/wallets/types';
import TransactionExpiredIcon from '../components/icons/TransactionExpiredIcon';
import TransactionIncomingIcon from '../components/icons/TransactionIncomingIcon';
import TransactionOffchainIcon from '../components/icons/TransactionOffchainIcon';
import TransactionOffchainIncomingIcon from '../components/icons/TransactionOffchainIncomingIcon';
import TransactionOnchainIcon from '../components/icons/TransactionOnchainIcon';
import TransactionOutgoingIcon from '../components/icons/TransactionOutgoingIcon';
import TransactionPendingIcon from '../components/icons/TransactionPendingIcon';
import loc, { formatBalanceWithoutSuffix, formatTransactionListDate, transactionTimeToReadable } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { useSettings } from '../hooks/context/useSettings';
import ListItem from './ListItem';
import { useTheme } from './themes';
import { Action, ToolTipMenuProps } from './types';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../navigation/DetailViewStackParamList';
import { useStorage } from '../hooks/context/useStorage';
import ToolTipMenu from './TooltipMenu';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';
import { pop } from '../NavigationService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
  dateLine: {
    fontSize: 13,
  },
  highlight: {
    backgroundColor: '#FFF5C0',
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
  },
});

interface TransactionListItemProps {
  itemPriceUnit?: BitcoinUnit;
  walletID: string;
  item: Transaction & LightningTransaction; // using type intersection to have less issues with ts
  searchQuery?: string;
  style?: ViewStyle;
  renderHighlightedText?: (text: string, query: string) => JSX.Element;
  onPress?: () => void;
}

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList>;

export const TransactionListItem: React.FC<TransactionListItemProps> = memo(
  ({
    item,
    itemPriceUnit = BitcoinUnit.BTC,
    walletID,
    searchQuery,
    style,
    renderHighlightedText,
    onPress: customOnPress,
  }: TransactionListItemProps) => {
    const { colors } = useTheme();
    const { navigate } = useExtendedNavigation<NavigationProps>();
    const menuRef = useRef<ToolTipMenuProps>();
    const { txMetadata, counterpartyMetadata, wallets } = useStorage();
    const { language, selectedBlockExplorer } = useSettings();
    const insets = useSafeAreaInsets();
    const containerStyle = useMemo(
      () => ({
        backgroundColor: colors.background,
        borderBottomColor: colors.lightBorder,
        paddingLeft: 16,

        paddingRight: 16,
      }),
      [colors.background, colors.lightBorder],
    );

    const combinedStyle = useMemo(() => [containerStyle, style], [containerStyle, style]);

    const shortenContactName = (name: string): string => {
      if (name.length < 16) return name;
      return name.substr(0, 7) + '...' + name.substr(name.length - 7, 7);
    };

    let counterparty;
    if (item.counterparty) {
      counterparty = counterpartyMetadata?.[item.counterparty]?.label ?? item.counterparty;
    }
    const txMemo = (counterparty ? `[${shortenContactName(counterparty)}] ` : '') + (txMetadata[item.hash]?.memo ?? '');
    const noteForCopy = (txMemo || item.memo || '').trim() || undefined;

    const listTitleKey = useMemo((): 'pending' | 'sent' | 'received' => {
      if (item.category === 'receive' && item.confirmations! < 3) return 'pending';
      if (item.type === 'bitcoind_tx') return item.value! < 0 ? 'sent' : 'received';
      if (item.type === 'paid_invoice') return 'sent';
      if (item.type === 'user_invoice' || item.type === 'payment_request') {
        if (!item.ispaid) return 'pending';
        return 'received';
      }
      if (!item.confirmations) return 'pending';
      return item.value! < 0 ? 'sent' : 'received';
    }, [item.category, item.confirmations, item.type, item.value, item.ispaid]);

    const listTitle = useMemo(() => {
      if (listTitleKey === 'pending') return loc.transactions.pending;
      if (listTitleKey === 'sent') return loc.transactions.list_title_sent;
      return loc.transactions.list_title_received;
    }, [listTitleKey]);

    const isPending = listTitleKey === 'pending';

    const dateLine = useMemo(() => {
      if (isPending) return transactionTimeToReadable(item.timestamp);
      return formatTransactionListDate(item.timestamp * 1000);
      // language in deps so date format updates when locale changes (formatters use global locale)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPending, item.timestamp, language]);

    const dateLineStyle = useMemo(() => [styles.dateLine, { color: colors.alternativeTextColor }], [colors.alternativeTextColor]);

    const formattedAmount = useMemo(() => {
      return formatBalanceWithoutSuffix(item.value && item.value, itemPriceUnit, true).toString();
    }, [item.value, itemPriceUnit]);

    const rowTitle = useMemo(() => {
      if (item.type === 'user_invoice' || item.type === 'payment_request') {
        const currentDate = new Date();
        const now = Math.floor(currentDate.getTime() / 1000);
        const invoiceExpiration = item.timestamp! + item.expire_time!;
        if (invoiceExpiration > now || item.ispaid) {
          return formattedAmount;
        } else {
          return loc.lnd.expired;
        }
      }
      return formattedAmount;
    }, [item, formattedAmount]);

    const rightMemoStyle = useMemo(
      () => [styles.dateLine, { color: colors.alternativeTextColor, textAlign: 'right' as const }],
      [colors.alternativeTextColor],
    );

    const rowTitleStyle = useMemo(() => {
      let color = colors.successColor;

      if (item.type === 'user_invoice' || item.type === 'payment_request') {
        const currentDate = new Date();
        const now = (currentDate.getTime() / 1000) | 0; // eslint-disable-line no-bitwise
        const invoiceExpiration = item.timestamp! + item.expire_time!;

        if (invoiceExpiration > now) {
          color = colors.successColor;
        } else if (invoiceExpiration < now) {
          if (item.ispaid) {
            color = colors.successColor;
          } else {
            color = '#9AA0AA';
          }
        }
      } else if (item.value! / 100000000 < 0) {
        color = colors.foregroundColor;
      }

      return {
        color,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'right',
        paddingRight: insets.right,
        paddingLeft: insets.left,
      };
    }, [
      colors.successColor,
      colors.foregroundColor,
      item.type,
      item.value,
      item.timestamp,
      item.expire_time,
      item.ispaid,
      insets.right,
      insets.left,
    ]);

    const determineTransactionTypeAndAvatar = () => {
      if (item.category === 'receive' && item.confirmations! < 3) {
        return {
          label: loc.transactions.pending_transaction,
          icon: <TransactionPendingIcon />,
        };
      }

      if (item.type && item.type === 'bitcoind_tx') {
        return {
          label: loc.transactions.onchain,
          icon: <TransactionOnchainIcon />,
        };
      }

      if (item.type === 'paid_invoice') {
        return {
          label: loc.transactions.offchain,
          icon: <TransactionOffchainIcon />,
        };
      }

      if (item.type === 'user_invoice' || item.type === 'payment_request') {
        const currentDate = new Date();
        const now = (currentDate.getTime() / 1000) | 0; // eslint-disable-line no-bitwise
        const invoiceExpiration = item.timestamp! + item.expire_time!;
        if (!item.ispaid && invoiceExpiration < now) {
          return {
            label: loc.transactions.expired_transaction,
            icon: <TransactionExpiredIcon />,
          };
        } else if (!item.ispaid) {
          return {
            label: loc.transactions.expired_transaction,
            icon: <TransactionPendingIcon />,
          };
        } else {
          return {
            label: loc.transactions.incoming_transaction,
            icon: <TransactionOffchainIncomingIcon />,
          };
        }
      }

      if (!item.confirmations) {
        return {
          label: loc.transactions.pending_transaction,
          icon: <TransactionPendingIcon />,
        };
      } else if (item.value! < 0) {
        return {
          label: loc.transactions.outgoing_transaction,
          icon: <TransactionOutgoingIcon />,
        };
      } else {
        return {
          label: loc.transactions.incoming_transaction,
          icon: <TransactionIncomingIcon />,
        };
      }
    };

    const { label: transactionTypeLabel, icon: avatar } = determineTransactionTypeAndAvatar();

    const amountWithUnit = useMemo(() => {
      const unitSuffix = itemPriceUnit === BitcoinUnit.BTC || itemPriceUnit === BitcoinUnit.SATS ? ` ${itemPriceUnit}` : ' ';
      return `${formattedAmount}${unitSuffix}`;
    }, [formattedAmount, itemPriceUnit]);

    const onPress = useCallback(async () => {
      menuRef?.current?.dismissMenu?.();
      // If a custom onPress handler was provided, use it and return
      if (customOnPress) {
        customOnPress();
        return;
      }

      if (item.hash) {
        if (renderHighlightedText) {
          pop();
        }
        navigate('TransactionStatus', { hash: item.hash, walletID });
      } else if (item.type === 'user_invoice' || item.type === 'payment_request' || item.type === 'paid_invoice') {
        const lightningWallet = wallets.filter(wallet => wallet?.getID() === item.walletID);
        if (lightningWallet.length === 1) {
          try {
            // is it a successful lnurl-pay?
            const LN = new Lnurl(false, AsyncStorage);
            let paymentHash = item.payment_hash!;
            if (typeof paymentHash === 'object') {
              paymentHash = uint8ArrayToHex(new Uint8Array((paymentHash as any).data));
            }
            const loaded = await LN.loadSuccessfulPayment(paymentHash);
            if (loaded) {
              navigate('ScanLNDInvoiceRoot', {
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
            console.debug(e);
          }

          navigate('LNDViewInvoice', {
            invoice: item,
            walletID: lightningWallet[0].getID(),
          });
        }
      } else {
        console.log('cant handle press');
      }
    }, [item, renderHighlightedText, navigate, walletID, wallets, customOnPress]);

    const handleOnDetailsPress = useCallback(() => {
      if (walletID && item && item.hash) {
        navigate('TransactionDetails', { tx: item, hash: item.hash, walletID });
      } else {
        const lightningWallet = wallets.find(wallet => wallet?.getID() === item.walletID);
        if (lightningWallet) {
          navigate('LNDViewInvoice', {
            invoice: item,
            walletID: lightningWallet.getID(),
          });
        }
      }
    }, [item, navigate, walletID, wallets]);

    const handleOnCopyAmountTap = useCallback(() => Clipboard.setString(rowTitle.replace(/[\s\\-]/g, '')), [rowTitle]);
    const handleOnCopyTransactionID = useCallback(() => Clipboard.setString(item.hash), [item.hash]);
    const handleOnCopyNote = useCallback(() => Clipboard.setString(noteForCopy ?? ''), [noteForCopy]);
    const handleOnViewOnBlockExplorer = useCallback(() => {
      const url = `${selectedBlockExplorer.url}/tx/${item.hash}`;
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        }
      });
    }, [item.hash, selectedBlockExplorer]);
    const handleCopyOpenInBlockExplorerPress = useCallback(() => {
      Clipboard.setString(`${selectedBlockExplorer.url}/tx/${item.hash}`);
    }, [item.hash, selectedBlockExplorer]);

    const onToolTipPress = useCallback(
      (id: any) => {
        if (id === CommonToolTipActions.CopyAmount.id) {
          handleOnCopyAmountTap();
        } else if (id === CommonToolTipActions.CopyNote.id) {
          handleOnCopyNote();
        } else if (id === CommonToolTipActions.OpenInBlockExplorer.id) {
          handleOnViewOnBlockExplorer();
        } else if (id === CommonToolTipActions.CopyBlockExplorerLink.id) {
          handleCopyOpenInBlockExplorerPress();
        } else if (id === CommonToolTipActions.CopyTXID.id) {
          handleOnCopyTransactionID();
        } else if (id === CommonToolTipActions.Details.id) {
          handleOnDetailsPress();
        }
      },
      [
        handleCopyOpenInBlockExplorerPress,
        handleOnCopyAmountTap,
        handleOnCopyNote,
        handleOnCopyTransactionID,
        handleOnDetailsPress,
        handleOnViewOnBlockExplorer,
      ],
    );
    const toolTipActions = useMemo((): Action[] => {
      const actions: (Action | Action[])[] = [
        {
          ...CommonToolTipActions.CopyAmount,
          hidden: rowTitle === loc.lnd.expired,
        },
        {
          ...CommonToolTipActions.CopyNote,
          hidden: !noteForCopy,
        },
        {
          ...CommonToolTipActions.CopyTXID,
          hidden: !item.hash,
        },
        {
          ...CommonToolTipActions.CopyBlockExplorerLink,
          hidden: !item.hash,
        },
        [{ ...CommonToolTipActions.OpenInBlockExplorer, hidden: !item.hash }, CommonToolTipActions.Details],
      ];

      return actions as Action[];
    }, [rowTitle, noteForCopy, item.hash]);

    return (
      <ToolTipMenu
        isButton
        actions={toolTipActions}
        onPressMenuItem={onToolTipPress}
        onPress={onPress}
        accessibilityLabel={`${transactionTypeLabel}, ${amountWithUnit}, ${dateLine}`}
        accessibilityRole="button"
      >
        <ListItem
          leftAvatar={avatar}
          title={listTitle}
          subtitle={<Text style={dateLineStyle}>{dateLine}</Text>}
          Component={View}
          chevron={false}
          rightTitle={rowTitle}
          rightTitleStyle={rowTitleStyle}
          rightSubtitle={noteForCopy}
          rightSubtitleStyle={rightMemoStyle}
          containerStyle={combinedStyle}
          testID="TransactionListItem"
        />
      </ToolTipMenu>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.item.hash === nextProps.item.hash &&
      prevProps.item.timestamp === nextProps.item.timestamp &&
      prevProps.itemPriceUnit === nextProps.itemPriceUnit &&
      prevProps.walletID === nextProps.walletID &&
      prevProps.searchQuery === nextProps.searchQuery
    );
  },
);
