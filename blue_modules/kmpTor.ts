import { NativeModules } from 'react-native';
const { TorModule } = NativeModules;

interface KmpTorInterface {
  start: () => Promise<boolean>;
  restart: () => Promise<boolean>;
  stop: () => Promise<boolean>;
  getTorStatus: () => string;
  sendRequest: (action: string, url: string, headers: string, body: string) => Promise<string>;
}

export default TorModule as KmpTorInterface;
