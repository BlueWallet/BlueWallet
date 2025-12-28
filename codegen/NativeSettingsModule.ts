import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  initializeDeviceUID(): Promise<string>;
  getDeviceUID(): Promise<string | null>;
  getDeviceUIDCopy(): Promise<string>;
  setClearFilesOnLaunch(value: boolean): Promise<boolean>;
  getClearFilesOnLaunch(): Promise<boolean>;
  setDoNotTrack(enabled: boolean): Promise<boolean>;
  getDoNotTrack(): Promise<boolean>;
  openSettings(): Promise<boolean>;
}

const nativeModule = TurboModuleRegistry.get<Spec>('SettingsModule');

export default nativeModule;
