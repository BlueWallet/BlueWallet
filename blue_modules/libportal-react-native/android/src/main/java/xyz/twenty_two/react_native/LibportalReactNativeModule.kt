package xyz.twenty_two.react_native

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

import xyz.twenty_two.PortalSdk
import xyz.twenty_two.GenerateMnemonicWords

class LibportalReactNativeModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  var instance: PortalSdk? = null

  override fun getName(): String {
    return NAME
  }

  @ReactMethod
  fun constructor(useFastOps: Boolean, promise: Promise) {
    if (instance == null) {
      instance = PortalSdk(useFastOps)
      promise.resolve(null)
    }
  }

  @ReactMethod
  fun poll(promise: Promise) {
    scope.launch {
      try {
        val nfcOut = instance!!.poll()
        val map = WritableNativeMap()
        map.putInt("msgIndex", nfcOut.msgIndex.toInt())
        val data = WritableNativeArray()
        nfcOut.data.forEach { data.pushInt(it.toInt()) }
        map.putArray("data", data)

        promise.resolve(map)
      } catch (e: Exception) {
        promise.reject(e)
      }
    }
  }

  @ReactMethod
  fun newTag(promise: Promise) {
    scope.launch {
      try {
        instance!!.newTag()
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject(e)
      }
    }
  }

  fun convertByteArray(data: ReadableArray): ByteArray {
    val dataParsed = arrayListOf<Byte>()
    for (i in 0 until data.size()) {
      if (data.getType(i) != ReadableType.Number) {
        throw Throwable("Invalid data type")
      } else {
        dataParsed.add(data.getDouble(i).toInt().toByte())
      }
    }

    return dataParsed.toByteArray()
  }

  @ReactMethod
  fun incomingData(msgIndex: Int, data: ReadableArray, promise: Promise) {
    try {
      scope.launch {
        instance!!.incomingData(msgIndex.toULong(), convertByteArray(data))
        promise.resolve(null)
      }
    } catch (e: Exception) {
      promise.reject(e)
    }
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    try {
      scope.launch {
        val status = instance!!.getStatus()

        val map = WritableNativeMap()
        map.putBoolean("initialized", status.initialized)
        // map.putBoolean("unverified", status.unverified)
        map.putBoolean("unlocked", status.unlocked)
        map.putString("network", status.network)

        promise.resolve(map)
      }
    } catch (e: Exception) {
      promise.reject(e)
    }
  }

  @ReactMethod
  fun generateMnemonic(numWords: String, network: String, pair_code: String?, promise: Promise) {
    val numWordsParsed = when(numWords) {
      "Words12" -> GenerateMnemonicWords.WORDS12
      "Words24" -> GenerateMnemonicWords.WORDS24
      else -> throw Throwable("Invalid num words")
    }

    try {
        scope.launch {
          instance!!.generateMnemonic(numWordsParsed, network, pair_code)
          promise.resolve(null)
        }
    } catch (e: Exception) {
      promise.reject(e)
    }
  }

  @ReactMethod
  fun restoreMnemonic(mnemonic: String, network: String, pair_code: String?, promise: Promise) {
    try {
      scope.launch {
        instance!!.restoreMnemonic(mnemonic, network, pair_code)
        promise.resolve(null)
      }
    } catch (e: Exception) {
      promise.reject(e)
    }
  }

  @ReactMethod
  fun unlock(pair_code: String, promise: Promise) {
    try {
      scope.launch {
        instance!!.unlock(pair_code)
        promise.resolve(null)
      }
    } catch (e: Exception) {
      promise.reject(e)
    }
  }

  @ReactMethod
  fun resume(promise: Promise) {
    try {
      scope.launch {
        // instance!!.resume()
        promise.resolve(null)
      }
    } catch (e: Exception) {
      promise.reject(e)
    }
  }

  @ReactMethod
  fun displayAddress(index: Int, promise: Promise) {
    try {
      scope.launch {
        promise.resolve(instance!!.displayAddress(index.toUInt()))
      }
    } catch (e: Exception) {
      promise.reject(e)
    }
  }

  @ReactMethod
  fun signPsbt(psbt: String, promise: Promise) {
    try {
      scope.launch {
        promise.resolve(instance!!.signPsbt(psbt))
      }
    } catch (e: Exception) {
      promise.reject(e)
    }
  }

  @ReactMethod
  fun publicDescriptors(promise: Promise) {
    try {
      scope.launch {
        val descriptors = instance!!.publicDescriptors()

        val map = WritableNativeMap()
        map.putString("external", descriptors.external)
        if (descriptors.internal != null) {
          map.putString("internal", descriptors.internal)
        }

        promise.resolve(map)
      }
    } catch (e: Exception) {
      promise.reject(e)
    }
  }

  @ReactMethod
  fun updateFirmware(binary: ReadableArray, promise: Promise) {
    try {
      scope.launch {
        instance!!.updateFirmware(convertByteArray(binary))
        promise.resolve(null)
      }
    } catch (e: Exception) {
      promise.reject(e)
    }
  }

  companion object {
    const val NAME = "LibportalReactNative"
  }
}
