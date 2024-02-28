//
//  Widgets.swift
//  Widgets
//
//  Created by Marcos Rodriguez on 6/6/21.
//  Copyright © 2021 BlueWallet. All rights reserved.
//

import WidgetKit
import SwiftUI

@main
struct Widgets: WidgetBundle {
    @WidgetBundleBuilder
    var body: some Widget {
        PriceWidget()
        WalletInformationWidget()
        MarketWidget()
        WalletInformationAndMarketWidget()
    }
}

extension WidgetConfiguration
{
    func contentMarginsDisabledIfAvailable() -> some WidgetConfiguration
    {
        if #available(iOSApplicationExtension 17.0, *)
        {
            return self.contentMarginsDisabled()
        }
        else
        {
            return self
        }
    }
}
