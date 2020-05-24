import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { BlueNavigationStyle, BlueLoading, SafeBlueArea, BlueListItem } from '../../BlueComponents';
import { useNavigation } from 'react-navigation-hooks';
const loc = require('../../loc');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const NetworkSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { navigate } = useNavigation();

  useEffect(() => {
    setIsLoading(false);
  }, []);

  return isLoading ? (
    <BlueLoading />
  ) : (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
      <ScrollView>
        <BlueListItem title={'Electrum server'} component={TouchableOpacity} onPress={() => navigate('ElectrumSettings')} />
        <BlueListItem title={loc.settings.lightning_settings} component={TouchableOpacity} onPress={() => navigate('LightningSettings')} />
        <BlueListItem title="Broadcast transaction" component={TouchableOpacity} onPress={() => navigate('Broadcast')} />
      </ScrollView>
    </SafeBlueArea>
  );
};
NetworkSettings.navigationOptions = {
  ...BlueNavigationStyle(),
  title: 'Network',
};
export default NetworkSettings;
