package io.bluewallet.bluewallet

import android.content.Context
import android.graphics.Bitmap
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
import org.json.JSONArray
import java.util.concurrent.Executors

object SharedImageStore {
    const val EVENT_NAME = "sharedImageAvailable"
    private const val PREFERENCES = "bluewallet_shared_images"
    private const val VALUE_KEY = "value"
    private const val VALUES_KEY = "values"
    private const val CREATED_AT_KEY = "createdAt"
    private const val VERSION_KEY = "version"
    private const val MAXIMUM_PAYLOAD_AGE_MILLIS = 120_000L
    private const val MAXIMUM_DECODE_DIMENSION = 2_048
    private val executor = Executors.newSingleThreadExecutor()

    internal fun importAsync(context: Context, source: Uri, completion: (String?, SharedImageImportError?) -> Unit) {
        executor.execute {
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

    internal fun importManyAsync(
        context: Context,
        sources: List<Uri>,
        shouldContinue: () -> Boolean = { true },
        completion: (List<String>, SharedImageImportError?) -> Unit,
    ) {
        executor.execute {
            val values = mutableListOf<String>()
            var lastError: SharedImageImportError? = null
            sources.take(10).forEach { source ->
                if (!shouldContinue()) return@execute
                try {
                    val value = decodeImage(context, source)
                    if (value != null) values.add(value)
                } catch (error: SharedImageImportException) {
                    lastError = error.reason
                } catch (_: OutOfMemoryError) {
                    lastError = SharedImageImportError.DIMENSIONS_TOO_LARGE
                } catch (_: Exception) {
                    lastError = SharedImageImportError.UNREADABLE
                }
            }
            if (!shouldContinue()) return@execute
            completion(values.distinct(), lastError ?: if (values.isEmpty()) SharedImageImportError.NO_QR_CODE else null)
        }
    }

    fun store(context: Context, value: String) {
        store(context, listOf(value))
    }

    fun store(context: Context, values: List<String>) {
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .edit()
            .putString(VALUES_KEY, JSONArray(values).toString())
            .putLong(CREATED_AT_KEY, System.currentTimeMillis())
            .putInt(VERSION_KEY, 2)
            .apply()
    }

    fun pop(context: Context): Map<String, Any>? {
        val preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
        val value = preferences.getString(VALUE_KEY, null)
        val encodedValues = preferences.getString(VALUES_KEY, null)
        val createdAt = preferences.getLong(CREATED_AT_KEY, 0)
        val version = preferences.getInt(VERSION_KEY, 0)
        preferences.edit().clear().apply()
        val age = System.currentTimeMillis() - createdAt
        if (createdAt <= 0 || age !in -5_000..MAXIMUM_PAYLOAD_AGE_MILLIS) return null
        if (version == 2 && encodedValues != null) {
            val values = runCatching {
                val array = JSONArray(encodedValues)
                (0 until array.length()).mapNotNull { array.optString(it).takeIf(String::isNotBlank) }
            }.getOrNull().orEmpty()
            return values.takeIf(List<String>::isNotEmpty)?.let { mapOf("values" to it) }
        }
        return value?.takeIf { version == 1 }?.let { mapOf("value" to it) }
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

        return decodeImage(bytes)
    }

    fun decodeImage(bytes: ByteArray): String? {
        SharedImageImportPolicy.validateEncodedSize(bytes.size.toLong())

        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        SharedImageImportPolicy.validateDimensions(bounds.outWidth, bounds.outHeight)

        var sampleSize = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / sampleSize > MAXIMUM_DECODE_DIMENSION) {
            sampleSize *= 2
        }
        val bitmap = BitmapFactory.decodeByteArray(
            bytes,
            0,
            bytes.size,
            BitmapFactory.Options().apply {
                inSampleSize = sampleSize
                inPreferredConfig = Bitmap.Config.ARGB_8888
            },
        ) ?: throw SharedImageImportException(SharedImageImportError.UNREADABLE)

        return try {
            val downsampled = java.io.ByteArrayOutputStream().use { output ->
                if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) {
                    throw SharedImageImportException(SharedImageImportError.UNREADABLE)
                }
                output.toByteArray()
            }
            ImageQRCodeDecoder.decode(Base64.encodeToString(downsampled, Base64.NO_WRAP))
        } finally {
            bitmap.recycle()
        }
    }
}

@ReactModule(name = SharedImageModule.NAME)
class SharedImageModule(private val context: ReactApplicationContext) : NativeSharedImageModuleSpec(context) {
    companion object {
        const val NAME = "SharedImageModule"
        private val decoderExecutor = Executors.newSingleThreadExecutor()
    }

    override fun getName() = NAME

    @ReactMethod
    override fun decodeImage(base64Image: String, promise: Promise) {
        decoderExecutor.execute {
            try {
                val bytes = Base64.decode(base64Image, Base64.DEFAULT)
                promise.resolve(SharedImageStore.decodeImage(bytes))
            } catch (error: Exception) {
                promise.reject("unreadable_image", "The selected image could not be read.", error)
            } catch (error: OutOfMemoryError) {
                promise.reject("image_too_large", "The selected image is too large to process.", error)
            }
        }
    }

    @ReactMethod
    override fun popPendingImage(promise: Promise) {
        val value = SharedImageStore.pop(context)
        promise.resolve(value?.let { Arguments.makeNativeMap(it) })
    }

}
