import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import navigationStyle from '../../components/navigationStyle';
import { SafeBlueArea } from '../../BlueComponents';
import loc from '../../loc';
import ListItem from '../../components/ListItem';

const NetworkSettings = () => {
  const { navigate } = useNavigation();

  const navigateToIsItMyAddress = () => {
    navigate('IsItMyAddress');
  };

  const navigateToBroadcast = () => {
    navigate('Broadcast');
  };

  const navigateToGenerateWord = () => {
    navigate('GenerateWord');
  };

  return (
    <SafeBlueArea>
      <ScrollView>
        <ListItem title={loc.is_it_my_address.title} onPress={navigateToIsItMyAddress} testID="IsItMyAddress" chevron />
        <ListItem title={loc.settings.network_broadcast} onPress={navigateToBroadcast} testID="Broadcast" chevron />
        <ListItem title={loc.autofill_word.title} onPress={navigateToGenerateWord} testID="GenerateWord" chevron />
      </ScrollView>
    </SafeBlueArea>
  );
};

NetworkSettings.navigationOptions = navigationStyle({}, opts => ({ ...opts, headerTitle: loc.settings.tools }));

export default NetworkSettings;
