import { xnaToSats, satsToXna, absSats } from '../blue_modules/neurai/amounts';
import React, { useCallback, useMemo, memo, useRef } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { Animated, Easing, Linking, Pressable, Text, TextStyle, ViewStyle, StyleSheet, View } from 'react-native';
import { Transaction } from '../class/wallets/types';
import TransactionIncomingIcon from '../components/icons/TransactionIncomingIcon';
import TransactionOutgoingIcon from '../components/icons/TransactionOutgoingIcon';
import TransactionPendingIcon from '../components/icons/TransactionPendingIcon';
import TransactionAssetIcon from '../components/icons/TransactionAssetIcon';
import TransactionPrivacyIcon from '../components/icons/TransactionPrivacyIcon';
import { usePrivacyTxKind } from '../blue_modules/neurai/privacy/txTags';
import { formatAssetAmount } from '../blue_modules/neurai/assetUtils';
import dayjs from 'dayjs';
import loc, { formatBalanceWithoutSuffix, formatTransactionListDate, transactionTimeToReadable } from '../loc';
import { XnaUnit } from '../models/xnaUnits';
import { getBlockExplorerUrlForWallet } from '../models/blockExplorer';
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
import ListItem from './ListItem';

const styles = StyleSheet.create({
  dateLine: {
    fontSize: 13,
  },
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
  itemPriceUnit?: XnaUnit;
  walletID: string;
  item: Transaction;
  searchQuery?: string;
  style?: ViewStyle;
  renderHighlightedText?: (text: string, query: string) => React.ReactElement;
  onPress?: () => void;
  disableNavigation?: boolean;
  /** The list already shows the day above the row, so the row only needs the time. */
  timeOnly?: boolean;
}

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList>;

export const TransactionListItem: React.FC<TransactionListItemProps> = memo(
  ({
    item,
    itemPriceUnit = XnaUnit.XNA,
    walletID,
    searchQuery,
    style,
    renderHighlightedText,
    onPress: customOnPress,
    disableNavigation = false,
    timeOnly = false,
  }: TransactionListItemProps) => {
    const { colors } = useTheme();
    const { navigate } = useExtendedNavigation<NavigationProps>();
    const { txMetadata, wallets } = useStorage();
    const { language, selectedBlockExplorer, selectedTestnetBlockExplorer } = useSettings();
    const explorerUrl = useMemo(() => {
      const w = wallets.find(x => x.getID() === walletID);
      return getBlockExplorerUrlForWallet(w as any, selectedBlockExplorer.url, selectedTestnetBlockExplorer.url);
    }, [wallets, walletID, selectedBlockExplorer, selectedTestnetBlockExplorer]);
    const insets = useSafeAreaInsets();
    const containerStyle = useMemo(
      () => ({
        backgroundColor: colors.background,
        borderBottomColor: colors.lightBorder,
      }),
      [colors.background, colors.lightBorder],
    );

    const combinedStyle = useMemo(() => [containerStyle, style], [containerStyle, style]);

    const txMemo = txMetadata[item.hash]?.memo ?? '';
    const privacyKind = usePrivacyTxKind(walletID, item.hash);
    const noteForCopy = txMemo.trim() || undefined;

    // A Neurai asset (token) transaction: direction and amount come from the
    // asset, not the XNA value (which only reflects the fee/change).
    const isAsset = !!item.assetName;
    const assetSent = xnaToSats(item.assetAmount ?? '0') < 0n;

    const listTitleKey = useMemo((): 'pending' | 'sent' | 'received' => {
      if (!item.confirmations) return 'pending';
      if (isAsset) return assetSent ? 'sent' : 'received';
      return item.value! < 0 ? 'sent' : 'received';
    }, [item.confirmations, item.value, isAsset, assetSent]);

    const listTitle = useMemo(() => {
      if (listTitleKey === 'pending') return loc.transactions.pending;
      if (listTitleKey === 'sent') return loc.transactions.list_title_sent;
      return loc.transactions.list_title_received;
    }, [listTitleKey]);

    const isPending = listTitleKey === 'pending';

    const dateLine = useMemo(() => {
      if (isPending) return transactionTimeToReadable(item.timestamp);
      if (timeOnly) return dayjs(item.timestamp * 1000).format('LT');
      return formatTransactionListDate(item.timestamp * 1000);
      // language in deps so date format updates when locale changes (formatters use global locale)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPending, timeOnly, item.timestamp, language]);

    const formattedAmount = useMemo(() => {
      return formatBalanceWithoutSuffix(item.value && item.value, itemPriceUnit, true).toString();
    }, [item.value, itemPriceUnit]);

    const rowTitle = useMemo(() => {
      if (isAsset) return `${formatAssetAmount(satsToXna(absSats(xnaToSats(item.assetAmount ?? '0'))))} ${item.assetName}`;
      return formattedAmount;
    }, [isAsset, item.assetAmount, item.assetName, formattedAmount]);

    const rowTitleStyle = useMemo<TextStyle>(() => {
      let color = colors.successColor;
      if (isAsset) {
        // Asset moved: red when it leaves, green when it arrives.
        color = assetSent ? '#d0021b' : colors.successColor;
      } else if (item.value! < 0n) {
        color = colors.foregroundColor;
      }
      return {
        color,
        fontSize: 15,
        fontWeight: '600' as TextStyle['fontWeight'],
        textAlign: 'right',
        paddingRight: insets.right,
        paddingLeft: insets.left,
      } as TextStyle;
    }, [colors.successColor, colors.foregroundColor, item.value, insets.right, insets.left, isAsset, assetSent]);

    const determineTransactionTypeAndAvatar = () => {
      // Privacy pool transactions keep their icon while pending; the title says "Pending".
      if (privacyKind) {
        const labels = { deposit: loc.privacy.tx_deposit, withdraw: loc.privacy.tx_withdraw, other: loc.privacy.tx_other };
        return {
          label: labels[privacyKind],
          icon: <TransactionPrivacyIcon kind={privacyKind} />,
        };
      } else if (!item.confirmations) {
        return {
          label: loc.transactions.pending_transaction,
          icon: <TransactionPendingIcon />,
        };
      } else if (isAsset) {
        return {
          label: assetSent ? loc.transactions.outgoing_transaction : loc.transactions.incoming_transaction,
          icon: <TransactionAssetIcon sent={assetSent} />,
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
      if (isAsset) return rowTitle;
      const unitSuffix = itemPriceUnit === XnaUnit.XNA || itemPriceUnit === XnaUnit.SATS ? ` ${itemPriceUnit}` : ' ';
      return `${formattedAmount}${unitSuffix}`;
    }, [isAsset, rowTitle, formattedAmount, itemPriceUnit]);

    // What the row shows: the direction as a sign (outgoing amounts already
    // carry their minus) and the unit, so a bare "5" never stands alone.
    const displayAmount = useMemo(() => {
      if (isAsset) return `${assetSent ? '-' : '+'}${rowTitle}`;
      return `${Number(item.value ?? 0) > 0 ? '+' : ''}${amountWithUnit.trim()}`;
    }, [isAsset, assetSent, rowTitle, item.value, amountWithUnit]);

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
        navigate('TransactionStatus', { hash: item.hash, walletID });
      } else {
        console.log('cant handle press');
      }
    }, [item, renderHighlightedText, navigate, walletID, customOnPress, disableNavigation]);

    const handleOnDetailsPress = useCallback(() => {
      if (walletID && item && item.hash) {
        // The transaction screen shows the details, the note and the explorer.
        navigate('TransactionStatus', { hash: item.hash, walletID });
      }
    }, [item, navigate, walletID]);

    const handleOnCopyAmountTap = useCallback(() => Clipboard.setString(rowTitle.replace(/[\s\\-]/g, '')), [rowTitle]);
    const handleOnCopyTransactionID = useCallback(() => Clipboard.setString(item.hash), [item.hash]);
    const handleOnCopyNote = useCallback(() => Clipboard.setString(noteForCopy ?? ''), [noteForCopy]);
    const handleOnViewOnBlockExplorer = useCallback(() => {
      const url = `${explorerUrl}/tx/${item.hash}`;
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        }
      });
    }, [item.hash, explorerUrl]);
    const handleCopyOpenInBlockExplorerPress = useCallback(() => {
      Clipboard.setString(`${explorerUrl}/tx/${item.hash}`);
    }, [item.hash, explorerUrl]);

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
    }, [noteForCopy, item.hash]);

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
          const highlightedElement = highlighted as React.ReactElement<{ numberOfLines?: number; style?: TextStyle | TextStyle[] }>;
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
            subtitle={<Text style={styles.dateLine}>{dateLine}</Text>}
            chevron={false}
            rightTitle={displayAmount}
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
  },
  (prevProps, nextProps) => {
    return (
      prevProps.item.hash === nextProps.item.hash &&
      prevProps.item.timestamp === nextProps.item.timestamp &&
      prevProps.itemPriceUnit === nextProps.itemPriceUnit &&
      prevProps.walletID === nextProps.walletID &&
      prevProps.searchQuery === nextProps.searchQuery &&
      prevProps.timeOnly === nextProps.timeOnly &&
      prevProps.style === nextProps.style
    );
  },
);
