package io.bluewallet.bluewallet

import org.junit.jupiter.api.Assertions.assertDoesNotThrow
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource

class SharedImageImportPolicyTest {
    @Test
    fun `accepts values exactly at both limits`() {
        assertDoesNotThrow {
            SharedImageImportPolicy.validateEncodedSize(SharedImageImportPolicy.MAX_ENCODED_BYTES)
            SharedImageImportPolicy.validateDimensions(4_000, 4_000)
        }
    }

    @Test
    fun `rejects encoded files over 10 MB`() {
        val error = assertThrows(SharedImageImportException::class.java) {
            SharedImageImportPolicy.validateEncodedSize(SharedImageImportPolicy.MAX_ENCODED_BYTES + 1)
        }
        assertEquals(SharedImageImportError.FILE_TOO_LARGE, error.reason)
    }

    @Test
    fun `rejects images over 16 megapixels`() {
        val error = assertThrows(SharedImageImportException::class.java) {
            SharedImageImportPolicy.validateDimensions(4_001, 4_000)
        }
        assertEquals(SharedImageImportError.DIMENSIONS_TOO_LARGE, error.reason)
    }

    @ParameterizedTest
    @CsvSource("0, 10", "-1, 10", "10, 0", "10, -1")
    fun `rejects invalid dimensions`(width: Int, height: Int) {
        val error = assertThrows(SharedImageImportException::class.java) {
            SharedImageImportPolicy.validateDimensions(width, height)
        }
        assertEquals(SharedImageImportError.UNREADABLE, error.reason)
    }

    @Test
    fun `every error has a stable code and localized message resource`() {
        SharedImageImportError.entries.forEach { error ->
            assertTrue(error.code.isNotBlank())
            assertTrue(error.messageResource != 0)
        }
        assertEquals(SharedImageImportError.entries.size, SharedImageImportError.entries.map { it.code }.toSet().size)
    }

    @Test
    fun `only clearly Bitcoin and LNDHub values use BlueWallet branding`() {
        assertTrue(SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding("bitcoin:bc1qexample?amount=0.01"))
        assertTrue(SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding("1BoatSLRHtKNngkdXEeobR76b53LETtpyT"))
        assertTrue(SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding("lndhub://login:password"))
        assertTrue(SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding("blitzhub://login:password"))
        assertFalse(SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding("https://example.com"))
        assertFalse(SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding("plain text"))
    }
}
