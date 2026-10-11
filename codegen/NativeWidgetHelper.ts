import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  reloadAllWidgets(): void;
}

const moduleProxy = TurboModuleRegistry.getEnforcing<Spec>('WidgetHelper');

export default moduleProxy;
