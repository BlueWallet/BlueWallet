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

actor HostManager {
    var availableHosts: [(host: String, port: UInt16, useSSL: Bool)]
    var hostFailureCounts: [String: Int] = [:]
    let maxRetriesPerHost: Int

    init(hosts: [(host: String, port: UInt16, useSSL: Bool)], maxRetriesPerHost: Int) {
        self.availableHosts = hosts
        self.maxRetriesPerHost = maxRetriesPerHost
    }

    func getNextHost() -> (host: String, port: UInt16, useSSL: Bool)? {
        guard !availableHosts.isEmpty else {
            return nil
        }
        // Rotate the first host to the end
        let currentHost = availableHosts.removeFirst()
        availableHosts.append(currentHost)
        return currentHost
    }

    func shouldSkipHost(_ host: String) -> Bool {
        if let failureCount = hostFailureCounts[host], failureCount >= maxRetriesPerHost {
            return true
        }
        return false
    }

    func resetFailureCount(for host: String) {
        hostFailureCounts[host] = 0
    }

    func incrementFailureCount(for host: String) {
        hostFailureCounts[host, default: 0] += 1
    }
}

class SwiftTCPClient {
    private var connection: NWConnection?
    private let queue = DispatchQueue(label: "SwiftTCPClientQueue", qos: .userInitiated)
    private let readTimeout: TimeInterval = 5.0
    let maxRetries = 3
    private let hostManager: HostManager
    
    init(hosts: [(host: String, port: UInt16, useSSL: Bool)] = [], maxRetriesPerHost: Int = 3) {
        self.hostManager = HostManager(hosts: hosts, maxRetriesPerHost: maxRetriesPerHost)
    }

    func connect(to host: String, port: UInt16, useSSL: Bool = false, validateCertificates: Bool = true, retries: Int = 0) async -> Bool {
        // Skip host if it has failed too many times
        if await hostManager.shouldSkipHost(host) {
            print("Skipping host \(host) after \(hostManager.maxRetriesPerHost) retries.")
            return false
        }

        let parameters: NWParameters
        if useSSL {
            parameters = NWParameters(tls: createTLSOptions(validateCertificates: validateCertificates), tcp: .init())
        } else {
            parameters = NWParameters.tcp
        }

        guard let nwPort = NWEndpoint.Port(rawValue: port) else {
            print("Invalid port number: \(port)")
            return false
        }
        connection = NWConnection(host: NWEndpoint.Host(host), port: nwPort, using: parameters)
        connection?.start(queue: queue)

        print("Attempting to connect to \(host):\(port) (SSL: \(useSSL))") 

        do {
            try await withCheckedThrowingContinuation { continuation in
                connection?.stateUpdateHandler = { [weak self] state in
                    guard let self = self else { return }

                    switch state {
                    case .ready:
                        print("Successfully connected to \(host):\(port)") 
                        self.connection?.stateUpdateHandler = nil
                        continuation.resume()
                    case .failed(let error):
                        if let nwError = error as? NWError, self.isTLSError(nwError) {
                            print("SSL Error while connecting to \(host):\(port) - \(error.localizedDescription)") 
                        }
                        print("Connection to \(host):\(port) failed with error: \(error.localizedDescription)") 
                        self.connection?.stateUpdateHandler = nil
                        continuation.resume(throwing: error)
                    case .cancelled:
                        print("Connection to \(host):\(port) was cancelled.") 
                        self.connection?.stateUpdateHandler = nil
                        continuation.resume(throwing: SwiftTCPClientError.connectionCancelled)
                    default:
                        break
                    }
                }
            }
            // Reset failure count on successful connection
            await hostManager.resetFailureCount(for: host)
            return true
        } catch {
            print("Connection to \(host) failed with error: \(error.localizedDescription)") 
            await hostManager.incrementFailureCount(for: host)

            if retries < maxRetries - 1 {
                print("Retrying connection to \(host) (\(retries + 1)/\(maxRetries))...") 
                return await connect(to: host, port: port, useSSL: useSSL, validateCertificates: validateCertificates, retries: retries + 1)
            } else {
                print("Host \(host) failed after \(maxRetries) retries. Skipping.") 
                return false
            }
        }
    }

