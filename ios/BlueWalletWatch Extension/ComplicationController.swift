//
//  ComplicationController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 8/24/19.
//

import ClockKit

class ComplicationController: NSObject, CLKComplicationDataSource {
  
  private let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
  
  // MARK: - Timeline Configuration
  
  func getSupportedTimeTravelDirections(for complication: CLKComplication, withHandler handler: @escaping (CLKComplicationTimeTravelDirections) -> Void) {
    handler([])
  }
  
  func getTimelineStartDate(for complication: CLKComplication, withHandler handler: @escaping (Date?) -> Void) {
    handler(nil)
  }

  func complicationDescriptors() async -> [CLKComplicationDescriptor] {
    return [CLKComplicationDescriptor(
      identifier: "io.bluewallet.bluewallet",
      displayName: "Market Price",
      supportedFamilies: CLKComplicationFamily.allCases
    )]
  }
  
  func getTimelineEndDate(for complication: CLKComplication, withHandler handler: @escaping (Date?) -> Void) {
    handler(nil)
  }
  
  func getPrivacyBehavior(for complication: CLKComplication, withHandler handler: @escaping (CLKComplicationPrivacyBehavior) -> Void) {
    handler(.showOnLockScreen)
  }
  
  // MARK: - Timeline Population
  
  func getCurrentTimelineEntry(
    for complication: CLKComplication,
    withHandler handler: @escaping (CLKComplicationTimelineEntry?) -> Void
  ) {
    // Load market data from user defaults
    guard let marketData: WidgetDataStore = groupUserDefaults?.codable(forKey: MarketData.string) else {
      handler(nil)
      return
    }
    
    let date = marketData.date ?? Date()
    let valueLabel = marketData.formattedRateForComplication ?? "--"
    let valueSmallLabel = marketData.formattedRateForSmallComplication ?? "--"
    let currencySymbol = groupUserDefaults?.string(forKey: "preferredCurrency")
      .flatMap { fiatUnit(currency: $0)?.symbol } ?? fiatUnit(currency: "USD")!.symbol
    let timeLabel = marketData.formattedDate ?? "--"
    
    let entry: CLKComplicationTimelineEntry
    
    // Handle different complication families
    switch complication.family {
    case .circularSmall:
      let template = CLKComplicationTemplateCircularSmallStackText(
        line1TextProvider: CLKSimpleTextProvider(text: valueSmallLabel),
        line2TextProvider: CLKSimpleTextProvider(text: currencySymbol)
      )
      entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
      
    case .utilitarianSmallFlat:
      let template = CLKComplicationTemplateUtilitarianSmallFlat(
        textProvider: CLKTextProvider(format: "%@%@", currencySymbol, valueSmallLabel)
      )
      entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
      
    case .graphicCircular:
      let template = CLKComplicationTemplateGraphicCircularStackText(
        line1TextProvider: CLKSimpleTextProvider(text: valueSmallLabel),
        line2TextProvider: CLKSimpleTextProvider(text: currencySymbol)
      )
      entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
      
    case .modularSmall:
      let template = CLKComplicationTemplateModularSmallStackText(
        line1TextProvider: CLKSimpleTextProvider(text: valueSmallLabel),
        line2TextProvider: CLKSimpleTextProvider(text: currencySymbol)
      )
      entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
      
    case .graphicCorner:
      let template = CLKComplicationTemplateGraphicCornerStackText(
        innerTextProvider: CLKSimpleTextProvider(text: valueSmallLabel),  // Inner text first
        outerTextProvider: CLKSimpleTextProvider(text: currencySymbol)    // Outer text second
      )
      entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
      
    default:
      handler(nil)
      return
    }
    
    handler(entry)
  }
  
  // MARK: - Timeline Entries

  func getTimelineEntries(for complication: CLKComplication, before date: Date, limit: Int, withHandler handler: @escaping ([CLKComplicationTimelineEntry]?) -> Void) {
    handler(nil)
  }

  func getTimelineEntries(for complication: CLKComplication, after date: Date, limit: Int, withHandler handler: @escaping ([CLKComplicationTimelineEntry]?) -> Void) {
    handler(nil)
  }

  // MARK: - Placeholder Templates

  func getLocalizableSampleTemplate(for complication: CLKComplication, withHandler handler: @escaping (CLKComplicationTemplate?) -> Void) {
    let line1Text = CLKSimpleTextProvider(text: "46 K")
    let line2Text = CLKSimpleTextProvider(text: "$")
    
    // Provide sample template for different complication families
    switch complication.family {
    case .circularSmall:
      let template = CLKComplicationTemplateCircularSmallStackText(
        line1TextProvider: line1Text,
        line2TextProvider: line2Text
      )
      handler(template)
      
    case .utilitarianSmallFlat:
      let template = CLKComplicationTemplateUtilitarianSmallFlat(
        textProvider: CLKTextProvider(format: "$46,134")
      )
      handler(template)
      
    case .modularSmall:
      let template = CLKComplicationTemplateModularSmallStackText(
        line1TextProvider: line1Text,
        line2TextProvider: line2Text
      )
      handler(template)
      
    default:
      handler(nil)
    }
  }
}
