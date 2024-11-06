import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, TouchableWithoutFeedback, View, ActivityIndicator } from 'react-native';
import { TWallet } from '../../class/wallets/types';
import ListItem from '../../components/ListItem';
import useOnAppLaunch from '../../hooks/useOnAppLaunch';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';

type RootStackParamList = {
  SelectWallet: { onWalletSelect: (wallet: TWallet) => void; onChainRequireSend: boolean };
};

type DefaultViewNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SelectWallet'>;



const DefaultView: React.FC = () => {

  const { navigate, pop } = useNavigation<DefaultViewNavigationProp>();
  const { wallets } = useStorage();
  const { ready, isViewAllWalletsEnabled, selectedDefaultWallet, setSelectedDefaultWalletStorage, setViewAllWalletsEnabledStorage } =
    useOnAppLaunch();

  

  const selectWallet = () => {
    navigate('SelectWallet', { onWalletSelect: onWalletSelectValueChanged, onChainRequireSend: false });
  };

  const onWalletSelectValueChanged = async (wallet: TWallet) => {
    await setViewAllWalletsEnabledStorage(false);
    await setSelectedDefaultWalletStorage(wallet.getID());
    pop();
  };

  if (!ready) {
    return <ActivityIndicator size="large" color="#0000ff" />; // Display a loading indicator until ready
  }

  return (
    <ScrollView automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="automatic">
      <View>
        <ListItem
          title={loc.settings.default_wallets}
          Component={TouchableWithoutFeedback}
          switch={{
            onValueChange: setViewAllWalletsEnabledStorage,
            value: isViewAllWalletsEnabled,
            disabled: wallets.length <= 0,
          }}
          subtitle={loc.settings.default_desc}
        />

        {!isViewAllWalletsEnabled && (
          <ListItem
            title={loc.settings.default_info}
            onPress={selectWallet}
            rightTitle={wallets.find(wallet => wallet.getID() === selectedDefaultWallet)?.getLabel()}
            chevron
            disabled={wallets.length <= 1}
          />
        )}
      </View>
    </ScrollView>
  );
};

export default DefaultView;
