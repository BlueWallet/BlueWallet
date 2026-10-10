package io.bluewallet.bluewallet

internal object SharedImageImportPolicy {
    const val MAX_ENCODED_BYTES = 10L * 1024L * 1024L
    const val MAX_PIXEL_COUNT = 16_000_000L

    fun validateEncodedSize(bytes: Long) {
        if (bytes < 0) throw SharedImageImportException(SharedImageImportError.UNREADABLE)
        if (bytes > MAX_ENCODED_BYTES) throw SharedImageImportException(SharedImageImportError.FILE_TOO_LARGE)
    }

    fun validateDimensions(width: Int, height: Int) {
        if (width <= 0 || height <= 0) throw SharedImageImportException(SharedImageImportError.UNREADABLE)
        val pixels = width.toLong() * height.toLong()
        if (pixels > MAX_PIXEL_COUNT) throw SharedImageImportException(SharedImageImportError.DIMENSIONS_TOO_LARGE)
    }
}

internal object SharedQRCodePreviewPolicy {
    fun shouldShowBlueWalletBranding(value: String): Boolean {
        val candidate = value.trim()
        val lowercased = candidate.lowercase()
        if (lowercased.startsWith("bitcoin:") || lowercased.startsWith("bitcoin://")) return true
        if (lowercased.startsWith("lndhub://") || lowercased.startsWith("blitzhub://")) return true
        if (lowercased.startsWith("bc1") || lowercased.startsWith("tb1") || lowercased.startsWith("bcrt1")) {
            return candidate.length in 14..90
        }
        val base58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz".toSet()
        return (candidate.startsWith("1") || candidate.startsWith("3")) &&
            candidate.length in 26..62 && candidate.all(base58::contains)
    }
}

internal enum class SharedImageImportError(val code: String, val messageResource: Int) {
    UNREADABLE("shared_image_unreadable", R.string.shared_image_error_unreadable),
    FILE_TOO_LARGE("shared_image_too_large", R.string.shared_image_error_file_too_large),
    DIMENSIONS_TOO_LARGE("shared_image_dimensions_too_large", R.string.shared_image_error_dimensions_too_large),
    NO_QR_CODE("shared_image_no_qrcode", R.string.shared_image_error_no_qr),
}

internal class SharedImageImportException(val reason: SharedImageImportError) : Exception(reason.code)
