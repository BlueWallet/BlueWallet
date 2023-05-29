import React, { useEffect, useRef, useContext, useState } from 'react';
import { View, Image, Text, StyleSheet, StatusBar, I18nManager, Pressable, useColorScheme, Platform } from 'react-native';
import { BluePrivateBalance } from '../../BlueComponents';
import DraggableFlatList, { ScaleDecorator } from '../../components/react-native-draggable-flatlist';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useNavigation, useTheme } from '@react-navigation/native';
import navigationStyle from '../../components/navigationStyle';
import { LightningCustodianWallet, LightningLdkWallet, MultisigHDWallet } from '../../class';
import WalletGradient from '../../class/wallet-gradient';
import loc, { formatBalance, transactionTimeToReadable } from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import styles from './style';


const ReorderWallets = () => {
  const sortableList = useRef();
  const { colors } = useTheme();
  const { wallets, setWalletsWithNewOrder } = useContext(BlueStorageContext);

  const { navigate } = useNavigation();
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
      <StatusBar
        barStyle={Platform.select({ ios: 'light-content', default: useColorScheme() === 'dark' ? 'light-content' : 'dark-content' })}
      />
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
    headerHideBackButton: true,
    headerLargeTitle: true,
    closeButton: true,
  },
  opts => ({ ...opts, headerTitle: loc.wallets.reorder_title }),
);

export default ReorderWallets;
