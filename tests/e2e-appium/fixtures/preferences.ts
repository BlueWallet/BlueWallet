// App code selects group.io.bluewallet.bluewallet for settings shared with widgets.
// E2E omits that entitlement and keeps settings in its own standardUserDefaults,
// where AppDelegate seeds Electrum and resets state between cases. Reads/writes
// still use the native module; only switching to the production group is blocked.
import { NativeModules } from 'react-native';
import DeviceInfo from 'react-native-device-info';
// AppDelegate refuses the production ID unless launched by the hosted-CI harness.
// This adapter is bundled only by the E2E Metro config, never by release builds.
if (!DeviceInfo.getBundleId().endsWith('.e2e') && DeviceInfo.getBundleId() !== 'io.bluewallet.bluewallet') {
  throw new Error('E2E preferences cannot run in an unrelated app');
}
const preferences = NativeModules.RNDefaultPreference;
const suite = DeviceInfo.getBundleId();
export default {
  // TurboModule functions are accessed lazily and are not enumerable. Spreading
  // NativeModules.RNDefaultPreference silently drops get/set on the new architecture.
  get: (key: string) => preferences.get(key),
  set: (key: string, value: string | number | boolean) => preferences.set(key, value),
  clear: (key: string) => preferences.clear(key),
  getMultiple: (keys: string[]) => preferences.getMultiple(keys),
  setMultiple: (values: Record<string, unknown>) => preferences.setMultiple(values),
  clearMultiple: (keys: string[]) => preferences.clearMultiple(keys),
  getAll: () => preferences.getAll(),
  clearAll: () => preferences.clearAll(),
  // Leave RNDefaultPreference on standardUserDefaults, the same domain seeded
  // by AppDelegate. The dedicated bundle already isolates this native store.
  setName: async () => {},
  getName: async () => suite,
};
