import UIKit
import React

class CustomSegmentedControl: UISegmentedControl {
    @objc var onChangeEvent: RCTDirectEventBlock?
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        addTarget(self, action: #selector(onChange(_:)), for: .valueChanged)
    }
    
    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        addTarget(self, action: #selector(onChange(_:)), for: .valueChanged)
    }
    
    @objc func setValues(_ values: [String]) {
        removeAllSegments()
        for (index, title) in values.enumerated() {
            insertSegment(withTitle: title, at: index, animated: false)
        }
    }
    
    @objc func setSelectedIndex(_ selectedIndex: NSNumber) {
        self.selectedSegmentIndex = selectedIndex.intValue
    }
    
    @objc func onChange(_ sender: UISegmentedControl) {
        onChangeEvent?(["selectedIndex": sender.selectedSegmentIndex])
    }
}

@objc(CustomSegmentedControlManager)
class CustomSegmentedControlManager: RCTViewManager {
    static var isRegistered = false
    
    override func view() -> UIView! {
        // Ensure native module is registered before returning the view.
        CustomSegmentedControlManager.registerIfNecessary()
        return CustomSegmentedControl(frame: .zero)
    }
    
    @objc static func registerIfNecessary() {
        if !isRegistered {
            isRegistered = true
        }
    }
    
    // Changed from static to instance method.
    override func constantsToExport() -> [AnyHashable: Any]! {
        return [
            "bubblingEventTypes": [
                "onChangeEvent": [
                    "phasedRegistrationNames": [
                        "bubbled": "onChangeEvent",
                        "captured": "onChangeEventCapture"
                    ]
                ]
            ]
        ]
    }

    override class func moduleName() -> String! {
        return "CustomSegmentedControl"
    }
    
    override class func requiresMainQueueSetup() -> Bool {
        return true
    }
}
