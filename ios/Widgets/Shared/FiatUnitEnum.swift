
// Hardcoding values for simplicity; AppIntents are unnecessarily complex

import AppIntents

@available(iOS 16.0, *)
enum FiatUnitEnum: String, AppEnum, CaseIterable, Identifiable, Codable {
  
  var id: String { self.rawValue }

    case AED
    case ARS
    case AUD
    case AWG
    case BHD
    case BRL
    case CAD
    case CHF
    case CLP
    case CNY
    case COP
    case CZK
    case DKK
    case EUR
    case GBP
    case HRK
    case HUF
    case IDR
    case ILS
    case INR
    case IRR
    case IRT
    case ISK
    case JPY
    case KES
    case KRW
    case KWD
    case LBP
    case LKR
    case MXN
    case MYR
    case MZN
    case NGN
    case NOK
    case NZD
    case OMR
    case PHP
    case PLN
    case QAR
    case RON
    case RUB
    case SAR
    case SEK
    case SGD
    case THB
    case TRY
    case TWD
    case TZS
    case UAH
    case UGX
    case USD
    case UYU
    case VEF
    case VES
    case XAF
    case ZAR
    case GHS

    var code: String {
        return self.rawValue
    }

    var source: String {
        switch self {
        case .AED:
            return "CoinGecko"
        case .ARS:
            return "Yadio"
        case .AUD:
            return "CoinGecko"
        case .AWG:
            return "CoinDesk"
        case .BHD:
            return "CoinGecko"
        case .BRL:
            return "CoinGecko"
        case .CAD:
            return "CoinGecko"
        case .CHF:
            return "CoinGecko"
        case .CLP:
            return "Yadio"
        case .CNY:
            return "Coinbase"
        case .COP:
            return "CoinDesk"
        case .CZK:
            return "CoinGecko"
        case .DKK:
            return "CoinGecko"
        case .EUR:
            return "Kraken"
        case .GBP:
            return "Kraken"
        case .HRK:
            return "CoinDesk"
        case .HUF:
            return "CoinGecko"
        case .IDR:
            return "CoinGecko"
        case .ILS:
            return "CoinGecko"
        case .INR:
            return "coinpaprika"
        case .IRR:
            return "Exir"
        case .IRT:
            return "Exir"
        case .ISK:
            return "CoinDesk"
        case .JPY:
            return "CoinGecko"
        case .KES:
            return "CoinDesk"
        case .KRW:
            return "CoinGecko"
        case .KWD:
            return "CoinGecko"
        case .LBP:
            return "YadioConvert"
        case .LKR:
            return "CoinGecko"
        case .MXN:
            return "CoinGecko"
        case .MYR:
            return "CoinGecko"
        case .MZN:
            return "CoinDesk"
        case .NGN:
            return "CoinGecko"
        case .NOK:
            return "CoinGecko"
        case .NZD:
            return "CoinGecko"
        case .OMR:
            return "CoinDesk"
        case .PHP:
            return "CoinGecko"
        case .PLN:
            return "CoinGecko"
        case .QAR:
            return "CoinDesk"
        case .RON:
            return "BNR"
        case .RUB:
            return "CoinGecko"
        case .SAR:
            return "CoinGecko"
        case .SEK:
            return "CoinGecko"
        case .SGD:
            return "CoinGecko"
        case .THB:
            return "CoinGecko"
        case .TRY:
            return "CoinGecko"
        case .TWD:
            return "CoinGecko"
        case .TZS:
            return "CoinDesk"
        case .UAH:
            return "CoinGecko"
        case .UGX:
            return "CoinDesk"
        case .USD:
            return "Kraken"
        case .UYU:
            return "CoinDesk"
        case .VEF:
            return "CoinGecko"
        case .VES:
            return "Yadio"
        case .XAF:
            return "CoinDesk"
        case .ZAR:
            return "CoinGecko"
        case .GHS:
            return "CoinDesk"
        }
    }

    static var typeDisplayRepresentation: TypeDisplayRepresentation {
        TypeDisplayRepresentation(stringLiteral: "Currency")
    }

