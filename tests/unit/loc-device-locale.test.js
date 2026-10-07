import assert from 'assert';
import fs from 'fs';
import path from 'path';

import { CF_BUNDLE_APPLE_LOCALES, langCodeToAppleLocale } from '../../loc/appleLocale';
import { resolveLangCodeFromRnLocale, resolveLangCodeFromRnLocales } from '../../loc/resolveDeviceLangCode';

const readPlistLocalizations = () => {
  const plistPath = path.join(__dirname, '../../ios/BlueWallet/Info.plist');
  const xml = fs.readFileSync(plistPath, 'utf8');
  const matches = [...xml.matchAll(/<key>CFBundleLocalizations<\/key>\s*<array>([\s\S]*?)<\/array>/g)];
  assert.strictEqual(matches.length, 1, 'CFBundleLocalizations array present');
  return [...matches[0][1].matchAll(/<string>([^<]+)<\/string>/g)].map(m => m[1]).sort((a, b) => a.localeCompare(b));
};

describe('Device locale → LangCode', () => {
  it('matches CFBundleLocalizations in Info.plist (1:1 with declared Apple codes)', () => {
    const fromPlist = readPlistLocalizations();
    const fromSource = [...CF_BUNDLE_APPLE_LOCALES];
    assert.deepStrictEqual(fromSource, fromPlist);
  });

  it('maps common ISO device codes to catalog LangCodes', () => {
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'de', languageTag: 'de-DE' }), 'de_de');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'ja', languageTag: 'ja-JP' }), 'jp_jp');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'ko', languageTag: 'ko-KR' }), 'ko_kr');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'uk', languageTag: 'uk-UA' }), 'ua');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'zh', languageTag: 'zh-Hans-CN' }), 'zh_cn');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'zh', languageTag: 'zh-Hant-TW' }), 'zh_tw');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'zh', languageTag: 'zh-Hant-SG' }), 'zh_tw');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'zh', languageTag: 'zh-Hant-CN' }), 'zh_tw');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'zh', languageTag: 'zh-Hans-TW', scriptCode: 'Hans' }), 'zh_cn');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'zh', languageTag: 'zh-Hans-HK' }), 'zh_cn');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'zh', languageTag: 'zh-Hans-MO' }), 'zh_cn');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'zh', languageTag: 'zh-TW' }), 'zh_tw');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'zh', languageTag: 'zh-Hant-TW', scriptCode: 'Hans' }), 'zh_cn');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'zh', languageTag: 'zh-Mong' }), 'zh_cn');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'pt', languageTag: 'pt-BR' }), 'pt_br');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'pt', languageTag: 'pt-PT' }), 'pt_pt');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'es', languageTag: 'es-419' }), 'es_419');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'es', languageTag: 'es', countryCode: 'MX' }), 'es_419');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'es', languageTag: 'es', countryCode: 'ES' }), 'es');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'es', languageTag: 'es' }), 'es_419');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'sr', languageTag: 'sr-Latn-RS' }), 'sr_rs');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'af', languageTag: 'af-ZA' }), 'zar_afr');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'xh', languageTag: 'xh-ZA' }), 'zar_xho');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'zu', languageTag: 'zu-ZA' }), 'zu_ZA');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'st', languageTag: 'st-ZA' }), 'st_ZA');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'gn', languageTag: 'gn-PY' }), 'gug_PY');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'kk', languageTag: 'kk-KZ' }), 'kk@Cyrl');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'nb', languageTag: 'nb-NO' }), 'nb_no');
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'ru', languageTag: 'ru-RU' }), 'ru');
  });

  it('does not map locales excluded from CFBundleLocalizations', () => {
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'da', languageTag: 'da-DK' }), null);
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'nl', languageTag: 'nl-NL' }), null);
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'fil', languageTag: 'fil-PH' }), null);
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'tl', languageTag: 'tl-PH' }), null);
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'ak', languageTag: 'ak-GH' }), null);
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'pcm', languageTag: 'pcm-NG' }), null);
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'nn', languageTag: 'nn-NO' }), null);
    assert.strictEqual(resolveLangCodeFromRnLocale({ languageCode: 'no', languageTag: 'no-NO' }), 'nb_no');
    assert.strictEqual(
      resolveLangCodeFromRnLocales([
        { languageCode: 'nl', languageTag: 'nl-NL' },
        { languageCode: 'en', languageTag: 'en-US' },
      ]),
      'en',
    );
  });

  it('uses the first matching locale in the preference list', () => {
    assert.strictEqual(
      resolveLangCodeFromRnLocales([
        { languageCode: 'en', languageTag: 'en-US' },
        { languageCode: 'de', languageTag: 'de-DE' },
      ]),
      'en',
    );
    assert.strictEqual(
      resolveLangCodeFromRnLocales([
        { languageCode: 'xx', languageTag: 'xx-XX' },
        { languageCode: 'fr', languageTag: 'fr-FR' },
      ]),
      'fr_fr',
    );
  });

  it('covers every CFBundle Apple locale with a reverse mapping', () => {
    const sampleTagForApple = apple => {
      if (apple === 'es') {
        return 'es-ES';
      }
      return apple;
    };
    for (const apple of CF_BUNDLE_APPLE_LOCALES) {
      const resolved = resolveLangCodeFromRnLocale({
        languageCode: apple.split('-')[0],
        languageTag: sampleTagForApple(apple),
      });
      assert.ok(resolved, `expected mapping for Apple locale ${apple}`);
      assert.strictEqual(langCodeToAppleLocale[resolved], apple, `${apple} round-trips through ${resolved}`);
    }
  });
});
