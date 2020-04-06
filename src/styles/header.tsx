import { StyleSheet } from 'react-native';

import { typography } from './typography';

export const headerStyle = StyleSheet.create({
  headerText: {
    ...typography.headline4,
    textAlign: 'center',
  },
});
