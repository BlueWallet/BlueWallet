package io.bluewallet.bluewallet

import android.content.Context
import android.content.SharedPreferences
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class FiatUnitsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val sharedPreferences: SharedPreferences = reactContext.getSharedPreferences("fiat_units", Context.MODE_PRIVATE)

    override fun getName(): String {
        return "FiatUnitsModule"
    }

    @ReactMethod
    fun setFiatUnits(fiatUnits: String) {
        sharedPreferences.edit().putString("fiatUnits", fiatUnits).apply()
    }

    fun getFiatUnits(): String? {
        return sharedPreferences.getString("fiatUnits", null)
    }
}
