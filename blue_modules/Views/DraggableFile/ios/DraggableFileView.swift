import React
import UIKit
import UniformTypeIdentifiers
import LocalAuthentication

enum DragAndDropLog {
  static func debug(_ message: String) {
    #if DEBUG
    NSLog("[DragAndDrop] %@", message)
    #endif
  }
}

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
    DragAndDropLog.debug("Screen protection \(enabled ? "enabled" : "disabled")")
    resolve(true)
  }

  @objc func setFocusedDropConsumer(
    _ enabled: Bool,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    DragAndDropState.hasFocusedDropConsumer = enabled
    DragAndDropLog.debug("Focused consumer \(enabled ? "registered" : "removed")")
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
final class DraggableFileView: UIView, UIDragInteractionDelegate, UIDropInteractionDelegate {
  @objc var fileName = "export.dat"
  @objc var mimeType = "application/octet-stream"
  @objc var content = ""
  @objc var isBase64 = false
  @objc var captureViewAsImage = false
  @objc var dragEnabled = true
  @objc var dropEnabled = false
  @objc var exportOnDrag = false
  @objc var secureContentExport = false
  @objc var biometricEnabled = false
  @objc var authenticationPrompt = "Authenticate to export wallet"
  @objc var onFileDrop: RCTDirectEventBlock?
  @objc var onExportRequested: RCTDirectEventBlock?
  private var savedBorderColor: CGColor?
  private var savedBorderWidth: CGFloat = 0
  private var savedCornerRadius: CGFloat = 0

  override init(frame: CGRect) {
    super.init(frame: frame)
    configureInteractions()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    configureInteractions()
  }

  private func configureInteractions() {
    isUserInteractionEnabled = true
    let dragInteraction = UIDragInteraction(delegate: self)
    // UIDragInteraction isn't enabled by default on every supported device.
    // Keep the interaction enabled and let the delegate enforce app state.
    dragInteraction.isEnabled = true
    addInteraction(dragInteraction)
    addInteraction(UIDropInteraction(delegate: self))
  }

  func dragInteraction(_ interaction: UIDragInteraction, itemsForBeginning session: UIDragSession) -> [UIDragItem] {
    guard dragEnabled, !DragAndDropState.isScreenProtected else { return [] }
    if exportOnDrag {
      DragAndDropLog.debug("Wallet drag redirected to guarded export")
      onExportRequested?(["requested": true])
      return []
    }
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
    guard dragEnabled, !DragAndDropState.isScreenProtected else { return [] }
    if exportOnDrag {
      DragAndDropLog.debug("Multi-drag wallet request redirected to guarded export")
      onExportRequested?(["requested": true])
      return []
    }
    return makeDragItems()
  }

  func dragInteraction(_ interaction: UIDragInteraction, previewForLifting item: UIDragItem, session: UIDragSession) -> UITargetedDragPreview? {
    UITargetedDragPreview(view: self)
  }

  private func makeDragItems() -> [UIDragItem] {
    if secureContentExport {
      return makeSecureTextDragItems()
    }
    let contentType = UTType(mimeType: mimeType)
      ?? UTType(filenameExtension: URL(fileURLWithPath: fileName).pathExtension)
      ?? .data
    DragAndDropLog.debug("Prepared outbound item type=\(contentType.identifier)")
    let provider = NSItemProvider()

    // Register the native file promise first so it is the highest-fidelity
    // representation. Transferable/FileRepresentation consumers negotiate this
    // UTType directly rather than relying on a file-name inference.
    provider.registerFileRepresentation(
      forTypeIdentifier: contentType.identifier,
      fileOptions: [],
      visibility: .all
    ) { [weak self] completion in
      guard let self else {
        completion(nil, false, NSError(domain: "io.bluewallet.dragdrop", code: 3))
        return Self.completedProgress()
      }
      return self.fulfillExport { url, error in completion(url, false, error) }
    }

    // Text-aware destinations can consume JSON and text exports without first
    // materializing the promised file. The file representation remains preferred.
    if contentType.conforms(to: .text), let data = content.data(using: .utf8) {
      provider.registerDataRepresentation(forTypeIdentifier: UTType.utf8PlainText.identifier, visibility: .all) { completion in
        completion(data, nil)
        return Self.completedProgress()
      }
    }

    // Image-aware destinations can request the native image UTI without forcing
    // snapshot work until they actually consume the provider's promise.
    if contentType.conforms(to: .image) {
      provider.registerDataRepresentation(forTypeIdentifier: contentType.identifier, visibility: .all) { [weak self] completion in
        guard let self else {
          completion(nil, NSError(domain: "io.bluewallet.dragdrop", code: 4))
          return Self.completedProgress()
        }
        return self.fulfillExportData(completion)
      }
    }
    provider.suggestedName = URL(fileURLWithPath: fileName).lastPathComponent
    return [UIDragItem(itemProvider: provider)]
  }

  private func makeSecureTextDragItems() -> [UIDragItem] {
    let value = content
    let exportName = fileName
    let requiresAuthentication = biometricEnabled
    let prompt = authenticationPrompt
    let provider = NSItemProvider()
    let contentType = UTType(mimeType: mimeType) ?? .data
    provider.suggestedName = exportName
    provider.registerFileRepresentation(
      forTypeIdentifier: contentType.identifier,
      fileOptions: [],
      visibility: .all
    ) { completion in
      let provideFile = {
        guard let url = Self.createDeferredExportFile(name: exportName, value: value) else {
          completion(nil, false, NSError(domain: "io.bluewallet.dragdrop", code: 2))
          return
        }
        DragAndDropLog.debug("Authorized file export fulfilled type=\(contentType.identifier)")
        completion(url, false, nil)
      }
      guard requiresAuthentication else {
        provideFile()
        return Self.completedProgress()
      }
      let context = LAContext()
      context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: prompt) { success, error in
        if success {
          provideFile()
        } else {
          DragAndDropLog.debug("File export authentication cancelled or failed")
          completion(nil, false, error)
        }
      }
      return Progress(totalUnitCount: 1)
    }
    provider.registerDataRepresentation(forTypeIdentifier: contentType.identifier, visibility: .all) { completion in
      let provideText = {
        guard let data = value.data(using: .utf8) else {
          completion(nil, NSError(domain: "io.bluewallet.dragdrop", code: 1))
          return
        }
        DragAndDropLog.debug("Authorized export fulfilled type=\(contentType.identifier)")
        completion(data, nil)
      }
      guard requiresAuthentication else {
        provideText()
        return Self.completedProgress()
      }
      let context = LAContext()
      context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: prompt) { success, error in
        if success {
          provideText()
        } else {
          DragAndDropLog.debug("Export authentication cancelled or failed")
          completion(nil, error)
        }
      }
      return Progress(totalUnitCount: 1)
    }
    DragAndDropLog.debug("Prepared deferred export type=\(contentType.identifier)")
    return [UIDragItem(itemProvider: provider)]
  }

  private static func createDeferredExportFile(name: String, value: String) -> URL? {
    let safeName = URL(fileURLWithPath: name).lastPathComponent
    guard !safeName.isEmpty, let data = value.data(using: .utf8) else { return nil }
    let directory = FileManager.default.temporaryDirectory
      .appendingPathComponent("DragExports", isDirectory: true)
      .appendingPathComponent(UUID().uuidString, isDirectory: true)
    let url = directory.appendingPathComponent(safeName)
    do {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      try data.write(to: url, options: .atomic)
      return url
    } catch {
      DragAndDropLog.debug("Could not create deferred export file: \(error.localizedDescription)")
      return nil
    }
  }

  func dropInteraction(_ interaction: UIDropInteraction, canHandle session: UIDropSession) -> Bool {
    dropEnabled && !DragAndDropState.isScreenProtected && session.localDragSession == nil && session.hasItemsConforming(toTypeIdentifiers: [
      UTType.fileURL.identifier,
      UTType.url.identifier,
      UTType.image.identifier,
      UTType.text.identifier,
      UTType.data.identifier,
    ])
  }

  func dropInteraction(_ interaction: UIDropInteraction, sessionDidUpdate session: UIDropSession) -> UIDropProposal {
    UIDropProposal(operation: dropInteraction(interaction, canHandle: session) ? .copy : .forbidden)
  }

  func dropInteraction(_ interaction: UIDropInteraction, sessionDidEnter session: UIDropSession) {
    guard dropInteraction(interaction, canHandle: session) else { return }
    savedBorderColor = layer.borderColor
    savedBorderWidth = layer.borderWidth
    savedCornerRadius = layer.cornerRadius
    layer.borderColor = UIColor.systemBlue.cgColor
    layer.borderWidth = 3
    layer.cornerRadius = 6
  }

  func dropInteraction(_ interaction: UIDropInteraction, sessionDidExit session: UIDropSession) {
    restoreDropAppearance()
  }

  func dropInteraction(_ interaction: UIDropInteraction, sessionDidEnd session: UIDropSession) {
    restoreDropAppearance()
  }

  func dropInteraction(_ interaction: UIDropInteraction, performDrop session: UIDropSession) {
    guard dropInteraction(interaction, canHandle: session) else { return }
    restoreDropAppearance()
    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    DragAndDropLog.debug("Native target accepted \(session.items.count) item(s)")
    for item in session.items {
      loadDroppedItem(item.itemProvider)
    }
  }

  private func restoreDropAppearance() {
    layer.borderColor = savedBorderColor
    layer.borderWidth = savedBorderWidth
    layer.cornerRadius = savedCornerRadius
  }

  private func loadDroppedItem(_ provider: NSItemProvider) {
    if provider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier), provider.canLoadObject(ofClass: NSURL.self) {
      DragAndDropLog.debug("Loading inbound file URL representation")
      provider.loadObject(ofClass: NSURL.self) { [weak self] object, _ in
        guard let self, let nsURL = object as? NSURL else { return }
        let url = nsURL as URL
        let type = UTType(filenameExtension: url.pathExtension) ?? .data
        guard let copiedURL = copyDroppedFile(url, type: type) else { return }
        emitDroppedFile(copiedURL, mimeType: type.preferredMIMEType)
      }
      return
    }
    if let type = preferredFileRepresentation(for: provider) {
      DragAndDropLog.debug("Loading inbound file representation type=\(type.identifier)")
      provider.loadFileRepresentation(forTypeIdentifier: type.identifier) { [weak self] url, _ in
        guard let self, let url, let copiedURL = copyDroppedFile(url, type: type) else { return }
        emitDroppedFile(copiedURL, mimeType: type.preferredMIMEType)
      }
      return
    }
    if provider.canLoadObject(ofClass: NSString.self) {
      DragAndDropLog.debug("Loading inbound text representation")
      provider.loadObject(ofClass: NSString.self) { [weak self] object, _ in
        guard let text = object as? String else { return }
        DispatchQueue.main.async { self?.onFileDrop?(["text": text, "mimeType": "text/plain"]) }
      }
    }
  }

  private func preferredFileRepresentation(for provider: NSItemProvider) -> UTType? {
    let types = provider.registeredTypeIdentifiers.compactMap(UTType.init)
    return types.first { $0.conforms(to: .image) }
      ?? types.first { $0.conforms(to: .data) && !$0.conforms(to: .text) && !$0.conforms(to: .url) }
  }

  private func copyDroppedFile(_ url: URL, type: UTType) -> URL? {
    let didAccess = url.startAccessingSecurityScopedResource()
    defer {
      if didAccess { url.stopAccessingSecurityScopedResource() }
    }
    let fileExtension = url.pathExtension.isEmpty ? type.preferredFilenameExtension : url.pathExtension
    let destination = FileManager.default.temporaryDirectory
      .appendingPathComponent("DroppedItems", isDirectory: true)
      .appendingPathComponent("\(UUID().uuidString).\(fileExtension ?? "dat")")
    do {
      try FileManager.default.createDirectory(at: destination.deletingLastPathComponent(), withIntermediateDirectories: true)
      try FileManager.default.copyItem(at: url, to: destination)
      return destination
    } catch {
      DragAndDropLog.debug("Could not copy inbound item: \(error.localizedDescription)")
      return nil
    }
  }

  private func emitDroppedFile(_ url: URL, mimeType: String?) {
    DispatchQueue.main.async { [weak self] in
      guard !DragAndDropState.isScreenProtected else { return }
      self?.onFileDrop?(["uri": url.absoluteString, "mimeType": mimeType ?? ""])
    }
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

  private func fulfillExport(_ completion: @escaping (URL?, Error?) -> Void) -> Progress {
    let progress = Progress(totalUnitCount: 1)
    let work = { [weak self] in
      guard let self, let url = self.createExportFile() else {
        completion(nil, NSError(domain: "io.bluewallet.dragdrop", code: 5))
        return
      }
      progress.completedUnitCount = 1
      completion(url, nil)
    }
    if captureViewAsImage && !Thread.isMainThread {
      DispatchQueue.main.async(execute: work)
    } else {
      work()
    }
    return progress
  }

  private func fulfillExportData(_ completion: @escaping (Data?, Error?) -> Void) -> Progress {
    let progress = Progress(totalUnitCount: 1)
    let work = { [weak self] in
      guard let self else {
        completion(nil, NSError(domain: "io.bluewallet.dragdrop", code: 6))
        return
      }
      let data = self.captureViewAsImage
        ? self.snapshotPNG()
        : (self.isBase64 ? Data(base64Encoded: self.content) : self.content.data(using: .utf8))
      guard let data else {
        completion(nil, NSError(domain: "io.bluewallet.dragdrop", code: 7))
        return
      }
      progress.completedUnitCount = 1
      completion(data, nil)
    }
    if captureViewAsImage && !Thread.isMainThread {
      DispatchQueue.main.async(execute: work)
    } else {
      work()
    }
    return progress
  }

  private func snapshotPNG() -> Data? {
    guard bounds.width > 0, bounds.height > 0 else { return nil }
    return UIGraphicsImageRenderer(bounds: bounds).pngData { _ in
      drawHierarchy(in: bounds, afterScreenUpdates: false)
    }
  }
}
