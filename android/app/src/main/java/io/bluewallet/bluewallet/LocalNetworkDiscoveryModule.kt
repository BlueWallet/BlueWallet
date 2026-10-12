package io.bluewallet.bluewallet

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.facebook.react.module.annotations.ReactModule
import java.util.concurrent.atomic.AtomicInteger

@ReactModule(name = LocalNetworkDiscoveryModule.NAME)
class LocalNetworkDiscoveryModule(reactContext: ReactApplicationContext) : NativeLocalNetworkDiscoverySpec(reactContext), PermissionListener {
    companion object {
        const val NAME = "LocalNetworkDiscovery"
        private const val PERMISSION_REQUEST = 8142
        private const val SCAN_DURATION_MS = 5_000L
    }

    private var pendingPromise: Promise? = null

    @ReactMethod
    override fun discoverElectrumServers(promise: Promise) {
        if (pendingPromise != null) {
            promise.reject("SCAN_IN_PROGRESS", "A local network scan is already in progress.")
            return
        }
        pendingPromise = promise

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            reactApplicationContext.checkSelfPermission(Manifest.permission.NEARBY_WIFI_DEVICES) != PackageManager.PERMISSION_GRANTED
        ) {
            val activity = currentActivity as? PermissionAwareActivity
            if (activity == null) {
                finishWithError("PERMISSION_UNAVAILABLE", "The local network permission cannot be requested right now.")
                return
            }
            activity.requestPermissions(arrayOf(Manifest.permission.NEARBY_WIFI_DEVICES), PERMISSION_REQUEST, this)
            return
        }
        startDiscovery()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray): Boolean {
        if (requestCode != PERMISSION_REQUEST) return false
        if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) startDiscovery()
        else finishWithError("PERMISSION_DENIED", "Local network access was not allowed.")
        return true
    }

    private fun startDiscovery() {
        val manager = reactApplicationContext.getSystemService(Context.NSD_SERVICE) as NsdManager
        val results = linkedMapOf<String, Triple<String, Int, Boolean>>()
        val listeners = mutableListOf<NsdManager.DiscoveryListener>()
        val activeScans = AtomicInteger(2)

        fun finishScan() {
            if (activeScans.decrementAndGet() > 0) return
            val array = Arguments.createArray()
            results.values.forEach { (host, port, ssl) ->
                array.pushMap(Arguments.createMap().apply {
                    putString("host", host)
                    putInt("port", port)
                    putBoolean("ssl", ssl)
                })
            }
            pendingPromise?.resolve(array)
            pendingPromise = null
        }

        listOf("_electrum._tcp." to false, "_electrums._tcp." to true).forEach { (serviceType, ssl) ->
            val listener = object : NsdManager.DiscoveryListener {
                override fun onDiscoveryStarted(regType: String) = Unit
                override fun onServiceFound(service: NsdServiceInfo) {
                    manager.resolveService(service, object : NsdManager.ResolveListener {
                        override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) = Unit
                        override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
                            val host = serviceInfo.host?.hostName ?: serviceInfo.host?.hostAddress ?: return
                            val key = "$host:${serviceInfo.port}:$ssl"
                            results[key] = Triple(host, serviceInfo.port, ssl)
                        }
                    })
                }
                override fun onServiceLost(service: NsdServiceInfo) = Unit
                override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                    try { manager.stopServiceDiscovery(this) } catch (_: Exception) { }
                    finishScan()
                }
                override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) = finishScan()
                override fun onDiscoveryStopped(serviceType: String) = finishScan()
            }
            listeners.add(listener)
            manager.discoverServices(serviceType, NsdManager.PROTOCOL_DNS_SD, listener)
        }

        Handler(Looper.getMainLooper()).postDelayed({
            listeners.forEach { listener ->
                try { manager.stopServiceDiscovery(listener) } catch (_: Exception) { finishScan() }
            }
        }, SCAN_DURATION_MS)
    }

    private fun finishWithError(code: String, message: String) {
        pendingPromise?.reject(code, message)
        pendingPromise = null
    }
}
