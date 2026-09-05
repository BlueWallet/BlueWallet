import Foundation

enum PendingTransactionsElectrumError: Error {
    case noAvailableServer
    case invalidRequest
    case invalidResponse
    case missingTransaction(String)
}

struct PendingTransactionsElectrumService {
    func fetchSnapshot(
        configuration: PendingTransactionsWatchConfiguration,
        now: Date = Date()
    ) async throws -> PendingTransactionsSharedSnapshot {
        guard configuration.isEnabled, !configuration.scriptHashes.isEmpty else {
            return .empty(at: now)
        }

        let ownedScriptHashes = Set(configuration.scriptHashes)
        var lastError: Error = PendingTransactionsElectrumError.noAvailableServer

        for peer in electrumPeers() {
            try Task.checkCancellation()
            let client = SwiftTCPClient(maxRetriesPerHost: 1)
            let connected = await client.connect(
                to: peer.host,
                port: peer.port,
                useSSL: peer.useSSL,
                validateCertificates: true
            )
            guard connected else {
                client.close()
                continue
            }

            do {
                let connection = ElectrumRPCConnection(client: client)
                let snapshot = try await fetchSnapshot(
                    ownedScriptHashes: ownedScriptHashes,
                    connection: connection,
                    now: now
                )
                client.close()
                return snapshot
            } catch {
                lastError = error
                client.close()
            }
        }

        throw lastError
    }

    private func fetchSnapshot(
        ownedScriptHashes: Set<String>,
        connection: ElectrumRPCConnection,
        now: Date
    ) async throws -> PendingTransactionsSharedSnapshot {
        let mempoolTransactionIDs = try await fetchMempoolTransactionIDs(
            scriptHashes: Array(ownedScriptHashes),
            connection: connection
        )
        guard !mempoolTransactionIDs.isEmpty else { return .empty(at: now) }

        var rawTransactions = try await fetchRawTransactions(
            transactionIDs: Array(mempoolTransactionIDs),
            connection: connection
        )
        var parsedTransactions: [String: ParsedBitcoinTransaction] = [:]
        var previousTransactionIDs = Set<String>()

        for transactionID in mempoolTransactionIDs {
            guard let rawTransaction = rawTransactions[transactionID] else {
                throw PendingTransactionsElectrumError.missingTransaction(transactionID)
            }
            let parsed = try BitcoinTransactionParser.parse(hex: rawTransaction)
            parsedTransactions[transactionID] = parsed
            previousTransactionIDs.formUnion(parsed.inputs.map(\.previousTransactionID))
        }

        let missingPreviousTransactionIDs = previousTransactionIDs.subtracting(rawTransactions.keys)
        if !missingPreviousTransactionIDs.isEmpty {
            rawTransactions.merge(
                try await fetchRawTransactions(
                    transactionIDs: Array(missingPreviousTransactionIDs),
                    connection: connection
                )
            ) { current, _ in current }
        }

        return try PendingTransactionsSnapshotCalculator.calculate(
            mempoolTransactionIDs: mempoolTransactionIDs,
            rawTransactions: rawTransactions,
            ownedScriptHashes: ownedScriptHashes,
            now: now
        )
    }

    private func fetchMempoolTransactionIDs(
        scriptHashes: [String],
        connection: ElectrumRPCConnection
    ) async throws -> Set<String> {
        var transactionIDs = Set<String>()

        for chunk in scriptHashes.chunked(into: 50) {
            try Task.checkCancellation()
            let results = try await connection.callBatch(
                method: "blockchain.scripthash.get_mempool",
                parameterSets: chunk.map { [$0] }
            )

            for result in results {
                guard let entries = result as? [[String: Any]] else {
                    throw PendingTransactionsElectrumError.invalidResponse
                }
                for entry in entries {
                    if let transactionID = entry["tx_hash"] as? String {
                        transactionIDs.insert(transactionID)
                    }
                }
            }
        }

        return transactionIDs
    }

    private func fetchRawTransactions(
        transactionIDs: [String],
        connection: ElectrumRPCConnection
    ) async throws -> [String: String] {
        var rawTransactions: [String: String] = [:]

        for chunk in transactionIDs.chunked(into: 20) {
            try Task.checkCancellation()
            let results = try await connection.callBatch(
                method: "blockchain.transaction.get",
                parameterSets: chunk.map { [$0, false] }
            )

            for (transactionID, result) in zip(chunk, results) {
                guard let rawTransaction = result as? String else {
                    throw PendingTransactionsElectrumError.missingTransaction(transactionID)
                }
                rawTransactions[transactionID] = rawTransaction
            }
        }

        return rawTransactions
    }

    private func electrumPeers() -> [(host: String, port: UInt16, useSSL: Bool)] {
        var peers: [(host: String, port: UInt16, useSSL: Bool)] = []
        let custom = UserDefaultsGroup.getElectrumSettings()

        if let host = custom.host, !host.isEmpty {
            if let sslPort = custom.sslPort, sslPort > 0 {
                peers.append((host: host, port: sslPort, useSSL: true))
            } else if let port = custom.port, port > 0 {
                peers.append((host: host, port: port, useSSL: false))
            }
        }

        for peer in hardcodedPeers where !peers.contains(where: {
            $0.host == peer.host && $0.port == peer.port && $0.useSSL == peer.useSSL
        }) {
            peers.append(peer)
        }

        return peers
    }
}

