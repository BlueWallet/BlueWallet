import Security
import Foundation

class KeychainService {
    static let shared = KeychainService()
    private let accessGroup = "group.io.bluewallet.bluewallet"

    private init() {}

  func fetchQRCodeData() -> (label: String, address: String)? {
      let query: [String: Any] = [
          kSecClass as String: kSecClassGenericPassword,
          kSecAttrService as String: "io.bluewallet.bluewallet.receivebitcoin",
          kSecAttrAccessGroup as String: accessGroup,
          kSecReturnAttributes as String: true,
          kSecReturnData as String: true
      ]

      var item: CFTypeRef?
      let status = SecItemCopyMatching(query as CFDictionary, &item)

      if status == errSecSuccess, let existingItem = item as? [String: Any],
         let data = existingItem[kSecValueData as String] as? Data,
         let qrDataString = String(data: data, encoding: .utf8) {
          let components = qrDataString.split(separator: ",")
          if components.count >= 2 {
              return (label: String(components[0]), address: String(components[1]))
          }
      } else {
          print("Keychain query failed with status: \(status)")
      }
      return nil
  }
  func saveQRCodeData(label: String, address: String) -> Result<Bool, Error> {
      let qrDataString = "\(label),\(address)"
      guard let qrData = qrDataString.data(using: .utf8) else {
          print("Failed to encode data")
          return .failure(KeychainError.invalidData)
      }

      let query: [String: Any] = [
          kSecClass as String: kSecClassGenericPassword,
          kSecAttrService as String: "io.bluewallet.bluewallet.receivebitcoin",
          kSecAttrAccessGroup as String: accessGroup,
          kSecValueData as String: qrData
      ]

      let status = SecItemAdd(query as CFDictionary, nil)
      if status == errSecSuccess {
          print("Data saved successfully.")
          return .success(true)
      } else {
          print("Failed to save data with status: \(status)")
          return .failure(KeychainError.unableToSave(status))
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
