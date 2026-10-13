import Foundation
import Network
import Testing

@Suite("Swift TCP client")
struct SwiftTCPClientTests {
    private enum StubError: Error { case streamFailed }
    private final class TestClock: @unchecked Sendable {
        var date = Date(timeIntervalSince1970: 1_000)
        func advance(by interval: TimeInterval) { date.addTimeInterval(interval) }
    }

    private let hosts: [HostManager.Host] = [
        (host: "electrum1.bluewallet.io", port: 443, useSSL: true),
        (host: "electrum2.bluewallet.io", port: 443, useSSL: true),
        (host: "electrum3.bluewallet.io", port: 443, useSSL: true),
    ]

    @Test("Rotates through BlueWallet Electrum servers")
    func rotatesHosts() async throws {
        let manager = HostManager(hosts: hosts, defaults: nil, jitter: { 0 })

        #expect(try #require(await manager.candidates().first).host == "electrum1.bluewallet.io")
        #expect(try #require(await manager.candidates().first).host == "electrum2.bluewallet.io")
        #expect(try #require(await manager.candidates().first).host == "electrum3.bluewallet.io")
        #expect(try #require(await manager.candidates().first).host == "electrum1.bluewallet.io")
    }

    @Test("Failed endpoints cool down with escalating delays")
    func endpointCooldownEscalates() async throws {
        let clock = TestClock()
        let manager = HostManager(hosts: hosts, defaults: nil, now: { clock.date }, jitter: { 0 })

        await manager.recordFailure(for: hosts[0])
        #expect(await manager.failureCount(for: hosts[0]) == 1)
        #expect(try #require(await manager.retryAfter(for: hosts[0])).timeIntervalSince(clock.date) == 30)
        #expect(!(await manager.candidates().contains { HostManager.key(for: $0) == HostManager.key(for: hosts[0]) }))

        await manager.recordFailure(for: hosts[0])
        #expect(await manager.failureCount(for: hosts[0]) == 2)
        #expect(try #require(await manager.retryAfter(for: hosts[0])).timeIntervalSince(clock.date) == 120)

        clock.advance(by: 121)
        #expect(await manager.candidates().contains { HostManager.key(for: $0) == HostManager.key(for: hosts[0]) })
    }

    @Test("A successful endpoint is reset and preferred")
    func successfulEndpointIsPreferred() async throws {
        let clock = TestClock()
        let manager = HostManager(hosts: hosts, defaults: nil, now: { clock.date }, jitter: { 0 })

        await manager.recordFailure(for: hosts[1])
        clock.advance(by: 31)
        await manager.recordSuccess(for: hosts[1])

        #expect(await manager.failureCount(for: hosts[1]) == 0)
        #expect(HostManager.key(for: try #require(await manager.candidates().first)) == HostManager.key(for: hosts[1]))
    }

    @Test("When every endpoint is cooling down only the earliest is probed")
    func probesOnlyEarliestCoolingEndpoint() async throws {
        let clock = TestClock()
        let manager = HostManager(hosts: hosts, defaults: nil, now: { clock.date }, jitter: { 0 })

        await manager.recordFailure(for: hosts[0])
        clock.advance(by: 1)
        await manager.recordFailure(for: hosts[1])
        clock.advance(by: 1)
        await manager.recordFailure(for: hosts[2])

        let candidates = await manager.candidates()
        #expect(candidates.count == 1)
        #expect(HostManager.key(for: try #require(candidates.first)) == HostManager.key(for: hosts[0]))
    }

    @Test("Endpoint identity includes port and TLS mode")
    func endpointIdentity() {
        let tcp: HostManager.Host = ("example.com", 50001, false)
        let tls: HostManager.Host = ("example.com", 50002, true)
        #expect(HostManager.key(for: tcp) != HostManager.key(for: tls))
    }

    @Test("Permanent failures receive the maximum cooldown")
    func permanentFailureCooldown() async throws {
        let clock = TestClock()
        let manager = HostManager(hosts: hosts, defaults: nil, now: { clock.date }, jitter: { 0 })

        await manager.recordFailure(for: hosts[0], permanent: true)

        #expect(await manager.failureCount(for: hosts[0]) == 4)
        #expect(try #require(await manager.retryAfter(for: hosts[0])).timeIntervalSince(clock.date) == 1_800)
    }

