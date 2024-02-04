import React from 'react';
import { ScrollView, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import navigationStyle from '../../components/navigationStyle';
import { BlueHeaderDefaultSub } from '../../BlueComponents';
import loc from '../../loc';
import ListItem from '../../components/ListItem';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const Settings = () => {
  const { navigate } = useNavigation();

  return (
    <ScrollView style={styles.root} contentInsetAdjustmentBehavior="automatic" automaticallyAdjustContentInsets>
      {Platform.OS === 'android' ? <BlueHeaderDefaultSub leftText={loc.settings.header} /> : <></>}
      <ListItem title={loc.settings.general} onPress={() => navigate('GeneralSettings')} testID="GeneralSettings" chevron />
      <ListItem title={loc.settings.currency} onPress={() => navigate('Currency')} testID="Currency" chevron />
      <ListItem title={loc.settings.language} onPress={() => navigate('Language')} testID="Language" chevron />
      <ListItem title={loc.settings.encrypt_title} onPress={() => navigate('EncryptStorage')} testID="SecurityButton" chevron />
      <ListItem title={loc.settings.network} onPress={() => navigate('NetworkSettings')} testID="NetworkSettings" chevron />
      <ListItem title={loc.settings.tools} onPress={() => navigate('Tools')} testID="Tools" chevron />
      <ListItem title={loc.settings.about} onPress={() => navigate('About')} testID="AboutButton" chevron />
    </ScrollView>
  );
};

export default Settings;
Settings.navigationOptions = navigationStyle({
  headerTransparent: true,
  headerTitle: Platform.select({ ios: loc.settings.header, default: '' }),
  headerLargeTitle: true,
});
