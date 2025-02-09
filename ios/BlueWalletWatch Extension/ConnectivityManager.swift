import WatchConnectivity
import Foundation

class ConnectivityManager: NSObject, WCSessionDelegate {
    static let shared = ConnectivityManager()
    let session: WCSession

    private override init() {
        session = WCSession.default
        super.init()
        session.delegate = self
        session.activate()
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            print("WCSession activation failed: \(error.localizedDescription)")
        } else {
            print("WCSession activated with state: \(activationState.rawValue)")
        }
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        NotificationCenter.default.post(name: Notification.Name("ReceivedWCMessage"), object: message)
    }
    
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        NotificationCenter.default.post(name: Notification.Name("ReceivedWCAppContext"), object: applicationContext)
    }
    
    // New methods to satisfy WCSessionDelegate protocol:
    func sessionDidBecomeInactive(_ session: WCSession) {
        // Minimal implementation
    }
    
    func sessionDidDeactivate(_ session: WCSession) {
        // Minimal implementation; re-activate the session if needed
        session.activate()
    }
}
