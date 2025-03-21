import SwiftUI
import WatchKit

@main
struct BlueWatchApp: App {
    
    var body: some Scene {
        WindowGroup {
            NavigationView {
                ContentView()
            }
        }
    }
}

struct ContentView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "bitcoinsign.circle.fill")
                .font(.system(size: 40))
                .foregroundColor(.blue)
            
            Text("Blue Wallet")
                .font(.headline)
            
            Text("Welcome to your Bitcoin wallet")
                .font(.caption)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
            
            Button(action: {
                // Action placeholder for future functionality
                print("Button tapped")
            }) {
                Text("Get Started")
                    .fontWeight(.semibold)
            }
            .buttonStyle(.borderedProminent)
            .padding(.top, 8)
        }
        .padding()
    }
}
