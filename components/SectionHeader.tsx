import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { usePlatformTheme } from './platformThemes';

interface SectionHeaderProps {
  title: string;
  marginTop?: number;
  marginBottom?: number;
  testID?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, marginTop, marginBottom, testID }) => {
  const { colors, sizing } = usePlatformTheme();
  const isAndroid = Platform.OS === 'android';

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: isAndroid ? 16 : 16,
      marginTop: marginTop !== undefined ? marginTop : isAndroid ? 24 : 16,
      marginBottom: marginBottom !== undefined ? marginBottom : isAndroid ? 0 : 8,
      height: isAndroid ? sizing.sectionHeaderHeight : undefined,
      justifyContent: isAndroid ? 'center' : undefined,
    },
    text: {
      fontSize: isAndroid ? 14 : 18,
      fontWeight: isAndroid ? '500' : 'bold',
      color: isAndroid ? colors.subtitleColor : colors.titleColor,
      textTransform: isAndroid ? 'uppercase' : 'none',
      marginLeft: isAndroid ? 8 : 0,
      letterSpacing: isAndroid ? 0.25 : 0,
    },
  });

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.text}>{title}</Text>
    </View>
  );
};

export default SectionHeader;
