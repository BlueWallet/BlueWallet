import SwiftUI

struct NotificationView: View {
    var body: some View {
        Text("You have a new notification")
            .font(.headline)
    }
}

struct NotificationView_Previews: PreviewProvider {
    static var previews: some View {
        NotificationView()
    }
}
