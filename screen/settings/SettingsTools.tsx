import React from 'react';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { SettingsScrollView, SettingsSection, SettingsListItem } from '../../components/platform';

const SettingsTools: React.FC = () => {
  const navigation = useExtendedNavigation();
  const navigateToIsItMyAddress = () => {
    navigation.navigate('IsItMyAddress');
  };

  const navigateToBroadcast = () => {
    navigation.navigate('Broadcast');
  };

  const navigateToGenerateWord = () => {
    navigation.navigate('GenerateWord');
  };

  return (
    <SettingsScrollView>
      <SettingsSection horizontalInset={false}>
        <SettingsListItem
          title={loc.is_it_my_address.title}
          iconName="search"
          onPress={navigateToIsItMyAddress}
          testID="IsItMyAddress"
          chevron
          position="first"
        />
        <SettingsListItem
          title={loc.settings.network_broadcast}
          iconName="paperPlane"
          onPress={navigateToBroadcast}
          testID="Broadcast"
          chevron
          position="middle"
        />
        <SettingsListItem
          title={loc.autofill_word.title}
          iconName="key"
          onPress={navigateToGenerateWord}
          testID="GenerateWord"
          chevron
          position="last"
        />
      </SettingsSection>
    </SettingsScrollView>
  );
};

export default SettingsTools;
