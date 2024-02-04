// UnlockWith.styles.ts
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  biometricRow: {
    justifyContent: 'center',
    flexDirection: 'row',
    width: 64,
    height: 64,
    alignSelf: 'center',
    marginBottom: 20,
  },
  icon: {
    width: 64,
    height: 64,
  },
  logoImage: {
    width: 100,
    height: 75,
    alignSelf: 'center',
  },
});
