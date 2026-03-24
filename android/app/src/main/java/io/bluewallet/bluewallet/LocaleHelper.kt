package io.bluewallet.bluewallet

import android.text.TextUtils
import android.view.View
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.module.annotations.ReactModule
import java.util.Currency
import java.util.Locale

@ReactModule(name = LocaleHelper.NAME)
class LocaleHelper(reactContext: ReactApplicationContext) : NativeLocaleHelperSpec(reactContext) {

    companion object {
        const val NAME = "LocaleHelper"
    }

    override fun getName(): String = NAME

    override fun setPreferredLanguage(locale: String) {
        val localeList = LocaleListCompat.forLanguageTags(locale)
        AppCompatDelegate.setApplicationLocales(localeList)
    }

    override fun getPreferredLanguage(): String? {
        val locales = AppCompatDelegate.getApplicationLocales()
        if (locales.isEmpty) return null
        return locales.toLanguageTags().split(",").firstOrNull()
    }

    override fun resetPreferredLanguage() {
        AppCompatDelegate.setApplicationLocales(LocaleListCompat.getEmptyLocaleList())
    }

    override fun getLocales(): WritableArray {
        val result = Arguments.createArray()
        val config = reactApplicationContext.resources.configuration
        val localeList = config.locales

        for (i in 0 until localeList.size()) {
            val locale = localeList.get(i) ?: continue
            val map = Arguments.createMap()
            map.putString("languageCode", locale.language)
            map.putString("countryCode", locale.country)
            map.putString("languageTag", locale.toLanguageTag())
            val scriptCode = locale.script
            if (scriptCode.isNotEmpty()) {
                map.putString("scriptCode", scriptCode)
            }
            val layoutDir = TextUtils.getLayoutDirectionFromLocale(locale)
            map.putBoolean("isRTL", layoutDir == View.LAYOUT_DIRECTION_RTL)
            result.pushMap(map)
        }
        return result
    }

    override fun getCurrencies(): WritableArray {
        val result = Arguments.createArray()
        val seen = mutableSetOf<String>()
        val config = reactApplicationContext.resources.configuration
        val localeList = config.locales

        for (i in 0 until localeList.size()) {
            val locale = localeList.get(i) ?: continue
            try {
                val currency = Currency.getInstance(locale)
                if (currency != null && seen.add(currency.currencyCode)) {
                    result.pushString(currency.currencyCode)
                }
            } catch (_: IllegalArgumentException) {
                // locale has no associated currency
            }
        }
        if (result.size() == 0) {
            try {
                val currency = Currency.getInstance(Locale.getDefault())
                if (currency != null) {
                    result.pushString(currency.currencyCode)
                }
            } catch (_: IllegalArgumentException) {}
        }
        return result
    }
}