enum PendingTransactionsSnapshotCalculator {
    static func calculate(
        mempoolTransactionIDs: Set<String>,
        rawTransactions: [String: String],
        ownedScriptHashes: Set<String>,
        now: Date
    ) throws -> PendingTransactionsSharedSnapshot {
        var parsedTransactions: [String: ParsedBitcoinTransaction] = [:]
        for transactionID in mempoolTransactionIDs {
            guard let rawTransaction = rawTransactions[transactionID] else {
                throw PendingTransactionsElectrumError.missingTransaction(transactionID)
            }
            parsedTransactions[transactionID] = try BitcoinTransactionParser.parse(hex: rawTransaction)
        }

        var totalPendingSats: Int64 = 0
        var hasIncoming = false
        var hasOutgoing = false
        for transactionID in mempoolTransactionIDs {
            guard let transaction = parsedTransactions[transactionID] else { continue }
            var walletValue: Int64 = 0

            for output in transaction.outputs where ownedScriptHashes.contains(
                BitcoinTransactionParser.electrumScriptHash(for: output.script)
            ) {
                walletValue = try adding(output.value, to: walletValue)
            }

            for input in transaction.inputs {
                guard let rawPreviousTransaction = rawTransactions[input.previousTransactionID] else {
                    throw PendingTransactionsElectrumError.missingTransaction(input.previousTransactionID)
                }
                let previousTransaction: ParsedBitcoinTransaction
                if let cached = parsedTransactions[input.previousTransactionID] {
                    previousTransaction = cached
                } else {
                    previousTransaction = try BitcoinTransactionParser.parse(hex: rawPreviousTransaction)
                    parsedTransactions[input.previousTransactionID] = previousTransaction
                }

                let outputIndex = Int(input.previousOutputIndex)
                guard previousTransaction.outputs.indices.contains(outputIndex) else {
                    throw PendingTransactionsElectrumError.invalidResponse
                }
                let previousOutput = previousTransaction.outputs[outputIndex]
                if ownedScriptHashes.contains(BitcoinTransactionParser.electrumScriptHash(for: previousOutput.script)) {
                    walletValue = try adding(-previousOutput.value, to: walletValue)
                }
            }

            guard walletValue != Int64.min else { throw PendingTransactionsElectrumError.invalidResponse }
            hasIncoming = hasIncoming || walletValue > 0
            hasOutgoing = hasOutgoing || walletValue < 0
            totalPendingSats = try adding(abs(walletValue), to: totalPendingSats)
        }

        return PendingTransactionsSharedSnapshot(
            pendingTransactionCount: mempoolTransactionIDs.count,
            totalPendingSats: totalPendingSats,
            direction: PendingTransactionDirection.classify(
                hasIncoming: hasIncoming,
                hasOutgoing: hasOutgoing
            ),
            updatedAt: now
        )
    }

    private static func adding(_ value: Int64, to current: Int64) throws -> Int64 {
        let result = current.addingReportingOverflow(value)
        guard !result.overflow else { throw PendingTransactionsElectrumError.invalidResponse }
        return result.partialValue
    }
}

private final class ElectrumRPCConnection {
    private let client: SwiftTCPClient
    private var nextRequestID = 1

    init(client: SwiftTCPClient) {
        self.client = client
    }

    func callBatch(method: String, parameterSets: [[Any]]) async throws -> [Any] {
        guard !parameterSets.isEmpty else { return [] }

        var requestIndexByID: [Int: Int] = [:]
        let requests: [[String: Any]] = parameterSets.enumerated().map { index, parameters in
            let requestID = nextRequestID
            nextRequestID += 1
            requestIndexByID[requestID] = index
            return [
                "jsonrpc": "2.0",
                "id": requestID,
                "method": method,
                "params": parameters,
            ]
        }

        guard JSONSerialization.isValidJSONObject(requests) else {
            throw PendingTransactionsElectrumError.invalidRequest
        }
        var requestData = try JSONSerialization.data(withJSONObject: requests)
        requestData.append(0x0a)
        guard await client.send(data: requestData) else {
            throw PendingTransactionsElectrumError.invalidRequest
        }

        let responseObject = try await receiveJSONObject()
        let responses: [[String: Any]]
        if let batch = responseObject as? [[String: Any]] {
            responses = batch
        } else if let single = responseObject as? [String: Any] {
            responses = [single]
        } else {
            throw PendingTransactionsElectrumError.invalidResponse
        }

        var orderedResults = Array<Any?>(repeating: nil, count: requests.count)
        for response in responses {
            guard response["error"] == nil || response["error"] is NSNull,
                  let requestID = response["id"] as? Int,
                  let index = requestIndexByID[requestID],
                  let result = response["result"] else {
                throw PendingTransactionsElectrumError.invalidResponse
            }
            orderedResults[index] = result
        }

        guard orderedResults.allSatisfy({ $0 != nil }) else {
            throw PendingTransactionsElectrumError.invalidResponse
        }
        return orderedResults.compactMap { $0 }
    }

    private func receiveJSONObject() async throws -> Any {
        var responseData = Data()

        for _ in 0..<16 {
            try Task.checkCancellation()
            responseData.append(try await client.receive())
            if let object = try? JSONSerialization.jsonObject(with: responseData, options: .fragmentsAllowed) {
                return object
            }
            guard responseData.count < 1_048_576 else { break }
        }

        throw PendingTransactionsElectrumError.invalidResponse
    }
}

private extension Array {
    func chunked(into size: Int) -> [[Element]] {
        guard size > 0 else { return [] }
        return stride(from: 0, to: count, by: size).map { start in
            Array(self[start..<Swift.min(start + size, count)])
        }
    }
}
