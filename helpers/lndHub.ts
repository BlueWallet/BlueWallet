import { BlueApp } from '../class';
import { getUserPreference, setUserPreference, clearUserPreference } from './userPreference';

/**
 * Function to get the LNDHub value from user preferences.
 * @returns The stored LNDHub value or undefined if not found.
 */
export const getLNDHub = async (): Promise<string | undefined> => {
  try {
    const value = await getUserPreference({
      key: BlueApp.LNDHUB,
      migrateToGroupContainer: true,
    });
    return String(value) ?? undefined;
  } catch (error) {
    console.error('Error getting LNDHub preference:', (error as Error).message);
    return undefined;
  }
};

/**
 * Function to set the LNDHub value using user preferences.
 * @param value The value to be stored for LNDHub.
 */
export const setLNDHub = async (value: string): Promise<void> => {
  try {
    await setUserPreference({
      key: BlueApp.LNDHUB,
      value,
      migrateToGroupContainer: true,
    });
  } catch (error) {
    console.error('Error setting LNDHub preference:', error);
  }
};

/**
 * Function to clear the LNDHub value from user preferences.
 * It removes the value from DefaultPreference or Settings (based on the platform).
 */
export const clearLNDHub = async (): Promise<void> => {
  try {
    await clearUserPreference({
      key: BlueApp.LNDHUB,
      useGroupContainer: true,
      migrateToGroupContainer: true,
    });
  } catch (error) {
    console.error('Error clearing LNDHub preference:', error);
  }
};