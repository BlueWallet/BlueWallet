package io.bluewallet.bluewallet

import android.graphics.Bitmap
import android.util.Base64
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.rncamerakit.ImageQRCodeDecoder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import java.io.ByteArrayOutputStream
import java.util.Locale

@RunWith(AndroidJUnit4::class)
class SharedImageImportPolicyInstrumentedTest {
    @Test
    fun boundaryImageIsAcceptedOnDevice() {
        SharedImageImportPolicy.validateEncodedSize(SharedImageImportPolicy.MAX_ENCODED_BYTES)
        SharedImageImportPolicy.validateDimensions(4_000, 4_000)
    }

    @Test
    fun oversizedImageReturnsTypedNativeErrorOnDevice() {
        val error = assertThrows(SharedImageImportException::class.java) {
            SharedImageImportPolicy.validateDimensions(4_001, 4_000)
        }
        assertEquals(SharedImageImportError.DIMENSIONS_TOO_LARGE, error.reason)
    }

    @Test
    fun decodedContentReachesTheTurboModuleUnchanged() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val decodedContent = "bitcoin:bc1qexample?amount=0.01&label=Café%20☕️"

        SharedImageStore.store(context, decodedContent)

        assertEquals(decodedContent, SharedImageStore.pop(context)?.get("value"))
    }

    @Test
    fun nativeResultPreviewsRemainDecodableWithAndWithoutBranding() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        listOf("bitcoin:bc1qexample?amount=0.01", "https://example.com/invoice/42").forEach { content ->
            val preview = SharedQRCodePreview.render(context, content)
            val encoded = ByteArrayOutputStream().use { output ->
                preview.compress(Bitmap.CompressFormat.PNG, 100, output)
                Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP)
            }
            assertEquals(content, ImageQRCodeDecoder.decode(encoded))
        }
    }

    @Test
    fun everyErrorHasLocalizedGuidanceOnDevice() {
        val baseContext = InstrumentationRegistry.getInstrumentation().targetContext
        listOf(Locale.ENGLISH, Locale.forLanguageTag("es"), Locale.FRENCH).forEach { locale ->
            val configuration = baseContext.resources.configuration.apply { setLocale(locale) }
            val localizedContext = baseContext.createConfigurationContext(configuration)
            SharedImageImportError.entries.forEach { error ->
                assertFalse(localizedContext.getString(error.messageResource).isBlank())
            }
            assertFalse(localizedContext.getString(R.string.shared_image_confirm_title).isBlank())
            assertFalse(localizedContext.getString(R.string.shared_image_confirm_message).isBlank())
            assertFalse(localizedContext.getString(R.string.shared_image_confirm_button).isBlank())
            assertFalse(localizedContext.getString(R.string.shared_image_help_button).isBlank())
        }
    }
}
