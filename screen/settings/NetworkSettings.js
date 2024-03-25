import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Notifications from '../../blue_modules/notifications';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';
import ListItem from '../../components/ListItem';

const NetworkSettings = () => {
  const { navigate } = useNavigation();

  const navigateToElectrumSettings = () => {
    navigate('ElectrumSettings');
  };

  const navigateToLightningSettings = () => {
    navigate('LightningSettings');
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" automaticallyAdjustContentInsets>
      <ListItem title={loc.settings.network_electrum} onPress={navigateToElectrumSettings} testID="ElectrumSettings" chevron />
      <ListItem title={loc.settings.lightning_settings} onPress={navigateToLightningSettings} testID="LightningSettings" chevron />
      {Notifications.isNotificationsCapable && (
        <ListItem
          title={loc.settings.notifications}
          onPress={() => navigate('NotificationSettings')}
          testID="NotificationSettings"
          chevron
        />
      )}
    </ScrollView>
  );
};

NetworkSettings.navigationOptions = navigationStyle({}, opts => ({ ...opts, headerTitle: loc.settings.network }));

export default NetworkSettings;
