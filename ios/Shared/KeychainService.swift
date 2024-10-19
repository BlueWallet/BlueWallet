import Security
import Foundation

class KeychainService {
    static let shared = KeychainService()
    private let accessGroup = "A7W54YZ4WU.group.io.bluewallet.bluewallet"

    private init() {}

    func fetchQRCodeData() -> (label: String, address: String)? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "receivebitcoin",
            kSecAttrAccessGroup as String: accessGroup,
            kSecReturnAttributes as String: true,
            kSecReturnData as String: true
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        if status == errSecSuccess, let existingItem = item as? [String: Any],
           let data = existingItem[kSecValueData as String] as? Data,
           let qrDataString = String(data: data, encoding: .utf8) {
            
            let components = qrDataString.split(separator: ",").map { String($0).removingPercentEncoding ?? String($0) }
            if components.count >= 2 {
                return (label: components[1], address: components[0])
            }
        }
        return nil
    }

    func saveQRCodeData(label: String, address: String) -> Result<Bool, Error> {
        let qrDataString = "\(address.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) ?? ""),\(label.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) ?? "")"
        guard let qrData = qrDataString.data(using: .utf8) else { return .failure(KeychainError.invalidData) }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "receivebitcoin",
            kSecAttrAccessGroup as String: accessGroup,
            kSecValueData as String: qrData
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        if status == errSecSuccess {
            return .success(true)
        } else {
            return .failure(KeychainError.unableToSave(status))
        }
    }

    func deleteQRCodeData() -> Result<Bool, Error> {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "receivebitcoin",
            kSecAttrAccessGroup as String: accessGroup
        ]

        let status = SecItemDelete(query as CFDictionary)
        if status == errSecSuccess {
            return .success(true)
        } else {
            return .failure(KeychainError.unableToDelete(status))
        }
    }
}

enum KeychainError: Error {
    case invalidData
    case unableToSave(OSStatus)
    case unableToDelete(OSStatus)

    var localizedDescription: String {
        switch self {
        case .invalidData:
            return "The data is invalid or corrupted."
        case .unableToSave(let status):
            return "Unable to save data to the Keychain. Status code: \(status)"
        case .unableToDelete(let status):
            return "Unable to delete data from the Keychain. Status code: \(status)"
        }
    }
}
