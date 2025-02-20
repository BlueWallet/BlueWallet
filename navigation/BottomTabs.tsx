import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useStorage } from '../hooks/context/useStorage';
import WalletTransactions from '../screen/wallets/WalletTransactions';
import WalletList from '../screen/wallets/WalletList';
import { Text, View } from 'react-native';
import { WalletCarouselItem } from '../components/WalletsCarousel'; // new import
import { TWallet } from '../class/wallets/types'; // if needed

// Helper to render a wallet as a tab icon.
// Note: onPress is noop since tab press is handled by the navigator.
const WalletTabIcon = ({ wallet, focused }: { wallet: TWallet; focused: boolean }) => {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <WalletCarouselItem
        item={wallet}
        onPress={() => {}}
        animationsEnabled={false}
        horizontal={true}
        // Optionally adjust styles based on focused:
        // You may add style or modify wallet properties if needed.
      />
    </View>
  );
};

// Inline component to wrap wallet transactions view
const WalletScreen = ({ route }: { route: { params: { walletID: string } } }) => {
  return <WalletTransactions route={{ params: { walletID: route.params.walletID, name: 'WalletTransactions' } }} />;
};

const Tab = createBottomTabNavigator();

const BottomTabs = () => {
  const { wallets } = useStorage();

  return (
    <Tab.Navigator screenOptions={{ 
        
        headerShown: false, tabBarPosition: 'left' }}>
      <Tab.Screen 
        name="Home" 
        component={WalletList} 
        options={{ tabBarLabel: 'Home' }} 
      />
      {wallets.map(wallet => (
        <Tab.Screen
          key={wallet.getID()}
          name={wallet.getID()}
          component={WalletScreen}
          options={{
            tabBarLabel: () => null, // hide default text label
            tabBarIcon: ({ focused }) => <WalletTabIcon wallet={wallet} focused={focused} />,
          }}
          initialParams={{ walletID: wallet.getID() }}
        />
      ))}
    </Tab.Navigator>
  );
};

export default BottomTabs;
