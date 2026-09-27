package io.bluewallet.bluewallet.components.draggablefile

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.bridge.ReadableArray

@ReactModule(name = DraggableFileManager.REACT_CLASS)
class DraggableFileManager : ViewGroupManager<DraggableFile>() {
    companion object { const val REACT_CLASS = "DraggableFile" }

    override fun getName() = REACT_CLASS
    override fun createViewInstance(reactContext: ThemedReactContext) = DraggableFile(reactContext)

    @ReactProp(name = "fileName")
    fun setFileName(view: DraggableFile, value: String?) { view.fileName = value ?: "export.dat" }

    @ReactProp(name = "mimeType")
    fun setMimeType(view: DraggableFile, value: String?) { view.mimeType = value ?: "application/octet-stream" }

    @ReactProp(name = "content")
    fun setContent(view: DraggableFile, value: String?) { view.content = value ?: "" }

    @ReactProp(name = "isBase64", defaultBoolean = false)
    fun setIsBase64(view: DraggableFile, value: Boolean) { view.isBase64 = value }

    @ReactProp(name = "captureViewAsImage", defaultBoolean = false)
    fun setCaptureViewAsImage(view: DraggableFile, value: Boolean) { view.captureViewAsImage = value }

    @ReactProp(name = "dragEnabled", defaultBoolean = true)
    fun setDragEnabled(view: DraggableFile, value: Boolean) { view.dragEnabled = value }

    @ReactProp(name = "dropEnabled", defaultBoolean = false)
    fun setDropEnabled(view: DraggableFile, value: Boolean) { view.dropEnabled = value }

    @ReactProp(name = "exportOnDrag", defaultBoolean = false)
    fun setExportOnDrag(view: DraggableFile, value: Boolean) { view.exportOnDrag = value }

    @ReactProp(name = "secureTextExport", defaultBoolean = false)
    fun setSecureTextExport(view: DraggableFile, value: Boolean) { view.secureTextExport = value }

    @ReactProp(name = "biometricEnabled", defaultBoolean = false)
    fun setBiometricEnabled(view: DraggableFile, value: Boolean) = Unit

    @ReactProp(name = "authenticationPrompt")
    fun setAuthenticationPrompt(view: DraggableFile, value: String?) = Unit

    override fun receiveCommand(root: DraggableFile, commandId: String, args: ReadableArray?) {
        when (commandId) {
            "startAuthorizedDrag" -> root.startAuthorizedDrag()
            else -> super.receiveCommand(root, commandId, args)
        }
    }

    override fun getExportedCustomDirectEventTypeConstants() = mapOf(
        "onFileDrop" to mapOf("registrationName" to "onFileDrop"),
        "onExportRequested" to mapOf("registrationName" to "onExportRequested"),
    )
}
