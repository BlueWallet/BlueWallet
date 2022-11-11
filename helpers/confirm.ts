import { Alert } from 'react-native';
import loc from '../loc';

/**
 * Helper function that throws un-cancellable dialog to confirm user's action.
 * Promise resolves to TRUE if user confirms, FALSE otherwise
 *
 * @param title {string}
 * @param text {string}
 *
 * @return {Promise<boolean>}
 */
module.exports = function (title = 'Are you sure?', text = ''): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      title,
      text,
      [
        {
          text: loc._.yes,
          onPress: () => resolve(true),
          style: 'default',
        },
        {
          text: loc._.cancel,
          onPress: () => resolve(false),
          style: 'cancel',
        },
      ],
      { cancelable: false },
    );
  });
};
