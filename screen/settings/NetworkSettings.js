import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Notifications from '../../blue_modules/notifications';
import navigationStyle from '../../components/navigationStyle';
import { SafeBlueArea, BlueListItem } from '../../BlueComponents';
import loc from '../../loc';
import { isTorCapable } from '../../blue_modules/environment';

const NetworkSettings = () => {
  const { navigate } = useNavigation();

  const navigateToElectrumSettings = () => {
    navigate('ElectrumSettings');
  };

  const navigateToTorSettings = () => {
    navigate('TorSettings');
  };

  const navigateToLightningSettings = () => {
    navigate('LightningSettings');
  };

  return (
    <SafeBlueArea>
      <ScrollView>
        <BlueListItem title={loc.settings.network_electrum} onPress={navigateToElectrumSettings} testID="ElectrumSettings" chevron />
        <BlueListItem title={loc.settings.lightning_settings} onPress={navigateToLightningSettings} testID="LightningSettings" chevron />
        {Notifications.isNotificationsCapable && (
          <BlueListItem
            title={loc.settings.notifications}
            onPress={() => navigate('NotificationSettings')}
            testID="NotificationSettings"
            chevron
          />
        )}
        {isTorCapable && <BlueListItem title={loc.settings.tor_settings} onPress={navigateToTorSettings} testID="TorSettings" chevron />}
      </ScrollView>
    </SafeBlueArea>
  );
};

NetworkSettings.navigationOptions = navigationStyle({}, opts => ({ ...opts, headerTitle: loc.settings.network }));

export default NetworkSettings;
