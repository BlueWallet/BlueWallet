//
//  AppIntent.swift
//  LiveActivity
//
//  Created by Marcos Rodriguez on 9/1/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import WidgetKit
import AppIntents

struct ConfigurationAppIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Configuration"
    static var description = IntentDescription("This is an example widget.")

    // An example configurable parameter.
    @Parameter(title: "Favorite Emoji", default: "😃")
    var favoriteEmoji: String
}
