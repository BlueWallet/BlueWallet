package io.bluewallet.bluewallet.components.draggablefile

import android.content.ClipData
import android.content.ClipDescription
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.util.Base64
import android.util.Log
import android.view.View
import android.view.DragEvent
import android.widget.FrameLayout
import androidx.core.content.FileProvider
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter
import java.io.ByteArrayOutputStream
import java.io.File
import io.bluewallet.bluewallet.BuildConfig

class DraggableFile(private val reactContext: ThemedReactContext) : FrameLayout(reactContext) {
    var fileName: String = "export.dat"
    var mimeType: String = "application/octet-stream"
    var content: String = ""
    var isBase64: Boolean = false
    var captureViewAsImage: Boolean = false
    var dragEnabled: Boolean = true
    var dropEnabled: Boolean = false
    var exportOnDrag: Boolean = false
    private var savedForeground: Drawable? = null

    init {
        isLongClickable = true
        setOnLongClickListener {
            if (!dragEnabled || DragAndDropState.isScreenProtected) return@setOnLongClickListener false
            if (exportOnDrag) {
                if (BuildConfig.DEBUG) Log.d("DragAndDrop", "Wallet drag redirected to guarded export")
                val payload = com.facebook.react.bridge.Arguments.createMap().apply { putBoolean("requested", true) }
                @Suppress("DEPRECATION")
                reactContext.getJSModule(RCTEventEmitter::class.java).receiveEvent(id, "onExportRequested", payload)
                return@setOnLongClickListener true
            }
            val file = createExportFile() ?: return@setOnLongClickListener false
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", file)
            if (BuildConfig.DEBUG) Log.d("DragAndDrop", "Prepared outbound item type=$mimeType")
            val clip = ClipData(
                ClipDescription(file.name, arrayOf(mimeType, ClipDescription.MIMETYPE_TEXT_URILIST)),
                ClipData.Item(uri),
            )
            startDragAndDrop(
                clip,
                View.DragShadowBuilder(this),
                DragAndDropState.outboundMarker,
                View.DRAG_FLAG_GLOBAL or View.DRAG_FLAG_GLOBAL_URI_READ,
            )
        }
        setOnDragListener { _, event -> handleDropEvent(event) }
    }

    @Suppress("DEPRECATION")
    private fun handleDropEvent(event: DragEvent): Boolean {
        if (!dropEnabled || DragAndDropState.isScreenProtected || event.localState === DragAndDropState.outboundMarker) return false
        return when (event.action) {
            DragEvent.ACTION_DRAG_STARTED -> event.clipDescription?.let {
                it.hasMimeType("image/*") || it.hasMimeType("text/*") || it.hasMimeType("application/*")
            } == true
            DragEvent.ACTION_DROP -> {
                restoreDropAppearance()
                reactContext.currentActivity?.requestDragAndDropPermissions(event)
                val clipData = event.clipData ?: return false
                if (BuildConfig.DEBUG) Log.d("DragAndDrop", "Native target accepted ${clipData.itemCount} item(s)")
                for (index in 0 until clipData.itemCount) {
                    val item = clipData.getItemAt(index)
                    val uri = item.uri
                    val value = uri?.toString() ?: item.text?.toString()?.trim() ?: continue
                    val payload = com.facebook.react.bridge.Arguments.createMap().apply {
                        if (uri != null) putString("uri", value) else putString("text", value)
                        putString("mimeType", uri?.let(reactContext.contentResolver::getType) ?: event.clipDescription?.getMimeType(0))
                    }
                    reactContext.getJSModule(RCTEventEmitter::class.java).receiveEvent(id, "onFileDrop", payload)
                }
                true
            }
            DragEvent.ACTION_DRAG_ENTERED -> {
                savedForeground = foreground
                foreground = GradientDrawable().apply {
                    setColor(Color.TRANSPARENT)
                    setStroke((3 * resources.displayMetrics.density).toInt(), Color.rgb(61, 169, 252))
                    cornerRadius = 6 * resources.displayMetrics.density
                }
                true
            }
            DragEvent.ACTION_DRAG_EXITED,
            DragEvent.ACTION_DRAG_ENDED -> {
                restoreDropAppearance()
                true
            }
            else -> true
        }
    }

    private fun restoreDropAppearance() {
        foreground = savedForeground
        savedForeground = null
    }

    private fun createExportFile(): File? = try {
        val safeName = File(fileName).name.takeIf { it.isNotBlank() } ?: return null
        val directory = File(context.cacheDir, "drag-exports").apply { mkdirs() }
        val file = File(directory, safeName)
        val bytes = if (captureViewAsImage) snapshotPng() ?: return null
        else if (isBase64) Base64.decode(content, Base64.DEFAULT)
        else content.toByteArray(Charsets.UTF_8)
        file.writeBytes(bytes)
        file
    } catch (error: Exception) {
        if (BuildConfig.DEBUG) Log.d("DragAndDrop", "Could not prepare outbound item", error)
        null
    }

    private fun snapshotPng(): ByteArray? {
        if (width <= 0 || height <= 0) return null
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        return try {
            draw(Canvas(bitmap))
            ByteArrayOutputStream().use { stream ->
                if (bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)) stream.toByteArray() else null
            }
        } finally {
            bitmap.recycle()
        }
    }
}
