import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { BlueLoading, BlueListItemHooks, BlueHeaderDefaultSubHooks } from '../../BlueComponents';
import { useNavigation } from '@react-navigation/native';
const loc = require('../../loc');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const Settings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { navigate } = useNavigation();

  useEffect(() => {
    setIsLoading(false);
  }, []);

  return isLoading ? (
    <BlueLoading />
  ) : (
    <ScrollView style={styles.root}>
      <StatusBar barStyle="default" />
      <BlueHeaderDefaultSubHooks leftText={loc.settings.header} rightComponent={null} />
      <BlueListItemHooks title="General" component={TouchableOpacity} onPress={() => navigate('GeneralSettings')} chevron />
      <BlueListItemHooks title={loc.settings.currency} component={TouchableOpacity} onPress={() => navigate('Currency')} chevron />
      <BlueListItemHooks title={loc.settings.language} component={TouchableOpacity} onPress={() => navigate('Language')} chevron />
      <BlueListItemHooks
        title="Security"
        onPress={() => navigate('EncryptStorage')}
        component={TouchableOpacity}
        testID="SecurityButton"
        chevron
      />
      <BlueListItemHooks title="Network" component={TouchableOpacity} onPress={() => navigate('NetworkSettings')} chevron />
      <BlueListItemHooks
        title={loc.settings.about}
        component={TouchableOpacity}
        onPress={() => navigate('About')}
        testID="AboutButton"
        chevron
      />
    </ScrollView>
  );
};

export default Settings;
