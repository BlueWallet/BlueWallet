import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useTheme } from '../../components/themes';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 20,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  share: {
    alignSelf: 'center',
    width: '40%',
  },
});

export const useDynamicStyles = () => {
  const theme = useTheme();

  const stylesHook = useMemo(
    () =>
      StyleSheet.create({
        root: {
          backgroundColor: theme.colors.elevated,
          // Add more dynamic styles as needed
        },
        container: {
          // Example of another dynamic style
          borderColor: theme.colors.inputBorderColor,
          borderWidth: 1,
        },
        // You can add more dynamically themed styles here
      }),
    [theme],
  ); // Recompute styles only when theme changes

  return stylesHook;
};
