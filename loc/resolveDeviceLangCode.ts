import { CF_BUNDLE_LANG_CODES, langCodeToAppleLocale } from './appleLocale';
import { LangCode } from './languages';

export type RnLocale = {
  languageCode: string;
  scriptCode?: string;
  countryCode?: string;
  languageTag?: string;
};

// Lower-cased Apple locale id -> LangCode for every locale declared in CFBundleLocalizations,
// so walking the device preference list stops where UIKit would stop.
const appleToLangCode = new Map<string, LangCode>(CF_BUNDLE_LANG_CODES.map(lang => [langCodeToAppleLocale[lang].toLowerCase(), lang]));
appleToLangCode.set('no', 'nb_no'); // Norwegian macrolanguage (Android)
appleToLangCode.set('tl', 'fil_PH'); // Tagalog code some Android builds report for Filipino

// Regions Apple folds into es-419. react-native-localize reports the 419 region itself as `UN`.
const ES_419_REGIONS = new Set(
  'un us br jp ar bo bz cl co cr cu do ec gt gy hn ht jm mx ni pa pe pr py sv tt uy ve bb gd lc vc ag dm kn bs'.split(' '),
);

// Candidate Apple ids for one device locale, most specific first.
const candidates = (locale: RnLocale): string[] => {
  const lang = locale.languageCode.toLowerCase();
  const subtags = (locale.languageTag ?? lang).toLowerCase().replace(/_/g, '-').split('-').slice(1);
  const script = locale.scriptCode?.toLowerCase() ?? subtags.find(s => s.length === 4);
  const region = locale.countryCode?.toLowerCase() ?? subtags.find(s => s.length === 2 || s.length === 3);
  const out: string[] = [];
  if (script) out.push(`${lang}-${script}`);
  if (region) out.push(`${lang}-${region}`);
  // Apple's own fallbacks for the few languages we split by script or region.
  if (lang === 'es' && region && ES_419_REGIONS.has(region)) out.push('es-419');
  if (lang === 'zh' && script !== 'hans' && script !== 'hant')
    out.push(region === 'tw' || region === 'hk' || region === 'mo' ? 'zh-hant' : 'zh-hans');
  if (lang === 'pt') out.push(region === 'br' || !region ? 'pt-br' : 'pt-pt');
  out.push(lang);
  return out;
};

export const resolveLangCodeFromRnLocale = (locale: RnLocale): LangCode | null => {
  for (const id of candidates(locale)) {
    const hit = appleToLangCode.get(id);
    if (hit) return hit;
  }
  return null;
};

/** First device locale that maps to a declared catalog, else `en`. */
export const resolveLangCodeFromRnLocales = (locales: readonly RnLocale[]): LangCode => {
  for (const locale of locales) {
    const hit = resolveLangCodeFromRnLocale(locale);
    if (hit) return hit;
  }
  return 'en';
};
