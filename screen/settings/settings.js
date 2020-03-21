import React, { useEffect, useState } from 'react';
import { ScrollView, View, Switch, TouchableOpacity } from 'react-native';
import {
  BlueText,
  BlueNavigationStyle,
  BlueCard,
  BlueLoading,
  SafeBlueArea,
  BlueHeaderDefaultSub,
  BlueListItem,
} from '../../BlueComponents';
import { AppStorage } from '../../class';
import { useNavigation } from 'react-navigation-hooks';
const BlueApp: AppStorage = require('../../BlueApp');
const loc = require('../../loc');

const Settings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [advancedModeEnabled, setAdvancedModeEnabled] = useState(false);
  const { navigate } = useNavigation();

  useEffect(() => {
    (async () => {
      setAdvancedModeEnabled(await BlueApp.isAdancedModeEnabled());
      setIsLoading(false);
    })();
  });

  const onAdvancedModeSwitch = async value => {
    setAdvancedModeEnabled(value);
    await BlueApp.setIsAdancedModeEnabled(value);
  };

  const onShowAdvancedOptions = () => {
    setShowAdvancedOptions(!showAdvancedOptions);
  };

  return isLoading ? (
    <BlueLoading />
  ) : (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
      <BlueHeaderDefaultSub leftText={loc.settings.header} rightComponent={null} />
      <ScrollView>
        {BlueApp.getWallets().length > 1 && (
          <BlueListItem component={TouchableOpacity} onPress={() => navigate('DefaultView')} title="On Launch" />
        )}
        <BlueListItem title="Security" onPress={() => navigate('EncryptStorage')} component={TouchableOpacity} testID="SecurityButton" />
        <BlueListItem title={loc.settings.lightning_settings} component={TouchableOpacity} onPress={() => navigate('LightningSettings')} />
        <BlueListItem title={loc.settings.language} component={TouchableOpacity} onPress={() => navigate('Language')} />
        <BlueListItem title={loc.settings.currency} component={TouchableOpacity} onPress={() => navigate('Currency')} />
        <BlueListItem title={'Electrum server'} component={TouchableOpacity} onPress={() => navigate('ElectrumSettings')} />
        <BlueListItem title={loc.settings.advanced_options} component={TouchableOpacity} onPress={onShowAdvancedOptions} />
        {showAdvancedOptions && (
          <BlueCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <BlueText>{loc.settings.enable_advanced_mode}</BlueText>
              <Switch value={advancedModeEnabled} onValueChange={onAdvancedModeSwitch} />
            </View>
          </BlueCard>
        )}

        <BlueListItem title={loc.settings.about} component={TouchableOpacity} onPress={() => navigate('About')} testID="AboutButton" />
      </ScrollView>
    </SafeBlueArea>
  );
};
Settings.navigationOptions = {
  ...BlueNavigationStyle,
};
export default Settings;
