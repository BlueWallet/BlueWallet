import NativeLocalNetworkDiscovery, { DiscoveredElectrumServer } from '../codegen/NativeLocalNetworkDiscovery';
import { ElectrumServerItem, uniqueElectrumServers } from './electrumServer';

export const discoverLocalElectrumServers = async (): Promise<ElectrumServerItem[]> => {
  if (!NativeLocalNetworkDiscovery) throw new Error('Local network discovery is unavailable on this device.');

  const discovered: DiscoveredElectrumServer[] = await NativeLocalNetworkDiscovery.discoverElectrumServers();
  return uniqueElectrumServers(
    discovered
      .filter(server => server.host && Number.isInteger(server.port) && server.port > 0 && server.port <= 65535)
      .map(server => ({
        host: server.host.replace(/\.$/, '').toLowerCase(),
        ...(server.ssl ? { ssl: server.port } : { tcp: server.port }),
      })),
  );
};
