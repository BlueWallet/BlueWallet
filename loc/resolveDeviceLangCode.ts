import { langCodeToAppleLocale } from './appleLocale';
import { LangCode } from './languages';

export type RnLocale = {
  languageCode: string;
  countryCode?: string;
  languageTag?: string;
  scriptCode?: string;
};

const ES_419_COUNTRY_CODES = new Set([
  '419',
  'MX',
  'AR',
  'CO',
  'CL',
  'PE',
  'VE',
  'EC',
  'GT',
  'CU',
  'BO',
  'DO',
  'HN',
  'PY',
  'SV',
  'NI',
  'CR',
  'PA',
  'UY',
  'PR',
  'BZ',
  'GY',
  'HT',
  'JM',
  'TT',
  'BB',
  'GD',
  'LC',
  'VC',
  'AG',
  'DM',
  'KN',
  'BS',
]);

const appleLocaleToLangCode = (() => {
  const map = new Map<string, LangCode>();
  for (const [lang, apple] of Object.entries(langCodeToAppleLocale) as [LangCode, string][]) {
    map.set(apple.toLowerCase(), lang);
  }
  // Legacy / alias tags seen from NSLocale / react-native-localize.
  map.set('no', 'nb_no');
  map.set('nn', 'nb_no');
  map.set('tl', 'fil_PH');
  map.set('tl-ph', 'fil_PH');
  map.set('iw', 'he');
  map.set('in', 'id_id');
  return map;
})();

const normalizeTag = (tag: string): string => tag.trim().replace(/_/g, '-');

const lookupTag = (tag: string): LangCode | null => {
  const normalized = normalizeTag(tag).toLowerCase();
  const direct = appleLocaleToLangCode.get(normalized);
  if (direct) {
    return direct;
  }
  const base = normalized.split('-')[0];
  return appleLocaleToLangCode.get(base) ?? null;
};

const resolvePortuguese = (locale: RnLocale): LangCode | null => {
  const tag = locale.languageTag ? normalizeTag(locale.languageTag).toLowerCase() : '';
  if (tag.startsWith('pt-br') || tag === 'pt-br') {
    return 'pt_br';
  }
  if (tag.startsWith('pt-pt') || tag === 'pt-pt') {
    return 'pt_pt';
  }
  const cc = locale.countryCode?.toUpperCase();
  if (cc === 'BR') {
    return 'pt_br';
  }
  if (cc === 'PT' || cc === 'AO' || cc === 'MZ' || cc === 'CV' || cc === 'GW' || cc === 'ST' || cc === 'TL') {
    return 'pt_pt';
  }
  if (locale.languageCode.toLowerCase() === 'pt') {
    return 'pt_pt';
  }
  return null;
};

const resolveChinese = (locale: RnLocale): LangCode | null => {
  const tag = locale.languageTag ? normalizeTag(locale.languageTag).toLowerCase() : '';
  if (tag.includes('hans') || tag.includes('cn') || tag.endsWith('-sg')) {
    return 'zh_cn';
  }
  if (tag.includes('hant') || tag.includes('-tw') || tag.includes('-hk') || tag.includes('-mo')) {
    return 'zh_tw';
  }
  const script = locale.scriptCode?.toLowerCase();
  if (script === 'hans') {
    return 'zh_cn';
  }
  if (script === 'hant') {
    return 'zh_tw';
  }
  const cc = locale.countryCode?.toUpperCase();
  if (cc === 'TW' || cc === 'HK' || cc === 'MO') {
    return 'zh_tw';
  }
  if (cc === 'CN' || cc === 'SG') {
    return 'zh_cn';
  }
  if (locale.languageCode.toLowerCase() === 'zh') {
    return 'zh_cn';
  }
  return null;
};

const resolveSpanish = (locale: RnLocale): LangCode | null => {
  const tag = locale.languageTag ? normalizeTag(locale.languageTag).toLowerCase() : '';
  if (tag === 'es-419' || tag.startsWith('es-419') || tag.includes('-419')) {
    return 'es_419';
  }
  const cc = locale.countryCode?.toUpperCase();
  if (cc && ES_419_COUNTRY_CODES.has(cc)) {
    return 'es_419';
  }
  if (cc === 'ES' || tag === 'es-es' || tag.endsWith('-es')) {
    return 'es';
  }
  if (locale.languageCode.toLowerCase() === 'es') {
    if (cc === 'ES') {
      return 'es';
    }
    // Undifferentiated `es` is common on Latin American devices; prefer es_419 over Spain.
    return 'es_419';
  }
  return null;
};

const resolveSerbian = (locale: RnLocale): LangCode | null => {
  const tag = locale.languageTag ? normalizeTag(locale.languageTag).toLowerCase() : '';
  if (tag.includes('latn') || locale.scriptCode?.toLowerCase() === 'latn') {
    return 'sr_rs';
  }
  if (locale.languageCode.toLowerCase() === 'sr') {
    return 'sr_rs';
  }
  return null;
};

export const resolveLangCodeFromRnLocale = (locale: RnLocale): LangCode | null => {
  const lc = locale.languageCode.toLowerCase();
  if (lc === 'pt') {
    const pt = resolvePortuguese(locale);
    if (pt) {
      return pt;
    }
  }
  if (lc === 'zh') {
    const zh = resolveChinese(locale);
    if (zh) {
      return zh;
    }
  }
  if (lc === 'es') {
    const es = resolveSpanish(locale);
    if (es) {
      return es;
    }
  }
  if (lc === 'sr') {
    const sr = resolveSerbian(locale);
    if (sr) {
      return sr;
    }
  }

  if (locale.languageTag) {
    const fromTag = lookupTag(locale.languageTag);
    if (fromTag) {
      return fromTag;
    }
  }

  const fromCode = lookupTag(lc);
  if (fromCode) {
    return fromCode;
  }

  if (locale.languageTag) {
    const tagPrefix = normalizeTag(locale.languageTag).split('-')[0].toLowerCase();
    return lookupTag(tagPrefix);
  }

  return null;
};

export const resolveLangCodeFromRnLocales = (locales: readonly RnLocale[]): LangCode => {
  for (const locale of locales) {
    const resolved = resolveLangCodeFromRnLocale(locale);
    if (resolved) {
      return resolved;
    }
  }
  return 'en';
};
