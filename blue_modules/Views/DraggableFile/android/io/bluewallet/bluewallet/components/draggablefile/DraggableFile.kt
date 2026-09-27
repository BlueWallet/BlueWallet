package io.bluewallet.bluewallet.components.draggablefile

import android.content.ClipData
import android.content.ClipDescription
import android.graphics.Bitmap
import android.graphics.Canvas
import android.util.Base64
import android.view.View
import android.widget.FrameLayout
import androidx.core.content.FileProvider
import com.facebook.react.uimanager.ThemedReactContext
import java.io.ByteArrayOutputStream
import java.io.File

class DraggableFile(private val reactContext: ThemedReactContext) : FrameLayout(reactContext) {
    var fileName: String = "export.dat"
    var mimeType: String = "application/octet-stream"
    var content: String = ""
    var isBase64: Boolean = false
    var captureViewAsImage: Boolean = false

    init {
        isLongClickable = true
        setOnLongClickListener {
            if (DragAndDropState.isScreenProtected) return@setOnLongClickListener false
            val file = createExportFile() ?: return@setOnLongClickListener false
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", file)
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
    } catch (_: Exception) {
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
