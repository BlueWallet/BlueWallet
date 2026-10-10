import { DeviceEventEmitter, NativeEventEmitter, Platform } from 'react-native';

const electrumDiscoveryEvents =
  Platform.OS === 'ios' ? new NativeEventEmitter(require('./NativeEventEmitter').default) : DeviceEventEmitter;

export default electrumDiscoveryEvents;
