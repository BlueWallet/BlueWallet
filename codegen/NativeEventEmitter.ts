import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

import type { Double, UnsafeObject } from 'react-native/Libraries/Types/CodegenTypes';

export interface Spec extends TurboModule {
  addListener(eventName: string): void;
  removeListeners(count: Double): void;
  getMostRecentUserActivity(): Promise<UnsafeObject | null>;
}

const moduleProxy = TurboModuleRegistry.getEnforcing<Spec>('EventEmitter');

export default moduleProxy;
