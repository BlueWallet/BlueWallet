import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
// eslint-disable-next-line @react-native/no-deep-imports
import type { Double } from 'react-native/Libraries/Types/CodegenTypes';

export interface Spec extends TurboModule {
  addListener(eventName: string): void;
  removeListeners(count: Double): void;
}

export default TurboModuleRegistry.get<Spec>('MenuElementsEmitter');
