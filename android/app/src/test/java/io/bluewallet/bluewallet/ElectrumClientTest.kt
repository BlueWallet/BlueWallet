package io.bluewallet.bluewallet

import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

class ElectrumClientTest {
    @Test
    fun `uses one-shot receiving in battery saver mode`() {
        assertEquals(true, shouldUseElectrumStreaming(false, false, 0))
        assertEquals(false, shouldUseElectrumStreaming(true, false, 10_000))
        assertEquals(false, shouldUseElectrumStreaming(false, true, 10_000))
        assertEquals(false, shouldUseElectrumStreaming(false, false, 511))
        assertEquals(true, shouldUseElectrumStreaming(false, false, 512))
    }

    @Test
    fun `taking the first message closes the subscription`() = runBlocking {
        var closeCount = 0
        val expected = "response\n".toByteArray()

        val actual = electrumMessageFlow(receive = { expected }, close = { closeCount++ }).first()

        assertArrayEquals(expected, actual)
        assertEquals(1, closeCount)
    }

    @Test
    fun `empty reads fail and close the subscription`() {
        var closeCount = 0

        assertThrows(IllegalStateException::class.java) {
            runBlocking {
                electrumMessageFlow(receive = { ByteArray(0) }, close = { closeCount++ }).first()
            }
        }
        assertEquals(1, closeCount)
    }
}
