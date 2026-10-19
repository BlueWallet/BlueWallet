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

  const navigateToManageWallets = () => {
    navigation.navigate('ManageWallets');
  };

  return (
    <SettingsScrollView>
      <SettingsSection>
        <SettingsListItem
          title={loc.is_it_my_address.title}
          iconName="search"
          onPress={navigateToIsItMyAddress}
          accessibilityLabel={loc.is_it_my_address.title}
          testID="IsItMyAddress"
          chevron
        />
        <SettingsListItem
          title={loc.settings.network_broadcast}
          iconName="paperPlane"
          onPress={navigateToBroadcast}
          accessibilityLabel={loc.settings.network_broadcast}
          testID="Broadcast"
          chevron
        />
        <SettingsListItem
          title={loc.autofill_word.title}
          iconName="key"
          onPress={navigateToGenerateWord}
          accessibilityLabel={loc.autofill_word.title}
          testID="GenerateWord"
          chevron
        />
        <SettingsListItem
          title={loc.wallets.manage_title}
          iconName="wallet"
          onPress={navigateToManageWallets}
          accessibilityLabel={loc.wallets.manage_title}
          testID="ManageWallets"
          bottomDivider={false}
        />
      </SettingsSection>
    </SettingsScrollView>
  );
};

export default SettingsTools;
