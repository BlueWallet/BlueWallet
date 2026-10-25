import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type CatalystToolbarAction = Readonly<{
  ownerId: string;
  itemId: string;
  kind: 'press' | 'longPress';
}>;

export interface Spec extends TurboModule {
  setItems(ownerId: string, itemsJson: string): void;
  clearItems(ownerId: string): void;
  readonly onPress: CodegenTypes.EventEmitter<CatalystToolbarAction>;
}

export default TurboModuleRegistry.get<Spec>('CatalystToolbar');
