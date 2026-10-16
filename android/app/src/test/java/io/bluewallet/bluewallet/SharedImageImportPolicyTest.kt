package io.bluewallet.bluewallet

import org.junit.jupiter.api.Assertions.assertDoesNotThrow
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource
import java.io.File

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
        brandingFixtures().forEach { (branded, value) ->
            assertEquals(branded, SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding(value), value)
        }
    }

    @Test
    fun `extracts only valid Bitcoin recipients`() {
        assertEquals(
            "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
            SharedQRCodePreviewPolicy.bitcoinAddress("bitcoin:1BoatSLRHtKNngkdXEeobR76b53LETtpyT?amount=1"),
        )
        assertNull(SharedQRCodePreviewPolicy.bitcoinAddress("lightning:lnbc1example"))
    }

    @Test
    fun `only valid Bitcoin recipients can open as a batch`() {
        val addresses = listOf("1BoatSLRHtKNngkdXEeobR76b53LETtpyT", "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy")
        assertTrue(SharedQRCodePreviewPolicy.shouldOpenAsBitcoinBatch(addresses))
        assertTrue(!SharedQRCodePreviewPolicy.shouldOpenAsBitcoinBatch(addresses + "lightning:lnbc1example"))
    }

    private fun brandingFixtures(): List<Pair<Boolean, String>> {
        val fixture = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
            .map { File(it, "tests/fixtures/shared-qr-branding.tsv") }
            .firstOrNull(File::isFile)
            ?: error("Could not find shared-qr-branding.tsv")
        return fixture.readLines().filterNot { it.startsWith("#") || it.isBlank() }.map { line ->
            val (branded, value) = line.split('\t', limit = 2)
            branded.toBooleanStrict() to value
        }
    }
}
