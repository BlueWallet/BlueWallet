import WatchKit
import SwiftUI

class NotificationHostingController: WKHostingController<NotificationView> {
    override var body: NotificationView {
        return NotificationView()
    }
}