    private func isTLSError(_ error: NWError) -> Bool {
        let nsError = error as NSError
        let code = nsError.code
        if #available(iOS 16.4, *) {
            switch code {
            case 20, 21, 22:
                return true
            case 1, 2, 3, 4:
                return false
            default:
                return false
            }
        } else {
            switch code {
            case 20, 21, 22:
                return true
            default:
                return false
            }
        }
    }

    func connectToNextAvailable(validateCertificates: Bool = true) async -> Bool {
        while true {
            guard let currentHost = await hostManager.getNextHost() else {
                print("No available hosts to connect.") 
                return false
            }

            if await hostManager.shouldSkipHost(currentHost.host) {
                print("Skipping host \(currentHost.host) after \(hostManager.maxRetriesPerHost) retries.") 
                continue
            }

            print("Attempting to connect to next available host: \(currentHost.host):\(currentHost.port) (SSL: \(currentHost.useSSL))") 

            if await connect(to: currentHost.host, port: currentHost.port, useSSL: currentHost.useSSL, validateCertificates: validateCertificates) {
                print("Connected to host \(currentHost.host):\(currentHost.port)") 
                await hostManager.resetFailureCount(for: currentHost.host)
                return true
            } else {
                print("Failed to connect to host \(currentHost.host):\(currentHost.port)") 
                await hostManager.incrementFailureCount(for: currentHost.host)
            }
        }
    }

    func send(data: Data) async -> Bool {
        guard let connection = connection else {
            print("Send failed: No active connection.") 
            return false
        }
        
        do {
            print("Sending data: \(data)") 
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                connection.send(content: data, completion: .contentProcessed { error in
                    if let error = error {
                        print("Send error: \(error.localizedDescription)") 
                        continuation.resume(throwing: error)
                    } else {
                        print("Data sent successfully.") 
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

        print("Attempting to receive data...") 

        return try await withThrowingTaskGroup(of: Data.self) { group in
            group.addTask {
                return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Data, Error>) in
                    connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { data, _, isComplete, error in
                        if let error = error {
                            print("Receive error: \(error.localizedDescription)") 
                            continuation.resume(throwing: SwiftTCPClientError.unknown(error))
                            return
                        }

                        if let data = data, !data.isEmpty {
                            print("Received data: \(data)") 
                            continuation.resume(returning: data)
                        } else if isComplete {
                            print("Connection closed by peer.") 
                            self.close()
                            continuation.resume(throwing: SwiftTCPClientError.noDataReceived)
                        } else {
                            print("Read timed out.") 
                            continuation.resume(throwing: SwiftTCPClientError.readTimedOut)
                        }
                    }
                }
            }
            
            group.addTask {
                try await Task.sleep(nanoseconds: UInt64(self.readTimeout * 1_000_000_000))
                print("Receive operation timed out after \(self.readTimeout) seconds.") 
                throw SwiftTCPClientError.readTimedOut
            }
            
            if let firstResult = try await group.next() {
                group.cancelAll()
                print("Receive operation completed successfully.") 
                return firstResult
            } else {
                print("Receive operation timed out.") 
                throw SwiftTCPClientError.readTimedOut
            }
        }
    }

    func close() {
        print("Closing connection.") 
        connection?.cancel()
        connection = nil
    }

    private func createTLSOptions(validateCertificates: Bool = true) -> NWProtocolTLS.Options {
        let tlsOptions = NWProtocolTLS.Options()
        if (!validateCertificates) {
            sec_protocol_options_set_verify_block(tlsOptions.securityProtocolOptions, { _, _, completion in
                completion(true)
            }, DispatchQueue.global())
            print("SSL certificate validation is disabled.") 
        }
        return tlsOptions
    }
}
