import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  dataGroup25: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: '25%',
  },

  dataGroup50: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: '50%',
  },

  labeledDataVGroup: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  dataItemLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    color: 'white'
  },

  dataItemValue: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
});
