import { StyleSheet } from 'react-native';
import { BlueCurrentTheme } from '../../../../components/themes';

export default StyleSheet.create({
  mainHeaderTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },

  mainHeaderSubtitle: {
    fontSize: 24,
    fontWeight: '500',
    color: 'white',
  },

  breakdownItemGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
    marginBottom: 18,
  },

  breakdownItemLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: BlueCurrentTheme.colors.alternativeTextColor,
  },

  breakdownItemValue: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },

  estimatedCostSection: {
    marginTop: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  estimatedCostSectionHeading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },

  estimatedCostSectionValue: {
    fontSize: 30,
    fontWeight: '500',
    color: BlueCurrentTheme.colors.alternativeTextColor,
  },
});
