import ClockKit
import SwiftData

class ComplicationController: NSObject, CLKComplicationDataSource {

    private let groupUserDefaults = UserDefaults(suiteName: WatchDataKeys.donottrack.rawValue)

    func getSupportedTimeTravelDirections(for complication: CLKComplication, withHandler handler: @escaping (CLKComplicationTimeTravelDirections) -> Void) {
        handler([])
    }

    func getTimelineStartDate(for complication: CLKComplication, withHandler handler: @escaping (Date?) -> Void) {
        handler(nil)
    }

    @available(watchOSApplicationExtension 7.0, *)
    func complicationDescriptors() async -> [CLKComplicationDescriptor] {
        return [CLKComplicationDescriptor(
            identifier: "io.bluewallet.bluewallet",
            displayName: "Market Price",
            supportedFamilies: CLKComplicationFamily.allCases)]
    }

    func getTimelineEndDate(for complication: CLKComplication, withHandler handler: @escaping (Date?) -> Void) {
        handler(nil)
    }

    func getPrivacyBehavior(for complication: CLKComplication, withHandler handler: @escaping (CLKComplicationPrivacyBehavior) -> Void) {
        handler(.showOnLockScreen)
    }

    func getCurrentTimelineEntry(
        for complication: CLKComplication,
        withHandler handler: @escaping (CLKComplicationTimelineEntry?) -> Void
    ) {
      guard let group = groupUserDefaults, let marketData: MarketData = group.value(forKey: WatchDataKeys.preferredCurrency.rawValue) as? MarketData else {
            handler(nil)
            return
        }
        let entry: CLKComplicationTimelineEntry
        let date: Date
        let valueLabel: String
        let valueSmallLabel: String
        let currencySymbol: String
        let timeLabel: String

        if let price = marketData.formattedRateForComplication,
           let priceAbbreviated = marketData.formattedRateForSmallComplication,
           let marketDatadata = marketData.date,
           let lastUpdated = marketData.formattedDate {
            date = marketDatadata
            valueLabel = price
            timeLabel = lastUpdated
            valueSmallLabel = priceAbbreviated
            if let preferredFiatCurrency = groupUserDefaults?.string(forKey: WatchDataKeys.preferredCurrency.rawValue),
               let preferredFiatUnit = fiatUnit(currency: preferredFiatCurrency) {
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

        let line2Text = CLKSimpleTextProvider(text: currencySymbol)
        let line1SmallText = CLKSimpleTextProvider(text: valueSmallLabel)

        switch complication.family {
        case .circularSmall:
            let template = CLKComplicationTemplateCircularSmallStackText(
                line1TextProvider: line1SmallText,
                line2TextProvider: line2Text
            )
            entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)

        case .utilitarianSmallFlat:
            let template = CLKComplicationTemplateUtilitarianSmallFlat(
                textProvider: CLKTextProvider(format: "%@%@", currencySymbol, valueSmallLabel)
            )
            entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)

        case .utilitarianSmall:
            let template = CLKComplicationTemplateUtilitarianSmallRingImage(
                imageProvider: CLKImageProvider(onePieceImage: UIImage(named: "Complication/Utilitarian")!),
                fillFraction: 1.0,
                ringStyle: .closed
            )
            entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)

        case .graphicCircular:
            let template = CLKComplicationTemplateGraphicCircularStackText(
                line1TextProvider: line1SmallText,
                line2TextProvider: line2Text
            )
            entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)