    static var caseDisplayRepresentations: [FiatUnitEnum: DisplayRepresentation] {
        return [
          .AED: DisplayRepresentation(stringLiteral: "United Arab Emirates (UAE Dirham)"),
            .ARS: DisplayRepresentation(stringLiteral: "Argentina (Argentine Peso)"),
            .AUD: DisplayRepresentation(stringLiteral: "Australia (Australian Dollar)"),
            .AWG: DisplayRepresentation(stringLiteral: "Aruba (Aruban Florin)"),
            .BHD: DisplayRepresentation(stringLiteral: "Bahrain (Bahraini Dinar)"),
            .BRL: DisplayRepresentation(stringLiteral: "Brazil (Brazilian Real)"),
            .CAD: DisplayRepresentation(stringLiteral: "Canada (Canadian Dollar)"),
            .CHF: DisplayRepresentation(stringLiteral: "Switzerland (Swiss Franc)"),
            .CLP: DisplayRepresentation(stringLiteral: "Chile (Chilean Peso)"),
            .CNY: DisplayRepresentation(stringLiteral: "China (Chinese Yuan)"),
            .COP: DisplayRepresentation(stringLiteral: "Colombia (Colombian Peso)"),
            .CZK: DisplayRepresentation(stringLiteral: "Czech Republic (Czech Koruna)"),
            .DKK: DisplayRepresentation(stringLiteral: "Denmark (Danish Krone)"),
            .EUR: DisplayRepresentation(stringLiteral: "European Union (Euro)"),
            .GBP: DisplayRepresentation(stringLiteral: "United Kingdom (British Pound)"),
            .HRK: DisplayRepresentation(stringLiteral: "Croatia (Croatian Kuna)"),
            .HUF: DisplayRepresentation(stringLiteral: "Hungary (Hungarian Forint)"),
            .IDR: DisplayRepresentation(stringLiteral: "Indonesia (Indonesian Rupiah)"),
            .ILS: DisplayRepresentation(stringLiteral: "Israel (Israeli New Shekel)"),
            .INR: DisplayRepresentation(stringLiteral: "India (Indian Rupee)"),
            .IRR: DisplayRepresentation(stringLiteral: "Iran (Iranian Rial)"),
            .IRT: DisplayRepresentation(stringLiteral: "Iran (Iranian Toman)"),
            .ISK: DisplayRepresentation(stringLiteral: "Iceland (Icelandic Króna)"),
            .JPY: DisplayRepresentation(stringLiteral: "Japan (Japanese Yen)"),
            .KES: DisplayRepresentation(stringLiteral: "Kenya (Kenyan Shilling)"),
            .KRW: DisplayRepresentation(stringLiteral: "South Korea (South Korean Won)"),
            .KWD: DisplayRepresentation(stringLiteral: "Kuwait (Kuwaiti Dinar)"),
            .LBP: DisplayRepresentation(stringLiteral: "Lebanon (Lebanese Pound)"),
            .LKR: DisplayRepresentation(stringLiteral: "Sri Lanka (Sri Lankan Rupee)"),
            .MXN: DisplayRepresentation(stringLiteral: "Mexico (Mexican Peso)"),
            .MYR: DisplayRepresentation(stringLiteral: "Malaysia (Malaysian Ringgit)"),
            .MZN: DisplayRepresentation(stringLiteral: "Mozambique (Mozambican Metical)"),
            .NGN: DisplayRepresentation(stringLiteral: "Nigeria (Nigerian Naira)"),
            .NOK: DisplayRepresentation(stringLiteral: "Norway (Norwegian Krone)"),
            .NZD: DisplayRepresentation(stringLiteral: "New Zealand (New Zealand Dollar)"),
            .OMR: DisplayRepresentation(stringLiteral: "Oman (Omani Rial)"),
            .PHP: DisplayRepresentation(stringLiteral: "Philippines (Philippine Peso)"),
            .PLN: DisplayRepresentation(stringLiteral: "Poland (Polish Zloty)"),
            .QAR: DisplayRepresentation(stringLiteral: "Qatar (Qatari Riyal)"),
            .RON: DisplayRepresentation(stringLiteral: "Romania (Romanian Leu)"),
            .RUB: DisplayRepresentation(stringLiteral: "Russia (Russian Ruble)"),
            .SAR: DisplayRepresentation(stringLiteral: "Saudi Arabia (Saudi Riyal)"),
            .SEK: DisplayRepresentation(stringLiteral: "Sweden (Swedish Krona)"),
            .SGD: DisplayRepresentation(stringLiteral: "Singapore (Singapore Dollar)"),
            .THB: DisplayRepresentation(stringLiteral: "Thailand (Thai Baht)"),
            .TRY: DisplayRepresentation(stringLiteral: "Turkey (Turkish Lira)"),
            .TWD: DisplayRepresentation(stringLiteral: "Taiwan (New Taiwan Dollar)"),
            .TZS: DisplayRepresentation(stringLiteral: "Tanzania (Tanzanian Shilling)"),
            .UAH: DisplayRepresentation(stringLiteral: "Ukraine (Ukrainian Hryvnia)"),
            .UGX: DisplayRepresentation(stringLiteral: "Uganda (Ugandan Shilling)"),
            .USD: DisplayRepresentation(stringLiteral: "United States of America (US Dollar)"),
            .UYU: DisplayRepresentation(stringLiteral: "Uruguay (Uruguayan Peso)"),
            .VEF: DisplayRepresentation(stringLiteral: "Venezuela (Venezuelan Bolívar Fuerte)"),
            .VES: DisplayRepresentation(stringLiteral: "Venezuela (Venezuelan Bolívar Soberano)"),
            .XAF: DisplayRepresentation(stringLiteral: "Central African Republic (Central African Franc)"),
            .ZAR: DisplayRepresentation(stringLiteral: "South Africa (South African Rand)"),
            .GHS: DisplayRepresentation(stringLiteral: "Ghana (Ghanaian Cedi)"),
        ]
    }
}

