import SwiftUI

struct NumericKeypadView: View {
    @State private var amount: [String] = ["0"]
    var keyPadType: NumericKeypadType = .BTC

    var body: some View {
        VStack {
            Text(title)
                .font(.largeTitle)
            HStack {
                Button("1", action: { append(value: "1") })
                Button("2", action: { append(value: "2") })
                Button("3", action: { append(value: "3") })
            }
            HStack {
                Button("4", action: { append(value: "4") })
                Button("5", action: { append(value: "5") })
                Button("6", action: { append(value: "6") })
            }
            HStack {
                Button("7", action: { append(value: "7") })
                Button("8", action: { append(value: "8") })
                Button("9", action: { append(value: "9") })
            }
            HStack {
                Button(".", action: { append(value: ".") }).disabled(keyPadType == .SATS)
                Button("0", action: { append(value: "0") })
                Button("<", action: { amount.removeLast() })
            }
        }
    }

    private var title: String {
        var title = ""
        for amount in self.amount {
            let isValid = Double(amount)
            if amount == "." || isValid != nil {
                title.append(String(amount))
            }
        }
        return "< \(title.isEmpty ? "0" : title) \(keyPadType.rawValue)"
    }

    private func append(value: String) {
        guard amount.filter({$0 != "."}).count <= 9 && !(amount.contains(".") && value == ".") else {
            return
        }
        switch keyPadType {
        case .SATS:
            if amount.first == "0" {
                if value == "0" {
                    return
                }
                amount[0] = value
            } else {
                amount.append(value)
            }
        case .BTC:
            if amount.isEmpty {
                if (value == "0") {
                    amount.append("0")
                } else if value == "." && !amount.contains(".") {
                    amount.append("0")
                    amount.append(".")
                } else {
                    amount.append(value)
                }
            } else if let first = amount.first, first == "0" {
                if amount.count > 1, amount[1] != "." {
                    amount.insert(".", at: 1)
                } else if amount.count == 1, amount.first == "0" && value != "." {
                    amount.append(".")
                    amount.append(value)
                } else {
                    amount.append(value)
                }
            } else {
                amount.append(value)
            }
        }
    }
}

struct NumericKeypadView_Previews: PreviewProvider {
    static var previews: some View {
        NumericKeypadView(keyPadType: .BTC)
    }
}

enum NumericKeypadType: String {
    case BTC = "BTC"
    case SATS = "sats"
}
