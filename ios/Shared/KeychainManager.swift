import Security
import Foundation

class KeychainManager {
    static let shared = KeychainManager()
    
    // Access group and service identifiers to match the TS implementation
    private let accessGroup = "group.io.bluewallet.bluewallet"
    private let service = "io.bluewallet.bluewallet.receivebitcoin"
    
    private init() {}
    
    /**
     * Stores data in the Keychain for the given key.
     * @param value The string value to store.
     * @param key The key for the value in the Keychain.
     */
    func storeInKeychain(value: String, forKey key: String) {
        let data = value.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "\(service).\(key)", // Unique service identifier
            kSecAttrAccessGroup as String: accessGroup,
            kSecValueData as String: data
        ]
        
        // Delete any existing item before adding
        SecItemDelete(query as CFDictionary)
        
        let status = SecItemAdd(query as CFDictionary, nil)
        
        if status == errSecSuccess {
            print("Successfully stored value for key: \(key)")
        } else {
            print("Error storing value for key: \(key), status: \(status)")
        }
    }
    
    /**
     * Retrieves data from the Keychain for the given key.
     * @param key The key for the value in the Keychain.
     * @returns The value if found, otherwise nil.
     */
    func getFromKeychain(forKey key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "\(service).\(key)", // Unique service identifier
            kSecAttrAccessGroup as String: accessGroup,
            kSecReturnData as String: kCFBooleanTrue!,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        if status == errSecSuccess {
            if let data = dataTypeRef as? Data {
                return String(data: data, encoding: .utf8)
            }
        } else {
            print("Error fetching value for key: \(key), status: \(status)")
        }
        return nil
    }
    
    /**
     * Deletes data from the Keychain for the given key.
     * @param key The key for the value in the Keychain.
     */
    func deleteFromKeychain(forKey key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "\(service).\(key)", // Unique service identifier
            kSecAttrAccessGroup as String: accessGroup
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        
        if status == errSecSuccess {
            print("Successfully deleted value for key: \(key)")
        } else {
            print("Error deleting value for key: \(key), status: \(status)")
        }
    }
    
    /**
     * Fetches QR code data (label and address) from the Keychain.
     * @returns A tuple containing the label and address if found, otherwise nil.
     */
    func fetchQRCodeData() -> (label: String, address: String)? {
        guard let label = getFromKeychain(forKey: "label"),
              let address = getFromKeychain(forKey: "address") else {
            return nil
        }
        return (label, address)
    }
}
