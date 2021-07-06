//
//  ComplicationController.swift
//  T WatchKit Extension
//
//  Created by Marcos Rodriguez on 8/24/19.
//  Copyright © 2019 Marcos Rodriguez. All rights reserved.
//

import ClockKit


class ComplicationController: NSObject, CLKComplicationDataSource {
  
  // MARK: - Timeline Configuration
  
  func getSupportedTimeTravelDirections(for complication: CLKComplication, withHandler handler: @escaping (CLKComplicationTimeTravelDirections) -> Void) {
    handler([])
  }
  
  func getTimelineStartDate(for complication: CLKComplication, withHandler handler: @escaping (Date?) -> Void) {
    handler(nil)
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
    withHandler handler: @escaping (CLKComplicationTimelineEntry?) -> Void)
  {
    let marketData: WidgetDataStore? = UserDefaults.standard.codable(forKey: MarketData.string)
    let entry: CLKComplicationTimelineEntry
    let date: Date
    let valueLabel: String
    let valueSmallLabel: String
    let currencySymbol: String
    let timeLabel: String
    if let price = marketData?.formattedRateForComplication, let priceAbbreviated = marketData?.formattedRateForSmallComplication, let marketDatadata = marketData?.date, let lastUpdated = marketData?.formattedDate {
      date = marketDatadata
      valueLabel = price
      timeLabel = lastUpdated
      valueSmallLabel = priceAbbreviated
      if let preferredFiatCurrency = UserDefaults.standard.string(forKey: "preferredFiatCurrency"), let preferredFiatUnit = fiatUnit(currency: preferredFiatCurrency) {
        currencySymbol = preferredFiatUnit.symbol
      } else {
        currencySymbol = fiatUnit(currency: "USD")!.symbol
      }
    } else {
      valueLabel = "--"
      timeLabel = "--"
      valueSmallLabel = "--"
      currencySymbol = fiatUnit(currency: "USD")!.symbol
      date = Date()
    }
    
    let line2Text = CLKSimpleTextProvider(text:currencySymbol)
    let line1SmallText = CLKSimpleTextProvider(text: valueSmallLabel)
    
    switch complication.family {
    case .circularSmall:
      let template = CLKComplicationTemplateCircularSmallStackText()
      template.line1TextProvider = line1SmallText
      template.line2TextProvider = line2Text
      entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
      handler(entry)
    case .utilitarianSmallFlat:
      let template = CLKComplicationTemplateUtilitarianSmallFlat()
      if #available(watchOSApplicationExtension 6.0, *) {
        template.textProvider = CLKTextProvider(format: "%@%@", currencySymbol, valueSmallLabel)
      } else {
        handler(nil)
      }
      entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
      handler(entry)
      
    case .utilitarianSmall:
      let template = CLKComplicationTemplateUtilitarianSmallRingImage()
      template.imageProvider = CLKImageProvider(onePieceImage: UIImage(named: "Complication/Utilitarian")!)
      entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
      handler(entry)
    case .graphicCircular:
      if #available(watchOSApplicationExtension 6.0, *) {
        let template = CLKComplicationTemplateGraphicCircularStackText()
        template.line1TextProvider = line1SmallText
        template.line2TextProvider = line2Text
        entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
        handler(entry)
      } else {
        handler(nil)
      }
    case .modularSmall:
      let template = CLKComplicationTemplateModularSmallStackText()
      template.line1TextProvider = line1SmallText
      template.line2TextProvider = line2Text
      entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
      handler(entry)
    case .graphicCorner:
      let template = CLKComplicationTemplateGraphicCornerStackText()
      if #available(watchOSApplicationExtension 6.0, *) {
        template.outerTextProvider = CLKTextProvider(format: "%@", valueSmallLabel)
        template.innerTextProvider = CLKTextProvider(format: "%@", currencySymbol)
      } else {
        handler(nil)
      }
      entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
      handler(entry)
    case .graphicBezel:
      let template = CLKComplicationTemplateGraphicBezelCircularText()
      if #available(watchOSApplicationExtension 6.0, *) {
        template.textProvider = CLKTextProvider(format: "%@%@", currencySymbol, valueSmallLabel)
        let imageProvider = CLKFullColorImageProvider(fullColorImage: UIImage(named: "Complication/Graphic Bezel")!)
        let circularTemplate = CLKComplicationTemplateGraphicCircularImage()
        circularTemplate.imageProvider = imageProvider
        template.circularTemplate = circularTemplate
        entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
        handler(entry)
      } else {
        handler(nil)
      }
    case .utilitarianLarge:
      if #available(watchOSApplicationExtension 7.0, *) {
        let textProvider = CLKTextProvider(format: "%@%@", currencySymbol, valueLabel)
        let template = CLKComplicationTemplateUtilitarianLargeFlat(textProvider: textProvider)
        entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
        handler(entry)
      } else {
        handler(nil)
      }
    case .modularLarge:
      let template = CLKComplicationTemplateModularLargeStandardBody()
      if #available(watchOSApplicationExtension 6.0, *) {
        template.headerTextProvider =  CLKTextProvider(format: "Bitcoin Price")
        template.body1TextProvider = CLKTextProvider(format: "%@%@", currencySymbol, valueLabel)
        template.body2TextProvider = CLKTextProvider(format: "at %@", timeLabel)
        entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
        handler(entry)
      } else {
        handler(nil)
      }
    case .extraLarge:
      let template = CLKComplicationTemplateExtraLargeStackText()
      if #available(watchOSApplicationExtension 6.0, *) {
        template.line1TextProvider = CLKTextProvider(format: "%@%@", currencySymbol, valueLabel)
        template.line2TextProvider = CLKTextProvider(format: "at %@", timeLabel)
        entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
        handler(entry)
      } else {
        handler(nil)
      }
    case .graphicRectangular:
      let template = CLKComplicationTemplateGraphicRectangularStandardBody()
      if #available(watchOSApplicationExtension 6.0, *) {
        template.headerTextProvider =  CLKTextProvider(format: "Bitcoin Price")
        template.body1TextProvider = CLKTextProvider(format: "%@%@", currencySymbol, valueLabel)
        template.body2TextProvider = CLKTextProvider(format: "at %@", timeLabel)
        entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
        handler(entry)
      } else {
        handler(nil)
      }
    case .graphicExtraLarge:
      if #available(watchOSApplicationExtension 7.0, *) {
        let template = CLKComplicationTemplateGraphicExtraLargeCircularStackText()
        template.line1TextProvider = CLKTextProvider(format: "%@%@", currencySymbol, valueLabel)
        template.line1TextProvider = CLKTextProvider(format: "at %@", timeLabel)
        entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
        handler(entry)
      } else {
        handler(nil)
      }
    @unknown default:
      fatalError()
    }
  }
  
}

