import Foundation
import Network
import WidgetKit
#if canImport(Darwin)
import Darwin
#endif
#if canImport(React_Codegen)
import React
#endif

// Lightweight helper used by the app target to refresh widget timelines from native code.
class WidgetHelper {
    func reloadAllWidgets() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}

#if canImport(React_Codegen)
@objc(WidgetHelperModule)
class WidgetHelperModule: NSObject, NativeWidgetHelperSpec {
    private var electrumDiscovery: ElectrumBonjourDiscovery?
    private var localNetworkPermissionRequest: LocalNetworkPermissionRequest?
    static func moduleName() -> String! { "WidgetHelper" }
    static func requiresMainQueueSetup() -> Bool { false }

    @objc
    func reloadAllWidgets() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    @objc
    func requestLocalNetworkPermission(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async { [weak self] in
            guard let self else {
                reject("local_network_permission_unavailable", "Local network permission is unavailable.", nil)
                return
            }
            guard self.localNetworkPermissionRequest == nil else {
                reject("local_network_permission_busy", "A local network permission request is already running.", nil)
                return
            }

            let request = LocalNetworkPermissionRequest { [weak self] status in
                self?.localNetworkPermissionRequest = nil
                resolve(status)
            }
            self.localNetworkPermissionRequest = request
            request.start()
        }
    }

    @objc
    func discoverElectrumServers(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async { [weak self] in
            guard let self else {
                reject("electrum_discovery_unavailable", "Electrum server discovery is unavailable.", nil)
                return
            }
            self.beginElectrumServerDiscovery(resolve, rejecter: reject)
        }
    }

    private func beginElectrumServerDiscovery(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard electrumDiscovery == nil else {
            reject("electrum_discovery_busy", "Electrum server discovery is already running.", nil)
            return
        }
        let discovery = ElectrumBonjourDiscovery { [weak self] result in
            self?.electrumDiscovery = nil
            switch result {
            case .success(let servers):
                do {
                    let data = try JSONSerialization.data(withJSONObject: servers)
                    resolve(String(data: data, encoding: .utf8) ?? "[]")
                } catch {
                    reject("electrum_discovery_encoding", error.localizedDescription, error)
                }
            case .failure(let error):
                reject("electrum_discovery_failed", error.localizedDescription, error)
            }
        }
        electrumDiscovery = discovery
        discovery.start()
    }

    @objc
    func invalidate() {
        DispatchQueue.main.async { [weak self] in
            self?.localNetworkPermissionRequest?.cancel()
            self?.localNetworkPermissionRequest = nil
            self?.electrumDiscovery?.cancel()
            self?.electrumDiscovery = nil
        }
    }
}

private final class LocalNetworkPermissionRequest {
    private static let policyDeniedError: Int32 = -65_570
    private let completion: (String) -> Void
    private var browser: NWBrowser?
    private var finished = false

    init(completion: @escaping (String) -> Void) {
        self.completion = completion
    }

    func start() {
        let descriptor = NWBrowser.Descriptor.bonjour(type: "_electrum._tcp", domain: "local.")
        let parameters = NWParameters.tcp
        parameters.includePeerToPeer = true
        let browser = NWBrowser(for: descriptor, using: parameters)
        self.browser = browser
        browser.stateUpdateHandler = { [weak self] state in
            guard let self else { return }
            switch state {
            case .ready:
                self.finish(with: "granted")
            case .waiting(let error):
                if self.isPolicyDenied(error) {
                    self.finish(with: "blocked", error: error)
                }
            case .failed(let error):
                self.finish(with: self.isPolicyDenied(error) ? "blocked" : "unavailable", error: error)
            case .cancelled:
                break
            default:
                break
            }
        }
        browser.start(queue: .main)
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in
            self?.finish(with: "unavailable", reason: "permission_probe_timed_out")
        }
    }

    func cancel() {
        guard !finished else { return }
        finished = true
        browser?.stateUpdateHandler = nil
        browser?.cancel()
        browser = nil
    }

    private func isPolicyDenied(_ error: NWError) -> Bool {
        if case .dns(let code) = error {
            return code == Self.policyDeniedError
        }
        return false
    }

    private func finish(with status: String, error: NWError? = nil, reason: String? = nil) {
        guard !finished else { return }
        finished = true
        browser?.stateUpdateHandler = nil
        browser?.cancel()
        browser = nil
        var diagnostic: [String: Any] = ["status": status]
        if let reason { diagnostic["reason"] = reason }
        if let error {
            switch error {
            case .dns(let code):
                diagnostic["errorDomain"] = "dns"
                diagnostic["errorCode"] = Int(code)
            case .posix(let code):
                diagnostic["errorDomain"] = "posix"
                diagnostic["errorCode"] = code.rawValue
            case .tls(let code):
                diagnostic["errorDomain"] = "tls"
                diagnostic["errorCode"] = code
            @unknown default:
                diagnostic["errorDomain"] = "unknown"
            }
        }
        if let data = try? JSONSerialization.data(withJSONObject: diagnostic),
           let value = String(data: data, encoding: .utf8) {
            completion(value)
        } else {
            completion(status)
        }
    }
}

