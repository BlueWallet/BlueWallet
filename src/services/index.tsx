import _BiometricService from './BiometricService';
import _NavigationService from './NavigationService';
import _SecureStorageService from './SecureStorageService';

export const NavigationService = new _NavigationService();
export const BiometricService = new _BiometricService();
export const SecureStorageService = new _SecureStorageService();
export { AppStateManager } from './AppStateManager';
export * from './NavigationService';
