import React from 'react';
import { useSettingsStyles } from '../../hooks/useSettingsStyles';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { View, Text } from 'react-native';

const ReleaseNotes: React.FC = () => {
  const notes = require('../../release-notes');
  const { styles } = useSettingsStyles();

  return (
    <SafeAreaScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <Text style={styles.infoText}>{notes}</Text>
      </View>
    </SafeAreaScrollView>
  );
};

export default ReleaseNotes;
