import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { BlueListItemHooks, BlueHeaderDefaultSubHooks } from '../../BlueComponents';
import { useNavigation } from '@react-navigation/native';
import loc from '../../loc';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const Settings = () => {
  const { navigate } = useNavigation();

  return (
    <ScrollView style={styles.root}>
      <StatusBar barStyle="default" />
      <BlueHeaderDefaultSubHooks leftText={loc.settings.header} rightComponent={null} />
      <BlueListItemHooks title={loc.settings.general} component={TouchableOpacity} onPress={() => navigate('GeneralSettings')} chevron />
      <BlueListItemHooks title={loc.settings.currency} component={TouchableOpacity} onPress={() => navigate('Currency')} chevron />
      <BlueListItemHooks title={loc.settings.language} component={TouchableOpacity} onPress={() => navigate('Language')} chevron />
      <BlueListItemHooks
        title={loc.settings.encrypt_title}
        onPress={() => navigate('EncryptStorage')}
        component={TouchableOpacity}
        testID="SecurityButton"
        chevron
      />
      <BlueListItemHooks title={loc.settings.network} component={TouchableOpacity} onPress={() => navigate('NetworkSettings')} chevron />
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
