package io.bluewallet.bluewallet

import android.content.Context
import android.net.ConnectivityManager
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

private const val ELECTRUM_DISCOVERY_DURATION_MS = 6_000L
private val ELECTRUM_SERVICE_TYPES = listOf("_electrum._tcp.", "_electrums._tcp.")

@ReactModule(name = WidgetHelperModule.NAME)
class WidgetHelperModule(private val context: ReactApplicationContext) : NativeWidgetHelperSpec(context) {
    companion object {
        const val NAME = "WidgetHelper"
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var activeDiscovery: ElectrumNsdDiscovery? = null

    override fun getName() = NAME

    @ReactMethod
    override fun reloadAllWidgets() {
        AppWidgetUtils.refreshAllWidgets(context)
    }

    @ReactMethod
    override fun requestLocalNetworkPermission(promise: Promise) {
        // Android does not require a runtime permission for NSD on the app's current target SDK.
        promise.resolve("granted")
    }

    @ReactMethod
    override fun discoverElectrumServers(promise: Promise) {
        mainHandler.post {
            if (activeDiscovery != null) {
                promise.reject("electrum_discovery_busy", "Electrum server discovery is already running.")
                return@post
            }

            try {
                val discovery = ElectrumNsdDiscovery(context, mainHandler, ::emitDiscoveredServer) { result ->
                    activeDiscovery = null
                    result.fold(
                        onSuccess = { promise.resolve(it.toString()) },
                        onFailure = { promise.reject("electrum_discovery_failed", it.message, it) },
                    )
                }
                activeDiscovery = discovery
                discovery.start()
            } catch (error: Exception) {
                activeDiscovery = null
                promise.reject("electrum_discovery_failed", error.message, error)
            }
        }
    }

    override fun invalidate() {
        mainHandler.post {
            activeDiscovery?.cancel()
            activeDiscovery = null
        }
        super.invalidate()
    }

    private fun emitDiscoveredServer(host: String, port: Int, ssl: Boolean) {
        try {
            val payload = Arguments.createMap().apply {
                putString("host", host)
                putInt("port", port)
                putBoolean("ssl", ssl)
            }
            context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onElectrumServerDiscovered", payload)
        } catch (_: Exception) {
            // Discovery must continue if React is tearing down or has no listener.
        }
    }
}

private class ElectrumNsdDiscovery(
    context: Context,
    private val handler: Handler,
    private val discoveredHandler: (String, Int, Boolean) -> Unit,
    private val completion: (Result<JSONArray>) -> Unit,
) {
    private val applicationContext = context.applicationContext
    private val nsdManager = applicationContext.getSystemService(Context.NSD_SERVICE) as? NsdManager
        ?: throw IllegalStateException("Network service discovery is unavailable.")
    private var multicastLock: WifiManager.MulticastLock? = null
    private var lanScanner: ElectrumLanPortScanner? = null
    private val listeners = mutableListOf<NsdManager.DiscoveryListener>()
    private val startedListeners = mutableSetOf<NsdManager.DiscoveryListener>()
    private val servers = linkedMapOf<String, JSONObject>()
    private val pendingServices = ArrayDeque<Pair<NsdServiceInfo, Boolean>>()
    private val pendingServiceKeys = mutableSetOf<String>()
    private val finished = AtomicBoolean(false)
    private var isResolving = false
    private val finishRunnable = Runnable { finish() }

    fun start() {
        handler.post {
            try {
                val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                multicastLock = wifiManager?.createMulticastLock("BlueWalletElectrumDiscovery")?.apply { setReferenceCounted(false) }
                multicastLock?.acquire()
                ELECTRUM_SERVICE_TYPES.forEach(::startSearch)
                lanScanner = ElectrumLanPortScanner(applicationContext, handler) { host, port, ssl ->
                    if (!finished.get()) {
                        val key = "$host:$port:$ssl"
                        servers[key] = JSONObject()
                            .put("name", host)
                            .put("host", host)
                            .put("port", port)
                            .put("ssl", ssl)
                        discoveredHandler(host, port, ssl)
                    }
                }.also { it.start() }
                handler.postDelayed(finishRunnable, ELECTRUM_DISCOVERY_DURATION_MS)
            } catch (error: Exception) {
                fail(error)
            }
        }
    }

    fun cancel() {
        handler.post { finish(resolve = false) }
    }

    private fun startSearch(serviceType: String) {
        val listener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(regType: String) {
                startedListeners += this
            }

            override fun onServiceFound(service: NsdServiceInfo) {
                if (finished.get()) return
                try {
                    val ssl = serviceType.contains("electrums")
                    val key = "${service.serviceName}:${service.serviceType}:$ssl"
                    if (pendingServiceKeys.size < 1_000 && pendingServiceKeys.add(key)) {
                        pendingServices.addLast(service to ssl)
                        resolveNext()
                    }
                } catch (_: Exception) {
                    // Ignore malformed framework service records and continue discovery.
                }
            }

            override fun onServiceLost(service: NsdServiceInfo) = Unit

            override fun onDiscoveryStopped(serviceType: String) {
                startedListeners -= this
            }

            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                // NSD is only one source. The private-LAN port scan can still
                // discover IP-based nodes when Bonjour is unavailable.
            }

            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {
                startedListeners -= this
            }
        }
        listeners += listener
        nsdManager.discoverServices(serviceType, NsdManager.PROTOCOL_DNS_SD, listener)
    }

    @Suppress("DEPRECATION")
    private fun resolveNext() {
        if (isResolving || finished.get()) return
        val (service, ssl) = pendingServices.removeFirstOrNull() ?: return
        isResolving = true
        try {
            nsdManager.resolveService(service, object : NsdManager.ResolveListener {
                override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                    isResolving = false
                    resolveNext()
                }

                override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
                    try {
                        if (!finished.get()) {
                            val address = serviceInfo.host?.hostAddress
                            if (address != null && !address.contains(':') && serviceInfo.port in 1..65_535) {
                                val key = "$address:${serviceInfo.port}:$ssl"
                                servers[key] = JSONObject()
                                    .put("name", serviceInfo.serviceName)
                                    .put("host", address)
                                    .put("port", serviceInfo.port)
                                    .put("ssl", ssl)
                                discoveredHandler(address, serviceInfo.port, ssl)
                            }
                        }
                    } catch (_: Exception) {
                        // Ignore a malformed resolution and continue with the queue.
                    } finally {
                        isResolving = false
                        resolveNext()
                    }
                }
            })
        } catch (_: Exception) {
            isResolving = false
            resolveNext()
        }
    }

    private fun fail(error: Throwable) {
        if (!finished.compareAndSet(false, true)) return
        cleanUp()
        completion(Result.failure(error))
    }

    private fun finish(resolve: Boolean = true) {
        if (!finished.compareAndSet(false, true)) return
        cleanUp()
        if (resolve) completion(Result.success(JSONArray(servers.values)))
    }

    private fun cleanUp() {
        handler.removeCallbacks(finishRunnable)
        lanScanner?.cancel()
        lanScanner = null
        startedListeners.toList().forEach { listener ->
            try {
                nsdManager.stopServiceDiscovery(listener)
            } catch (_: Exception) {
                // The framework may already have stopped a failed search.
            }
        }
        startedListeners.clear()
        pendingServices.clear()
        pendingServiceKeys.clear()
        try {
            if (multicastLock?.isHeld == true) multicastLock?.release()
        } catch (_: Exception) {
            // Cleanup must never crash the app or prevent promise settlement.
        } finally {
            multicastLock = null
        }
    }
}

