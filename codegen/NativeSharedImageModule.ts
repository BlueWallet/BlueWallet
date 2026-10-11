import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type SharedQRCode = Readonly<{ value?: string; values?: string[] }>;

export interface Spec extends TurboModule {
  decodeImage(base64Image: string): Promise<string | null>;
  popPendingImage(): Promise<SharedQRCode | null>;
}

export default TurboModuleRegistry.get<Spec>('SharedImageModule');
