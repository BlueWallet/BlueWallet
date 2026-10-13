import Dispatch
import Foundation
import Network

enum SwiftTCPClientError: Error, LocalizedError {
    case connectionNil, connectionCancelled, readTimedOut, noDataReceived
    case unknown(Error)

    var errorDescription: String? {
        switch self {
        case .connectionNil: return "Connection is nil."
        case .connectionCancelled: return "Connection was cancelled."
        case .readTimedOut: return "Read timed out."
        case .noDataReceived: return "No data received."
        case .unknown(let error): return error.localizedDescription
        }
    }
}

actor HostManager {
    typealias Host = (host: String, port: UInt16, useSSL: Bool)
    private var hosts: [Host]
    private var failureCounts: [String: Int] = [:]
    let maxRetriesPerHost: Int

    init(hosts: [Host], maxRetriesPerHost: Int) {
        self.hosts = hosts
        self.maxRetriesPerHost = max(1, maxRetriesPerHost)
    }

    var count: Int { hosts.count }

    func nextHost() -> Host? {
        guard !hosts.isEmpty else { return nil }
        let host = hosts.removeFirst()
        hosts.append(host)
        return host
    }

    func shouldSkip(_ host: String) -> Bool {
        failureCounts[host, default: 0] >= maxRetriesPerHost
    }

    func recordSuccess(for host: String) { failureCounts[host] = 0 }
    func recordFailure(for host: String) { failureCounts[host, default: 0] += 1 }
}

final class SwiftTCPClient {
    private enum State: CustomStringConvertible {
        case disconnected, connecting, connected, cancelled
        case failed(Error)

        var description: String {
            switch self {
            case .disconnected: return "Disconnected"
            case .connecting: return "Connecting"
            case .connected: return "Connected"
            case .cancelled: return "Cancelled"
            case .failed(let error): return "Failed: \(error.localizedDescription)"
            }
        }
    }

    private let queue = DispatchQueue(label: "io.bluewallet.swift-tcp-client", qos: .userInitiated)
    private let queueKey = DispatchSpecificKey<Void>()
    private let readTimeout: TimeInterval
    private let maxRetries: Int
    private let hostManager: HostManager
    private var connection: NWConnection?
    private var state: State = .disconnected
    private var pathStatus: NWPath.Status?
    private var pathIsConstrained = false
    private var pathIsExpensive = false
    private var pathMonitor: NWPathMonitor?
    private var receiveBuffer = Data()

    init(hosts: [HostManager.Host] = [], maxRetriesPerHost: Int = 3, maxRetries: Int = 3, readTimeout: TimeInterval = 5) {
        hostManager = HostManager(hosts: hosts, maxRetriesPerHost: maxRetriesPerHost)
        self.maxRetries = max(1, maxRetries)
        self.readTimeout = readTimeout
        queue.setSpecific(key: queueKey, value: ())
        startPathMonitor()
    }

    deinit {
        pathMonitor?.cancel()
        connection?.cancel()
    }

    func connect(to host: String, port: UInt16, useSSL: Bool = false, validateCertificates: Bool = true, retries: Int = 0) async -> Bool {
        guard !(await hostManager.shouldSkip(host)) else { return false }

        for attempt in max(0, retries)..<maxRetries {
            do {
                try await connectOnce(to: host, port: port, useSSL: useSSL, validateCertificates: validateCertificates)
                await hostManager.recordSuccess(for: host)
                return true
            } catch {
                await hostManager.recordFailure(for: host)
                print("Connection to \(host):\(port) failed: \(error.localizedDescription)")
                guard attempt + 1 < maxRetries, !isConnectionRefused(error) else { break }
                try? await Task.sleep(nanoseconds: 500_000_000)
            }
        }
        close()
        return false
    }

    func connectToNextAvailable(validateCertificates: Bool = true) async -> Bool {
        let count = await hostManager.count
        for _ in 0..<count {
            guard let candidate = await hostManager.nextHost() else { return false }
            guard !(await hostManager.shouldSkip(candidate.host)) else { continue }
            if await connect(to: candidate.host, port: candidate.port, useSSL: candidate.useSSL, validateCertificates: validateCertificates) {
                return true
            }
        }
        return false
    }

