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

   const navigateToPrivacy = () => {
    navigate('SettingsPrivacy');
  };


  return (
    <SafeBlueArea>
      <ScrollView>
        <BlueListItem title={loc.is_it_my_address.title} onPress={navigateToIsItMyAddress} testID="IsItMyAddress" chevron />
        <BlueListItem title={loc.settings.network_broadcast} onPress={navigateToBroadcast} testID="Broadcast" chevron />
        <BlueListItem title={loc.settings.privacy} onPress={navigateToPrivacy} testID="SettingsPrivacy" chevron />
      </ScrollView>
    </SafeBlueArea>
  );
};

NetworkSettings.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.settings.tools }));

export default NetworkSettings;
