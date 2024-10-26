//
//  ElectrumFetcherProtocol.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 10/26/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//


// ElectrumFetcher.swift

import Foundation
import Network

protocol ElectrumFetcherProtocol {
    func fetchTransactionConfirmations(txid: String) async throws -> Int
}

class ElectrumFetcher: ElectrumFetcherProtocol {
    
    private var connection: NWConnection?
    private let host: NWEndpoint.Host
    private let port: NWEndpoint.Port
    private let useSSL: Bool
    private let queue = DispatchQueue(label: "ElectrumFetcherQueue")
    private let requestTimeout: TimeInterval = 10
    
    init(host: String, port: UInt16, useSSL: Bool) {
        self.host = NWEndpoint.Host(host)
        self.port = NWEndpoint.Port(rawValue: port) ?? .init(integerLiteral: 50001) // Default port if invalid
        self.useSSL = useSSL
    }
    
    deinit {
        disconnect()
    }
    
    func connect() async throws {
        let parameters = NWParameters.tcp
        if useSSL {
            let tlsOptions = NWProtocolTLS.Options()
            sec_protocol_options_set_min_tls_protocol_version(tlsOptions.securityProtocolOptions, .TLSv12)
            parameters.defaultProtocolStack.applicationProtocols.insert(tlsOptions, at: 0)
        }
        
        connection = NWConnection(host: host, port: port, using: parameters)
        connection?.stateUpdateHandler = { [weak self] newState in
            switch newState {
            case .ready:
                print("ElectrumFetcher: Connected to \(self?.host.description ?? "Unknown Host"):\(self?.port.rawValue ?? 0)")
            case .failed(let error):
                print("ElectrumFetcher: Connection failed with error: \(error.localizedDescription)")
            case .cancelled:
                print("ElectrumFetcher: Connection cancelled.")
            default:
                break
            }
        }
        
        connection?.start(queue: queue)
        
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            connection?.stateUpdateHandler = { newState in
                switch newState {
                case .ready:
                    continuation.resume()
                case .failed(let error):
                    continuation.resume(throwing: error)
                case .cancelled:
                    continuation.resume(throwing: NSError(domain: "ElectrumFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "Connection cancelled"]))
                default:
                    break
                }
            }
        }
    }
    
    func disconnect() {
        connection?.cancel()
        connection = nil
        print("ElectrumFetcher: Disconnected from \(host.description):\(port.rawValue)")
    }
    
    private func sendRequest(request: [String: Any]) async throws -> [String: Any] {
        let requestData = try JSONSerialization.data(withJSONObject: request, options: [])
        var requestWithNewline = requestData
        requestWithNewline.append(contentsOf: "\n".utf8)
        
        if connection?.state != .ready {
            try await connectWithRetry()
        }
        
        try await send(data: requestWithNewline)
        print("ElectrumFetcher: Sent request \(request["method"] ?? "unknown method")")
        
        let responseData = try await receive(timeout: requestTimeout)
        print("ElectrumFetcher: Received response for request \(request["method"] ?? "unknown method")")
        
        guard let responseJSON = try? JSONSerialization.jsonObject(with: responseData, options: []) as? [String: Any] else {
            throw NSError(domain: "ElectrumFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON response"])
        }
        
        return responseJSON
    }
    
    private func send(data: Data) async throws {
        guard let connection = connection else {
            throw NSError(domain: "ElectrumFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "No active connection"])
        }
        
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            connection.send(content: data, completion: .contentProcessed { error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            })
        }
    }
    
    private func receive(timeout: TimeInterval) async throws -> Data {
        guard let connection = connection else {
            throw NSError(domain: "ElectrumFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "No active connection"])
        }
        
        return try await withTaskCancellationHandler(operation: {
            return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Data, Error>) in
                connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { data, context, isComplete, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else if let data = data, !data.isEmpty {
                        continuation.resume(returning: data)
                    } else {
                        continuation.resume(throwing: NSError(domain: "ElectrumFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data received"]))
                    }
                }
            }
        }, onCancel: {
            connection.cancel()
        })
    }
    
    private func connectWithRetry(maxRetries: Int = 3) async throws {
        var attempt = 0
        var delayTime: TimeInterval = 1
        
        while attempt < maxRetries {
            do {
                try await connect()
                return
            } catch {
                attempt += 1
                if attempt >= maxRetries {
                    throw error
                }
                print("ElectrumFetcher: Connection attempt \(attempt) failed with error: \(error.localizedDescription). Retrying in \(delayTime) seconds...")
                try await Task.sleep(nanoseconds: UInt64(delayTime * 1_000_000_000))
                delayTime *= 2
            }
        }
    }
    
    func fetchTransactionConfirmations(txid: String) async throws -> Int {
        let requestId = UUID().uuidString
        
        let requestDict: [String: Any] = [
            "id": requestId,
            "method": "blockchain.transaction.get_confirmations",
            "params": [txid]
        ]
        
        let responseJSON = try await sendRequest(request: requestDict)
        
        if let error = responseJSON["error"] as? [String: Any], let message = error["message"] as? String {
            throw NSError(domain: "ElectrumFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: message])
        }
        
        if let result = responseJSON["result"] as? Int {
            return result
        } else {
            throw NSError(domain: "ElectrumFetcher", code: -1, userInfo: [NSLocalizedDescriptionKey: "Unexpected response format"])
        }
    }
}