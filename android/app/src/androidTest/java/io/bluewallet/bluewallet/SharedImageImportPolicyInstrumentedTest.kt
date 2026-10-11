package io.bluewallet.bluewallet

import android.graphics.Bitmap
import android.content.res.Configuration
import android.util.Base64
import android.view.ContextThemeWrapper
import android.view.LayoutInflater
import android.view.View
import android.widget.ImageView
import android.widget.TextView
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.rncamerakit.ImageQRCodeDecoder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
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

        assertEquals(listOf(decodedContent), SharedImageStore.pop(context)?.get("values"))
    }

    @Test
    fun expiredDecodedContentIsDiscarded() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        SharedImageStore.store(context, "bitcoin:expired")
        context.getSharedPreferences("bluewallet_shared_images", android.content.Context.MODE_PRIVATE)
            .edit()
            .putLong("createdAt", System.currentTimeMillis() - 121_000)
            .commit()
        assertNull(SharedImageStore.pop(context))
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
            assertFalse(localizedContext.getString(R.string.shared_image_confirm_button).isBlank())
            assertFalse(localizedContext.getString(R.string.shared_image_help_button).isBlank())
        }
    }

    @Test
    fun resultLayoutSupportsLightDarkLargeTextAndNarrowScreens() {
        val base = InstrumentationRegistry.getInstrumentation().targetContext
        fun render(uiMode: Int): Pair<Int, Int> {
            val configuration = Configuration(base.resources.configuration).apply {
                this.uiMode = uiMode
                fontScale = 1.5f
            }
            val context = ContextThemeWrapper(base.createConfigurationContext(configuration), R.style.AppTheme)
            val view = LayoutInflater.from(context).inflate(R.layout.shared_qr_result, null)
            view.findViewById<TextView>(R.id.shared_qr_content).text = "bitcoin:bc1qexample?amount=0.01&label=Large%20Text"
            val width = (320 * context.resources.displayMetrics.density).toInt()
            view.measure(View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED))
            view.layout(0, 0, view.measuredWidth, view.measuredHeight)
            assertTrue(view.measuredWidth <= width)
            assertTrue(view.measuredHeight > 0)
            assertFalse(view.findViewById<TextView>(R.id.shared_qr_content).text.isNullOrEmpty())
            assertFalse(view.findViewById<ImageView>(R.id.shared_qr_preview).contentDescription.isNullOrEmpty())
            return view.findViewById<TextView>(R.id.shared_qr_content).currentTextColor to view.measuredHeight
        }
        val light = render(Configuration.UI_MODE_NIGHT_NO)
        val dark = render(Configuration.UI_MODE_NIGHT_YES)
        assertNotEquals(light.first, dark.first)
    }
}
