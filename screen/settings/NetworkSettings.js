import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Notifications from '../../blue_modules/notifications';
import navigationStyle from '../../components/navigationStyle';
import { SafeBlueArea, BlueListItem } from '../../BlueComponents';
import loc from '../../loc';

const NetworkSettings = () => {
  const { navigate } = useNavigation();

  const navigateToElectrumSettings = () => {
    navigate('ElectrumSettings');
  };

  const navigateToLightningSettings = () => {
    navigate('LightningSettings');
  };

  const navigateToBroadcast = () => {
    navigate('Broadcast');
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
      </ScrollView>
    </SafeBlueArea>
  );
};

NetworkSettings.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.settings.network }));

export default NetworkSettings;
