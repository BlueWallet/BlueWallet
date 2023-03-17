import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ScrollView } from 'react-native';
import { BlueListItem, SafeBlueArea } from '../../BlueComponents';
import Notifications from '../../blue_modules/notifications';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';

const NetworkSettings = () => {
  const { navigate } = useNavigation();

  const navigateToLightningSettings = () => {
    navigate('LightningSettings');
  };

  const navigateToBoltHubSettings = () => {
    navigate('BolthubSettings');
  };

  return (
    <SafeBlueArea>
      <ScrollView>
        <BlueListItem title="Bolt Hub Settings" onPress={navigateToBoltHubSettings} testID="BolthubSettings" chevron />
        {/* <BlueListItem title={loc.settings.lightning_settings} onPress={navigateToLightningSettings} testID="LightningSettings" chevron /> */}
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

NetworkSettings.navigationOptions = navigationStyle({}, opts => ({ ...opts, headerTitle: loc.settings.network }));

export default NetworkSettings;
