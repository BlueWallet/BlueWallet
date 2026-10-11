import assert from 'assert';
import fs from 'fs';
import path from 'path';

import { pickLaunchLanguage } from '../../loc';
import { CF_BUNDLE_APPLE_LOCALES, langCodeToAppleLocale } from '../../loc/appleLocale';
import { resolveLangCodeFromRnLocale, resolveLangCodeFromRnLocales } from '../../loc/resolveDeviceLangCode';

const readPlistLocalizations = () => {
  const xml = fs.readFileSync(path.join(__dirname, '../../ios/BlueWallet/Info.plist'), 'utf8');
  const matches = [...xml.matchAll(/<key>CFBundleLocalizations<\/key>\s*<array>([\s\S]*?)<\/array>/g)];
  assert.strictEqual(matches.length, 1, 'CFBundleLocalizations array present');
  return [...matches[0][1].matchAll(/<string>([^<]+)<\/string>/g)].map(m => m[1]).sort((a, b) => a.localeCompare(b));
};

const resolve = (languageTag, extra = {}) =>
  resolveLangCodeFromRnLocale({
    languageCode: languageTag.split('-')[0],
    languageTag,
    ...extra,
  });

describe('Device locale → LangCode', () => {
  it('matches CFBundleLocalizations in Info.plist (1:1 with declared Apple codes)', () => {
    assert.deepStrictEqual([...CF_BUNDLE_APPLE_LOCALES], readPlistLocalizations());
  });

  it('covers every CFBundle Apple locale with a reverse mapping', () => {
    for (const apple of CF_BUNDLE_APPLE_LOCALES) {
      const resolved = resolve(apple);
      assert.ok(resolved, `expected mapping for Apple locale ${apple}`);
      assert.strictEqual(langCodeToAppleLocale[resolved], apple, `${apple} round-trips through ${resolved}`);
    }
  });

  it('maps ISO device codes to catalog LangCodes', () => {
    assert.strictEqual(resolve('de-DE'), 'de_de');
    assert.strictEqual(resolve('ja-JP'), 'jp_jp');
    assert.strictEqual(resolve('ko-KR'), 'ko_kr');
    assert.strictEqual(resolve('uk-UA'), 'ua');
    assert.strictEqual(resolve('kk-KZ'), 'kk@Cyrl');
    assert.strictEqual(resolve('af-ZA'), 'zar_afr');
    assert.strictEqual(resolve('no-NO'), 'nb_no');
    assert.strictEqual(resolve('iw-IL'), 'he');
  });

  it('resolves script before region for Chinese', () => {
    assert.strictEqual(resolve('zh-Hans-CN'), 'zh_cn');
    assert.strictEqual(resolve('zh-Hant-TW'), 'zh_tw');
    assert.strictEqual(resolve('zh-Hant-CN'), 'zh_tw');
    assert.strictEqual(resolve('zh-Hans-TW'), 'zh_cn');
    assert.strictEqual(resolve('zh-TW', { scriptCode: 'Hans' }), 'zh_cn');
    assert.strictEqual(resolve('zh-TW'), 'zh_tw');
    assert.strictEqual(resolve('zh-HK'), 'zh_tw');
    assert.strictEqual(resolve('zh-SG'), 'zh_cn');
    assert.strictEqual(resolve('zh'), 'zh_cn');
  });

  it('splits Portuguese and Spanish by region the way Apple does', () => {
    assert.strictEqual(resolve('pt-BR'), 'pt_br');
    assert.strictEqual(resolve('pt-PT'), 'pt_pt');
    assert.strictEqual(resolve('pt-AO'), 'pt_pt');
    assert.strictEqual(resolve('pt'), 'pt_br');
    assert.strictEqual(resolve('es-419'), 'es_419');
    assert.strictEqual(resolve('es-MX'), 'es_419');
    assert.strictEqual(resolve('es', { countryCode: 'AR' }), 'es_419');
    assert.strictEqual(resolve('es-ES'), 'es');
    assert.strictEqual(resolve('es'), 'es');
  });

  it('only takes Latin Serbian, like the plist', () => {
    assert.strictEqual(resolve('sr-Latn-RS'), 'sr_rs');
    assert.strictEqual(resolve('sr-RS', { scriptCode: 'Latn' }), 'sr_rs');
    assert.strictEqual(resolve('sr-Cyrl-RS'), null);
    assert.strictEqual(resolve('sr-RS'), null);
  });

  it('skips locales excluded from CFBundleLocalizations so the next preferred language wins', () => {
    for (const tag of ['da-DK', 'nl-NL', 'fil-PH', 'tl-PH', 'ak-GH', 'pcm-NG', 'nn-NO', 'xx-XX']) {
      assert.strictEqual(resolve(tag), null, tag);
    }
    const locales = [
      { languageCode: 'nl', languageTag: 'nl-NL' },
      { languageCode: 'fr', languageTag: 'fr-FR' },
    ];
    assert.strictEqual(resolveLangCodeFromRnLocales(locales), 'fr_fr');
    assert.strictEqual(resolveLangCodeFromRnLocales([{ languageCode: 'xx', languageTag: 'xx-XX' }]), 'en');
  });
});

describe('pickLaunchLanguage', () => {
  it('fresh install follows the device', () => {
    assert.deepStrictEqual(
      pickLaunchLanguage({
        stored: null,
        lastAutodetected: null,
        device: 'de_de',
        legacyAutodetect: 'en',
      }),
      {
        lang: 'de_de',
        autodetected: true,
      },
    );
  });

  it('keeps following the device while the stored value is still what we autodetected', () => {
    assert.deepStrictEqual(
      pickLaunchLanguage({
        stored: 'de_de',
        lastAutodetected: 'de_de',
        device: 'fr_fr',
        legacyAutodetect: 'en',
      }),
      {
        lang: 'fr_fr',
        autodetected: true,
      },
    );
  });

  it('keeps an in-app pick even when the device language changes', () => {
    assert.deepStrictEqual(
      pickLaunchLanguage({
        stored: 'ru',
        lastAutodetected: 'de_de',
        device: 'fr_fr',
        legacyAutodetect: 'en',
      }),
      {
        lang: 'ru',
        autodetected: false,
      },
    );
  });

  it('upgrade: stored value equal to the legacy autodetect result is treated as autodetected', () => {
    // German device, old autodetect could only produce `en`
    assert.deepStrictEqual(
      pickLaunchLanguage({
        stored: 'en',
        lastAutodetected: null,
        device: 'de_de',
        legacyAutodetect: 'en',
      }),
      {
        lang: 'de_de',
        autodetected: true,
      },
    );
    // in-app pick from before: kept
    assert.deepStrictEqual(
      pickLaunchLanguage({
        stored: 'fr_fr',
        lastAutodetected: null,
        device: 'de_de',
        legacyAutodetect: 'en',
      }),
      {
        lang: 'fr_fr',
        autodetected: false,
      },
    );
  });
});
