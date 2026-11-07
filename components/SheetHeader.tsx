import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import loc from '../loc';
import { useTheme } from './themes';

interface SheetHeaderProps {
  title?: string;
  onClose: () => void;
}

/**
 * Title and close for a form sheet on Android. react-native-screens skips the toolbar on Android form sheets, so they
 * live in the content there. iOS uses the native header and gets nothing here.
 */
const SheetHeader: React.FC<SheetHeaderProps> = ({ title, onClose }) => {
  const { colors, closeImage } = useTheme();
  if (Platform.OS !== 'android') return null;

  const stylesHook = StyleSheet.create({
    title: {
      color: colors.foregroundColor,
    },
    closeButton: {
      backgroundColor: colors.lightButton,
    },
  });

  return (
    <View style={styles.root}>
      {title ? (
        <Text style={[styles.title, stylesHook.title]} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={loc._.close}
        style={[styles.closeButton, stylesHook.closeButton]}
        onPress={onClose}
        testID="NavigationCloseButton"
      >
        <Image source={closeImage} />
      </TouchableOpacity>
    </View>
  );
};

/** Android form sheets often report insets.bottom as 0. iOS form sheets often report a huge one. */
export const useSheetBottomPadding = (): number => {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 16 : 16;
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
    borderRadius: 15,
  },
});

export default SheetHeader;
