import Foundation
import Network
import Testing

@Suite("Swift TCP client")
struct SwiftTCPClientTests {
    private enum StubError: Error { case streamFailed }

    private let hosts: [HostManager.Host] = [
        (host: "electrum1.bluewallet.io", port: 443, useSSL: true),
        (host: "electrum2.bluewallet.io", port: 443, useSSL: true),
        (host: "electrum3.bluewallet.io", port: 443, useSSL: true),
    ]

    @Test("Rotates through BlueWallet Electrum servers")
    func rotatesHosts() async throws {
        let manager = HostManager(hosts: hosts, maxRetriesPerHost: 2)

        #expect(try #require(await manager.nextHost()).host == "electrum1.bluewallet.io")
        #expect(try #require(await manager.nextHost()).host == "electrum2.bluewallet.io")
        #expect(try #require(await manager.nextHost()).host == "electrum3.bluewallet.io")
        #expect(try #require(await manager.nextHost()).host == "electrum1.bluewallet.io")
    }

    @Test("Stops selecting a server at its failure limit")
    func tracksFailures() async {
        let manager = HostManager(hosts: hosts, maxRetriesPerHost: 2)

        await manager.recordFailure(for: hosts[0].host)
        #expect(!(await manager.shouldSkip(hosts[0].host)))
        await manager.recordFailure(for: hosts[0].host)
        #expect(await manager.shouldSkip(hosts[0].host))
        await manager.recordSuccess(for: hosts[0].host)
        #expect(!(await manager.shouldSkip(hosts[0].host)))
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
