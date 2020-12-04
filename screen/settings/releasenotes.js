import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeBlueArea, BlueCard, BlueNavigationStyle, BlueText } from '../../BlueComponents';
import { useTheme } from '@react-navigation/native';
import loc from '../../loc';

const ReleaseNotes = () => {
  const notes = require('../../release-notes');
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  return (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
      <ScrollView>
        <BlueCard>
          <BlueText>{notes}</BlueText>
        </BlueCard>
      </ScrollView>
    </SafeBlueArea>
  );
};

ReleaseNotes.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: loc.settings.about_release_notes,
});

export default ReleaseNotes;
