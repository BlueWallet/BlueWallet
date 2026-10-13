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
    private struct Health: Codable {
        var failureCount = 0
        var retryAfter = Date.distantPast
        var lastSuccess: Date?
    }

    private let hosts: [Host]
    private let defaults: UserDefaults?
    private let persistenceKey: String
    private let now: () -> Date
    private let jitter: () -> Double
    private var health: [String: Health]
    private var cursor = 0

    init(
        hosts: [Host],
        maxRetriesPerHost _: Int = 1,
        defaults: UserDefaults? = .standard,
        persistenceKey: String = "io.bluewallet.electrum-endpoint-health",
        now: @escaping () -> Date = Date.init,
        jitter: @escaping () -> Double = { Double.random(in: -0.2...0.2) }
    ) {
        self.hosts = hosts
        self.defaults = defaults
        self.persistenceKey = persistenceKey
        self.now = now
        self.jitter = jitter
        if let data = defaults?.data(forKey: persistenceKey),
           let saved = try? JSONDecoder().decode([String: Health].self, from: data) {
            health = saved
        } else {
            health = [:]
        }
    }

    nonisolated static func key(for host: Host) -> String {
        "\(host.host.lowercased()):\(host.port):\(host.useSSL ? "tls" : "tcp")"
    }

    func candidates(excluding excludedKeys: Set<String> = []) -> [Host] {
        let candidates = hosts.filter { !excludedKeys.contains(Self.key(for: $0)) }
        guard !candidates.isEmpty else { return [] }

        let currentDate = now()
        let healthy = candidates.filter { health[Self.key(for: $0), default: Health()].retryAfter <= currentDate }
        if healthy.isEmpty {
            // When every endpoint is cooling down, probe only the one closest
            // to recovery rather than sweeping the complete failed list.
            return candidates.min {
                health[Self.key(for: $0), default: Health()].retryAfter
                    < health[Self.key(for: $1), default: Health()].retryAfter
            }.map { [$0] } ?? []
        }

        if let preferred = healthy.max(by: {
            (health[Self.key(for: $0)]?.lastSuccess ?? .distantPast)
                < (health[Self.key(for: $1)]?.lastSuccess ?? .distantPast)
        }), health[Self.key(for: preferred)]?.lastSuccess != nil {
            return [preferred] + healthy.filter { Self.key(for: $0) != Self.key(for: preferred) }
        }

        let offset = cursor % healthy.count
        cursor = (cursor + 1) % healthy.count
        return Array(healthy[offset...]) + Array(healthy[..<offset])
    }

    func recordSuccess(for host: Host) {
        health[Self.key(for: host)] = Health(failureCount: 0, retryAfter: .distantPast, lastSuccess: now())
        persist()
    }

    func recordFailure(for host: Host, permanent: Bool = false) {
        let key = Self.key(for: host)
        var state = health[key, default: Health()]
        state.failureCount = permanent ? max(4, state.failureCount + 1) : state.failureCount + 1
        let delays: [TimeInterval] = [30, 120, 600, 1_800]
        let baseDelay = delays[min(state.failureCount - 1, delays.count - 1)]
        state.retryAfter = now().addingTimeInterval(baseDelay * max(0.8, min(1.2, 1 + jitter())))
        health[key] = state
        persist()
    }

    func retryAfter(for host: Host) -> Date? { health[Self.key(for: host)]?.retryAfter }
    func failureCount(for host: Host) -> Int { health[Self.key(for: host)]?.failureCount ?? 0 }

    private func persist() {
        guard let defaults, let data = try? JSONEncoder().encode(health) else { return }
        defaults.set(data, forKey: persistenceKey)
    }
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
    private let hostManager: HostManager
    private var connection: NWConnection?
    private var currentEndpoint: HostManager.Host?
    private var state: State = .disconnected
    private var pathStatus: NWPath.Status?
    private var pathIsConstrained = false
    private var pathIsExpensive = false
    private var pathMonitor: NWPathMonitor?
    private var receiveBuffer = Data()

    init(hosts: [HostManager.Host] = [], maxRetriesPerHost: Int = 1, maxRetries _: Int = 1, readTimeout: TimeInterval = 5) {
        hostManager = HostManager(hosts: hosts, maxRetriesPerHost: maxRetriesPerHost)
        self.readTimeout = readTimeout
        queue.setSpecific(key: queueKey, value: ())
        startPathMonitor()
    }

    deinit {
        pathMonitor?.cancel()
        connection?.cancel()
    }

    func connect(to host: String, port: UInt16, useSSL: Bool = false, validateCertificates: Bool = true, retries: Int = 0) async -> Bool {
        _ = retries // Retained for source compatibility; endpoints are attempted once.
        let endpoint: HostManager.Host = (host, port, useSSL)
        do {
            try Task.checkCancellation()
            try await connectOnce(to: host, port: port, useSSL: useSSL, validateCertificates: validateCertificates)
            queue.sync { currentEndpoint = endpoint }
            return true
        } catch is CancellationError {
            close()
            return false
        } catch {
            if !isNetworkUnavailable(error) {
                await hostManager.recordFailure(for: endpoint, permanent: isPermanentConnectionFailure(error))
            }
            print("Connection to \(host):\(port) failed: \(error.localizedDescription)")
        }
        close()
        return false
    }

    func connectToNextAvailable(validateCertificates: Bool = true, excluding excludedKeys: Set<String> = []) async -> Bool {
        let candidates = await hostManager.candidates(excluding: excludedKeys)
        for candidate in candidates {
            guard !Task.isCancelled else { return false }
            guard queue.sync(execute: { pathStatus != .unsatisfied }) else { return false }
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
        let endpoint = queue.sync { currentEndpoint }
        do {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                connection.send(content: data, completion: .contentProcessed { error in
                    if let error { continuation.resume(throwing: error) }
                    else { continuation.resume() }
                })
            }
            return true
        } catch {
            if let endpoint { await hostManager.recordFailure(for: endpoint) }
            close()
            return false
        }
    }

    func receive() async throws -> Data {
        let endpoint = queue.sync { currentEndpoint }
        do {
            while true {
                if let message = queue.sync(execute: nextBufferedMessage) {
                    if let endpoint { await hostManager.recordSuccess(for: endpoint) }
                    return message
                }

                let chunk = try await receiveChunk()
                queue.sync { receiveBuffer.append(chunk) }

                guard queue.sync(execute: { receiveBuffer.count <= 1_048_576 }) else {
                    throw SwiftTCPClientError.noDataReceived
                }
            }
        } catch is CancellationError {
            close()
            throw CancellationError()
        } catch {
            if let endpoint { await hostManager.recordFailure(for: endpoint) }
            close()
            throw error
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
        electrumMessageStream(
            receive: { [weak self] in
                guard let self else { throw SwiftTCPClientError.connectionNil }
                return try await self.receive()
            },
            close: { [weak self] in self?.close() }
        )
    }

    func close() {
        if DispatchQueue.getSpecific(key: queueKey) != nil { closeOnQueue() }
        else { queue.sync { closeOnQueue() } }
    }

    private func closeOnQueue() {
        let connection = connection
        self.connection = nil
        currentEndpoint = nil
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
        tcp.enableFastOpen = false; tcp.noDelay = true; tcp.enableKeepalive = false
        tcp.connectionTimeout = 10
    }

    private func tlsOptions(validateCertificates: Bool) -> NWProtocolTLS.Options {
        let options = NWProtocolTLS.Options()
        if !validateCertificates {
            sec_protocol_options_set_verify_block(options.securityProtocolOptions, { _, _, completion in completion(true) }, queue)
        }
        return options
    }

    private func isPermanentConnectionFailure(_ error: Error) -> Bool {
        let underlying: Error
        if case SwiftTCPClientError.unknown(let wrapped) = error { underlying = wrapped } else { underlying = error }
        if case NWError.tls(_) = underlying { return true }
        return false
    }

    private func isNetworkUnavailable(_ error: Error) -> Bool {
        let underlying: Error
        if case SwiftTCPClientError.unknown(let wrapped) = error { underlying = wrapped } else { underlying = error }
        return (underlying as NSError).code == Int(ENETDOWN)
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

func electrumMessageStream(
    receive: @escaping () async throws -> Data,
    close: @escaping () -> Void
) -> AsyncThrowingStream<Data, Error> {
    AsyncThrowingStream { continuation in
        let task = Task {
            do {
                while !Task.isCancelled {
                    continuation.yield(try await receive())
                }
                continuation.finish()
            } catch {
                continuation.finish(throwing: error)
            }
        }

        continuation.onTermination = { _ in
            task.cancel()
            close()
        }
    }
}

func receiveElectrumResponse(
    useStreaming: Bool,
    stream: () -> AsyncThrowingStream<Data, Error>,
    oneShot: () async throws -> Data,
    fallback: (Error) async throws -> Data
) async throws -> Data {
    guard useStreaming else { return try await oneShot() }

    do {
        var messages = stream().makeAsyncIterator()
        guard let message = try await messages.next() else {
            throw SwiftTCPClientError.noDataReceived
        }
        return message
    } catch is CancellationError {
        throw CancellationError()
    } catch {
        return try await fallback(error)
    }
}
