import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

import type { Double, UnsafeObject } from 'react-native/Libraries/Types/CodegenTypes';

export interface Spec extends TurboModule {
  becomeCurrent(activityId: Double, type: string, title: string | null, userInfo: UnsafeObject | null, url: string | null): void;
  invalidate(activityId: Double): void;
  isSupported(): Promise<boolean>;
}

const nativeModule = TurboModuleRegistry.get<Spec>('ReactNativeContinuity');

export default nativeModule;
