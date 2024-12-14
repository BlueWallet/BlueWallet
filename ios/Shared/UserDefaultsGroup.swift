//
//  UserDefaultsGroup.swift
//  MarketWidgetExtension
//
//  Created by Marcos Rodriguez on 10/31/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import Foundation

struct UserDefaultsElectrumSettings {
    var host: String?
    var port: UInt16?
    var sslPort: UInt16?
}

let hardcodedPeers = DefaultElectrumPeers.map { settings in
    (
        host: settings.host ?? "", 
        port: settings.sslPort ?? settings.port ?? 50001, 
        useSSL: settings.sslPort != nil
    )
}

let DefaultElectrumPeers = [
 UserDefaultsElectrumSettings(host: "mainnet.foundationdevices.com", port: 50001, sslPort: 50002),
    // UserDefaultsElectrumSettings(host: "electrum.jochen-hoenicke.de", port: 50001, sslPort: 50006),
    UserDefaultsElectrumSettings(host: "electrum1.bluewallet.io", port: 50001, sslPort: 443),
    UserDefaultsElectrumSettings(host: "electrum.acinq.co", port: 50001, sslPort: 50002),
    UserDefaultsElectrumSettings(host: "electrum.bitaroo.net", port: 50001, sslPort: 50002),
]

class UserDefaultsGroup {
    static private let suite = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)

    static func getElectrumSettings() -> UserDefaultsElectrumSettings {
        guard let electrumSettingsHost = suite?.string(forKey: UserDefaultsGroupKey.ElectrumSettingsHost.rawValue) else {
            return DefaultElectrumPeers.randomElement() ?? UserDefaultsElectrumSettings()
        }

        let electrumSettingsTCPPort = suite?.integer(forKey: UserDefaultsGroupKey.ElectrumSettingsTCPPort.rawValue) ?? 50001
        let electrumSettingsSSLPort = suite?.integer(forKey: UserDefaultsGroupKey.ElectrumSettingsSSLPort.rawValue) ?? 443

        let host = electrumSettingsHost
        let sslPort = UInt16(electrumSettingsSSLPort)
        let port = UInt16(electrumSettingsTCPPort)

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
            return LatestTransaction(isUnconfirmed: false, epochValue: Int(allWalletsTransactionTime) ?? 0)
        }
    }
}
