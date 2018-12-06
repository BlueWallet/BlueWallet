import { AsyncStorage, Platform, Alert } from 'react-native';

async function start() {
  const key = 'security_alert_num_times';
  let times = await AsyncStorage.getItem(key);
  times = times || 0;

  console.log({ times });

  if (times < 3 && Platform.OS === 'ios') {
    Alert.alert(
      'Security alert',
      'If you used BlueWallet prior to version 3.1.0 you are advised to re-create wallets ' +
        'and transfer all funds from old wallets to new ones, as older versions might have security issues',
      [
        { text: 'Remind me later', onPress: () => AsyncStorage.setItem(key, '0') },
        { text: 'Ok', onPress: () => AsyncStorage.setItem(key, parseInt(times) + 1 + '') },
      ],
      { cancelable: false },
    );
  }
}

module.exports.start = start;
