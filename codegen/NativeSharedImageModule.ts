import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type SharedQRCode = Readonly<{ value: string }>;

export interface Spec extends TurboModule {
  popPendingImage(): Promise<SharedQRCode | null>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('SharedImageModule');
