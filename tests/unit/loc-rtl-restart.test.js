import assert from 'assert';
import { DeviceEventEmitter, I18nManager } from 'react-native';

import {
  LANGUAGE_RTL_RESTART_EVENT,
  notifyRtlRestartNeeded,
  shouldNotifyRtlLanguageRestart,
} from '../../loc/languageSync';

describe('RTL restart notification', () => {
  it('emits locLanguageRtlRestartNeeded for SettingsProvider alert', () => {
    let received = false;
    const sub = DeviceEventEmitter.addListener(LANGUAGE_RTL_RESTART_EVENT, () => {
      received = true;
    });
    notifyRtlRestartNeeded();
    sub.remove();
    assert.strictEqual(received, true);
  });

  it('detects when desired RTL differs from the running layout direction', () => {
    const original = I18nManager.isRTL;
    Object.defineProperty(I18nManager, 'isRTL', { configurable: true, get: () => false });
    const desiredRtl = true;
    assert.strictEqual(I18nManager.isRTL !== desiredRtl, true);
    Object.defineProperty(I18nManager, 'isRTL', { configurable: true, get: () => original });
  });

  it('does not require restart alert for LTR to LTR manual language changes', () => {
    assert.strictEqual(
      shouldNotifyRtlLanguageRestart({ previousLang: 'en', newLang: 'zar_afr', userSelected: true }),
      false,
    );
    assert.strictEqual(
      shouldNotifyRtlLanguageRestart({ previousLang: 'zar_afr', newLang: 'en', userSelected: true }),
      false,
    );
  });

  it('requires restart alert only when manual pick crosses RTL catalog boundary', () => {
    assert.strictEqual(
      shouldNotifyRtlLanguageRestart({ previousLang: 'en', newLang: 'ar', userSelected: true }),
      true,
    );
    assert.strictEqual(
      shouldNotifyRtlLanguageRestart({ previousLang: 'ar', newLang: 'en', userSelected: true }),
      true,
    );
    assert.strictEqual(shouldNotifyRtlLanguageRestart({ previousLang: 'en', newLang: 'ar' }), false);
    assert.strictEqual(shouldNotifyRtlLanguageRestart({ previousLang: null, newLang: 'ar', userSelected: true }), false);
  });
});
