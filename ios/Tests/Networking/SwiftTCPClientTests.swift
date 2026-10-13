import Foundation
import Network
import Testing

@Suite("Swift TCP client")
struct SwiftTCPClientTests {
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
