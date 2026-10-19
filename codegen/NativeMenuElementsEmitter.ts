import type { TurboModule, CodegenTypes } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  setAvailableActions(actions: ReadonlyArray<string>): void;
  readonly onMenuAction: CodegenTypes.EventEmitter<string>;
}

export default TurboModuleRegistry.get<Spec>('MenuElementsEmitter');
