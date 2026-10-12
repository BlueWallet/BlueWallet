import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type DiscoveredElectrumServer = Readonly<{
  host: string;
  port: number;
  ssl: boolean;
}>;

export interface Spec extends TurboModule {
  discoverElectrumServers(): Promise<DiscoveredElectrumServer[]>;
}

export default TurboModuleRegistry.get<Spec>('LocalNetworkDiscovery');
