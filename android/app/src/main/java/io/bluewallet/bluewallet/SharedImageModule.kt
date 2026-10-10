package io.bluewallet.bluewallet

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import com.rncamerakit.ImageQRCodeDecoder
import java.util.concurrent.Executors

object SharedImageStore {
    const val EVENT_NAME = "sharedImageAvailable"
    private const val PREFERENCES = "bluewallet_shared_images"
    private const val VALUE_KEY = "value"
    private val executor = Executors.newSingleThreadExecutor()

    internal fun importAsync(context: Context, source: Uri, completion: (String?, SharedImageImportError?) -> Unit) {
        executor.execute {
            val preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            preferences.edit().clear().commit()

            var importError: SharedImageImportError? = null
            var value: String? = null
            try {
                val declaredSize = context.contentResolver.query(source, arrayOf(OpenableColumns.SIZE), null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst() && !cursor.isNull(0)) cursor.getLong(0) else null
                }
                if (declaredSize != null) SharedImageImportPolicy.validateEncodedSize(declaredSize)

                value = decodeImage(context, source)
                    ?: throw SharedImageImportException(SharedImageImportError.NO_QR_CODE)
            } catch (error: SharedImageImportException) {
                importError = error.reason
            } catch (_: OutOfMemoryError) {
                importError = SharedImageImportError.DIMENSIONS_TOO_LARGE
            } catch (_: Exception) {
                importError = SharedImageImportError.UNREADABLE
            }
            completion(value, importError)
        }
    }

    fun store(context: Context, value: String) {
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .edit()
            .putString(VALUE_KEY, value)
            .commit()
    }

    fun pop(context: Context): Map<String, String>? {
        val preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
        val value = preferences.getString(VALUE_KEY, null)
        preferences.edit().clear().commit()
        return value?.let { mapOf("value" to it) }
    }

    fun decodeImage(context: Context, source: Uri): String? {
        val bytes = context.contentResolver.openInputStream(source)?.use { input ->
            val output = java.io.ByteArrayOutputStream()
            val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
            var total = 0L
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                total += count
                SharedImageImportPolicy.validateEncodedSize(total)
                output.write(buffer, 0, count)
            }
            output.toByteArray()
        } ?: throw SharedImageImportException(SharedImageImportError.UNREADABLE)

        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        SharedImageImportPolicy.validateDimensions(bounds.outWidth, bounds.outHeight)

        return ImageQRCodeDecoder.decode(Base64.encodeToString(bytes, Base64.NO_WRAP))
    }
}

@ReactModule(name = SharedImageModule.NAME)
class SharedImageModule(private val context: ReactApplicationContext) : NativeSharedImageModuleSpec(context) {
    companion object {
        const val NAME = "SharedImageModule"
    }

    override fun getName() = NAME

    @ReactMethod
    override fun popPendingImage(promise: Promise) {
        val value = SharedImageStore.pop(context)
        promise.resolve(value?.let { Arguments.makeNativeMap(it) })
    }

}
