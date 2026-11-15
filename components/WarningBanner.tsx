import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { useTheme } from './themes';

type Props = {
  text: string;
  testID?: string;
};

/**
 * Light orange notice with a warning icon. Use for important, non-dismissable safety notes.
 */
const WarningBanner: React.FC<Props> = ({ text, testID }) => {
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    container: {
      backgroundColor: colors.warningBannerBackground,
      borderColor: colors.warningBannerBorder,
    },
    text: {
      color: colors.warningBannerText,
    },
  });

  return (
    <View style={[styles.container, stylesHook.container]} testID={testID}>
      <Icon name="warning" color={colors.warningBannerText} size={20} />
      <Text style={[styles.text, stylesHook.text]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'left',
  },
});

export default WarningBanner;
