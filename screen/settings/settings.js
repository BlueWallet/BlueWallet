import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { BlueNavigationStyle, BlueLoading, SafeBlueArea, BlueHeaderDefaultSub, BlueListItem } from '../../BlueComponents';
import { useNavigation } from 'react-navigation-hooks';
const loc = require('../../loc');

const Settings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { navigate } = useNavigation();

  useEffect(() => {
    setIsLoading(false);
  }, []);

  return isLoading ? (
    <BlueLoading />
  ) : (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
      <ScrollView>
        <BlueHeaderDefaultSub leftText={loc.settings.header} rightComponent={null} />
        <BlueListItem title={'General'} component={TouchableOpacity} onPress={() => navigate('GeneralSettings')} chevron />
        <BlueListItem title={loc.settings.currency} component={TouchableOpacity} onPress={() => navigate('Currency')} chevron />
        <BlueListItem title={loc.settings.language} component={TouchableOpacity} onPress={() => navigate('Language')} chevron />
        <BlueListItem
          title="Security"
          onPress={() => navigate('EncryptStorage')}
          component={TouchableOpacity}
          testID="SecurityButton"
          chevron
        />
        <BlueListItem title="Network" component={TouchableOpacity} onPress={() => navigate('NetworkSettings')} chevron />
        <BlueListItem
          title={loc.settings.about}
          component={TouchableOpacity}
          onPress={() => navigate('About')}
          testID="AboutButton"
          chevron
        />
      </ScrollView>
    </SafeBlueArea>
  );
};
Settings.navigationOptions = {
  ...BlueNavigationStyle,
};
export default Settings;
