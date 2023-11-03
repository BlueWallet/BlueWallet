import React, { useEffect, useRef, useContext, useState } from 'react';
import { View, Image, Text, StyleSheet, I18nManager, Pressable, useColorScheme, Platform } from 'react-native';
import { BluePrivateBalance } from '../../BlueComponents';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useNavigation } from '@react-navigation/native';
import navigationStyle from '../../components/navigationStyle';
import { LightningCustodianWallet, LightningLdkWallet, MultisigHDWallet } from '../../class';
import WalletGradient from '../../class/wallet-gradient';
import loc, { formatBalance, transactionTimeToReadable } from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '../../components/themes';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  itemRoot: {
    backgroundColor: 'transparent',
    padding: 10,
  },
  gradient: {
    padding: 15,
    borderRadius: 10,
    minHeight: 164,
    elevation: 5,
  },
  image: {
    width: 99,
    height: 94,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  transparentText: {
    backgroundColor: 'transparent',
  },
  tip: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginVertical: 24,
  },
  label: {
    backgroundColor: 'transparent',
    fontSize: 19,
    color: '#fff',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  balance: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 36,
    color: '#fff',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  latestTxLabel: {
    backgroundColor: 'transparent',
    fontSize: 13,
    color: '#fff',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  latestTxValue: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 16,
    color: '#fff',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
});

const ReorderWallets = () => {
  const sortableList = useRef();
  const { colors } = useTheme();
  const { wallets, setWalletsWithNewOrder } = useContext(BlueStorageContext);
  const colorScheme = useColorScheme();
  const { navigate, setOptions } = useNavigation();
  const stylesHook = {
    root: {
      backgroundColor: colors.elevated,
    },
    tip: {
      backgroundColor: colors.ballOutgoingExpired,
    },
  };
  const [walletData, setWalletData] = useState([]);

  useEffect(() => {
    setWalletData(wallets);
  }, [wallets]);

  useEffect(() => {
    setOptions({
      statusBarStyle: Platform.select({ ios: 'light', default: colorScheme === 'dark' ? 'light' : 'dark' }),
    });
  }, [colorScheme, setOptions]);

  const navigateToWallet = wallet => {
    const walletID = wallet.getID();
    navigate('WalletTransactions', {
      walletID,
      walletType: wallet.type,
      key: `WalletTransactions-${walletID}`,
    });
  };

  const renderItem = ({ item, drag, isActive }) => {
    return (
      <ScaleDecorator>
        <Pressable
          accessibilityRole="button"
          disabled={isActive}
          onLongPress={drag}
          onPress={() => navigateToWallet(item)}
          shadowOpacity={40 / 100}
          shadowOffset={{ width: 0, height: 0 }}
          shadowRadius={5}
          style={styles.itemRoot}
        >
          <LinearGradient shadowColor="#000000" colors={WalletGradient.gradientsFor(item.type)} style={styles.gradient}>
            <Image
              source={(() => {
                switch (item.type) {
                  case LightningLdkWallet.type:
                  case LightningCustodianWallet.type:
                    return I18nManager.isRTL ? require('../../img/lnd-shape-rtl.png') : require('../../img/lnd-shape.png');
                  case MultisigHDWallet.type:
                    return I18nManager.isRTL ? require('../../img/vault-shape-rtl.png') : require('../../img/vault-shape.png');
                  default:
                    return I18nManager.isRTL ? require('../../img/btc-shape-rtl.png') : require('../../img/btc-shape.png');
                }
              })()}
              style={styles.image}
            />

            <Text style={styles.transparentText} />
            <Text numberOfLines={1} style={styles.label}>
              {item.getLabel()}
            </Text>
            {item.hideBalance ? (
              <BluePrivateBalance />
            ) : (
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.balance}>
                {formatBalance(Number(item.getBalance()), item.getPreferredBalanceUnit(), true)}
              </Text>
            )}
            <Text style={styles.transparentText} />
            <Text numberOfLines={1} style={styles.latestTxLabel}>
              {loc.wallets.list_latest_transaction}
            </Text>
            <Text numberOfLines={1} style={styles.latestTxValue}>
              {item.getTransactions().find(tx => tx.confirmations === 0)
                ? loc.transactions.pending.toLowerCase()
                : transactionTimeToReadable(item.getLatestTransactionTime())}
            </Text>
          </LinearGradient>
        </Pressable>
      </ScaleDecorator>
    );
  };

  const onChangeOrder = () => {
    ReactNativeHapticFeedback.trigger('impactMedium', { ignoreAndroidSystemSettings: false });
  };

  const onDragBegin = () => {
    ReactNativeHapticFeedback.trigger('selection', { ignoreAndroidSystemSettings: false });
  };

  const onRelease = () => {
    ReactNativeHapticFeedback.trigger('impactLight', { ignoreAndroidSystemSettings: false });
  };

  const onDragEnd = ({ data }) => {
    setWalletsWithNewOrder(data);
    setWalletData(data);
  };

  const _keyExtractor = (_item, index) => index.toString();

  const ListHeaderComponent = (
    <View style={[styles.tip, stylesHook.tip]}>
      <Text style={{ color: colors.foregroundColor }}>{loc.wallets.reorder_instructions}</Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={[styles.root, stylesHook.root]}>
      <DraggableFlatList
        ListHeaderComponent={ListHeaderComponent}
        ref={sortableList}
        dragItemOverflow
        data={walletData}
        keyExtractor={_keyExtractor}
        renderItem={renderItem}
        onChangeOrder={onChangeOrder}
        onDragBegin={onDragBegin}
        onRelease={onRelease}
        onDragEnd={onDragEnd}
        containerStyle={styles.root}
      />
    </GestureHandlerRootView>
  );
};

ReorderWallets.navigationOptions = navigationStyle(
  {
    headerBackVisible: false,
    headerLargeTitle: true,
    closeButton: true,
  },
  opts => ({ ...opts, headerTitle: loc.wallets.reorder_title }),
);

export default ReorderWallets;
