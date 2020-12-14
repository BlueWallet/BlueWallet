import { StyleSheet } from 'react-native';
import { BlueCurrentTheme } from '../../../components/themes';

export default StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 16,
    color: 'white',
  },

  subHeader: {
    fontSize: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    fontWeight: '700',
  },

  headingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },

  headingTitleWithIconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headingTitleIcon: {
    marginRight: 6,
  },

  headingLinkText: {
    color: BlueCurrentTheme.colors.buttonAlternativeTextColor,
    fontSize: 15,
    fontWeight: '500',
  },
});
