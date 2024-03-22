import React, { useContext, useEffect, useState } from 'react';
import { View, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import navigationStyle from '../../components/navigationStyle';
import { BlueCard, BlueText } from '../../BlueComponents';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import ListItem from '../../components/ListItem';
import useOnAppLaunch from '../../hooks/useOnAppLaunch';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  SelectWallet: { onWalletSelect: (wallet: { getID: () => string; getLabel: () => string }) => void };
  // Add other screens here as needed
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
      const wallet = await getSelectedDefaultWallet();

      if (wallet) {
        newDefaultWalletLabel = wallet.getLabel();
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
      const selectedWallet = await getSelectedDefaultWallet();
      if (selectedWallet) {
        setDefaultWalletLabel(selectedWallet.getLabel());
        setIsViewAllWalletsSwitchEnabled(false);
      }
    }
  };

  const selectWallet = () => {
    navigate('SelectWallet', { onWalletSelect: onWalletSelectValueChanged });
  };

  const onWalletSelectValueChanged = async (wallet: { getID: () => string; getLabel: () => string; }) => {
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


// @ts-ignore: Property 'navigationOptions' does not exist on type 'DefaultView'
DefaultView.navigationOptions = navigationStyle({}, (opts: any) => ({ ...opts, title: loc.settings.default_title }));

export default DefaultView;
