//
//  PriceView.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/8/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import SwiftUI
import WidgetKit

struct PriceView: View {
  
  var currentMarketData: MarketData? = emptyMarketData
  var previousMarketData: MarketData? = emptyMarketData
  
  var body: some View {
    VStack(alignment: .trailing, spacing: /*@START_MENU_TOKEN@*/nil/*@END_MENU_TOKEN@*/, content: {
      Text("Last Updated").font(Font.system(size: 11, weight: .regular, design: .default)).foregroundColor(.textColorLightGray)
      HStack(alignment: .lastTextBaseline, spacing: /*@START_MENU_TOKEN@*/nil/*@END_MENU_TOKEN@*/, content: {
        Text(currentMarketData?.formattedDate ?? "").lineLimit(1).foregroundColor(.textColor).font(Font.system(size:13, weight: .regular, design: .default)).minimumScaleFactor(0.01).transition(.opacity)
      })
      Spacer()
      VStack(alignment: .trailing, spacing: 16, content: {
        HStack(alignment: .lastTextBaseline, spacing: /*@START_MENU_TOKEN@*/nil/*@END_MENU_TOKEN@*/, content: {
          Text(currentMarketData?.price ?? "").lineLimit(1).foregroundColor(.textColor).font(Font.system(size:28, weight: .bold, design: .default)).minimumScaleFactor(0.01).transition(.opacity)
        })
        if let previousMarketDataPrice = previousMarketData?.price, let currentMarketDataRate = currentMarketData?.rate, let previousMarketDataRate = previousMarketData?.rate, previousMarketDataRate > 0, currentMarketDataRate != previousMarketDataRate {
          HStack(alignment: .lastTextBaseline, spacing: /*@START_MENU_TOKEN@*/nil/*@END_MENU_TOKEN@*/, content: {
            Image(systemName: currentMarketDataRate > previousMarketDataRate  ?  "arrow.up" : "arrow.down")
            Text("from").lineLimit(1).foregroundColor(.textColor).font(Font.system(size:13, weight: .regular, design: .default)).minimumScaleFactor(0.01)
            Text(previousMarketDataPrice).lineLimit(1).foregroundColor(.textColor).font(Font.system(size:13, weight: .regular, design: .default)).minimumScaleFactor(0.01)
          }).transition(.slide)
        }
      })
    }).frame(minWidth: 0,
             maxWidth: .infinity,
             minHeight: 0,
             maxHeight: .infinity,
             alignment: .trailing)
  }
}

struct PriceView_Previews: PreviewProvider {
  static var previews: some View {
    PriceView().previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}
