package io.bluewallet.bluewallet

import java.math.BigInteger
import java.security.MessageDigest

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
    fun shouldOpenAsBitcoinBatch(values: List<String>): Boolean =
        values.isNotEmpty() && values.all { bitcoinAddress(it) != null }

    fun bitcoinAddress(value: String): String? {
        val candidate = value.trim()
        val withoutScheme = candidate
            .replace(Regex("^bitcoin:(//)?", RegexOption.IGNORE_CASE), "")
            .substringBefore('?')
        return withoutScheme.takeIf { isValidBech32Address(it) || isValidBase58CheckAddress(it) }
    }

    fun shouldShowBlueWalletBranding(value: String): Boolean {
        val candidate = value.trim()
        val lowercased = candidate.lowercase()
        if (lowercased.startsWith("bitcoin:") || lowercased.startsWith("bitcoin://")) return true
        if (lowercased.startsWith("lndhub://") || lowercased.startsWith("blitzhub://")) return true
        return bitcoinAddress(candidate) != null
    }

    private fun isValidBech32Address(value: String): Boolean {
        if (value.length > 90 || value != value.lowercase() && value != value.uppercase()) return false
        val candidate = value.lowercase()
        val separator = candidate.lastIndexOf('1')
        if (separator <= 0) return false
        val hrp = candidate.substring(0, separator)
        if (hrp !in setOf("bc", "tb", "bcrt")) return false
        val alphabet = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
        val payload = candidate.substring(separator + 1)
        if (payload.length < 6) return false
        val values = payload.map(alphabet::indexOf)
        if (values.any { it < 0 }) return false
        val expanded = hrp.map { it.code shr 5 } + 0 + hrp.map { it.code and 31 }
        return polymod(expanded + values) in setOf(1, 0x2bc830a3)
    }

    private fun polymod(values: List<Int>): Int {
        val generators = intArrayOf(0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3)
        var checksum = 1
        values.forEach { value ->
            val top = checksum ushr 25
            checksum = (checksum and 0x1ffffff) shl 5 xor value
            for (bit in 0..4) if ((top ushr bit) and 1 == 1) checksum = checksum xor generators[bit]
        }
        return checksum
    }

    private fun isValidBase58CheckAddress(value: String): Boolean {
        if (value.length !in 26..35 || value.firstOrNull() !in setOf('1', '3')) return false
        val alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
        var number = BigInteger.ZERO
        value.forEach { character ->
            val digit = alphabet.indexOf(character)
            if (digit < 0) return false
            number = number.multiply(BigInteger.valueOf(58)).add(BigInteger.valueOf(digit.toLong()))
        }
        var decoded = number.toByteArray().let { if (it.size > 1 && it[0] == 0.toByte()) it.copyOfRange(1, it.size) else it }
        decoded = ByteArray(value.takeWhile { it == '1' }.length) + decoded
        if (decoded.size <= 4) return false
        val payload = decoded.copyOfRange(0, decoded.size - 4)
        val expected = MessageDigest.getInstance("SHA-256").digest(MessageDigest.getInstance("SHA-256").digest(payload)).take(4)
        return expected == decoded.takeLast(4)
    }
}

internal enum class SharedImageImportError(val code: String, val messageResource: Int) {
    TOO_MANY_IMAGES("shared_image_too_many", R.string.shared_image_error_too_many),
    UNREADABLE("shared_image_unreadable", R.string.shared_image_error_unreadable),
    FILE_TOO_LARGE("shared_image_too_large", R.string.shared_image_error_file_too_large),
    DIMENSIONS_TOO_LARGE("shared_image_dimensions_too_large", R.string.shared_image_error_dimensions_too_large),
    NO_QR_CODE("shared_image_no_qrcode", R.string.shared_image_error_no_qr),
}

internal class SharedImageImportException(val reason: SharedImageImportError) : Exception(reason.code)
