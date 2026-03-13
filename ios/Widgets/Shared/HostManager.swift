import Foundation

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

        var attempts = availableHosts.count
        while attempts > 0 {
            let currentHost = availableHosts.removeFirst()
            if !shouldSkipHost(currentHost.host) {
                availableHosts.append(currentHost)
                return currentHost
            } else {
                availableHosts.append(currentHost)
                attempts -= 1
            }
        }

        return nil
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