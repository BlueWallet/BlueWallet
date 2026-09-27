import React
import UIKit
import UniformTypeIdentifiers

@objcMembers
final class DragAndDropState: NSObject {
  static var isScreenProtected = false
  static var hasFocusedDropConsumer = false
}

@objc(DragAndDropModule)
final class DragAndDropModule: RCTEventEmitter {
  private static weak var current: DragAndDropModule?

  @objc override static func requiresMainQueueSetup() -> Bool { true }

  override init() {
    super.init()
    DragAndDropModule.current = self
  }

  override func supportedEvents() -> [String]! { ["onFileDrop"] }

  @objc func setScreenProtectEnabled(
    _ enabled: Bool,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    DragAndDropState.isScreenProtected = enabled
    resolve(true)
  }

  @objc func setFocusedDropConsumer(
    _ enabled: Bool,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    DragAndDropState.hasFocusedDropConsumer = enabled
    resolve(true)
  }

  static func emitFileDrop(_ value: String, mimeType: String?) {
    current?.sendEvent(withName: "onFileDrop", body: ["uri": value, "mimeType": mimeType ?? ""])
  }

  static func emitTextDrop(_ value: String) {
    current?.sendEvent(withName: "onFileDrop", body: ["text": value, "mimeType": UTType.utf8PlainText.preferredMIMEType ?? "text/plain"])
  }
}

@objc(DraggableFileView)
final class DraggableFileView: UIView, UIDragInteractionDelegate {
  @objc var fileName = "export.dat"
  @objc var mimeType = "application/octet-stream"
  @objc var content = ""
  @objc var isBase64 = false
  @objc var captureViewAsImage = false

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = true
    addInteraction(UIDragInteraction(delegate: self))
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    isUserInteractionEnabled = true
    addInteraction(UIDragInteraction(delegate: self))
  }

  func dragInteraction(_ interaction: UIDragInteraction, itemsForBeginning session: UIDragSession) -> [UIDragItem] {
    guard !DragAndDropState.isScreenProtected else { return [] }
    return makeDragItems()
  }

  // UIKit invokes this when the user taps another draggable item while a drag
  // is active. Returning this view's item enables the system multi-drag model
  // without maintaining selection state in JavaScript.
  func dragInteraction(
    _ interaction: UIDragInteraction,
    itemsForAddingTo session: UIDragSession,
    withTouchAt point: CGPoint
  ) -> [UIDragItem] {
    guard !DragAndDropState.isScreenProtected else { return [] }
    return makeDragItems()
  }

  func dragInteraction(_ interaction: UIDragInteraction, previewForLifting item: UIDragItem, session: UIDragSession) -> UITargetedDragPreview? {
    UITargetedDragPreview(view: self)
  }

  private func makeDragItems() -> [UIDragItem] {
    guard let fileURL = createExportFile() else { return [] }
    let contentType = UTType(mimeType: mimeType)
      ?? UTType(filenameExtension: fileURL.pathExtension)
      ?? .data
    let provider = NSItemProvider()

    // Register the native file promise first so it is the highest-fidelity
    // representation. Transferable/FileRepresentation consumers negotiate this
    // UTType directly rather than relying on a file-name inference.
    provider.registerFileRepresentation(
      forTypeIdentifier: contentType.identifier,
      fileOptions: [],
      visibility: .all
    ) { completion in
      completion(fileURL, false, nil)
      return Self.completedProgress()
    }

    // Text-aware destinations can consume JSON and text exports without first
    // materializing the promised file. The file representation remains preferred.
    if contentType.conforms(to: .text), let data = try? Data(contentsOf: fileURL) {
      provider.registerDataRepresentation(forTypeIdentifier: UTType.utf8PlainText.identifier, visibility: .all) { completion in
        completion(data, nil)
        return Self.completedProgress()
      }
    }

    // Image-aware destinations (including SwiftUI Transferable Image consumers)
    // receive the native image representation as a standards-compatible fallback.
    if contentType.conforms(to: .image), let image = UIImage(contentsOfFile: fileURL.path) {
      provider.registerObject(image, visibility: .all)
    }
    provider.suggestedName = fileURL.lastPathComponent
    let item = UIDragItem(itemProvider: provider)
    item.localObject = fileURL
    return [item]
  }

  private static func completedProgress() -> Progress {
    let progress = Progress(totalUnitCount: 1)
    progress.completedUnitCount = 1
    return progress
  }

  private func createExportFile() -> URL? {
    let safeName = URL(fileURLWithPath: fileName).lastPathComponent
    guard !safeName.isEmpty else { return nil }
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent("DragExports", isDirectory: true)
    let url = directory.appendingPathComponent(safeName)
    let data = captureViewAsImage ? snapshotPNG() : (isBase64 ? Data(base64Encoded: content) : content.data(using: .utf8))
    guard let data else { return nil }
    do {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      try data.write(to: url, options: .atomic)
      return url
    } catch {
      NSLog("[DragAndDrop] Could not create export file: %@", error.localizedDescription)
      return nil
    }
  }

  private func snapshotPNG() -> Data? {
    guard bounds.width > 0, bounds.height > 0 else { return nil }
    return UIGraphicsImageRenderer(bounds: bounds).pngData { _ in
      drawHierarchy(in: bounds, afterScreenUpdates: false)
    }
  }
}
