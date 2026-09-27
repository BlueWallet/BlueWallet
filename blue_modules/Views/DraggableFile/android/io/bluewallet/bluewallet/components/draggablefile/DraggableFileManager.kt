package io.bluewallet.bluewallet.components.draggablefile

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp

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
}
