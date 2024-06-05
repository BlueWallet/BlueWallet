package io.bluewallet.bluewallet.tor

import android.app.Application
import android.util.Log
import android.widget.Toast
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import io.matthewnelson.kmp.tor.KmpTorLoaderAndroid
import io.matthewnelson.kmp.tor.TorConfigProviderAndroid
import io.matthewnelson.kmp.tor.common.address.*
import io.matthewnelson.kmp.tor.controller.common.config.TorConfig
import io.matthewnelson.kmp.tor.controller.common.config.TorConfig.Option.*
import io.matthewnelson.kmp.tor.controller.common.config.TorConfig.Setting.*
import io.matthewnelson.kmp.tor.controller.common.control.usecase.TorControlInfoGet
import io.matthewnelson.kmp.tor.controller.common.control.usecase.TorControlSignal
import io.matthewnelson.kmp.tor.controller.common.events.TorEvent
import io.matthewnelson.kmp.tor.manager.TorManager
import io.matthewnelson.kmp.tor.manager.TorServiceConfig
import io.matthewnelson.kmp.tor.manager.common.TorControlManager
import io.matthewnelson.kmp.tor.manager.common.TorOperationManager
import io.matthewnelson.kmp.tor.manager.common.event.TorManagerEvent
import io.matthewnelson.kmp.tor.manager.common.state.isOff
import io.matthewnelson.kmp.tor.manager.common.state.isOn
import io.matthewnelson.kmp.tor.manager.common.state.isStarting
import io.matthewnelson.kmp.tor.manager.common.state.isStopping
import io.matthewnelson.kmp.tor.manager.R
import kotlinx.coroutines.*
import java.net.InetSocketAddress
import java.net.Proxy

class TorKmpManager(application : Application) {

    private val TAG = "TorListener"

    private val providerAndroid by lazy {
        object : TorConfigProviderAndroid(context = application) {
            override fun provide(): TorConfig {
                return TorConfig.Builder {
                    // Set multiple ports for all of the things
                    val dns = Ports.Dns()
                    put(dns.set(AorDorPort.Value(PortProxy(9252))))
                    put(dns.set(AorDorPort.Value(PortProxy(9253))))

                    val socks = Ports.Socks()
                    put(socks.set(AorDorPort.Value(PortProxy(9254))))
                    put(socks.set(AorDorPort.Value(PortProxy(9255))))

                    val http = Ports.HttpTunnel()
                    put(http.set(AorDorPort.Value(PortProxy(9258))))
                    put(http.set(AorDorPort.Value(PortProxy(9259))))

                    val trans = Ports.Trans()
                    put(trans.set(AorDorPort.Value(PortProxy(9262))))
                    put(trans.set(AorDorPort.Value(PortProxy(9263))))

                    // If a port (9263) is already taken (by ^^^^ trans port above)
                    // this will take its place and "overwrite" the trans port entry
                    // because port 9263 is taken.
                    put(socks.set(AorDorPort.Value(PortProxy(9263))))

                    // Set Flags
                    socks.setFlags(setOf(
                        Ports.Socks.Flag.OnionTrafficOnly
                    )).setIsolationFlags(setOf(
                        Ports.IsolationFlag.IsolateClientAddr,
                    )).set(AorDorPort.Value(PortProxy(9264)))
                    put(socks)

                    // reset our socks object to defaults
                    socks.setDefault()

                    // Not necessary, as if ControlPort is missing it will be
                    // automatically added for you; but for demonstration purposes...
//                    put(Ports.Control().set(AorDorPort.Auto))

                    // Use a UnixSocket instead of TCP for the ControlPort.
                    //
                    // A unix domain socket will always be preferred on Android
                    // if neither Ports.Control or UnixSockets.Control are provided.
                    put(UnixSockets.Control().set(FileSystemFile(
                        workDir.builder {

                            // Put the file in the "data" directory
                            // so that we avoid any directory permission
                            // issues.
                            //
                            // Note that DataDirectory is automatically added
                            // for you if it is not present in your provided
                            // config. If you set a custom Path for it, you
                            // should use it here.
                            addSegment(DataDirectory.DEFAULT_NAME)

                            addSegment(UnixSockets.Control.DEFAULT_NAME)
                        }
                    )))

                    // Use a UnixSocket instead of TCP for the SocksPort.
                    put(UnixSockets.Socks().set(FileSystemFile(
                        workDir.builder {

                            // Put the file in the "data" directory
                            // so that we avoid any directory permission
                            // issues.
                            //
                            // Note that DataDirectory is automatically added
                            // for you if it is not present in your provided
                            // config. If you set a custom Path for it, you
                            // should use it here.
                            addSegment(DataDirectory.DEFAULT_NAME)

                            addSegment(UnixSockets.Socks.DEFAULT_NAME)
                        }
                    )))

                    // For Android, disabling & reducing connection padding is
                    // advisable to minimize mobile data usage.
                    put(ConnectionPadding().set(AorTorF.False))
                    put(ConnectionPaddingReduced().set(TorF.True))

                    // Tor default is 24h. Reducing to 10 min helps mitigate
                    // unnecessary mobile data usage.
                    put(DormantClientTimeout().set(Time.Minutes(10)))

                    // Tor defaults this setting to false which would mean if
                    // Tor goes dormant, the next time it is started it will still
                    // be in the dormant state and will not bootstrap until being
                    // set to "active". This ensures that if it is a fresh start,
                    // dormancy will be cancelled automatically.
                    put(DormantCanceledByStartup().set(TorF.True))

                    // If planning to use v3 Client Authentication in a persistent
                    // manner (where private keys are saved to disk via the "Persist"
                    // flag), this is needed to be set.
                    put(ClientOnionAuthDir().set(FileSystemDir(
                        workDir.builder { addSegment(ClientOnionAuthDir.DEFAULT_NAME) }
                    )))

                    val hsPath = workDir.builder {
                        addSegment(HiddenService.DEFAULT_PARENT_DIR_NAME)
                        addSegment("test_service")
                    }
                    // Add Hidden services
                    put(HiddenService()
                        .setPorts(ports = setOf(
                            // Use a unix domain socket to communicate via IPC instead of over TCP
                            HiddenService.UnixSocket(virtualPort = Port(80), targetUnixSocket = hsPath.builder {
                                addSegment(HiddenService.UnixSocket.DEFAULT_UNIX_SOCKET_NAME)
                            }),
                        ))
                        .setMaxStreams(maxStreams = HiddenService.MaxStreams(value = 2))
                        .setMaxStreamsCloseCircuit(value = TorF.True)
                        .set(FileSystemDir(path = hsPath))
                    )

                    put(HiddenService()
                        .setPorts(ports = setOf(
                            HiddenService.Ports(virtualPort = Port(80), targetPort = Port(1030)), // http
                            HiddenService.Ports(virtualPort = Port(443), targetPort = Port(1030)) // https
                        ))
                        .set(FileSystemDir(path =
                        workDir.builder {
                            addSegment(HiddenService.DEFAULT_PARENT_DIR_NAME)
                            addSegment("test_service_2")
                        }
                        ))
                    )
                }.build()
            }
        }
    }

