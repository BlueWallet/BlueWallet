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
  const { colors } = useTheme();

  return StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    // More  properties
  });
};
