import Bugsnag from '@bugsnag/react-native';
import DefaultPreference from 'react-native-default-preference';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GROUP_IO_BLUEWALLET = 'group.io.bluewallet.bluewallet';
const DO_NOT_TRACK_KEY = 'donottrack';

const bugsnagReady = (async () => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    // Migrate the legacy preference before deciding whether to start reporting.
    const legacyDoNotTrack = await AsyncStorage.getItem(DO_NOT_TRACK_KEY);
    if (legacyDoNotTrack) {
      await DefaultPreference.set(DO_NOT_TRACK_KEY, '1');
      await AsyncStorage.removeItem(DO_NOT_TRACK_KEY);
    }
    const doNotTrack = await DefaultPreference.get(DO_NOT_TRACK_KEY);
    if (doNotTrack === '1') return false;

    Bugsnag.start();
    return true;
  } catch (error) {
    // Never let analytics setup crash the app.
    console.error('Failed to initialize Bugsnag:', error);
    return false;
  }
})();

export default bugsnagReady;