    @Test("Endpoint health persists across client lifetimes")
    func endpointHealthPersists() async {
        let suiteName = "SwiftTCPClientTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defer { defaults.removePersistentDomain(forName: suiteName) }
        let clock = TestClock()

        let first = HostManager(hosts: hosts, defaults: defaults, now: { clock.date }, jitter: { 0 })
        await first.recordFailure(for: hosts[0])
        let restored = HostManager(hosts: hosts, defaults: defaults, now: { clock.date }, jitter: { 0 })

        #expect(await restored.failureCount(for: hosts[0]) == 1)
        #expect(!(await restored.candidates().contains { HostManager.key(for: $0) == HostManager.key(for: hosts[0]) }))
    }

    @Test("A user-added server is immediately eligible")
    func addingServerUpdatesCandidates() async throws {
        let clock = TestClock()
        let manager = HostManager(hosts: hosts + [(host: "custom.example", port: 50002, useSSL: true)], defaults: nil, now: { clock.date }, jitter: { 0 })
        for host in hosts { await manager.recordFailure(for: host) }

        let candidates = await manager.candidates()

        #expect(candidates.count == 1)
        #expect(try #require(candidates.first).host == "custom.example")
    }

    @Test("A user-removed server is never selected")
    func removingServerUpdatesCandidates() async {
        let storeName = "SwiftTCPClientTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: storeName)!
        defer { defaults.removePersistentDomain(forName: storeName) }
        let clock = TestClock()
        let original = HostManager(hosts: hosts, defaults: defaults, now: { clock.date }, jitter: { 0 })
        await original.recordSuccess(for: hosts[0])

        let remaining = Array(hosts.dropFirst())
        let updated = HostManager(hosts: remaining, defaults: defaults, now: { clock.date }, jitter: { 0 })

        #expect(!(await updated.candidates().contains { HostManager.key(for: $0) == HostManager.key(for: hosts[0]) }))
    }

    @Test("Editing a server port or TLS mode creates a fresh endpoint")
    func changingServerCreatesFreshEndpoint() async throws {
        let clock = TestClock()
        let original = hosts[0]
        let edited: HostManager.Host = (original.host, 50001, false)
        let manager = HostManager(hosts: [original, edited], defaults: nil, now: { clock.date }, jitter: { 0 })
        await manager.recordFailure(for: original)

        let candidates = await manager.candidates()

        #expect(candidates.count == 1)
        #expect(HostManager.key(for: try #require(candidates.first)) == HostManager.key(for: edited))
        #expect(await manager.failureCount(for: edited) == 0)
    }

    @Test("Uses one-shot receiving for constrained system conditions")
    func receivePolicy() {
        #expect(electrumStreamingAllowed(isLowPowerModeEnabled: false, pathStatus: .satisfied, isConstrained: false, isExpensive: false))
        #expect(!electrumStreamingAllowed(isLowPowerModeEnabled: true, pathStatus: .satisfied, isConstrained: false, isExpensive: false))
        #expect(!electrumStreamingAllowed(isLowPowerModeEnabled: false, pathStatus: .satisfied, isConstrained: true, isExpensive: false))
        #expect(!electrumStreamingAllowed(isLowPowerModeEnabled: false, pathStatus: .unsatisfied, isConstrained: false, isExpensive: false))
    }

    @Test("Encodes a newline-delimited Electrum request")
    func encodesElectrumRequest() throws {
        let data = try JSONEncoder().encodeElectrumMessage(
            ElectrumRequest(id: 0, method: "server.version", params: ["BlueWallet", "1.4"])
        )

        #expect(data.last == 0x0A)
        let payload = data.dropLast()
        let object = try #require(JSONSerialization.jsonObject(with: payload) as? [String: Any])
        #expect(object["id"] as? Int == 0)
        #expect(object["method"] as? String == "server.version")
        #expect(object["params"] as? [String] == ["BlueWallet", "1.4"])
    }

