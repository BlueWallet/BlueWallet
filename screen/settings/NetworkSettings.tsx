import React from 'react';
import { Platform } from 'react-native';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { SettingsScrollView, SettingsSection, SettingsListItem } from '../../components/platform';

const NetworkSettings: React.FC = () => {
  const navigation = useExtendedNavigation();
  const isNotificationsCapable = Platform.OS !== 'web';
  const navigateToElectrumSettings = () => {
    navigation.navigate('ElectrumSettings');
  };

  const navigateToLightningSettings = () => {
    navigation.navigate('LightningSettings');
  };

  const navigateToBlockExplorerSettings = () => {
    navigation.navigate('SettingsBlockExplorer');
  };

  const navigateToNotificationSettings = () => {
    navigation.navigate('NotificationSettings');
  };

  return (
    <SettingsScrollView>
      <SettingsSection horizontalInset={false}>
        <SettingsListItem
          title={loc.settings.block_explorer}
          iconName="blockExplorer"
          onPress={navigateToBlockExplorerSettings}
          testID="BlockExplorerSettings"
          chevron
          position="first"
        />

        <SettingsListItem
          title={loc.settings.network_electrum}
          iconName="electrum"
          onPress={navigateToElectrumSettings}
          testID="ElectrumSettings"
          chevron
          position="middle"
        />

        <SettingsListItem
          title={loc.settings.lightning_settings}
          iconName="lightning"
          onPress={navigateToLightningSettings}
          testID="LightningSettings"
          chevron
          position={isNotificationsCapable ? 'middle' : 'last'}
        />

        {isNotificationsCapable && (
          <SettingsListItem
            title={loc.settings.notifications}
            iconName="notifications"
            onPress={navigateToNotificationSettings}
            testID="NotificationSettings"
            chevron
            position="last"
          />
        )}
      </SettingsSection>
    </SettingsScrollView>
  );
};

export default NetworkSettings;
