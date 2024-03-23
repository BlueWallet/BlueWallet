import React, { useContext, useEffect, useState } from 'react';
import { View, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BlueCard, BlueText } from '../../BlueComponents';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import ListItem from '../../components/ListItem';
import useOnAppLaunch from '../../hooks/useOnAppLaunch';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TWallet } from '../../class/wallets/types';

type RootStackParamList = {
  SelectWallet: { onWalletSelect: (wallet: TWallet) => void; onChainRequireSend: boolean };
};

type DefaultViewNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SelectWallet'>;

const DefaultView: React.FC = () => {
  const [defaultWalletLabel, setDefaultWalletLabel] = useState<string>('');
  const [isViewAllWalletsSwitchEnabled, setIsViewAllWalletsSwitchEnabled] = useState<boolean>(true);
  const { navigate, pop } = useNavigation<DefaultViewNavigationProp>();
  const { wallets } = useContext(BlueStorageContext);
  const { isViewAllWalletsEnabled, getSelectedDefaultWallet, setSelectedDefaultWallet, setViewAllWalletsEnabled } = useOnAppLaunch();

  useEffect(() => {
    (async () => {
      const newViewAllWalletsEnabled: boolean = await isViewAllWalletsEnabled();
      let newDefaultWalletLabel: string = '';
      const walletID = await getSelectedDefaultWallet();

      if (walletID) {
        const w = wallets.find(wallet => wallet.getID() === walletID);
        if (w) newDefaultWalletLabel = w.getLabel();
      }
      setDefaultWalletLabel(newDefaultWalletLabel);
      setIsViewAllWalletsSwitchEnabled(newViewAllWalletsEnabled);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onViewAllWalletsSwitchValueChanged = async (value: boolean) => {
    await setViewAllWalletsEnabled(value);
    if (value) {
      setIsViewAllWalletsSwitchEnabled(true);
      setDefaultWalletLabel('');
    } else {
      const selectedWalletID = await getSelectedDefaultWallet();
      const selectedWallet = wallets.find(wallet => wallet.getID() === selectedWalletID);
      if (selectedWallet) {
        setDefaultWalletLabel(selectedWallet.getLabel());
        setIsViewAllWalletsSwitchEnabled(false);
      }
    }
  };

  const selectWallet = () => {
    navigate('SelectWallet', { onWalletSelect: onWalletSelectValueChanged, onChainRequireSend: false });
  };

  const onWalletSelectValueChanged = async (wallet: TWallet) => {
    await setViewAllWalletsEnabled(false);
    await setSelectedDefaultWallet(wallet.getID());
    setDefaultWalletLabel(wallet.getLabel());
    setIsViewAllWalletsSwitchEnabled(false);
    pop();
  };

  return (
    <ScrollView automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="automatic">
      <View>
        <ListItem
          title={loc.settings.default_wallets}
          Component={TouchableWithoutFeedback}
          switch={{
            onValueChange: onViewAllWalletsSwitchValueChanged,
            value: isViewAllWalletsSwitchEnabled,
            disabled: wallets.length <= 0,
          }}
        />
        <BlueCard>
          <BlueText>{loc.settings.default_desc}</BlueText>
        </BlueCard>
        {!isViewAllWalletsSwitchEnabled && (
          <ListItem title={loc.settings.default_info} onPress={selectWallet} rightTitle={defaultWalletLabel} chevron />
        )}
      </View>
    </ScrollView>
  );
};

export default DefaultView;
