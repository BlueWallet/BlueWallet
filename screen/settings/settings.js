import React, { useContext } from 'react';
import { ScrollView, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import navigationStyle from '../../components/navigationStyle';
import { BlueListItem, BlueHeaderDefaultSub } from '../../BlueComponents';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const Settings = () => {
  const { navigate } = useNavigation();
  // By simply having it here, it'll re-render the UI if language is changed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { language } = useContext(BlueStorageContext);

  return (
    <ScrollView style={styles.root} contentInsetAdjustmentBehavior="automatic" automaticallyAdjustContentInsets>
      {Platform.OS === 'android' ? <BlueHeaderDefaultSub leftText={loc.settings.header} /> : <></>}
      <BlueListItem title={loc.settings.general} onPress={() => navigate('GeneralSettings')} testID="GeneralSettings" chevron />
      <BlueListItem title={loc.settings.currency} onPress={() => navigate('Currency')} testID="Currency" chevron />
      <BlueListItem title={loc.settings.language} onPress={() => navigate('Language')} testID="Language" chevron />
      <BlueListItem title={loc.settings.encrypt_title} onPress={() => navigate('EncryptStorage')} testID="SecurityButton" chevron />
      <BlueListItem title={loc.settings.network} onPress={() => navigate('NetworkSettings')} testID="NetworkSettings" chevron />
      <BlueListItem title={loc.settings.tools} onPress={() => navigate('Tools')} testID="Tools" chevron />
      <BlueListItem title={loc.settings.about} onPress={() => navigate('About')} testID="AboutButton" chevron />
    </ScrollView>
  );
};

export default Settings;
Settings.navigationOptions = navigationStyle({
  headerTitle: Platform.select({ ios: loc.settings.header, default: '' }),
  headerLargeTitle: true,
});
