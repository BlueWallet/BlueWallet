import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeBlueArea, BlueCard, BlueNavigationStyle, BlueLoadingHook, BlueTextHooks } from '../../BlueComponents';
import { useTheme } from '@react-navigation/native';
/** @type {AppStorage} */

const ReleaseNotes = () => {
  const [isLoading, setIsLoading] = useState(true);
  const notes = require('../../release-notes');
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  useEffect(() => {
    setIsLoading(false);
  }, []);

  return isLoading ? (
    <BlueLoadingHook />
  ) : (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
      <ScrollView>
        <BlueCard>
          <BlueTextHooks>{notes}</BlueTextHooks>
        </BlueCard>
      </ScrollView>
    </SafeBlueArea>
  );
};

ReleaseNotes.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: 'Release notes',
});

export default ReleaseNotes;
