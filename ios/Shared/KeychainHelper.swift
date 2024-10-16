import Foundation

struct KeychainHelper {

    @discardableResult
    static func saveToKeychain(key: String, value: String, service: String) -> Bool {
        let data = Data(value.utf8)
        
        // Create query with access group for the shared App Group
        let query = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: key,
            kSecValueData: data,
            kSecAttrAccessGroup: "group.io.bluewallet.bluewallet" // Specify the App Group here
        ] as CFDictionary
        
        // Delete any existing item with the same key (if exists)
        SecItemDelete(query)
        
        // Add new item to keychain
        let status = SecItemAdd(query, nil)
        return status == errSecSuccess
    }

    static func getFromKeychain(key: String, service: String) -> String? {
        // Create query with access group for the shared App Group
        let query = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: key,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne,
            kSecAttrAccessGroup: "group.io.bluewallet.bluewallet" // Specify the App Group here
        ] as CFDictionary
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query, &result)
        
        guard status == errSecSuccess, let data = result as? Data else {
            return nil
        }
        
        return String(data: data, encoding: .utf8)
    }

    static func deleteFromKeychain(key: String, service: String) -> Bool {
        // Create query with access group for the shared App Group
        let query = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: key,
            kSecAttrAccessGroup: "group.io.bluewallet.bluewallet" // Specify the App Group here
        ] as CFDictionary
        
        let status = SecItemDelete(query)
        return status == errSecSuccess
    }
}
