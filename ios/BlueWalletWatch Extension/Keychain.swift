import Foundation

class Keychain {
    
    static let shared = Keychain()
    
    private init() {}
    
    // MARK: - Save Data to Keychain
    func save<T: Codable>(_ value: T, forKey key: String) -> Bool {
        do {
            let data = try JSONEncoder().encode(value)
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrAccount as String: key,
                kSecValueData as String: data
            ]
            
            // Delete any existing item before adding new data
            SecItemDelete(query as CFDictionary)
            
            let status = SecItemAdd(query as CFDictionary, nil)
            return status == errSecSuccess
        } catch {
            print("Error encoding data for key \(key): \(error)")
            return false
        }
    }
    
    // MARK: - Load Data from Keychain with Default
    func load<T: Codable>(_ type: T.Type, forKey key: String) -> T? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        if status == errSecItemNotFound {
            // Return an empty array if no data is found
            if type is Array<Any>.Type {
                return [] as? T
            }
            print("No data found for key \(key)")
            return nil
        }
        
        guard status == errSecSuccess, let data = dataTypeRef as? Data else {
            print("Error loading data for key \(key): \(status)")
            return nil
        }
        
        do {
            let decodedObject = try JSONDecoder().decode(type, from: data)
            return decodedObject
        } catch {
            print("Error decoding data for key \(key): \(error)")
            return nil
        }
    }
    
    // MARK: - Update Data in Keychain
    func update<T: Codable>(_ value: T, forKey key: String) -> Bool {
        do {
            let data = try JSONEncoder().encode(value)
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrAccount as String: key
            ]
            let attributes: [String: Any] = [
                kSecValueData as String: data
            ]
            
            let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
            return status == errSecSuccess
        } catch {
            print("Error encoding data for key \(key): \(error)")
            return false
        }
    }
    
    // MARK: - Delete Data from Keychain
    func delete(forKey key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess
    }
}
