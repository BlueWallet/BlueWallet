//
//  PriceWidgetEntryView.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 10/27/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import SwiftUI

struct PriceWidgetEntryView: View {
    let entry: PriceWidgetEntry

    var body: some View {
        PriceView(entry: entry)
    }
}
