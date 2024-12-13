import Foundation

actor HostManager {
    var availableHosts: [(host: String, port: UInt16, useSSL: Bool)]
    var hostFailureCounts: [String: Int] = [:]
    let maxRetriesPerHost: Int

    init(hosts: [(host: String, port: UInt16, useSSL: Bool)], maxRetriesPerHost: Int) {
        self.availableHosts = hosts
        self.maxRetriesPerHost = maxRetriesPerHost
        print("Initialized HostManager with \(hosts.count) hosts.")
    }

    func getNextHost() -> (host: String, port: UInt16, useSSL: Bool)? {
        guard !availableHosts.isEmpty else {
            print("No available hosts to retrieve.")
            return nil
        }
        
        var attempts = availableHosts.count
        while attempts > 0 {
            let currentHost = availableHosts.removeFirst()
            if !shouldSkipHost(currentHost.host) {
                availableHosts.append(currentHost)
                print("Selected host: \(currentHost.host):\(currentHost.port) (SSL: \(currentHost.useSSL))")
                return currentHost
            } else {
                availableHosts.append(currentHost)
                attempts -= 1
                print("Host \(currentHost.host) is skipped due to max retries.")
            }
        }

        print("All hosts have been exhausted after max retries.")
        return nil
    }

    func shouldSkipHost(_ host: String) -> Bool {
        if let failureCount = hostFailureCounts[host], failureCount >= maxRetriesPerHost {
            print("Host \(host) has reached max retries (\(failureCount)). It will be skipped.") 
            return true
        }
        return false
    }

    func resetFailureCount(for host: String) {
        hostFailureCounts[host] = 0
        print("Reset failure count for host \(host).") 
    }

    func incrementFailureCount(for host: String) {
        hostFailureCounts[host, default: 0] += 1
        let newCount = hostFailureCounts[host]!
        print("Incremented failure count for host \(host). New count: \(newCount)") 
    }
}