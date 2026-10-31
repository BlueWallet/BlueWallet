import Foundation
import React
import Security

/** Read-only compatibility bridge for data written by react-native-secure-key-store. */
@objc(LegacySecureStorage)
final class LegacySecureStorage: NSObject {
    private static let service = "RNSecureKeyStoreKeyChain"

    @objc static func requiresMainQueueSetup() -> Bool { false }

    private func query(for key: String) -> [String: Any] {
        let encodedKey = key.data(using: .utf8)!
        return [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.service,
            kSecAttrAccount as String: encodedKey,
            kSecAttrGeneric as String: encodedKey,
        ]
    }

    @objc(get:resolver:rejecter:)
    func get(
        _ key: String,
        resolver resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        var item: CFTypeRef?
        var search = query(for: key)
        search[kSecMatchLimit as String] = kSecMatchLimitOne
        search[kSecReturnData as String] = true

        let status = SecItemCopyMatching(search as CFDictionary, &item)
        switch status {
        case errSecSuccess:
            guard let data = item as? Data, let value = String(data: data, encoding: .utf8) else {
                reject("LEGACY_SECURE_STORAGE_DECODE", "Legacy Keychain value is not valid UTF-8", nil)
                return
            }
            resolve(value)
        case errSecItemNotFound:
            resolve(nil)
        default:
            reject("LEGACY_SECURE_STORAGE_READ", SecCopyErrorMessageString(status, nil) as String? ?? "Keychain read failed", nil)
        }
    }

    @objc(remove:resolver:rejecter:)
    func remove(
        _ key: String,
        resolver resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        let status = SecItemDelete(query(for: key) as CFDictionary)
        if status == errSecSuccess || status == errSecItemNotFound {
            resolve(nil)
        } else {
            reject("LEGACY_SECURE_STORAGE_REMOVE", SecCopyErrorMessageString(status, nil) as String? ?? "Keychain removal failed", nil)
        }
    }
}
