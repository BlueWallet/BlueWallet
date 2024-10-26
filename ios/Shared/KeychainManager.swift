// KeychainManager.swift

import Foundation
import Security

// MARK: - KeychainError

/// Defines possible errors that can occur during Keychain operations.
enum KeychainError: Error, LocalizedError {
    case unhandledError(status: OSStatus)
    case unexpectedData
    case encodingError
    case decodingError
    
    var errorDescription: String? {
        switch self {
        case .unhandledError(let status):
            return "Unhandled Keychain error with status: \(status)"
        case .unexpectedData:
            return "Unexpected data retrieved from Keychain."
        case .encodingError:
            return "Failed to encode object for Keychain."
        case .decodingError:
            return "Failed to decode object from Keychain."
        }
    }
}

// MARK: - KeychainManager

/// Manages Keychain operations for storing and retrieving data securely.
final class KeychainManager {
    
    // MARK: - Singleton Instance
    
    static let shared = KeychainManager()
    
    // MARK: - Constants
    
  private let accessGroup = "A7W54YZ4WU.group.io.bluewallet.bluewallet"
    
    // MARK: - Initializer
    
    private init() {}
    
    // MARK: - Public Methods
    
    /// Saves raw data to the Keychain for a given service and account.
    /// - Parameters:
    ///   - data: Data to be saved.
    ///   - service: Service identifier.
    ///   - account: Account identifier.
    func save(data: Data, service: String, account: String) throws {
        // Delete any existing item to prevent duplicates
        try delete(service: service, account: account)
        
        let query: [String: Any] = [
            kSecClass as String       : kSecClassGenericPassword,
            kSecAttrService as String : service,
            kSecAttrAccount as String : account,
            kSecAttrAccessGroup as String : accessGroup,
            kSecValueData as String   : data,
            kSecAttrAccessible as String : kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        
        let status = SecItemAdd(query as CFDictionary, nil)
        
        guard status == errSecSuccess else {
            throw KeychainError.unhandledError(status: status)
        }
    }
    
    /// Retrieves raw data from the Keychain for a given service and account.
    /// - Parameters:
    ///   - service: Service identifier.
    ///   - account: Account identifier.
    /// - Returns: Retrieved data or nil if not found.
    func retrieve(service: String, account: String) throws -> Data? {
        let query: [String: Any] = [
            kSecClass as String       : kSecClassGenericPassword,
            kSecAttrService as String : service,
            kSecAttrAccount as String : account,
            kSecAttrAccessGroup as String : accessGroup,
            kSecReturnData as String  : kCFBooleanTrue!,
            kSecMatchLimit as String  : kSecMatchLimitOne
        ]
        
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        
        if status == errSecSuccess {
            guard let data = item as? Data else {
                throw KeychainError.unexpectedData
            }
            return data
        } else if status == errSecItemNotFound {
            return nil
        } else {
            throw KeychainError.unhandledError(status: status)
        }
    }
    
    /// Deletes data from the Keychain for a given service and account.
    /// - Parameters:
    ///   - service: Service identifier.
    ///   - account: Account identifier.
    func delete(service: String, account: String) throws {
        let query: [String: Any] = [
            kSecClass as String       : kSecClassGenericPassword,
            kSecAttrService as String : service,
            kSecAttrAccount as String : account,
            kSecAttrAccessGroup as String : accessGroup
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unhandledError(status: status)
        }
    }
    
    /// Saves a Codable object to the Keychain.
    /// - Parameters:
    ///   - object: Codable object to be saved.
    ///   - service: Service identifier.
    ///   - account: Account identifier.
    func saveCodable<T: Codable>(object: T, service: String, account: String) throws {
        let encoder = JSONEncoder()
        let data: Data
        do {
            data = try encoder.encode(object)
        } catch {
            throw KeychainError.encodingError
        }
        try save(data: data, service: service, account: account)
    }
    
    /// Retrieves a Codable object from the Keychain.
    /// - Parameters:
    ///   - service: Service identifier.
    ///   - account: Account identifier.
    ///   - type: Type of the Codable object to retrieve.
    /// - Returns: Decoded Codable object or nil if not found.
    func retrieveCodable<T: Codable>(service: String, account: String, type: T.Type) throws -> T? {
        guard let data = try retrieve(service: service, account: account) else {
            return nil
        }
        let decoder = JSONDecoder()
        do {
            let object = try decoder.decode(T.self, from: data)
            return object
        } catch {
            throw KeychainError.decodingError
        }
    }
}
