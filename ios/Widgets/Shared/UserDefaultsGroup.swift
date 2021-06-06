//
//  UserDefaultsGroup.swift
//  MarketWidgetExtension
//
//  Created by Marcos Rodriguez on 10/31/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import Foundation

struct UserDefaultsElectrumSettings {
  let host: String?
  let port: Int32?
  let sslPort: Int32?
}

let DefaultElectrumPeers = [UserDefaultsElectrumSettings(host: "electrum1.bluewallet.io", port: 50001, sslPort: 443),
                              UserDefaultsElectrumSettings(host: "electrum2.bluewallet.io", port: 50001, sslPort: 443),
                              UserDefaultsElectrumSettings(host: "electrum3.bluewallet.io", port: 50001, sslPort: 443)]

class UserDefaultsGroup {
  static private let suite = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)

  static func getElectrumSettings() -> UserDefaultsElectrumSettings {
    guard let electrumSettingsHost = suite?.string(forKey: UserDefaultsGroupKey.ElectrumSettingsHost.rawValue) else {
      return UserDefaultsElectrumSettings(host: "electrum1.bluewallet.io", port: 50001, sslPort: 443)
    }
    
    let electrumSettingsTCPPort = suite?.string(forKey: UserDefaultsGroupKey.ElectrumSettingsTCPPort.rawValue) ?? "50001"
    let electrumSettingsSSLPort = suite?.string(forKey: UserDefaultsGroupKey.ElectrumSettingsSSLPort.rawValue) ?? "443"
    
    let host = electrumSettingsHost
    let sslPort = Int32(electrumSettingsSSLPort)
    let port = Int32(electrumSettingsTCPPort)

    return UserDefaultsElectrumSettings(host: host, port: port, sslPort: sslPort)
  }
  
  static func getAllWalletsBalance() -> Double {
    guard let allWalletsBalance = suite?.string(forKey: UserDefaultsGroupKey.AllWalletsBalance.rawValue) else {
      return 0
    }

    return Double(allWalletsBalance) ?? 0
  }
  
  // Int: EPOCH value, Bool: Latest transaction is unconfirmed
  static func getAllWalletsLatestTransactionTime() -> LatestTransaction {
    guard let allWalletsTransactionTime = suite?.string(forKey: UserDefaultsGroupKey.AllWalletsLatestTransactionTime.rawValue) else {
      return LatestTransaction(isUnconfirmed: false, epochValue: 0)
    }
    
    if allWalletsTransactionTime == UserDefaultsGroupKey.LatestTransactionIsUnconfirmed.rawValue {
      return LatestTransaction(isUnconfirmed: true, epochValue: 0)
    } else {
      return LatestTransaction(isUnconfirmed: false, epochValue: Int(allWalletsTransactionTime))
    }
  }
  
}
