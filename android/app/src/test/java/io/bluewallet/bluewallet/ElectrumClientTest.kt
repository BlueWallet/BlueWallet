package io.bluewallet.bluewallet

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOf
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

    @Test
    fun `stream response does not invoke fallback`() = runBlocking {
        var oneShotCalls = 0
        var fallbackCalls = 0
        val expected = "streamed".toByteArray()

        val actual = receiveElectrumResponse(
            useStreaming = true,
            stream = { flowOf(expected) },
            oneShot = { oneShotCalls++; ByteArray(0) },
            fallback = { fallbackCalls++; ByteArray(0) },
        )

        assertArrayEquals(expected, actual)
        assertEquals(0, oneShotCalls)
        assertEquals(0, fallbackCalls)
    }

    @Test
    fun `stream failure invokes one-shot fallback once`() = runBlocking {
        var fallbackCalls = 0
        val expected = "fallback".toByteArray()

        val actual = receiveElectrumResponse(
            useStreaming = true,
            stream = { flow { throw IllegalStateException("stream failed") } },
            oneShot = { ByteArray(0) },
            fallback = {
                fallbackCalls++
                expected
            },
        )

        assertArrayEquals(expected, actual)
        assertEquals(1, fallbackCalls)
    }

    @Test
    fun `disabled streaming uses one-shot without creating stream`() = runBlocking {
        var streamCalls = 0
        var fallbackCalls = 0
        val expected = "one-shot".toByteArray()

        val actual = receiveElectrumResponse(
            useStreaming = false,
            stream = { streamCalls++; flowOf(ByteArray(0)) },
            oneShot = { expected },
            fallback = { fallbackCalls++; ByteArray(0) },
        )

        assertArrayEquals(expected, actual)
        assertEquals(0, streamCalls)
        assertEquals(0, fallbackCalls)
    }

    @Test
    fun `cancellation does not invoke fallback`() {
        var fallbackCalls = 0

        assertThrows(CancellationException::class.java) {
            runBlocking {
                receiveElectrumResponse(
                    useStreaming = true,
                    stream = { flow { throw CancellationException("cancelled") } },
                    oneShot = { ByteArray(0) },
                    fallback = { fallbackCalls++; ByteArray(0) },
                )
            }
        }
        assertEquals(0, fallbackCalls)
    }
}
