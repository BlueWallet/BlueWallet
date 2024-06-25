//
//  Colors.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/1/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import SwiftUI

extension Color {
  
  init(hex: String) {
      let scanner = Scanner(string: hex)
      scanner.currentIndex = hex.index(hex.startIndex, offsetBy: 1)
      var rgbValue: UInt64 = 0
      scanner.scanHexInt64(&rgbValue)

      let red = Double((rgbValue & 0xff0000) >> 16) / 255.0
      let green = Double((rgbValue & 0x00ff00) >> 8) / 255.0
      let blue = Double(rgbValue & 0x0000ff) / 255.0

      self.init(red: red, green: green, blue: blue)
  }
  
  static let textColor = Color("TextColor")
  static let textColorLightGray = Color(red: 0.6, green: 0.63, blue: 0.67)
  static let widgetBackground = Color("WidgetBackground")
  static let containerGreen = Color("ContainerGreen")
  static let containerRed = Color("ContainerRed")
}
