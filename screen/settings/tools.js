import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import navigationStyle from '../../components/navigationStyle';
import { SafeBlueArea, BlueListItem } from '../../BlueComponents';
import loc from '../../loc';

const NetworkSettings = () => {
  const { navigate } = useNavigation();

  const navigateToIsItMyAddress = () => {
    navigate('IsItMyAddress');
  };

  const navigateToBroadcast = () => {
    navigate('Broadcast');
  };

  const navigateToLocalTrader = () => {
    navigate('HodlHodl', { screen: 'HodlHodl' });
  };

  return (
    <SafeBlueArea>
      <ScrollView>
        <BlueListItem title={loc.is_it_my_address.title} onPress={navigateToIsItMyAddress} testID="IsItMyAddress" chevron />
        <BlueListItem title={loc.settings.network_broadcast} onPress={navigateToBroadcast} testID="Broadcast" chevron />
        <BlueListItem title={loc.hodl.local_trader} onPress={navigateToLocalTrader} testID="LocalTrader" chevron />
      </ScrollView>
    </SafeBlueArea>
  );
};

NetworkSettings.navigationOptions = navigationStyle({}, opts => ({ ...opts, headerTitle: loc.settings.tools }));

export default NetworkSettings;