    @Test("Uses the streaming response without invoking fallback")
    func usesStreamingResponse() async throws {
        var oneShotCalls = 0
        var fallbackCalls = 0
        var closeCalls = 0
        let expected = Data("streamed".utf8)

        let actual = try await receiveElectrumResponse(
            useStreaming: true,
            stream: {
                electrumMessageStream(
                    receive: { expected },
                    close: { closeCalls += 1 }
                )
            },
            oneShot: { oneShotCalls += 1; return Data() },
            fallback: { _ in fallbackCalls += 1; return Data() }
        )

        #expect(actual == expected)
        #expect(oneShotCalls == 0)
        #expect(fallbackCalls == 0)
        await Task.yield()
        #expect(closeCalls == 1)
    }

    @Test("Falls back to one-shot after the stream fails")
    func fallsBackAfterStreamFailure() async throws {
        var fallbackCalls = 0
        let expected = Data("fallback".utf8)

        let actual = try await receiveElectrumResponse(
            useStreaming: true,
            stream: {
                AsyncThrowingStream { continuation in
                    continuation.finish(throwing: StubError.streamFailed)
                }
            },
            oneShot: { Data() },
            fallback: { error in
                #expect(error is StubError)
                fallbackCalls += 1
                return expected
            }
        )

        #expect(actual == expected)
        #expect(fallbackCalls == 1)
    }

    @Test("Uses one-shot directly when streaming is disabled")
    func usesOneShotWhenStreamingIsDisabled() async throws {
        var streamCalls = 0
        var fallbackCalls = 0
        let expected = Data("one-shot".utf8)

        let actual = try await receiveElectrumResponse(
            useStreaming: false,
            stream: {
                streamCalls += 1
                return AsyncThrowingStream { $0.finish() }
            },
            oneShot: { expected },
            fallback: { _ in fallbackCalls += 1; return Data() }
        )

        #expect(actual == expected)
        #expect(streamCalls == 0)
        #expect(fallbackCalls == 0)
    }

    @Test("Cancellation does not trigger fallback")
    func cancellationDoesNotFallback() async {
        var fallbackCalls = 0

        do {
            _ = try await receiveElectrumResponse(
                useStreaming: true,
                stream: {
                    AsyncThrowingStream { $0.finish(throwing: CancellationError()) }
                },
                oneShot: { Data() },
                fallback: { _ in fallbackCalls += 1; return Data() }
            )
            Issue.record("Expected cancellation")
        } catch {
            #expect(error is CancellationError)
        }

        #expect(fallbackCalls == 0)
    }

    @Test("A failed stream closes its connection exactly once")
    func failedStreamClosesConnection() async {
        var closeCalls = 0
        let stream = electrumMessageStream(
            receive: { throw StubError.streamFailed },
            close: { closeCalls += 1 }
        )

        do {
            for try await _ in stream {}
            Issue.record("Expected the stream to fail")
        } catch {
            #expect(error is StubError)
        }
        await Task.yield()
        #expect(closeCalls == 1)
    }

    @Test("Does not retain the client through Network framework callbacks")
    func releasesClient() {
        weak var client: SwiftTCPClient?
        do {
            let scopedClient = SwiftTCPClient()
            client = scopedClient
            #expect(client != nil)
        }
        #expect(client == nil)
    }

    @Test(
        "Connects to a BlueWallet Electrum server",
        .enabled(if: ProcessInfo.processInfo.environment["RUN_ELECTRUM_INTEGRATION_TESTS"] == "1")
    )
    func connectsToBlueWalletElectrum() async throws {
        let client = SwiftTCPClient(hosts: hosts, maxRetriesPerHost: 1, maxRetries: 1, readTimeout: 10)
        defer { client.close() }

        #expect(await client.connectToNextAvailable(validateCertificates: true))
        let request = try JSONEncoder().encodeElectrumMessage(
            ElectrumRequest(id: 0, method: "server.version", params: ["BlueWallet", "1.4"])
        )
        #expect(await client.send(data: request))

        let response = try await client.receive()
        let object = try #require(JSONSerialization.jsonObject(with: response) as? [String: Any])
        #expect(object["id"] as? Int == 0)
        #expect(object["result"] != nil)
    }
}
