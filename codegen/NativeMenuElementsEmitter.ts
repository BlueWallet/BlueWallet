import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

import type { Double } from 'react-native/Libraries/Types/CodegenTypes';

export interface Spec extends TurboModule {
  addListener(eventName: string): void;
  removeListeners(count: Double): void;
  openSettings(): void;
  addWalletMenuAction(): void;
  importWalletMenuAction(): void;
  reloadTransactionsMenuAction(): void;
  sharedInstance?(): void;
}

const moduleProxy = TurboModuleRegistry.getEnforcing<Spec>('MenuElementsEmitter');

export default moduleProxy;