func getTimelineEntries(for complication: CLKComplication, before date: Date, limit: Int, withHandler handler: @escaping ([CLKComplicationTimelineEntry]?) -> Void) {
  // Call the handler with the timeline entries prior to the given date
  handler(nil)
}

func getTimelineEntries(for complication: CLKComplication, after date: Date, limit: Int, withHandler handler: @escaping ([CLKComplicationTimelineEntry]?) -> Void) {
  // Call the handler with the timeline entries after to the given date
  handler(nil)
}

// MARK: - Placeholder Templates

func getLocalizableSampleTemplate(for complication: CLKComplication, withHandler handler: @escaping (CLKComplicationTemplate?) -> Void) {
  // This method will be called once per supported complication, and the results will be cached
  let line1Text = CLKSimpleTextProvider(text:"46 K")
  let line2Text = CLKSimpleTextProvider(text:"$")
  let lineTimeText = CLKSimpleTextProvider(text:"3:40 PM")

  switch complication.family {
  case .circularSmall:
    let template = CLKComplicationTemplateCircularSmallStackText()
    template.line1TextProvider = line1Text
    template.line2TextProvider = line2Text
    handler(template)
  case .utilitarianSmallFlat:
    let template = CLKComplicationTemplateUtilitarianSmallFlat()
    if #available(watchOSApplicationExtension 6.0, *) {
      template.textProvider = CLKTextProvider(format: "%@", "$46,134")
    } else {
      handler(nil)
    }
    handler(template)
  case .utilitarianSmall:
    let template = CLKComplicationTemplateUtilitarianSmallRingImage()
    template.imageProvider = CLKImageProvider(onePieceImage: UIImage(named: "Complication/Utilitarian")!)
    handler(template)
  case .graphicCircular:
    if #available(watchOSApplicationExtension 6.0, *) {
      let template = CLKComplicationTemplateGraphicCircularStackText()
      template.line1TextProvider = line1Text
      template.line2TextProvider = line2Text
      handler(template)
    } else {
      handler(nil)
    }
  case .graphicCorner:
    let template = CLKComplicationTemplateGraphicCornerStackText()
    if #available(watchOSApplicationExtension 6.0, *) {
      template.outerTextProvider = CLKTextProvider(format: "46,134")
      template.innerTextProvider = CLKTextProvider(format: "$")
    } else {
      handler(nil)
    }
    handler(template)
  case .modularSmall:
    let template = CLKComplicationTemplateModularSmallStackText()
    template.line1TextProvider = line1Text
    template.line2TextProvider = line2Text
    handler(template)
  case .utilitarianLarge:
    if #available(watchOSApplicationExtension 7.0, *) {
      let textProvider = CLKTextProvider(format: "%@%@", "$", "46,000")
      let template = CLKComplicationTemplateUtilitarianLargeFlat(textProvider: textProvider)
      handler(template)
    } else {
      handler(nil)
    }
  case .graphicBezel:
    let template = CLKComplicationTemplateGraphicBezelCircularText()
    if #available(watchOSApplicationExtension 6.0, *) {
      template.textProvider = CLKTextProvider(format: "%@%@", "$S", "46,000")
      let imageProvider = CLKFullColorImageProvider(fullColorImage: UIImage(named: "Complication/Graphic Bezel")!)
      let circularTemplate = CLKComplicationTemplateGraphicCircularImage()
      circularTemplate.imageProvider = imageProvider
      template.circularTemplate = circularTemplate
      handler(template)
    } else {
      handler(nil)
    }
  case .modularLarge:
    let template = CLKComplicationTemplateModularLargeStandardBody()
    if #available(watchOSApplicationExtension 6.0, *) {
      template.headerTextProvider =  CLKTextProvider(format: "Bitcoin Price")
      template.body1TextProvider = CLKTextProvider(format: "%@%@", "$S", "46,000")
      template.body2TextProvider = lineTimeText
      handler(template)
    } else {
      handler(nil)
    }
  case .extraLarge:
    let template = CLKComplicationTemplateExtraLargeStackText()
    template.line1TextProvider = line1Text
    template.line2TextProvider = lineTimeText
    handler(template)
  case .graphicRectangular:
    let template = CLKComplicationTemplateGraphicRectangularStandardBody()
    if #available(watchOSApplicationExtension 6.0, *) {
      template.headerTextProvider =  CLKTextProvider(format: "Bitcoin Price")
      template.body1TextProvider = CLKTextProvider(format: "%@%@", "$S", "46,000")
      template.body2TextProvider = CLKTextProvider(format: "%@", Date().description)
      handler(template)
    } else {
      handler(nil)
    }
  case .graphicExtraLarge:
    if #available(watchOSApplicationExtension 7.0, *) {
      let template = CLKComplicationTemplateGraphicExtraLargeCircularStackText()
      template.line1TextProvider = line1Text
      template.line2TextProvider = line2Text
      handler(template)
    } else {
      handler(nil)
    }
  @unknown default:
    fatalError()
  }
}
