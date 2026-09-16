import Foundation

/// A transaction does not declare its Bitcoin network. Keep output scripts network-neutral
/// instead of presenting a potentially dangerous mainnet/testnet address.
enum ScriptDescription {
    static func from(script: [UInt8]) -> String {
        let hex = script.map { String(format: "%02x", $0) }.joined()
        return "Script: \(hex)"
    }
}
