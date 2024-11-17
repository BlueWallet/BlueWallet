import Foundation
import Network

enum SwiftTCPClientError: Error, LocalizedError {
    case connectionNil
    case connectionCancelled
    case readTimedOut
    case noDataReceived
    case unknown(Error)
    
    var errorDescription: String? {
        switch self {
        case .connectionNil:
            return "Connection is nil."
        case .connectionCancelled:
            return "Connection was cancelled."
        case .readTimedOut:
            return "Read timed out."
        case .noDataReceived:
            return "No data received."
        case .unknown(let error):
            return error.localizedDescription
        }
    }
}

class SwiftTCPClient {
    private var connection: NWConnection?
    private let queue = DispatchQueue(label: "SwiftTCPClientQueue")
    private let readTimeout: TimeInterval = 5.0

    func connect(to host: String, port: UInt16, useSSL: Bool = false) async -> Bool {
        let parameters: NWParameters
        if useSSL {
            parameters = NWParameters(tls: createTLSOptions(), tcp: .init())
        } else {
            parameters = NWParameters.tcp
        }

        connection = NWConnection(host: NWEndpoint.Host(host), port: NWEndpoint.Port(rawValue: port)!, using: parameters)
        connection?.start(queue: queue)

        let serialQueue = DispatchQueue(label: "SwiftTCPClient.connect.serialQueue")
        var hasResumed = false

        do {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                connection?.stateUpdateHandler = { [weak self] state in
                    guard let self = self else { return }
                    serialQueue.async {
                        if !hasResumed {
                            switch state {
                            case .ready:
                                self.connection?.stateUpdateHandler = nil
                                hasResumed = true
                                continuation.resume()
                            case .failed(let error):
                                self.connection?.stateUpdateHandler = nil
                                hasResumed = true
                                continuation.resume(throwing: error)
                            case .cancelled:
                                self.connection?.stateUpdateHandler = nil
                                hasResumed = true
                                continuation.resume(throwing: SwiftTCPClientError.connectionCancelled)
                            default:
                                break
                            }
                        }
                    }
                }
            }
            return true
        } catch {
            print("Connection failed with error: \(error.localizedDescription)")
            return false
        }
    }

    func send(data: Data) async -> Bool {
        guard let connection = connection else {
            print("Send failed: No active connection.")
            return false
        }
        
        do {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                connection.send(content: data, completion: .contentProcessed { error in
                    if let error = error {
                        print("Send error: \(error.localizedDescription)")
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume()
                    }
                })
            }
            return true
        } catch {
            print("Send failed with error: \(error.localizedDescription)")
            return false
        }
    }

    func receive() async throws -> Data {
        guard let connection = connection else {
            throw SwiftTCPClientError.connectionNil
        }

        return try await withThrowingTaskGroup(of: Data.self) { group in
            group.addTask {
                return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Data, Error>) in
                    connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { data, _, isComplete, error in
                        if let error = error {
                            continuation.resume(throwing: SwiftTCPClientError.unknown(error))
                            return
                        }

                        if let data = data, !data.isEmpty {
                            continuation.resume(returning: data)
                        } else if isComplete {
                            self.close()
                            continuation.resume(throwing: SwiftTCPClientError.noDataReceived)
                        } else {
                            continuation.resume(throwing: SwiftTCPClientError.readTimedOut)
                        }
                    }
                }
            }
            
            group.addTask {
                try await Task.sleep(nanoseconds: UInt64(self.readTimeout * 1_000_000_000))
                throw SwiftTCPClientError.readTimedOut
            }
            
            if let firstResult = try await group.next() {
                group.cancelAll()
                return firstResult
            } else {
                throw SwiftTCPClientError.readTimedOut
            }
        }
    }

    func close() {
        connection?.cancel()
        connection = nil
    }

    private func createTLSOptions() -> NWProtocolTLS.Options {
        let tlsOptions = NWProtocolTLS.Options()
        sec_protocol_options_set_verify_block(tlsOptions.securityProtocolOptions, { _, _, completion in
            completion(true)
        }, DispatchQueue.global(qos: .background))
        return tlsOptions
    }
}
