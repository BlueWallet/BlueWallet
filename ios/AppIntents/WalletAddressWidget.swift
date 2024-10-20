import WidgetKit
import SwiftUI
import AppIntents

@available(iOS 18.0, *)
struct WalletAddressControlWidget: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "WalletAddressControlWidget") {
            ControlWidgetButton(action: WalletAddressIntent()) {
                Image(systemName: "bitcoinsign.circle")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 40, height: 40)
            }
        }
    }
}
