//
//  MarketView.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/3/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import SwiftUI
import WidgetKit

struct MarketView: View {

  var marketData: MarketData = emptyMarketData

    var body: some View {
      VStack(alignment: .leading, spacing:23 , content: {
        VStack(alignment: .leading, spacing: /*@START_MENU_TOKEN@*/nil/*@END_MENU_TOKEN@*/, content: {
          Text("Market").font(.headline).foregroundColor(.textColor).bold()
          Spacer()
          HStack(alignment: .center, spacing: 0, content: {
            Text("Next Block").bold().lineLimit(1).font(Font.system(size:11, weight: .medium, design: .default)).foregroundColor(.textColor)
            Spacer()
            Text(marketData.formattedNextBlock).padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4)).lineLimit(1).minimumScaleFactor(0.1).foregroundColor(.widgetBackground).font(Font.system(size:11, weight: .semibold, design: .default)).background(Color(red: 0.29, green: 0.86, blue: 0.73)).overlay(
              RoundedRectangle(cornerRadius: 4.0)
                .stroke(Color.containerGreen, lineWidth: 4.0))
          })

          Spacer()
          HStack(alignment: .center, spacing: 0, content: {
            Text("Sats/\(WidgetAPI.getUserPreferredCurrency())").bold().lineLimit(1).font(Font.system(size:11, weight: .medium, design: .default)).foregroundColor(.textColor)
            Spacer()
            Text(marketData.sats == "..." ? "..." : marketData.sats).padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4)).lineLimit(1).minimumScaleFactor(0.1).foregroundColor(.widgetBackground).font(Font.system(size:11, weight: .semibold, design: .default)).background(Color(red: 0.97, green: 0.21, blue: 0.38)).overlay(
              RoundedRectangle(cornerRadius: 4.0)
                .stroke(Color.containerRed, lineWidth: 4.0))
          })
          Spacer()
          HStack(alignment: .center, spacing: 0, content: {
            Text("Price").bold().lineLimit(1).font(Font.system(size:11, weight: . medium, design: .default)).foregroundColor(.textColor)
            Spacer()
            Text(marketData.price == "..." ? "..." : marketData.price).padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4)).lineLimit(1).minimumScaleFactor(0.1).foregroundColor(.widgetBackground).font(Font.system(size:11, weight: .semibold, design: .default)).background(Color(red: 0.29, green: 0.86, blue: 0.73)).overlay(
              RoundedRectangle(cornerRadius:4.0)
                .stroke(Color.containerGreen, lineWidth: 4.0))
          })
        })
      })
    }
}



struct MarketView_Previews: PreviewProvider {
    static var previews: some View {
      MarketView(marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 0))
        .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
