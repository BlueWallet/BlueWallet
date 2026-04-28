import UIKit
import React

@objc(SegmentedControlView)
final class SegmentedControlView: UIView {

  private let segmentedControl = UISegmentedControl()

  // MARK: - Lifecycle

  override init(frame: CGRect) {
    super.init(frame: frame)
    setup()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setup()
  }

  private func setup() {
    segmentedControl.addTarget(self, action: #selector(handleValueChanged(_:)), for: .valueChanged)
    addSubview(segmentedControl)
    segmentedControl.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      segmentedControl.leadingAnchor.constraint(equalTo: leadingAnchor),
      segmentedControl.trailingAnchor.constraint(equalTo: trailingAnchor),
      segmentedControl.topAnchor.constraint(equalTo: topAnchor),
      segmentedControl.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }

  // MARK: - Prop setters

  @objc var values: NSArray = [] {
    didSet { rebuildSegments() }
  }

  @objc var selectedIndex: Int = 0 {
    didSet {
      guard segmentedControl.numberOfSegments > 0 else { return }
      let clamped = min(max(selectedIndex, 0), segmentedControl.numberOfSegments - 1)
      if segmentedControl.selectedSegmentIndex != clamped {
        segmentedControl.selectedSegmentIndex = clamped
      }
    }
  }

  @objc var enabled: Bool = true {
    didSet { segmentedControl.isEnabled = enabled }
  }

  @objc var momentary: Bool = false {
    didSet { segmentedControl.isMomentary = momentary }
  }

  @objc var textColor: UIColor? {
    didSet { applyTextAttributes() }
  }

  @objc var onChange: RCTBubblingEventBlock?

  override var tintColor: UIColor! {
    didSet { segmentedControl.selectedSegmentTintColor = tintColor }
  }

  override var backgroundColor: UIColor? {
    didSet { segmentedControl.backgroundColor = backgroundColor }
  }

  // MARK: - Private helpers

  private func rebuildSegments() {
    let titles = values as? [String] ?? []
    segmentedControl.removeAllSegments()
    for (i, title) in titles.enumerated() {
      segmentedControl.insertSegment(withTitle: title, at: i, animated: false)
    }
    guard !titles.isEmpty else { return }
    let clamped = min(max(selectedIndex, 0), titles.count - 1)
    segmentedControl.selectedSegmentIndex = clamped
  }

  private func applyTextAttributes() {
    if let color = textColor {
      segmentedControl.setTitleTextAttributes([.foregroundColor: color], for: .normal)
      segmentedControl.setTitleTextAttributes([.foregroundColor: UIColor.white], for: .selected)
    } else {
      segmentedControl.setTitleTextAttributes(nil, for: .normal)
      segmentedControl.setTitleTextAttributes(nil, for: .selected)
    }
  }

  @objc private func handleValueChanged(_ sender: UISegmentedControl) {
    onChange?(["selectedIndex": sender.selectedSegmentIndex])
  }
}

