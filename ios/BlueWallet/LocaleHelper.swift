import Foundation

#if canImport(React_Codegen)
@objc(LocaleHelperModule)
class LocaleHelperModule: NSObject, NativeLocaleHelperSpec {
  static func moduleName() -> String! { "LocaleHelper" }
  static func requiresMainQueueSetup() -> Bool { false }

  @objc
  func setPreferredLanguage(_ locale: String) {
    UserDefaults.standard.set([locale], forKey: "AppleLanguages")
    UserDefaults.standard.synchronize()
  }

  @objc
  func getPreferredLanguage() -> String? {
    guard let languages = UserDefaults.standard.array(forKey: "AppleLanguages") as? [String],
          let first = languages.first else {
      return nil
    }
    return first
  }

  @objc
  func resetPreferredLanguage() {
    UserDefaults.standard.removeObject(forKey: "AppleLanguages")
    UserDefaults.standard.synchronize()
  }

  @objc
  func getLocales() -> [[String: Any]] {
    return Self.buildLocales()
  }

  @objc
  func getCurrencies() -> [String] {
    return Self.buildCurrencies()
  }

  // MARK: - Shared helpers

  static func buildLocales() -> [[String: Any]] {
    var result: [[String: Any]] = []
    for tag in Locale.preferredLanguages {
      let locale = Locale(identifier: tag)
      let languageCode = locale.language.languageCode?.identifier ?? ""
      let scriptCode = locale.language.script?.identifier
      let regionCode = locale.language.region?.identifier ?? locale.region?.identifier ?? ""
      let isRTL = Locale.Language(identifier: tag).characterDirection == .rightToLeft
      var entry: [String: Any] = [
        "languageCode": languageCode,
        "countryCode": regionCode,
        "languageTag": tag,
        "isRTL": isRTL,
      ]
      if let sc = scriptCode {
        entry["scriptCode"] = sc
      }
      result.append(entry)
    }
    return result
  }

  static func buildCurrencies() -> [String] {
    var seen = Set<String>()
    var currencies: [String] = []
    for tag in Locale.preferredLanguages {
      let locale = Locale(identifier: tag)
      if let code = locale.currency?.identifier, !seen.contains(code) {
        seen.insert(code)
        currencies.append(code)
      }
    }
    if currencies.isEmpty, let current = Locale.current.currency?.identifier {
      currencies.append(current)
    }
    return currencies
  }
}
#else
@objc(LocaleHelperModule)
class LocaleHelperModule: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc
  func setPreferredLanguage(_ locale: String) {
    UserDefaults.standard.set([locale], forKey: "AppleLanguages")
    UserDefaults.standard.synchronize()
  }

  @objc
  func getPreferredLanguage() -> String? {
    guard let languages = UserDefaults.standard.array(forKey: "AppleLanguages") as? [String],
          let first = languages.first else {
      return nil
    }
    return first
  }

  @objc
  func resetPreferredLanguage() {
    UserDefaults.standard.removeObject(forKey: "AppleLanguages")
    UserDefaults.standard.synchronize()
  }

  @objc
  func getLocales() -> [[String: Any]] {
    return LocaleHelperModule.buildLocales()
  }

  @objc
  func getCurrencies() -> [String] {
    return LocaleHelperModule.buildCurrencies()
  }
}
#endif
