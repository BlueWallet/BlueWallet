import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { BlueLoading, SafeBlueArea, BlueCard, BlueText, BlueNavigationStyle } from '../../BlueComponents';
/** @type {AppStorage} */

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const ReleaseNotes = () => {
  const [isLoading, setIsLoading] = useState(true);
  const notes = require('../../release-notes');

  useEffect(() => {
    setIsLoading(false);
  }, []);

  return isLoading ? (
    <BlueLoading />
  ) : (
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
  title: 'Release notes',
});

export default ReleaseNotes;
