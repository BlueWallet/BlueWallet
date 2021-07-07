//
//  UserDefaultsExtension.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 2/8/21.
//  Copyright © 2021 BlueWallet. All rights reserved.
//

import Foundation

extension UserDefaults {

func codable<Element: Codable>(forKey key: String) -> Element? {
        guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
        let element = try? PropertyListDecoder().decode(Element.self, from: data)
        return element
    }
}
