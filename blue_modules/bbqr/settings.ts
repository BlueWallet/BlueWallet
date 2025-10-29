// BBQR Settings Management
import AsyncStorage from '@react-native-async-storage/async-storage';

export type QRProtocol = 'bc-ur' | 'bbqr' | 'auto';

const STORAGE_KEY = 'PREFERRED_QR_PROTOCOL';
const DEFAULT_PROTOCOL: QRProtocol = 'bc-ur'; // BC-UR default for backward compatibility

/**
 * Get the user's preferred QR protocol
 */
export async function getPreferredProtocol(): Promise<QRProtocol> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    if (value === 'bc-ur' || value === 'bbqr' || value === 'auto') {
      return value;
    }
    return DEFAULT_PROTOCOL;
  } catch (error) {
    console.error('Error reading QR protocol preference:', error);
    return DEFAULT_PROTOCOL;
  }
}

/**
 * Set the user's preferred QR protocol
 */
export async function setPreferredProtocol(protocol: QRProtocol): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, protocol);
  } catch (error) {
    console.error('Error saving QR protocol preference:', error);
    throw error;
  }
}

/**
 * Determine which protocol to use for encoding
 * Auto mode will try BBQR first for efficiency
 */
export async function getProtocolForEncoding(): Promise<'bc-ur' | 'bbqr'> {
  const preference = await getPreferredProtocol();

  switch (preference) {
    case 'bc-ur':
      return 'bc-ur';
    case 'bbqr':
      return 'bbqr';
    case 'auto':
      // In auto mode, prefer BBQR for efficiency
      return 'bbqr';
    default:
      return 'bc-ur';
  }
}
