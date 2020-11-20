import _BiometricService from './BiometricService';
import _NavigationService from './NavigationService';
import _SecureStorageService from './SecureStorageService';
import _StoreService from './StoreService';

export const NavigationService = new _NavigationService();
export const BiometricService = new _BiometricService();
export const SecureStorageService = new _SecureStorageService();
export const StoreService = new _StoreService();
export { default as AppStateManager } from './AppStateManager';
export * from './NavigationService';
