import type { TurboModule, CodegenTypes } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  addListener(eventName: string): void;
  removeListeners(count: CodegenTypes.Double): void;
  getMostRecentUserActivity(): Promise<CodegenTypes.UnsafeObject | null>;
}

const moduleProxy = TurboModuleRegistry.getEnforcing<Spec>('EventEmitter');

export default moduleProxy;