    private val loaderAndroid by lazy {
        KmpTorLoaderAndroid(provider = providerAndroid)
    }

    private val manager: TorManager by lazy {
        TorManager.newInstance(application = application, loader = loaderAndroid, requiredEvents = null)
    }

    // only expose necessary interfaces
    val torOperationManager: TorOperationManager get() = manager
    val torControlManager: TorControlManager get() = manager

    private val listener = TorListener()

    val events: LiveData<String> get() = listener.eventLines

    private val appScope by lazy {
        CoroutineScope(Dispatchers.Main.immediate + SupervisorJob())
    }

    val torStateLiveData: MutableLiveData<TorState> = MutableLiveData()
        get() = field
    var torState: TorState = TorState()
        get() = field

    var proxy: Proxy? = null
        get() = field

    init {
        manager.debug(true)
        manager.addListener(listener)
        listener.addLine(TorServiceConfig.getMetaData(application).toString())
    }

    fun isConnected(): Boolean {
        return manager.state.isOn() && manager.state.bootstrap >= 100
    }

    fun isStarting(): Boolean {
        return manager.state.isStarting() ||
                (manager.state.isOn() && manager.state.bootstrap < 100);
    }


    fun newIdentity(appContext: Application) {
        appScope.launch {
            val result = manager.signal(TorControlSignal.Signal.NewNym)
            result.onSuccess {
                if (it !is String) {
                    listener.addLine(TorControlSignal.NEW_NYM_SUCCESS)
                    Toast.makeText(appContext, TorControlSignal.NEW_NYM_SUCCESS, Toast.LENGTH_SHORT).show()
                    return@onSuccess
                }

                val post: String? = when {
                    it.startsWith(TorControlSignal.NEW_NYM_RATE_LIMITED) -> {
                        // Rate limiting NEWNYM request: delaying by 8 second(s)
                        val seconds: Int? = it.drop(TorControlSignal.NEW_NYM_RATE_LIMITED.length)
                            .substringBefore(' ')
                            .toIntOrNull()

                        if (seconds == null) {
                            it
                        } else {
                            appContext.getString(
                                R.string.kmp_tor_newnym_rate_limited,
                                seconds
                            )
                        }
                    }
                    it == TorControlSignal.NEW_NYM_SUCCESS -> {
                        appContext.getString(R.string.kmp_tor_newnym_success)
                    }
                    else -> {
                        null
                    }
                }

                if (post != null) {
                    listener.addLine(post)
                    Toast.makeText(appContext, post, Toast.LENGTH_SHORT).show()
                }
            }
            result.onFailure {
                val msg = "Tor identity change failed"
                listener.addLine(msg)
                Toast.makeText(appContext, msg, Toast.LENGTH_SHORT).show()
            }
        }
    }


