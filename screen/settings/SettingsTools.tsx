import useScreenHeaderMenu from '../../hooks/useScreenHeaderMenu';
import { useNavigation } from '@react-navigation/native';
import React from 'react';

import loc from '../../loc';
import { SettingsSection, SettingsListItem, SettingsScrollView } from '../../components/SettingsSection';

const SettingsTools: React.FC = () => {
  const navigation = useNavigation();
  const navigateToIsItMyAddress = () => {
    navigation.navigate('IsItMyAddress');
  };

  const navigateToBroadcast = () => {
    navigation.navigate('Broadcast');
  };

  const navigateToGenerateWord = () => {
    navigation.navigate('GenerateWord');
  };

  useScreenHeaderMenu([
    { id: 'settings_address_check', text: loc.is_it_my_address.title, onPress: navigateToIsItMyAddress },
    { id: 'settings_broadcast', text: loc.settings.network_broadcast, onPress: navigateToBroadcast },
    { id: 'settings_generate_word', text: loc.autofill_word.title, onPress: navigateToGenerateWord },
  ]);

  return (
    <SettingsScrollView>
      <SettingsSection>
        <SettingsListItem
          title={loc.is_it_my_address.title}
          iconName="search"
          onPress={navigateToIsItMyAddress}
          testID="IsItMyAddress"
          chevron
        />
        <SettingsListItem
          title={loc.settings.network_broadcast}
          iconName="paperPlane"
          onPress={navigateToBroadcast}
          testID="Broadcast"
          chevron
        />
        <SettingsListItem
          title={loc.autofill_word.title}
          iconName="key"
          onPress={navigateToGenerateWord}
          testID="GenerateWord"
          chevron
          bottomDivider={false}
        />
      </SettingsSection>
    </SettingsScrollView>
  );
};

export default SettingsTools;
