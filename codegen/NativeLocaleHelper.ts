import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface LocaleObject {
  languageCode: string;
  countryCode: string;
  languageTag: string;
  isRTL: boolean;
  scriptCode?: string;
}

export interface Spec extends TurboModule {
  setPreferredLanguage(locale: string): void;
  getPreferredLanguage(): string | null;
  resetPreferredLanguage(): void;
  getLocales(): LocaleObject[];
  getCurrencies(): string[];
}

const nativeModule = TurboModuleRegistry.get<Spec>('LocaleHelper');
export default nativeModule;