    private inner class TorListener: TorManagerEvent.Listener() {
        private val _eventLines: MutableLiveData<String> = MutableLiveData("")
        val eventLines: LiveData<String> = _eventLines
        private val events: MutableList<String> = ArrayList(50)
        fun addLine(line: String) {
            synchronized(this) {
                if (events.size > 49) {
                    events.removeAt(0)
                }
                events.add(line)
                //Log.i(TAG, line)
                //_eventLines.value = events.joinToString("\n")
                _eventLines.postValue(events.joinToString("\n"))
            }
        }

        override fun onEvent(event: TorManagerEvent) {

            if (event is TorManagerEvent.State) {
                val stateEvent: TorManagerEvent.State = event
                val state = stateEvent.torState
                torState.progressIndicator = state.bootstrap
                val liveTorState = TorState()
                liveTorState.progressIndicator = state.bootstrap

                if (state.isOn()) {
                    if (state.bootstrap >= 100) {
                        torState.state = EnumTorState.ON
                        liveTorState.state = EnumTorState.ON
                    } else {
                        torState.state = EnumTorState.STARTING
                        liveTorState.state = EnumTorState.STARTING
                    }
                } else if (state.isStarting()) {
                    torState.state = EnumTorState.STARTING
                    liveTorState.state = EnumTorState.STARTING
                } else if (state.isOff()) {
                    torState.state = EnumTorState.OFF
                    liveTorState.state = EnumTorState.OFF
                } else if (state.isStopping()) {
                    torState.state = EnumTorState.STOPPING
                    liveTorState.state = EnumTorState.STOPPING
                }
                torStateLiveData.postValue(liveTorState)
            }
            addLine(event.toString())
            super.onEvent(event)
        }

        override fun onEvent(event: TorEvent.Type.SingleLineEvent, output: String) {
            addLine("$event - $output")

            super.onEvent(event, output)
        }

        override fun onEvent(event: TorEvent.Type.MultiLineEvent, output: List<String>) {
            addLine("multi-line event: $event. See Logs.")

            // these events are many many many lines and should be moved
            // off the main thread if ever needed to be dealt with.
            val enabled = false
            if (enabled) {
                appScope.launch(Dispatchers.IO) {
                    Log.d(TAG, "-------------- multi-line event START: $event --------------")
                    for (line in output) {
                        Log.d(TAG, line)
                    }
                    Log.d(TAG, "--------------- multi-line event END: $event ---------------")
                }
            }

            super.onEvent(event, output)
        }

        override fun managerEventError(t: Throwable) {
            t.printStackTrace()
        }

        override fun managerEventAddressInfo(info: TorManagerEvent.AddressInfo) {
            if (info.isNull) {
                // Tear down HttpClient
            } else {
                info.socksInfoToProxyAddressOrNull()?.firstOrNull()?.let { proxyAddress ->
                    @Suppress("UNUSED_VARIABLE")
                    val socket = InetSocketAddress(proxyAddress.address.value, proxyAddress.port.value)
                    proxy = Proxy(Proxy.Type.SOCKS, socket)
                }
            }
        }

        override fun managerEventStartUpCompleteForTorInstance() {
            // Do one-time things after we're bootstrapped

            appScope.launch {
                torControlManager.onionAddNew(
                    type = OnionAddress.PrivateKey.Type.ED25519_V3,
                    hsPorts = setOf(HiddenService.Ports(virtualPort = Port(443))),
                    flags = null,
                    maxStreams = null,
                ).onSuccess { hsEntry ->
                    addLine(
                        "New HiddenService: " +
                                "\n - Address: https://${hsEntry.address.canonicalHostname()}" +
                                "\n - PrivateKey: ${hsEntry.privateKey}"
                    )

                    torControlManager.onionDel(hsEntry.address).onSuccess {
                        addLine("Aaaaaaaaand it's gone...")
                    }.onFailure { t ->
                        t.printStackTrace()
                    }
                }.onFailure { t ->
                    t.printStackTrace()
                }

                delay(20_000L)

                torControlManager.infoGet(TorControlInfoGet.KeyWord.Uptime()).onSuccess { uptime ->
                    addLine("Uptime - $uptime")
                }.onFailure { t ->
                    t.printStackTrace()
                }
            }
        }
    }
}
