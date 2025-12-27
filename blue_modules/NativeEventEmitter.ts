import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type { UnsafeObject, Double } from 'react-native/Libraries/Types/CodegenTypes';

export interface Spec extends TurboModule {
  addListener(eventName: string): void;
  removeListeners(count: Double): void;
  getMostRecentUserActivity(): Promise<UnsafeObject | null>;
}

export default TurboModuleRegistry.get<Spec>('EventEmitter');
