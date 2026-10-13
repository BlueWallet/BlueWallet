package io.bluewallet.bluewallet

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

class ElectrumClientTest {
    private val servers = listOf(
        ElectrumClient.ElectrumServer("one.example", 50001, false),
        ElectrumClient.ElectrumServer("two.example", 50002, true),
        ElectrumClient.ElectrumServer("three.example", 443, true),
    )

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

    @Test
    fun `healthy endpoints rotate`() {
        val breaker = EndpointCircuitBreaker(nowMillis = { 1_000 }, jitter = { 0.0 })

        assertEquals(servers[0], breaker.candidates(servers).first())
        assertEquals(servers[1], breaker.candidates(servers).first())
        assertEquals(servers[2], breaker.candidates(servers).first())
        assertEquals(servers[0], breaker.candidates(servers).first())
    }

    @Test
    fun `failed endpoints cool down with escalating delays and recover`() {
        var now = 1_000L
        val breaker = EndpointCircuitBreaker(nowMillis = { now }, jitter = { 0.0 })

        breaker.recordFailure(servers[0])
        assertEquals(1, breaker.health(servers[0]).failureCount)
        assertEquals(now + 30_000, breaker.health(servers[0]).retryAfterMillis)
        assertTrue(servers[0] !in breaker.candidates(servers))

        breaker.recordFailure(servers[0])
        assertEquals(2, breaker.health(servers[0]).failureCount)
        assertEquals(now + 120_000, breaker.health(servers[0]).retryAfterMillis)

        now += 120_001
        assertTrue(servers[0] in breaker.candidates(servers))
    }

    @Test
    fun `successful endpoint resets failures and is preferred`() {
        var now = 1_000L
        val breaker = EndpointCircuitBreaker(nowMillis = { now }, jitter = { 0.0 })

        breaker.recordFailure(servers[1])
        now += 30_001
        breaker.recordSuccess(servers[1])

        assertEquals(0, breaker.health(servers[1]).failureCount)
        assertEquals(servers[1], breaker.candidates(servers).first())
    }

    @Test
    fun `all cooling endpoints probe only earliest recovery`() {
        var now = 1_000L
        val breaker = EndpointCircuitBreaker(nowMillis = { now }, jitter = { 0.0 })

        breaker.recordFailure(servers[0])
        now++
        breaker.recordFailure(servers[1])
        now++
        breaker.recordFailure(servers[2])

        assertEquals(listOf(servers[0]), breaker.candidates(servers))
    }

    @Test
    fun `health persists between circuit breaker instances`() {
        val store = InMemoryEndpointHealthStore()
        val first = EndpointCircuitBreaker(store = store, nowMillis = { 1_000 }, jitter = { 0.0 })
        first.recordFailure(servers[0])

        val restored = EndpointCircuitBreaker(store = store, nowMillis = { 1_000 }, jitter = { 0.0 })
        assertEquals(1, restored.health(servers[0]).failureCount)
        assertTrue(servers[0] !in restored.candidates(servers))
    }

    @Test
    fun `endpoint identity includes port and transport`() {
        val tcp = ElectrumClient.ElectrumServer("example.com", 50001, false)
        val tls = ElectrumClient.ElectrumServer("example.com", 50002, true)
        assertNotEquals(EndpointCircuitBreaker.key(tcp), EndpointCircuitBreaker.key(tls))
    }

    @Test
    fun `permanent failures receive maximum cooldown`() {
        val now = 1_000L
        val breaker = EndpointCircuitBreaker(nowMillis = { now }, jitter = { 0.0 })

        breaker.recordFailure(servers[0], permanent = true)

        assertEquals(4, breaker.health(servers[0]).failureCount)
        assertEquals(now + 1_800_000, breaker.health(servers[0]).retryAfterMillis)
    }

    @Test
    fun `user-added server is immediately eligible`() {
        val breaker = EndpointCircuitBreaker(nowMillis = { 1_000 }, jitter = { 0.0 })
        servers.forEach(breaker::recordFailure)
        val added = ElectrumClient.ElectrumServer("custom.example", 50002, true)

        assertEquals(listOf(added), breaker.candidates(servers + added))
    }

    @Test
    fun `user-removed server is never selected`() {
        val store = InMemoryEndpointHealthStore()
        val original = EndpointCircuitBreaker(store = store, nowMillis = { 1_000 }, jitter = { 0.0 })
        original.recordSuccess(servers[0])

        val updated = EndpointCircuitBreaker(store = store, nowMillis = { 1_000 }, jitter = { 0.0 })
        val remaining = servers.drop(1)

        assertTrue(servers[0] !in updated.candidates(remaining))
    }

    @Test
    fun `editing server port or transport creates fresh endpoint`() {
        val breaker = EndpointCircuitBreaker(nowMillis = { 1_000 }, jitter = { 0.0 })
        val original = servers[0]
        val edited = original.copy(port = 50002, isSsl = true)
        breaker.recordFailure(original)

        assertEquals(listOf(edited), breaker.candidates(listOf(original, edited)))
        assertEquals(0, breaker.health(edited).failureCount)
    }
}
