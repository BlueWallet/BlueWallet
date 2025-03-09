import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../components/themes';
import { useIsLargeScreen } from '../hooks/useIsLargeScreen';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';
import { WalletCarouselItem } from '../components/WalletsCarousel';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import { TWallet } from '../class/wallets/types';
import { Icon } from '@rneui/themed';
import loc from '../loc';
import { navigationRef } from '../NavigationService';

// Extended props to allow using as standalone component
interface CustomSideTabBarProps extends Partial<BottomTabBarProps> {
  isStandalone?: boolean;
}

const CustomSideTabBar: React.FC<CustomSideTabBarProps> = ({ 
  state, 
  descriptors, 
  navigation,
  isStandalone = false
}) => {
  const { colors } = useTheme();
  const { isLargeScreen } = useIsLargeScreen();
  const { isDrawerShouldHide } = useSettings();
  const { wallets } = useStorage();
  const extendedNavigation = useExtendedNavigation();

  if ((isDrawerShouldHide && isLargeScreen) && !isStandalone) {
    return null;
  }

  // Use NavigationRef for standalone mode
  const navObject = isStandalone ? navigationRef : navigation;

  const handleWalletPress = useCallback((wallet: TWallet) => {
    if (wallet?.getID) {
      const walletID = wallet.getID();
      const walletType = wallet.type;
      
      // Navigate to WalletTransactions within DetailViewStackScreensStack
      navObject.navigate('WalletTransactions', {
        walletID,
        walletType
      });
    }
  }, [navObject]);
  
  const handleWalletLongPress = useCallback(() => {
    navObject.navigate('ManageWallets');
  }, [navObject]);

  // Check if a wallet is selected by examining the current navigation state
  const isWalletSelected = useCallback((walletID: string) => {
    if (isStandalone) {
      // For standalone mode, check the navigation ref state
      const currentRoute = navigationRef.getCurrentRoute();
      return currentRoute?.name === 'WalletTransactions' && 
             currentRoute?.params?.walletID === walletID;
    } else {
      // For tab bar mode, check if we're on a wallet screen with this wallet ID
      const routes = state?.routes || [];
      for (const route of routes) {
        if (route.name === 'DetailViewStackScreensStack') {
          // Try to get info from the state of this screen
          const detailsState = route.state as any;
          if (detailsState?.routes) {
            const currentRoute = detailsState.routes[detailsState.index];
            return currentRoute?.name === 'WalletTransactions' && 
                  currentRoute?.params?.walletID === walletID;
          }
        }
      }
      return false;
    }
  }, [isStandalone, state]);

  // Similar logic for checking if Home is selected
  const isHomeSelected = useCallback(() => {
    if (isStandalone) {
      const currentRoute = navigationRef.getCurrentRoute();
      return currentRoute?.name === 'WalletsList';
    } else {
      // Check if we're on Home tab or WalletsList screen
      if (state?.index === 0) return true; // Home tab is selected
      
      // Or if we're on WalletsList screen in the DetailViewStackScreensStack
      const routes = state?.routes || [];
      for (const route of routes) {
        if (route.name === 'DetailViewStackScreensStack') {
          const detailsState = route.state as any;
          if (detailsState?.routes) {
            const currentRoute = detailsState.routes[detailsState.index];
            return currentRoute?.name === 'WalletsList';
          }
        }
      }
      return false;
    }
  }, [isStandalone, state]);

  const handleHomePress = useCallback(() => {
    navObject.navigate('WalletsList');
  }, [navObject]);

  return (
    <View style={[
      styles.container, 
      { backgroundColor: colors.background, borderRightColor: colors.border }
    ]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Home tab item */}
        <TouchableOpacity 
          style={[
            styles.homeItem, 
            isHomeSelected() && { backgroundColor: colors.elevated }
          ]} 
          onPress={handleHomePress}
        >
          <Icon 
            name="home" 
            size={20} 
            type="font-awesome"
            color={isHomeSelected() ? colors.foregroundColor : colors.alternativeTextColor} 
          />
          <Text style={[
            styles.homeText, 
            { 
              color: isHomeSelected() 
                ? colors.foregroundColor 
                : colors.alternativeTextColor 
            }
          ]}>
            {loc.wallets.list_title}
          </Text>
        </TouchableOpacity>

        {/* Wallet separator */}
        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        {/* Wallet items */}
        {wallets.map((wallet) => (
          <View key={wallet.getID()} style={styles.walletItemContainer}>
            <WalletCarouselItem 
              item={wallet}
              onPress={() => handleWalletPress(wallet)}
              handleLongPress={handleWalletLongPress}
              isSelectedWallet={isWalletSelected(wallet.getID())}
              horizontal={false}
              customStyle={styles.walletItem}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute', 
    left: 0,
    top: 0,
    bottom: 0,
    width: 320,
    borderRightWidth: 1,
    elevation: 3,
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 16,
  },
  homeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  homeText: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  walletItemContainer: {
    marginBottom: 16,
  },
  walletItem: {
    marginHorizontal: 16,
    width: 288, // 320 - 16*2 padding
  },
});

export default CustomSideTabBar;
