import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  reloadAllWidgets(): void;
  requestLocalNetworkPermission(): Promise<string>;
  discoverElectrumServers(): Promise<string>;
}

const moduleProxy = TurboModuleRegistry.getEnforcing<Spec>('WidgetHelper');

export default moduleProxy;
