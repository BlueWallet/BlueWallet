import React, { useEffect, useRef, useContext, useState } from 'react';
import { StyleSheet, useColorScheme, Platform } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { useNavigation } from '@react-navigation/native';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '../../components/themes';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { WalletCarouselItem } from '../../components/WalletsCarousel';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  padding16: {
    padding: 16,
  },
});

const ReorderWallets = () => {
  const sortableList = useRef();
  const { colors } = useTheme();
  const { wallets, setWalletsWithNewOrder } = useContext(BlueStorageContext);
  const colorScheme = useColorScheme();
  const { navigate, setOptions } = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [walletData, setWalletData] = useState([]);

  const stylesHook = {
    root: {
      backgroundColor: colors.elevated,
    },
    tip: {
      backgroundColor: colors.ballOutgoingExpired,
    },
  };

  useEffect(() => {
    setWalletData(wallets);
  }, [wallets]);

  useEffect(() => {
    setOptions({
      statusBarStyle: Platform.select({ ios: 'light', default: colorScheme === 'dark' ? 'light' : 'dark' }),
    });
  }, [colorScheme, setOptions]);

  useEffect(() => {
    // Filter wallets based on search query
    const filteredWallets = wallets.filter(wallet => wallet.getLabel().toLowerCase().includes(searchQuery.toLowerCase()));
    setWalletData(filteredWallets);
  }, [wallets, searchQuery]);

  useEffect(() => {
    // Set navigation options dynamically
    setOptions({
      headerSearchBarOptions: {
        hideWhenScrolling: false,
        onChangeText: event => setSearchQuery(event.nativeEvent.text),
        onClear: () => setSearchQuery(''),
        onFocus: () => setIsSearchFocused(true),
        onBlur: () => setIsSearchFocused(false),
        placeholder: loc.wallets.search_wallets,
      },
    });
  }, [setSearchQuery, setIsSearchFocused, setOptions]);

  const navigateToWallet = wallet => {
    const walletID = wallet.getID();
    navigate('WalletTransactions', {
      walletID,
      walletType: wallet.type,
    });
  };

  const renderItem = ({ item, drag, isActive }) => {
    const itemOpacity = isActive ? 1 : 0.5; // Set opacity to 0.5 if not active

    return (
      <ScaleDecorator>
        <WalletCarouselItem
          item={item}
          handleLongPress={isDraggingDisabled ? null : drag}
          isActive={isActive}
          onPress={navigateToWallet}
          customStyle={[styles.padding16, { opacity: itemOpacity }]} // Apply opacity style
        />
      </ScaleDecorator>
    );
  };

  const onChangeOrder = () => {
    triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
  };

  const onDragBegin = () => {
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
  };

  const onRelease = () => {
    triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
  };

  const onDragEnd = ({ data }) => {
    setWalletsWithNewOrder(data);
    setWalletData(data);
  };

  const _keyExtractor = (_item, index) => index.toString();

  const isDraggingDisabled = searchQuery.length > 0 || isSearchFocused;

  return (
    <GestureHandlerRootView style={[styles.root, stylesHook.root]}>
      <DraggableFlatList
        ref={sortableList}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets
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
