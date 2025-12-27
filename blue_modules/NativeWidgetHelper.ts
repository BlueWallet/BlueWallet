import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  reloadAllWidgets(): void;
}

export default TurboModuleRegistry.get<Spec>('WidgetHelper');