/**
 * Checks the active private IPv4 /24 for common Electrum TCP endpoints. An
 * open socket is only a candidate; JavaScript requires a server.version and
 * ping handshake before showing it to the user.
 */
private class ElectrumLanPortScanner(
    private val context: Context,
    private val handler: Handler,
    private val resultHandler: (String, Int, Boolean) -> Unit,
) {
    private val cancelled = AtomicBoolean(false)
    private val executor = Executors.newFixedThreadPool(24)

    fun start() {
        val localAddress = findPrivateIPv4Address() ?: return
        val parts = localAddress.hostAddress?.split('.') ?: return
        if (parts.size != 4) return
        val prefix = parts.take(3).joinToString(".")
        val localSuffix = parts[3].toIntOrNull()
        val endpoints = listOf(50001 to false, 50002 to true, 443 to true)
        for (suffix in 1..254) {
            if (suffix == localSuffix) continue
            val host = "$prefix.$suffix"
            for ((port, ssl) in endpoints) {
                executor.execute {
                    if (cancelled.get()) return@execute
                    try {
                        Socket().use { socket ->
                            socket.connect(InetSocketAddress(host, port), 350)
                            if (!cancelled.get()) handler.post { if (!cancelled.get()) resultHandler(host, port, ssl) }
                        }
                    } catch (_: Exception) {
                        // Closed and unreachable ports are expected during discovery.
                    }
                }
            }
        }
    }

    fun cancel() {
        if (!cancelled.compareAndSet(false, true)) return
        executor.shutdownNow()
    }

    private fun findPrivateIPv4Address(): Inet4Address? {
        return try {
            val manager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return null
            val activeNetwork = manager.activeNetwork ?: return null
            manager.getLinkProperties(activeNetwork)?.linkAddresses?.asSequence()
                .orEmpty()
                .mapNotNull { it.address as? Inet4Address }
                .firstOrNull { address -> !address.isLoopbackAddress && address.isSiteLocalAddress }
        } catch (_: Exception) {
            null
        }
    }
}
