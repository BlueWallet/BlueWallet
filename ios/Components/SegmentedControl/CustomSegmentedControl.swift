import UIKit
import React

@objc(CustomSegmentedControl)
class CustomSegmentedControl: UISegmentedControl {
    @objc var onChangeEvent: RCTDirectEventBlock?

    @objc var values: [String] = [] {
        didSet {
            removeAllSegments()
            for (index, title) in values.enumerated() {
                insertSegment(withTitle: title, at: index, animated: false)
            }
        }
    }

    @objc var selectedIndex: NSNumber = 0 {
        didSet {
            self.selectedSegmentIndex = selectedIndex.intValue
        }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        addTarget(self, action: #selector(onChange(_:)), for: .valueChanged)
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        addTarget(self, action: #selector(onChange(_:)), for: .valueChanged)
    }

    @objc func onChange(_ sender: UISegmentedControl) {
        onChangeEvent?(["selectedIndex": sender.selectedSegmentIndex])
    }
}

@objc(CustomSegmentedControlManager)
class CustomSegmentedControlManager: RCTViewManager {
    override func view() -> UIView! {
        return CustomSegmentedControl(frame: .zero)
    }

    override class func requiresMainQueueSetup() -> Bool {
        return true
    }
}
