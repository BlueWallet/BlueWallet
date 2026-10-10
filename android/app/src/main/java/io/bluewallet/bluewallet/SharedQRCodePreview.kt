package io.bluewallet.bluewallet

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.Shader
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel

internal object SharedQRCodePreview {
    private const val SIZE = 720
    private const val LOGO_FRACTION = 90f / 271f

    fun render(context: Context, value: String): Bitmap {
        var correctionLevel = ErrorCorrectionLevel.H
        val writer = QRCodeWriter()
        val matrix = try {
            encode(writer, value, correctionLevel)
        } catch (_: Exception) {
            correctionLevel = ErrorCorrectionLevel.L
            encode(writer, value, correctionLevel)
        }
        val bitmap = Bitmap.createBitmap(SIZE, SIZE, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(
                0f,
                SIZE.toFloat(),
                SIZE.toFloat(),
                0f,
                Color.rgb(12, 37, 80),
                Color.rgb(30, 58, 138),
                Shader.TileMode.CLAMP,
            )
        }
        for (y in 0 until matrix.height) {
            for (x in 0 until matrix.width) {
                if (matrix[x, y]) canvas.drawPoint(x.toFloat(), y.toFloat(), paint)
            }
        }

        if (correctionLevel == ErrorCorrectionLevel.H && SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding(value)) {
            drawLogo(context, canvas)
        }
        return bitmap
    }

    private fun encode(writer: QRCodeWriter, value: String, correctionLevel: ErrorCorrectionLevel) = writer.encode(
        value,
        BarcodeFormat.QR_CODE,
        SIZE,
        SIZE,
        mapOf(
            EncodeHintType.ERROR_CORRECTION to correctionLevel,
            EncodeHintType.MARGIN to 1,
        ),
    )

    private fun drawLogo(context: Context, canvas: Canvas) {
        val logo = BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher) ?: return
        val logoSize = (SIZE * LOGO_FRACTION).toInt()
        val padding = SIZE / 50
        val left = (SIZE - logoSize) / 2
        val top = (SIZE - logoSize) / 2
        val background = Paint().apply { color = Color.WHITE }
        canvas.drawRect(
            (left - padding).toFloat(),
            (top - padding).toFloat(),
            (left + logoSize + padding).toFloat(),
            (top + logoSize + padding).toFloat(),
            background,
        )
        canvas.drawBitmap(logo, null, Rect(left, top, left + logoSize, top + logoSize), Paint(Paint.ANTI_ALIAS_FLAG))
    }
}