private final class ElectrumBonjourDiscovery: NSObject, NetServiceBrowserDelegate, NetServiceDelegate {
    private let completion: (Result<[[String: Any]], Error>) -> Void
    private var browsers: [NetServiceBrowser] = []
    private var services: [NetService] = []
    private var lanScanner: ElectrumLANScanner?
    private var servers: [[String: Any]] = []
    private var finished = false
    private let maximumServiceCount = 1_000

    init(completion: @escaping (Result<[[String: Any]], Error>) -> Void) {
        self.completion = completion
    }

    func start() {
        DispatchQueue.main.async {
            for type in ["_electrum._tcp.", "_electrums._tcp."] {
                let browser = NetServiceBrowser()
                browser.delegate = self
                self.browsers.append(browser)
                browser.searchForServices(ofType: type, inDomain: "local.")
            }
            let scanner = ElectrumLANScanner { [weak self] host, port, ssl in
                self?.addServer(name: host, host: host, port: port, ssl: ssl)
            }
            self.lanScanner = scanner
            scanner.start()
            DispatchQueue.main.asyncAfter(deadline: .now() + 6) { [weak self] in self?.finish() }
        }
    }

    func netServiceBrowser(_ browser: NetServiceBrowser, didFind service: NetService, moreComing: Bool) {
        guard !finished, services.count < maximumServiceCount else { return }
        service.delegate = self
        services.append(service)
        service.resolve(withTimeout: 4)
    }

    func netServiceDidResolveAddress(_ sender: NetService) {
        guard !finished, let rawHost = sender.hostName, sender.port > 0, sender.port <= 65_535 else { return }
        let host = rawHost.hasSuffix(".") ? String(rawHost.dropLast()) : rawHost
        let isSSL = sender.type.lowercased().contains("electrums")
        addServer(name: sender.name, host: host, port: sender.port, ssl: isSSL)
    }

    func netServiceBrowser(_ browser: NetServiceBrowser, didNotSearch errorDict: [String: NSNumber]) {
        // Bonjour is only one discovery source. Keep the subnet scan running
        // when DNS-SD is unavailable or no service type is registered.
    }

    private func finish() {
        guard !finished else { return }
        finished = true
        cleanUp()
        completion(.success(servers.map { record in
            var result = record
            result.removeValue(forKey: "key")
            return result
        }))
    }

    func cancel() {
        guard !finished else { return }
        finished = true
        cleanUp()
    }

    private func cleanUp() {
        lanScanner?.cancel()
        lanScanner = nil
        browsers.forEach {
            $0.delegate = nil
            $0.stop()
        }
        services.forEach {
            $0.delegate = nil
            $0.stop()
        }
        browsers.removeAll()
        services.removeAll()
    }

    private func addServer(name: String, host: String, port: Int, ssl: Bool) {
        guard !finished, port > 0, port <= 65_535 else { return }
        let key = "\(host):\(port):\(ssl)"
        guard !servers.contains(where: { $0["key"] as? String == key }) else { return }
        let server: [String: Any] = ["key": key, "name": name, "host": host, "port": port, "ssl": ssl]
        servers.append(server)
        var event = server
        event.removeValue(forKey: "key")
        EventEmitter.shared()?.sendElectrumServerDiscovered(event)
    }
}

