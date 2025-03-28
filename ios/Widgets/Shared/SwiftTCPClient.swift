import Foundation
import Network
import Dispatch

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

struct TimeoutError: Error {}

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
    
    private enum ConnectionState: CustomStringConvertible {
        case disconnected
        case connecting
        case connected(NWConnection.State)
        case failed(Error)
        case cancelled
        
        var description: String {
            switch self {
            case .disconnected:
                return "Disconnected"
            case .connecting:
                return "Connecting"
            case .connected(let state):
                return "Connected (\(state))"
            case .failed(let error):
                return "Failed: \(error.localizedDescription)"
            case .cancelled:
                return "Cancelled"
            }
        }
    }
    
    private var connectionState: ConnectionState = .disconnected
    
    // Add a path monitor to detect network changes
    private var pathMonitor: NWPathMonitor?
    private var currentPath: NWPath?
    
    init(hosts: [(host: String, port: UInt16, useSSL: Bool)] = [], maxRetriesPerHost: Int = 3) {
        self.hostManager = HostManager(hosts: hosts, maxRetriesPerHost: maxRetriesPerHost)
        setupPathMonitor()
    }
    
    deinit {
        stopPathMonitor()
        close()
    }
    
    private func setupPathMonitor() {
        pathMonitor = NWPathMonitor()
        pathMonitor?.pathUpdateHandler = { [weak self] path in
            guard let self = self else { return }
            let previousPath = self.currentPath
            self.currentPath = path
            
            if let previousPath = previousPath, previousPath.status != path.status {
                print("Network path changed: \(path.status), available interfaces: \(path.availableInterfaces.map { $0.name })")
                
                // If we're connected and the network changed to unsatisfied, we might need to reconnect
                if path.status == .unsatisfied, case .connected = self.connectionState {
                    print("Network became unavailable, connection may be affected")
                }
            }
        }
        pathMonitor?.start(queue: queue)
    }
    
    private func stopPathMonitor() {
        pathMonitor?.cancel()
        pathMonitor = nil
    }

    func connect(to host: String, port: UInt16, useSSL: Bool = false, validateCertificates: Bool = true, retries: Int = 0) async -> Bool {
        // Skip host if it has failed too many times
        if await hostManager.shouldSkipHost(host) {
            print("Skipping host \(host) after \(hostManager.maxRetriesPerHost) retries.")
            return false
        }

        // Reset connection state and close any existing connection
        connectionState = .disconnected
        close()

        // Check network availability before attempting to connect
        if let currentPath = currentPath, currentPath.status == .unsatisfied {
            print("Network is currently unavailable, can't connect to \(host):\(port)")
            await hostManager.incrementFailureCount(for: host)
            return false
        }

        let parameters: NWParameters
        if useSSL {
            parameters = NWParameters(tls: createTLSOptions(validateCertificates: validateCertificates), tcp: .init())
        } else {
            parameters = NWParameters.tcp
        }

        parameters.prohibitExpensivePaths = false
        parameters.expiredDNSBehavior = .allow
        parameters.multipathServiceType = .handover
        
        let tcpOptions = parameters.defaultProtocolStack.internetProtocol as? NWProtocolTCP.Options
        tcpOptions?.enableFastOpen = false  
        tcpOptions?.noDelay = true     
        
        tcpOptions?.enableKeepalive = true
        tcpOptions?.keepaliveCount = 5
        tcpOptions?.keepaliveIdle = 60 
        tcpOptions?.keepaliveInterval = 5
        
        tcpOptions?.connectionTimeout = 10  

        guard let nwPort = NWEndpoint.Port(rawValue: port) else {
            print("Invalid port number: \(port)")
            return false
        }
        
        let isLocalhost = host == "localhost" || host == "127.0.0.1" || host == "::1"
        if isLocalhost {
            print("Connecting to localhost, checking if service is available on port \(port)...")
        }
        
        connectionState = .connecting
        let endpoint = NWEndpoint.Host(host)
        connection = NWConnection(host: endpoint, port: nwPort, using: parameters)
        connection?.start(queue: queue)
        
        print("Attempting to connect to \(host):\(port) (SSL: \(useSSL))")
        
        guard let connection = connection else {
            print("Connection object creation failed")
            connectionState = .failed(SwiftTCPClientError.connectionNil)
            return false
        }

        do {
            try await withCheckedThrowingContinuation { [self] (continuation: CheckedContinuation<Void, Error>) in
                let syncQueue = DispatchQueue(label: "com.bluewallet.continuationSync")
                var isContinuationResolved = false
                
                // Safe completion function to avoid multiple resolutions
                let completeOnce: (Result<Void, Error>) -> Void = { result in
                    syncQueue.sync {
                        if !isContinuationResolved {
                            isContinuationResolved = true
                            switch result {
                            case .success:
                                continuation.resume()
                            case .failure(let error):
                                continuation.resume(throwing: error)
                            }
                        }
                    }
                }
                
                connection.stateUpdateHandler = { state in
                    switch state {
                    case .ready:
                        print("Successfully connected to \(host):\(port)")
                        
                        if let localEndpointDesc = connection.currentPath?.localEndpoint?.debugDescription {
                            print("Local endpoint: \(localEndpointDesc)")
                        }
                        if let remoteEndpointDesc = connection.currentPath?.remoteEndpoint?.debugDescription {
                            print("Remote endpoint: \(remoteEndpointDesc)")
                        }
                        
                        self.connectionState = .connected(state)
                        completeOnce(.success(()))
                        
                    case .failed(let error):
                        let nsError = error as NSError
                        print("Connection to \(host):\(port) failed with error: \(error.localizedDescription) (Code: \(nsError.code))")
                        
                        if self.isTLSError(error) {
                            print("SSL Error while connecting to \(host):\(port) - \(error.localizedDescription)")
                        } else if nsError.code == 61 {
                            print("Connection refused by \(host):\(port) - Server may not be listening on this port")
                            if isLocalhost {
                                print("For localhost connections, ensure the server is running and listening on port \(port)")
                            }
                        } else if nsError.code == 60 {
                            print("Operation timed out connecting to \(host):\(port) - Server might be unreachable")
                        } else if nsError.code == 65 {
                            print("No route to host \(host):\(port) - Network route unavailable")
                        }
                        
                        self.connectionState = .failed(error)
                        completeOnce(.failure(SwiftTCPClientError.unknown(error)))
                        
                    case .cancelled:
                        print("Connection to \(host):\(port) was cancelled.")
                        self.connectionState = .cancelled
                        completeOnce(.failure(SwiftTCPClientError.connectionCancelled))
                        
                    case .preparing:
                        print("Preparing connection to \(host):\(port)...")
                        
                    case .waiting(let error):
                        print("Waiting to connect to \(host):\(port) - \(error.localizedDescription)")
                        
                    case .setup:
                        print("Setting up connection to \(host):\(port)...")
                        
                    @unknown default:
                        print("Unknown connection state for \(host):\(port)")
                    }
                }
                
                let timeoutWorkItem = DispatchWorkItem { [weak self] in
                    guard let self = self else { return }
                    
                    syncQueue.sync {
                        if !isContinuationResolved {
                            self.connectionState = .failed(SwiftTCPClientError.readTimedOut)
                            print("Connection to \(host):\(port) timed out after \(self.readTimeout) seconds")
                            completeOnce(.failure(SwiftTCPClientError.readTimedOut))
                        }
                    }
                }
                
                self.queue.asyncAfter(deadline: .now() + self.readTimeout, execute: timeoutWorkItem)
            }
            
            await hostManager.resetFailureCount(for: host)
            return true
            
        } catch {
            print("Connection to \(host) failed with error: \(error.localizedDescription)")
            await hostManager.incrementFailureCount(for: host)
            
            if let nsError = error as NSError?, nsError.code == 61 {
                print("Connection refused by \(host):\(port) - skipping retries as server is not listening")
                return false
            }
            
            if retries < maxRetries - 1 {
                print("Retrying connection to \(host) (\(retries + 1)/\(maxRetries))...")
                try? await Task.sleep(nanoseconds: 500_000_000) // 500ms delay
                return await connect(to: host, port: port, useSSL: useSSL, validateCertificates: validateCertificates, retries: retries + 1)
            } else {
                print("Host \(host) failed after \(maxRetries) retries. Skipping.")
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

    func isConnectionReady() -> Bool {
      guard connection != nil else { 
            return false 
        }
        
        if case .connected(let state) = connectionState, state == .ready {
            return true
        }
        return false
    }

    func send(data: Data) async -> Bool {
        if !isConnectionReady() {
            print("Send failed: Connection is not ready. Current state: \(connectionState)")
            return false
        }
        
        guard let connection = connection else {
            print("Send failed: No active connection.")
            return false
        }
        
        guard let _ = connection.currentPath?.remoteEndpoint else {
            print("Send failed: No remote endpoint available")
            return false
        }
        
        do {
            print("Sending data (\(data.count) bytes)")
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                let connectionCopy = connection
                
                let workItem = DispatchWorkItem {
                    connectionCopy.send(content: data, completion: .contentProcessed { error in
                        if let error = error {
                            print("Send error: \(error.localizedDescription)")
                            continuation.resume(throwing: error)
                        } else {
                            print("Data sent successfully")
                            continuation.resume()
                        }
                    })
                }
                
                self.queue.async(execute: workItem)
            }
            return true
        } catch {
            print("Send failed with error: \(error.localizedDescription)")
            
            // Update connection state if we detect it's failed
            if let nsError = error as NSError?, nsError.code == 57 || nsError.code == 54 {
                connectionState = .failed(error)
                print("Connection appears to be closed or reset")
            }
            
            return false
        }
    }

    func receive() async throws -> Data {
        guard case .connected = connectionState else {
            print("Receive failed: Connection is not in connected state. Current state: \(connectionState)")
            throw SwiftTCPClientError.connectionNil
        }
        
        guard let connection = connection else {
            throw SwiftTCPClientError.connectionNil
        }

        print("Attempting to receive data...")
        
        // Extract the timeout value to avoid capturing self in the task closures
        let timeout = self.readTimeout
        let closeConnection = { [weak self] in self?.close() }

        return try await withThrowingTaskGroup(of: Data.self) { group in
            // Create a task for receiving data
            group.addTask { @Sendable in
                return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Data, Error>) in
                    // We'll use a dedicated flag with a lock for thread safety
                    let syncQueue = DispatchQueue(label: "com.bluewallet.receiveSync")
                    var isCompleted = false
                    
                    connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { data, _, isComplete, error in
                        syncQueue.sync {
                            guard !isCompleted else { return }
                            isCompleted = true
                            
                            if let error = error {
                                let nsError = error as NSError
                                print("Receive error: \(error.localizedDescription) (Code: \(nsError.code))")
                                continuation.resume(throwing: SwiftTCPClientError.unknown(error))
                                return
                            }

                            if let data = data, !data.isEmpty {
                                print("Received data: \(data)")
                                continuation.resume(returning: data)
                            } else if isComplete {
                                print("Connection closed by peer.")
                                closeConnection()
                                continuation.resume(throwing: SwiftTCPClientError.noDataReceived)
                            } else {
                                print("Read timed out.")
                                continuation.resume(throwing: SwiftTCPClientError.readTimedOut)
                            }
                        }
                    }
                }
            }
            
            group.addTask { @Sendable in
                try await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
                print("Receive operation timed out after \(timeout) seconds.")
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
        print("Closing connection")
        connection?.stateUpdateHandler = nil
        connectionState = .disconnected
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

    private func withTimeout<T>(seconds: TimeInterval, operation: @escaping @Sendable () async throws -> T) async throws -> T {
        // Extract the value to avoid capturing self
        let timeoutSeconds = seconds
        
        return try await withThrowingTaskGroup(of: T.self) { group in
            // Add the main operation task
            group.addTask { @Sendable in
                return try await operation()
            }
            
            // Add the timeout task
            group.addTask { @Sendable in
                try await Task.sleep(nanoseconds: UInt64(timeoutSeconds * 1_000_000_000))
                throw TimeoutError()
            }
            
            let result = try await group.next()!
            group.cancelAll()
            return result
        }
    }
}
