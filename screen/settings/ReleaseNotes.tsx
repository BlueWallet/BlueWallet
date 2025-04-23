import React, { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import loc from '../../loc';
import { useNativePlatformTheme } from '../../theme';
import { useSettingsStyles } from '../../hooks/useSettingsStyles';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';

const ReleaseNotes: React.FC = () => {
  const notes = require('../../release-notes');
  const { styles } = useSettingsStyles();
  const { isAndroid } = useNativePlatformTheme();

  return (
    <SafeAreaScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.card, isAndroid && { marginHorizontal: 16 }]}>
        <Text style={styles.infoText}>{notes}</Text>
      </View>
    </SafeAreaScrollView>
  );
};

export default ReleaseNotes;
