import React, { memo, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import { Animated, Easing, Linking, Pressable, Text, TextStyle, ViewStyle, StyleSheet, View, useWindowDimensions } from 'react-native';
import { resolveTransactionNoteMetadataKey } from '../blue_modules/transactionDisplayState';
import Lnurl from '../class/lnurl';
import { LightningArkWallet } from '../class/wallets/lightning-ark-wallet';
import { LightningTransaction, Transaction } from '../class/wallets/types';
import TransactionListIcon, { resolveTransactionListIconVariant } from '../components/icons/TransactionListIcon';
import loc, { formatBalanceWithoutSuffix, formatTransactionListDate, transactionTimeToReadable } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { useSettings } from '../hooks/context/useSettings';
import { useTheme } from './themes';
import { Action } from './types';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../navigation/DetailViewStackParamList';
import { useStorage } from '../hooks/context/useStorage';
import ToolTipMenu from './TooltipMenu';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';
import { pop } from '../NavigationService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { uint8ArrayToHex } from '../blue_modules/uint8array-extras';
import ListItem from './ListItem';

const styles = StyleSheet.create({
  fullWidthButton: {
    width: '100%',
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  avatarContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  rightColumn: {
    marginLeft: 8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightTitle: {
    textAlign: 'right',
  },
  animatedScaleContainer: {
    width: '100%',
  },
});

type AnimatedPressableRowProps = {
  onPress: () => void;
  children: React.ReactNode;
  accessibilityLabel: string;
};

const AnimatedPressableRow: React.FC<AnimatedPressableRowProps> = ({ onPress, children, accessibilityLabel }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (toValue: number) => {
      Animated.timing(scaleAnim, {
        toValue,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [scaleAnim],
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[styles.animatedScaleContainer, { transform: [{ scale: scaleAnim }] }]}>{children}</Animated.View>
    </Pressable>
  );
};

interface TransactionListItemProps {
  itemPriceUnit: BitcoinUnit;
  walletID: string;
  item: Transaction & LightningTransaction; // using type intersection to have less issues with ts
  searchQuery?: string;
  style?: ViewStyle;
  renderHighlightedText?: (text: string, query: string) => React.ReactElement;
  onPress?: () => void;
  disableNavigation?: boolean;
}

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList>;

const TransactionListItemComponent: React.FC<TransactionListItemProps> = ({
  item,
  itemPriceUnit,
  walletID,
  searchQuery,
  style,
  renderHighlightedText,
  onPress: customOnPress,
  disableNavigation = false,
}: TransactionListItemProps) => {
  const { colors } = useTheme();
  const { navigate } = useExtendedNavigation<NavigationProps>();
  const { txMetadata, counterpartyMetadata, wallets } = useStorage();
  const { language, selectedBlockExplorer } = useSettings();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const containerStyle = useMemo(
    () => ({
      backgroundColor: colors.background,
      borderBottomColor: colors.lightBorder,
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
  const metadataKey = resolveTransactionNoteMetadataKey(item);
  const txMemo =
    (counterparty ? `[${shortenContactName(counterparty)}] ` : '') + (metadataKey ? (txMetadata[metadataKey]?.memo ?? '') : '');
  const noteForCopy = (txMemo || item.memo || '').trim() || undefined;

  // LightningArkWallet rows are tagged by synthetic txid in
  // lightning-ark-wallet.getTransactions(): `boarding-…` for refills, everything
  // else is Lightning. Used for pending-refill state and off-chain icons, not
  // the date subtitle (which matches on-chain wallets: timestamp only).
  const arkRowKind = useMemo<'Lightning' | 'Refill' | undefined>(() => {
    const wallet = wallets.find(w => w.getID() === item.walletID);
    if (wallet?.type !== LightningArkWallet.type) return undefined;
    const txid = (item as { txid?: string }).txid;
    if (txid?.startsWith('boarding-')) return 'Refill';
    return 'Lightning';
  }, [item, wallets]);

  // A refill is "Pending" until the SDK settles its boarding UTXO into a VTXO
  // (also when it enters the spendable balance). getTransactions() pass 2 tags
  // those not-yet-settled rows with a `boarding-utxo-…` id; settled refills use
  // `boarding-…` and render as a normal confirmed receive.
  const isPendingRefill = useMemo(
    () => arkRowKind === 'Refill' && !!(item as { txid?: string }).txid?.startsWith('boarding-utxo-'),
    [arkRowKind, item],
  );

  const listTitleKey = useMemo((): 'pending' | 'sent' | 'received' => {
    if (isPendingRefill) return 'pending';
    if (item.category === 'receive' && item.confirmations! < 3) return 'pending';
    if (item.type === 'bitcoind_tx') return item.value! < 0 ? 'sent' : 'received';
    if (item.type === 'paid_invoice') return 'sent';
    if (item.type === 'user_invoice' || item.type === 'payment_request') {
      if (!item.ispaid) return 'pending';
      return 'received';
    }
    if (!item.confirmations) return 'pending';
    return item.value! < 0 ? 'sent' : 'received';
  }, [isPendingRefill, item.category, item.confirmations, item.type, item.value, item.ispaid]);

  const listTitle = useMemo(() => {
    if (listTitleKey === 'pending') return loc.transactions.pending;
    if (listTitleKey === 'sent') return loc.transactions.list_title_sent;
    return loc.transactions.list_title_received;
  }, [listTitleKey]);

  const isPending = listTitleKey === 'pending';

  const dateLine = useMemo(() => {
    return isPending ? transactionTimeToReadable(item.timestamp) : formatTransactionListDate(item.timestamp * 1000);
    // language in deps so date format updates when locale changes (formatters use global locale)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, item.timestamp, language]);

  const formattedAmount = useMemo(() => {
    return formatBalanceWithoutSuffix(item.value, itemPriceUnit, true).toString();
  }, [item.value, itemPriceUnit]);

  const transactionIdentifier = useMemo(() => {
    if (item.hash) return item.hash;
    const txid = (item as { txid?: string }).txid;
    if (txid) return txid;
    const rawPaymentHash = item.payment_hash;
    if (!rawPaymentHash) return undefined;
    return typeof rawPaymentHash === 'string' ? rawPaymentHash : uint8ArrayToHex(new Uint8Array((rawPaymentHash as any).data));
  }, [item]);

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

  const rowTitleStyle = useMemo<TextStyle>(() => {
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
      lineHeight: Math.round(20 * fontScale),
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
    fontScale,
  ]);

  const determineTransactionTypeAndAvatar = () => {
    const iconVariant = resolveTransactionListIconVariant({ item, arkRowKind, isPendingRefill });

    let label: string;
    if (item.type === 'paid_invoice') {
      label = loc.transactions.offchain;
    } else if (iconVariant === 'expired') {
      label = loc.transactions.expired_transaction;
    } else if (iconVariant === 'pending' && (item.type === 'user_invoice' || item.type === 'payment_request') && !item.ispaid) {
      label = loc.transactions.expired_transaction;
    } else if (iconVariant === 'pending') {
      label = loc.transactions.pending_transaction;
    } else if (iconVariant === 'onchain') {
      label = loc.transactions.onchain;
    } else if (iconVariant === 'outgoing' || iconVariant === 'lightning-outgoing') {
      label = loc.transactions.outgoing_transaction;
    } else {
      label = loc.transactions.incoming_transaction;
    }

    return {
      label,
      icon: <TransactionListIcon variant={iconVariant} />,
    };
  };

  const { label: transactionTypeLabel, icon: avatar } = determineTransactionTypeAndAvatar();

  const amountWithUnit = useMemo(() => {
    const unitSuffix = itemPriceUnit === BitcoinUnit.BTC || itemPriceUnit === BitcoinUnit.SATS ? ` ${itemPriceUnit}` : ' ';
    return `${formattedAmount}${unitSuffix}`;
  }, [formattedAmount, itemPriceUnit]);

  const onPress = useCallback(async () => {
    // If a custom onPress handler was provided, use it and return
    if (customOnPress) {
      customOnPress();
      if (disableNavigation) return;
    }

    if (item.hash) {
      if (renderHighlightedText) {
        pop();
      }
      navigate('TransactionStatus', { hash: item.hash, walletID, tx: item });
    } else if (item.type === 'user_invoice' || item.type === 'payment_request' || item.type === 'paid_invoice' || item.payment_request) {
      // A settled Arkade swap is an enriched native Ark leg (type 'bitcoind_tx')
      // carrying the swap's invoice payload (payment_request/hash/preimage). Route
      // it to the Lightning invoice view by that payload, not by type — otherwise
      // it falls through to the on-chain TransactionStatus branch below.
      const lightningWallet = wallets.filter(wallet => wallet?.getID() === item.walletID);
      if (lightningWallet.length === 1) {
        try {
          // is it a successful lnurl-pay?
          const LN = new Lnurl(false, AsyncStorage);
          const rawPaymentHash = item.payment_hash;
          if (!rawPaymentHash) throw new Error('Missing payment hash');
          const normalizedPaymentHash =
            typeof rawPaymentHash === 'string' ? rawPaymentHash : uint8ArrayToHex(new Uint8Array((rawPaymentHash as any).data));
          const loaded = await LN.loadSuccessfulPayment(normalizedPaymentHash);
          if (loaded) {
            navigate('ScanLNDInvoiceRoot', {
              screen: 'LnurlPaySuccess',
              params: {
                paymentHash: normalizedPaymentHash,
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
    } else if ((item as { txid?: string }).txid) {
      // Hash-less Ark rows carry a synthetic `txid`. Native transfer legs (`ark-…`)
      // open the hash-less-tolerant TransactionStatus detail. Refill rows carry the
      // real on-chain txid in `hash` and are handled by the branch above.
      const txid = (item as { txid: string }).txid;
      navigate('TransactionStatus', { tx: item, hash: txid, walletID });
    }
  }, [item, renderHighlightedText, navigate, walletID, wallets, customOnPress, disableNavigation]);

  const handleOnDetailsPress = useCallback(() => {
    if (walletID && item && item.hash) {
      navigate('TransactionStatus', { hash: item.hash, walletID, tx: item });
    } else if (item.type === 'user_invoice' || item.type === 'payment_request' || item.type === 'paid_invoice' || item.payment_request) {
      // Settled Arkade swaps carry invoice data on a 'bitcoind_tx' leg; route by
      // payload so they open the Lightning invoice view (see onPress above).
      const lightningWallet = wallets.find(wallet => wallet?.getID() === item.walletID);
      if (lightningWallet) {
        navigate('LNDViewInvoice', {
          invoice: item,
          walletID: lightningWallet.getID(),
        });
      }
    } else if ((item as { txid?: string }).txid) {
      const txid = (item as { txid: string }).txid;
      navigate('TransactionStatus', { tx: item, hash: txid, walletID });
    }
  }, [item, navigate, walletID, wallets]);

  const handleOnCopyAmountTap = useCallback(() => Clipboard.setString(rowTitle.replace(/[\s\\-]/g, '')), [rowTitle]);
  const handleOnCopyTransactionID = useCallback(() => Clipboard.setString(transactionIdentifier ?? ''), [transactionIdentifier]);
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
        hidden: !transactionIdentifier,
      },
      {
        ...CommonToolTipActions.CopyBlockExplorerLink,
        hidden: !item.hash,
      },
      [{ ...CommonToolTipActions.OpenInBlockExplorer, hidden: !item.hash }, CommonToolTipActions.Details],
    ];

    return actions as Action[];
  }, [rowTitle, noteForCopy, transactionIdentifier, item.hash]);

  const title = listTitle;
  const subtitle = dateLine;
  const subtitleNumberOfLines: number = 1;

  const titleStyle = useMemo(() => ({ color: colors.foregroundColor }), [colors.foregroundColor]);
  const subtitleStyle = useMemo(() => ({ color: colors.alternativeTextColor }), [colors.alternativeTextColor]);

  const subtitleContent = useMemo(() => {
    if (!subtitle) return null;
    const maxLines = subtitleNumberOfLines === 0 ? undefined : subtitleNumberOfLines;

    if (renderHighlightedText && searchQuery) {
      const highlighted = renderHighlightedText(subtitle, searchQuery);
      if (React.isValidElement(highlighted)) {
        const highlightedElement = highlighted as React.ReactElement<{
          numberOfLines?: number;
          style?: TextStyle | TextStyle[];
        }>;
        const existingStyle = highlightedElement.props?.style;
        const mergedStyle: TextStyle[] = (
          Array.isArray(existingStyle)
            ? [styles.subtitle, subtitleStyle, ...existingStyle]
            : [styles.subtitle, subtitleStyle, existingStyle]
        ).filter(Boolean) as TextStyle[];

        return React.cloneElement(highlightedElement, {
          numberOfLines: maxLines,
          style: mergedStyle,
        });
      }
      return highlighted;
    }

    return (
      <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={maxLines}>
        {subtitle}
      </Text>
    );
  }, [subtitle, subtitleNumberOfLines, renderHighlightedText, searchQuery, subtitleStyle]);

  return (
    <ToolTipMenu
      actions={toolTipActions}
      onPressMenuItem={onToolTipPress}
      shouldOpenOnLongPress
      style={styles.fullWidthButton}
      accessibilityLabel={`${transactionTypeLabel}, ${amountWithUnit}, ${subtitle ?? title}`}
      accessibilityRole="button"
    >
      <AnimatedPressableRow onPress={onPress} accessibilityLabel={`${transactionTypeLabel}, ${amountWithUnit}, ${subtitle ?? title}`}>
        {/* @ts-ignore - Context menu wrapper types can be overly strict about child element props */}
        <ListItem
          leftAvatar={avatar}
          title={listTitle}
          subtitle={dateLine}
          chevron={false}
          rightTitle={rowTitle}
          rightTitleStyle={rowTitleStyle}
          rightSubtitle={noteForCopy}
          rightSubtitleStyle={styles.rightColumn}
          containerStyle={combinedStyle}
          testID="TransactionListItem"
          accessibilityRole="button"
          accessibilityLabel={`${transactionTypeLabel}, ${amountWithUnit}, ${subtitle ?? title}`}
        >
          <View style={styles.row}>
            <View style={styles.avatarContainer}>{avatar}</View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, titleStyle]} numberOfLines={1}>
                {title}
              </Text>
              {subtitleContent}
            </View>
            <View style={styles.rightColumn}>
              <Text style={[styles.rightTitle, rowTitleStyle]} numberOfLines={1}>
                {rowTitle}
              </Text>
            </View>
          </View>
        </ListItem>
      </AnimatedPressableRow>
    </ToolTipMenu>
  );
};

export const TransactionListItem = memo(TransactionListItemComponent);
