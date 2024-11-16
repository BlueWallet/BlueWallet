import ClockKit
import WatchConnectivity

class ComplicationController: NSObject, CLKComplicationDataSource {

    private let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)

    override init() {
        super.init()
        NotificationCenter.default.addObserver(self, selector: #selector(handleUpdateComplicationRequest), name: .didReceiveUpdateComplicationRequest, object: nil)
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - Notification Handling

    @objc private func handleUpdateComplicationRequest() {
        let server = CLKComplicationServer.sharedInstance()
        server.activeComplications?.forEach { complication in
            server.reloadTimeline(for: complication)
            print("[Complication] Reloaded complication for \(complication.family)")
        }
    }

    // MARK: - Timeline Configuration

    func getSupportedTimeTravelDirections(for complication: CLKComplication, withHandler handler: @escaping (CLKComplicationTimeTravelDirections) -> Void) {
        handler([])
    }

    func getTimelineStartDate(for complication: CLKComplication, withHandler handler: @escaping (Date?) -> Void) {
        handler(nil)
    }

    func complicationDescriptors() async -> [CLKComplicationDescriptor] {
        return [
            CLKComplicationDescriptor(
                identifier: "io.bluewallet.bluewallet",
                displayName: "Market Price",
                supportedFamilies: CLKComplicationFamily.allCases
            )
        ]
    }

    func getTimelineEndDate(for complication: CLKComplication, withHandler handler: @escaping (Date?) -> Void) {
        handler(nil)
    }

    func getPrivacyBehavior(for complication: CLKComplication, withHandler handler: @escaping (CLKComplicationPrivacyBehavior) -> Void) {
        handler(.showOnLockScreen)
    }

    // MARK: - Timeline Population

    func getCurrentTimelineEntry(for complication: CLKComplication, withHandler handler: @escaping (CLKComplicationTimelineEntry?) -> Void) {
        var marketData: WidgetDataStore? = groupUserDefaults?.codable(forKey: MarketData.string)
        let date: Date
        let valueLabel: String
        let valueSmallLabel: String
        let currencySymbol: String
        let timeLabel: String

        if let price = marketData?.formattedRateForComplication,
           let priceAbbreviated = marketData?.formattedRateForSmallComplication,
           var marketDataDate = marketData?.date,
           let lastUpdated = marketData?.formattedDate {
            date = marketDataDate
            valueLabel = price
            timeLabel = lastUpdated
            valueSmallLabel = priceAbbreviated
            if let preferredFiatCurrency = groupUserDefaults?.string(forKey: "preferredCurrency"),
               let preferredFiatUnit = try? FiatUnit(from: preferredFiatCurrency as! Decoder) {
                currencySymbol = preferredFiatUnit.symbol
            } else {
                currencySymbol = try! FiatUnit.fiatUnit(for: "USD")!.symbol
            }
        } else {
            valueLabel = "--"
            timeLabel = "--"
            valueSmallLabel = "--"
            currencySymbol = try! FiatUnit.fiatUnit(for: "USD")!.symbol
            date = Date()
        }

        let line2Text = CLKSimpleTextProvider(text: currencySymbol)
        let line1SmallText = CLKSimpleTextProvider(text: valueSmallLabel)

        // Use updated initializers for complications
        switch complication.family {
        case .circularSmall:
            let template = CLKComplicationTemplateCircularSmallStackText(line1TextProvider: line1SmallText, line2TextProvider: line2Text)
            let entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)
            
        case .utilitarianSmallFlat:
            let template = CLKComplicationTemplateUtilitarianSmallFlat(textProvider: CLKTextProvider(format: "%@%@", currencySymbol, valueSmallLabel))
            let entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)
            
        case .utilitarianSmall:
            let template = CLKComplicationTemplateUtilitarianSmallRingImage(imageProvider: CLKImageProvider(onePieceImage: UIImage(named: "Complication/Utilitarian")!), fillFraction: 0.7, ringStyle: .closed)
            let entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)
            
        case .graphicCircular:
            let template = CLKComplicationTemplateGraphicCircularStackText(line1TextProvider: line1SmallText, line2TextProvider: line2Text)
            let entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)
            
        case .modularSmall:
            let template = CLKComplicationTemplateModularSmallStackText(line1TextProvider: line1SmallText, line2TextProvider: line2Text)
            let entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)
            
        case .graphicCorner:
            let template = CLKComplicationTemplateGraphicCornerStackText(innerTextProvider: CLKTextProvider(format: "%@", currencySymbol), outerTextProvider: CLKTextProvider(format: "%@", valueSmallLabel))
            let entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)
            
        case .graphicBezel:
            let circularTemplate = CLKComplicationTemplateGraphicCircularImage(imageProvider: CLKFullColorImageProvider(fullColorImage: UIImage(named: "Complication/Graphic Bezel")!))
            let template = CLKComplicationTemplateGraphicBezelCircularText(circularTemplate: circularTemplate, textProvider: CLKTextProvider(format: "%@%@", currencySymbol, valueSmallLabel))
            let entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)
            
        case .utilitarianLarge:
            let template = CLKComplicationTemplateUtilitarianLargeFlat(textProvider: CLKTextProvider(format: "%@%@", currencySymbol, valueLabel))
            let entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)
            
        case .modularLarge:
            let template = CLKComplicationTemplateModularLargeStandardBody(headerTextProvider: CLKTextProvider(format: "Bitcoin Price"), body1TextProvider: CLKTextProvider(format: "%@%@", currencySymbol, valueLabel), body2TextProvider: CLKTextProvider(format: "at %@", timeLabel))
            let entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)
            
        case .extraLarge:
            let template = CLKComplicationTemplateExtraLargeStackText(line1TextProvider: CLKTextProvider(format: "%@%@", currencySymbol, valueLabel), line2TextProvider: CLKTextProvider(format: "at %@", timeLabel))
            let entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)
            
        case .graphicRectangular:
            let template = CLKComplicationTemplateGraphicRectangularStandardBody(headerTextProvider: CLKTextProvider(format: "Bitcoin Price"), body1TextProvider: CLKTextProvider(format: "%@%@", currencySymbol, valueLabel), body2TextProvider: CLKTextProvider(format: "at %@", timeLabel))
            let entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)
            
        case .graphicExtraLarge:
            let template = CLKComplicationTemplateGraphicExtraLargeCircularStackText(line1TextProvider: CLKTextProvider(format: "%@%@", currencySymbol, valueLabel), line2TextProvider: CLKTextProvider(format: "at %@", timeLabel))
            let entry = CLKComplicationTimelineEntry(date: date, complicationTemplate: template)
            handler(entry)
            
        @unknown default:
            fatalError("Unknown complication family")
        }
    }
  
    // MARK: - Placeholder Templates

    func getLocalizableSampleTemplate(for complication: CLKComplication, withHandler handler: @escaping (CLKComplicationTemplate?) -> Void) {
        let line1Text = CLKSimpleTextProvider(text: "46 K")
        let line2Text = CLKSimpleTextProvider(text: "$")
        let lineTimeText = CLKSimpleTextProvider(text: "3:40 PM")
        
        switch complication.family {
        case .circularSmall:
            let template = CLKComplicationTemplateCircularSmallStackText(line1TextProvider: line1Text, line2TextProvider: line2Text)
            handler(template)
            
        case .utilitarianSmallFlat:
            let template = CLKComplicationTemplateUtilitarianSmallFlat(textProvider: CLKTextProvider(format: "$46,134"))
            handler(template)
            
        case .modularSmall:
            let template = CLKComplicationTemplateModularSmallStackText(line1TextProvider: line1Text, line2TextProvider: line2Text)
            handler(template)
            
        case .graphicCircular:
            let template = CLKComplicationTemplateGraphicCircularStackText(line1TextProvider: line1Text, line2TextProvider: line2Text)
            handler(template)
            
        default:
            handler(nil)
        }
    }
}