/// Finds open Electrum-shaped endpoints on the current private IPv4 /24. The
/// JavaScript layer performs the authoritative server.version handshake before
/// any endpoint is displayed.
private final class ElectrumLANScanner {
    private struct Candidate {
        let host: String
        let port: UInt16
        let ssl: Bool
    }

    private let resultHandler: (String, Int, Bool) -> Void
    private var candidates: [Candidate] = []
    private var connections: [UUID: NWConnection] = [:]
    private var cancelled = false
    private let concurrencyLimit = 24

    init(resultHandler: @escaping (String, Int, Bool) -> Void) {
        self.resultHandler = resultHandler
    }

    func start() {
        guard let address = Self.privateIPv4Address() else { return }
        let octets = address.split(separator: ".").compactMap { UInt8($0) }
        guard octets.count == 4 else { return }
        let prefix = "\(octets[0]).\(octets[1]).\(octets[2])"
        let endpoints: [(UInt16, Bool)] = [(50001, false), (50002, true), (443, true)]
        for lastOctet in UInt8(1)...UInt8(254) where lastOctet != octets[3] {
            for endpoint in endpoints {
                candidates.append(Candidate(host: "\(prefix).\(lastOctet)", port: endpoint.0, ssl: endpoint.1))
            }
        }
        startNextConnections()
    }

    func cancel() {
        cancelled = true
        candidates.removeAll()
        connections.values.forEach { $0.cancel() }
        connections.removeAll()
    }

    private func startNextConnections() {
        guard !cancelled else { return }
        while connections.count < concurrencyLimit, !candidates.isEmpty {
            let candidate = candidates.removeFirst()
            guard let port = NWEndpoint.Port(rawValue: candidate.port) else { continue }
            let connection = NWConnection(host: NWEndpoint.Host(candidate.host), port: port, using: .tcp)
            let identifier = UUID()
            connections[identifier] = connection
            var settled = false
            let settle: (Bool) -> Void = { [weak self, weak connection] isOpen in
                guard !settled else { return }
                settled = true
                connection?.stateUpdateHandler = nil
                connection?.cancel()
                guard let self, !self.cancelled else { return }
                self.connections.removeValue(forKey: identifier)
                if isOpen { self.resultHandler(candidate.host, Int(candidate.port), candidate.ssl) }
                self.startNextConnections()
            }
            connection.stateUpdateHandler = { state in
                switch state {
                case .ready: settle(true)
                case .failed, .cancelled: settle(false)
                default: break
                }
            }
            connection.start(queue: .main)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { settle(false) }
        }
    }

    private static func privateIPv4Address() -> String? {
        var interfaces: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&interfaces) == 0, let first = interfaces else { return nil }
        defer { freeifaddrs(interfaces) }
        var cursor: UnsafeMutablePointer<ifaddrs>? = first
        while let interface = cursor {
            defer { cursor = interface.pointee.ifa_next }
            guard let socketAddress = interface.pointee.ifa_addr, socketAddress.pointee.sa_family == UInt8(AF_INET) else { continue }
            let flags = Int32(interface.pointee.ifa_flags)
            guard flags & IFF_UP != 0, flags & IFF_LOOPBACK == 0 else { continue }
            let address = socketAddress.withMemoryRebound(to: sockaddr_in.self, capacity: 1) { $0.pointee.sin_addr }
            var mutableAddress = address
            var buffer = [CChar](repeating: 0, count: Int(INET_ADDRSTRLEN))
            guard inet_ntop(AF_INET, &mutableAddress, &buffer, socklen_t(INET_ADDRSTRLEN)) != nil else { continue }
            let host = String(cString: buffer)
            if host.hasPrefix("10.") || host.hasPrefix("192.168.") || Self.isPrivate172(host) { return host }
        }
        return nil
    }

    private static func isPrivate172(_ host: String) -> Bool {
        let parts = host.split(separator: ".")
        guard parts.count == 4, parts[0] == "172", let second = Int(parts[1]) else { return false }
        return (16...31).contains(second)
    }
}
#else
// Fallback for targets (e.g., widget extension) that do not pull in React codegen modules.
@objc(WidgetHelperModule)
class WidgetHelperModule: NSObject {
    func reloadAllWidgets() {
        // WidgetsExtension does not link the app's WidgetHelper; invoke WidgetKit directly.
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}
#endif
