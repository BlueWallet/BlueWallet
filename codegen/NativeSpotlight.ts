import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  replaceIndex(itemsJSON: string): Promise<number>;
  deleteIndex(): Promise<void>;
  popPendingURL(): Promise<string | null>;
  donateActivity(identifier: string, title: string): void;
  clearActivity(): void;
}

export default TurboModuleRegistry.get<Spec>('SpotlightModule');