    func isConnectionReady() -> Bool {
        queue.sync {
            guard connection != nil, case .connected = state else { return false }
            return true
        }
    }

    func shouldUseStreaming(isLowPowerModeEnabled: Bool) -> Bool {
        queue.sync {
            electrumStreamingAllowed(
                isLowPowerModeEnabled: isLowPowerModeEnabled,
                pathStatus: pathStatus,
                isConstrained: pathIsConstrained,
                isExpensive: pathIsExpensive
            )
        }
    }

    func send(data: Data) async -> Bool {
        guard let connection = readyConnection() else { return false }
        do {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                connection.send(content: data, completion: .contentProcessed { error in
                    if let error { continuation.resume(throwing: error) }
                    else { continuation.resume() }
                })
            }
            return true
        } catch {
            close()
            return false
        }
    }

    func receive() async throws -> Data {
        while true {
            if let message = queue.sync(execute: nextBufferedMessage) {
                return message
            }

            let chunk = try await receiveChunk()
            queue.sync { receiveBuffer.append(chunk) }

            guard queue.sync(execute: { receiveBuffer.count <= 1_048_576 }) else {
                close()
                throw SwiftTCPClientError.noDataReceived
            }
        }
    }

    private func receiveChunk() async throws -> Data {
        guard let connection = readyConnection() else { throw SwiftTCPClientError.connectionNil }
        return try await withCheckedThrowingContinuation { continuation in
            let lock = NSLock()
            var completed = false
            let finish: (Result<Data, Error>) -> Bool = { result in
                lock.lock()
                guard !completed else { lock.unlock(); return false }
                completed = true
                lock.unlock()
                continuation.resume(with: result)
                return true
            }

            connection.receive(minimumIncompleteLength: 1, maximumLength: 65_536) { [weak self] data, _, complete, error in
                if let error { _ = finish(.failure(SwiftTCPClientError.unknown(error))) }
                else if let data, !data.isEmpty { _ = finish(.success(data)) }
                else if complete { _ = finish(.failure(SwiftTCPClientError.noDataReceived)) }
                else { _ = finish(.failure(SwiftTCPClientError.readTimedOut)) }

                if error != nil || complete { self?.close() }
            }

            queue.asyncAfter(deadline: .now() + readTimeout) { [weak self, weak connection] in
                guard let self, self.connection === connection else { return }
                guard finish(.failure(SwiftTCPClientError.readTimedOut)) else { return }
                self.connection = nil
                self.state = .disconnected
                connection?.stateUpdateHandler = nil
                connection?.cancel()
            }
        }
    }

    /// Streams messages until the consumer stops, an error occurs, or the
    /// connection closes. The stream owns the connection and always tears it
    /// down when iteration ends.
    func messages() -> AsyncThrowingStream<Data, Error> {
        AsyncThrowingStream { continuation in
            let task = Task { [weak self] in
                guard let self else {
                    continuation.finish(throwing: SwiftTCPClientError.connectionNil)
                    return
                }

                do {
                    while !Task.isCancelled {
                        continuation.yield(try await receive())
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }

            continuation.onTermination = { [weak self] _ in
                task.cancel()
                self?.close()
            }
        }
    }

    func close() {
        if DispatchQueue.getSpecific(key: queueKey) != nil { closeOnQueue() }
        else { queue.sync { closeOnQueue() } }
    }

    private func closeOnQueue() {
        let connection = connection
        self.connection = nil
        receiveBuffer.removeAll(keepingCapacity: false)
        state = .disconnected
        connection?.stateUpdateHandler = nil
        connection?.cancel()
    }

    private func readyConnection() -> NWConnection? {
        queue.sync {
            guard case .connected = state else { return nil }
            return connection
        }
    }

    private func nextBufferedMessage() -> Data? {
        guard let newline = receiveBuffer.firstIndex(of: 0x0A) else { return nil }
        let message = receiveBuffer[..<newline]
        receiveBuffer.removeSubrange(...newline)
        return message.isEmpty ? nextBufferedMessage() : Data(message)
    }

    private func connectOnce(to host: String, port: UInt16, useSSL: Bool, validateCertificates: Bool) async throws {
        guard let port = NWEndpoint.Port(rawValue: port) else { throw POSIXError(.EINVAL) }
        guard queue.sync(execute: { pathStatus != .unsatisfied }) else { throw POSIXError(.ENETDOWN) }

        let parameters = useSSL ? NWParameters(tls: tlsOptions(validateCertificates: validateCertificates), tcp: .init()) : .tcp
        configure(parameters)
        close()

        let connection = NWConnection(host: NWEndpoint.Host(host), port: port, using: parameters)
        queue.sync { self.connection = connection; state = .connecting }

        try await withCheckedThrowingContinuation { continuation in
            let lock = NSLock()
            var completed = false
            let finish: (Result<Void, Error>, () -> Void) -> Bool = { result, updateState in
                lock.lock()
                guard !completed else { lock.unlock(); return false }
                completed = true
                lock.unlock()
                updateState()
                continuation.resume(with: result)
                return true
            }

            connection.stateUpdateHandler = { [weak self] newState in
                guard let self, self.connection === connection else { return }
                switch newState {
                case .ready:
                    _ = finish(.success(())) { self.state = .connected }
                case .failed(let error):
                    _ = finish(.failure(SwiftTCPClientError.unknown(error))) { self.state = .failed(error) }
                case .cancelled:
                    _ = finish(.failure(SwiftTCPClientError.connectionCancelled)) { self.state = .cancelled }
                default: break
                }
            }
            connection.start(queue: queue)
            queue.asyncAfter(deadline: .now() + readTimeout) { [weak self, weak connection] in
                guard let self, self.connection === connection else { return }
                guard finish(.failure(SwiftTCPClientError.readTimedOut), { self.state = .failed(SwiftTCPClientError.readTimedOut) }) else { return }
                self.connection = nil
                connection?.stateUpdateHandler = nil
                connection?.cancel()
            }
        }
    }

    private func startPathMonitor() {
        let monitor = NWPathMonitor()
        pathMonitor = monitor
        monitor.pathUpdateHandler = { [weak self] path in
            self?.pathStatus = path.status
            self?.pathIsConstrained = path.isConstrained
            self?.pathIsExpensive = path.isExpensive
        }
        monitor.start(queue: queue)
    }

    private func configure(_ parameters: NWParameters) {
        parameters.prohibitExpensivePaths = false
        parameters.expiredDNSBehavior = .allow
        parameters.multipathServiceType = .handover
        guard let tcp = parameters.defaultProtocolStack.internetProtocol as? NWProtocolTCP.Options else { return }
        tcp.enableFastOpen = false; tcp.noDelay = true; tcp.enableKeepalive = true
        tcp.keepaliveCount = 5; tcp.keepaliveIdle = 60; tcp.keepaliveInterval = 5; tcp.connectionTimeout = 10
    }

    private func tlsOptions(validateCertificates: Bool) -> NWProtocolTLS.Options {
        let options = NWProtocolTLS.Options()
        if !validateCertificates {
            sec_protocol_options_set_verify_block(options.securityProtocolOptions, { _, _, completion in completion(true) }, queue)
        }
        return options
    }

    private func isConnectionRefused(_ error: Error) -> Bool {
        let underlying: Error
        if case SwiftTCPClientError.unknown(let wrapped) = error { underlying = wrapped } else { underlying = error }
        return (underlying as NSError).code == Int(ECONNREFUSED)
    }
}

func electrumStreamingAllowed(
    isLowPowerModeEnabled: Bool,
    pathStatus: NWPath.Status?,
    isConstrained: Bool,
    isExpensive: Bool
) -> Bool {
    let hasUsablePath = pathStatus == nil || pathStatus == .satisfied
    return hasUsablePath && !isLowPowerModeEnabled && !isConstrained && !isExpensive
}
