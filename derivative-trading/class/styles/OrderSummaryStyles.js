import { StyleSheet } from 'react-native';
import { BlueCurrentTheme } from '../../../components/themes';

export default StyleSheet.create({
  screenHeadline: {
    fontSize: 34,
    fontWeight: 'bold',
    color: 'white',
  },

  breakdownItemGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
    marginBottom: 12,
  },

  breakdownItemLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },

  breakdownItemValue: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
});
