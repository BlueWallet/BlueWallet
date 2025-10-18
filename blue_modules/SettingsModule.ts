import { NativeModules, Platform } from 'react-native';

interface SettingsModuleInterface {
  /**
   * Initialize device UID if not exists
   * Returns the device UID or "Disabled" if Do Not Track is enabled
   */
  initializeDeviceUID(): Promise<string>;

  /**
   * Get the device UID
   * Returns the device UID or "Disabled" if Do Not Track is enabled
   */
  getDeviceUID(): Promise<string | null>;

  /**
   * Get the device UID copy (for Settings display)
   */
  getDeviceUIDCopy(): Promise<string>;

  /**
   * Set the clearFilesOnLaunch preference
   */
  setClearFilesOnLaunch(value: boolean): Promise<boolean>;

  /**
   * Get the clearFilesOnLaunch preference
   */
  getClearFilesOnLaunch(): Promise<boolean>;

  /**
   * Set Do Not Track setting
   */
  setDoNotTrack(enabled: boolean): Promise<boolean>;

  /**
   * Get Do Not Track setting
   */
  getDoNotTrack(): Promise<boolean>;

  /**
   * Open the settings activity (Android only)
   * This opens the app's settings screen
   */
  openSettings(): Promise<boolean>;
}

// Only available on Android
const SettingsModule: SettingsModuleInterface | null = Platform.OS === 'android' ? NativeModules.SettingsModule : null;

export default SettingsModule;