        case .modularSmall:
            let template = CLKComplicationTemplateModularSmallStackText(
                line1TextProvider: line1SmallText,
                line2TextProvider: line2Text
            )
            entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)

        case .graphicCorner:
            let template = CLKComplicationTemplateGraphicCornerStackText(
                innerTextProvider: CLKTextProvider(format: "%@", currencySymbol),
                outerTextProvider: CLKTextProvider(format: "%@", valueSmallLabel)
            )
            entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)

        case .graphicBezel:
            let circularTemplate = CLKComplicationTemplateGraphicCircularImage(
                imageProvider: CLKFullColorImageProvider(fullColorImage: UIImage(named: "Complication/Graphic Bezel")!)
            )
            let template = CLKComplicationTemplateGraphicBezelCircularText(
                circularTemplate: circularTemplate,
                textProvider: CLKTextProvider(format: "%@%@", currencySymbol, valueSmallLabel)
            )
            entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)

        case .utilitarianLarge:
            let template = CLKComplicationTemplateUtilitarianLargeFlat(
                textProvider: CLKTextProvider(format: "%@%@", currencySymbol, valueLabel)
            )
            entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)

        case .modularLarge:
            let template = CLKComplicationTemplateModularLargeStandardBody(
                headerTextProvider: CLKTextProvider(format: "Bitcoin Price"),
                body1TextProvider: CLKTextProvider(format: "%@%@", currencySymbol, valueLabel),
                body2TextProvider: CLKTextProvider(format: "at %@", timeLabel)
            )
            entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)

        case .extraLarge:
            let template = CLKComplicationTemplateExtraLargeStackText(
                line1TextProvider: line1SmallText,
                line2TextProvider: CLKTextProvider(format: "at %@", timeLabel)
            )
            entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)

        case .graphicRectangular:
            let template = CLKComplicationTemplateGraphicRectangularStandardBody(
                headerTextProvider: CLKTextProvider(format: "Bitcoin Price"),
                body1TextProvider: CLKTextProvider(format: "%@%@", currencySymbol, valueLabel),
                body2TextProvider: CLKTextProvider(format: "at %@", timeLabel)
            )
            entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)

        case .graphicExtraLarge:
            let template = CLKComplicationTemplateGraphicExtraLargeCircularStackText(
                line1TextProvider: CLKTextProvider(format: "%@%@", currencySymbol, valueLabel),
                line2TextProvider: CLKTextProvider(format: "at %@", timeLabel)
            )
            entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)

        @unknown default:
            fatalError()
        }
    }

    func getTimelineEntries(
        for complication: CLKComplication,
        before date: Date,
        limit: Int,
        withHandler handler: @escaping ([CLKComplicationTimelineEntry]?) -> Void
    ) {
        handler(nil)
    }

    func getTimelineEntries(
        for complication: CLKComplication,
        after date: Date,
        limit: Int,
        withHandler handler: @escaping ([CLKComplicationTimelineEntry]?) -> Void
    ) {
        handler(nil)
    }

    func getLocalizableSampleTemplate(
        for complication: CLKComplication,
        withHandler handler: @escaping (CLKComplicationTemplate?) -> Void
    ) {
        let line1Text = CLKSimpleTextProvider(text: "46 K")
        let line2Text = CLKSimpleTextProvider(text: "$")
        let lineTimeText = CLKSimpleTextProvider(text: "3:40 PM")

        switch complication.family {
        case .circularSmall:
            let template = CLKComplicationTemplateCircularSmallStackText(
                line1TextProvider: line1Text,
                line2TextProvider: line2Text
            )
            handler(template)

        case .utilitarianSmallFlat:
            let template = CLKComplicationTemplateUtilitarianSmallFlat(
                textProvider: CLKTextProvider(format: "%@", "$46,134")
            )
            handler(template)

        case .utilitarianSmall:
            let template = CLKComplicationTemplateUtilitarianSmallRingImage(
                imageProvider: CLKImageProvider(onePieceImage: UIImage(named: "Complication/Utilitarian")!),
                fillFraction: 1.0,
                ringStyle: .closed
            )
            handler(template)

        case .graphicCircular:
            let template = CLKComplicationTemplateGraphicCircularStackText(
                line1TextProvider: line1Text,
                line2TextProvider: line2Text
            )
            handler(template)

        case .graphicCorner:
            let template = CLKComplicationTemplateGraphicCornerStackText(
                innerTextProvider: CLKTextProvider(format: "%@", line2Text.text),
                outerTextProvider: CLKTextProvider(format: "%@", line1Text.text)
            )
            handler(template)

        case .modularSmall:
            let template = CLKComplicationTemplateModularSmallStackText(
                line1TextProvider: line1Text,
                line2TextProvider: line2Text
            )
            handler(template)

        case .utilitarianLarge:
            let template = CLKComplicationTemplateUtilitarianLargeFlat(
                textProvider: CLKTextProvider(format: "%@%@", "$", "46,000")
            )
            handler(template)

        case .graphicBezel:
            let circularTemplate = CLKComplicationTemplateGraphicCircularImage(
                imageProvider: CLKFullColorImageProvider(fullColorImage: UIImage(named: "Complication/Graphic Bezel")!)
            )
            let template = CLKComplicationTemplateGraphicBezelCircularText(
                circularTemplate: circularTemplate,
                textProvider: CLKTextProvider(format: "%@%@", "$S", "46,000")
            )
            handler(template)

        case .modularLarge:
            let template = CLKComplicationTemplateModularLargeStandardBody(
                headerTextProvider: CLKTextProvider(format: "Bitcoin Price"),
                body1TextProvider: CLKTextProvider(format: "%@%@", "$S", "46,000"),
                body2TextProvider: lineTimeText
            )
            handler(template)

        case .extraLarge:
            let template = CLKComplicationTemplateExtraLargeStackText(
                line1TextProvider: line1Text,
                line2TextProvider: lineTimeText
            )
            handler(template)

        case .graphicRectangular:
            let template = CLKComplicationTemplateGraphicRectangularStandardBody(
                headerTextProvider: CLKTextProvider(format: "Bitcoin Price"),
                body1TextProvider: CLKTextProvider(format: "%@%@", "$S", "46,000"),
                body2TextProvider: CLKTextProvider(format: "%@", Date().description)
            )
            handler(template)

        case .graphicExtraLarge:
            let template = CLKComplicationTemplateGraphicExtraLargeCircularStackText(
                line1TextProvider: line1Text,
                line2TextProvider: line2Text
            )
            handler(template)

        @unknown default:
            fatalError()
        }
    }
}
