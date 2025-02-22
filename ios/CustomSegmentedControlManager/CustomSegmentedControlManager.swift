import UIKit
import React

@objc(CustomSegmentedControlManager)
class CustomSegmentedControlManager: RCTViewManager {
    override class func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func view() -> UIView! {
        // Explicitly use the designated initializer with a zero frame.
        return CustomSegmentedControl(frame: .zero)
    }
    
    @objc class func registerIfNecessary() {
        // Registration logic if needed.
    }
}

class CustomSegmentedControl: UISegmentedControl {
    var onChangeEvent: RCTDirectEventBlock?
    
    // Added convenience initializer.
    convenience init() {
        self.init(frame: .zero)
    }
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        addTarget(self, action: #selector(onChange), for: .valueChanged)
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        addTarget(self, action: #selector(onChange), for: .valueChanged)
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
    
    @objc func onChange() {
        onChangeEvent?(["selectedIndex": self.selectedSegmentIndex])
    }
}
