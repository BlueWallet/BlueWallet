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
import io.nayuki.qrcodegen.QrCode

internal object SharedQRCodePreview {
    private const val SIZE = 720
    private const val LOGO_FRACTION = 90f / 271f
    private const val QUIET_ZONE_MODULES = 1

    fun render(context: Context, value: String): Bitmap {
        var highCorrection = true
        val qrCode = try {
            QrCode.encodeText(value, QrCode.Ecc.HIGH)
        } catch (_: Exception) {
            highCorrection = false
            QrCode.encodeText(value, QrCode.Ecc.LOW)
        }
        val moduleCount = qrCode.size + QUIET_ZONE_MODULES * 2
        val moduleSize = maxOf(1, SIZE / moduleCount)
        val bitmapSize = moduleCount * moduleSize
        val bitmap = Bitmap.createBitmap(bitmapSize, bitmapSize, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)
        val paint = Paint().apply {
            isAntiAlias = false
            shader = LinearGradient(
                0f,
                0f,
                bitmapSize.toFloat(),
                bitmapSize.toFloat(),
                Color.rgb(12, 37, 80),
                Color.rgb(30, 58, 138),
                Shader.TileMode.CLAMP,
            )
        }
        for (y in 0 until qrCode.size) {
            for (x in 0 until qrCode.size) {
                if (qrCode.getModule(x, y)) {
                    val left = (x + QUIET_ZONE_MODULES) * moduleSize
                    val top = (y + QUIET_ZONE_MODULES) * moduleSize
                    canvas.drawRect(
                        left.toFloat(),
                        top.toFloat(),
                        (left + moduleSize).toFloat(),
                        (top + moduleSize).toFloat(),
                        paint,
                    )
                }
            }
        }

        if (highCorrection && SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding(value)) {
            drawLogo(context, canvas, bitmapSize, moduleSize)
        }
        return bitmap
    }

    private fun drawLogo(context: Context, canvas: Canvas, bitmapSize: Int, moduleSize: Int) {
        val logo = BitmapFactory.decodeResource(context.resources, R.drawable.shared_qr_logo) ?: return
        val logoSize = (bitmapSize * LOGO_FRACTION).toInt()
        val requestedBackdrop = logoSize + moduleSize
        val backdropModules = ((requestedBackdrop + moduleSize - 1) / moduleSize).let { if (it % 2 == 0) it + 1 else it }
        val backdropSize = backdropModules * moduleSize
        val left = (bitmapSize - logoSize) / 2
        val top = (bitmapSize - logoSize) / 2
        val backdropLeft = (bitmapSize - backdropSize) / 2
        val background = Paint().apply { color = Color.WHITE }
        canvas.drawRect(
            backdropLeft.toFloat(),
            backdropLeft.toFloat(),
            (backdropLeft + backdropSize).toFloat(),
            (backdropLeft + backdropSize).toFloat(),
            background,
        )
        canvas.drawBitmap(logo, null, Rect(left, top, left + logoSize, top + logoSize), Paint(Paint.ANTI_ALIAS_FLAG))
    }
}
