package io.bluewallet.bluewallet

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.onCompletion
import kotlinx.coroutines.isActive
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.Socket
import java.net.InetSocketAddress
import java.net.SocketTimeoutException
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLHandshakeException
import javax.net.ssl.SSLSocket
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

class ElectrumClient {
    companion object {
        private const val TAG = "ElectrumClient"
        private const val HEALTH_PREFERENCES = "electrum_endpoint_health"
        
        // Default list of Electrum servers to try
        val hardcodedPeers = listOf(
            ElectrumServer("electrum1.bluewallet.io", 50001, false),
            ElectrumServer("electrum2.bluewallet.io", 50001, false),
            ElectrumServer("electrum3.bluewallet.io", 50001, false),
            ElectrumServer("electrum1.bluewallet.io", 443, true),
            ElectrumServer("electrum2.bluewallet.io", 443, true),
            ElectrumServer("electrum3.bluewallet.io", 443, true)
        )
    }

    private var socket: Socket? = null
    private var outputStream: OutputStream? = null
    private var inputReader: BufferedReader? = null
    private var context: Context? = null
    private var networkStatusListener: NetworkStatusListener? = null
    private var circuitBreaker = EndpointCircuitBreaker()
    private var currentEndpoint: ElectrumServer? = null
    
    data class ElectrumServer(val host: String, val port: Int, val isSsl: Boolean)
    
    /**
     * Initialize ElectrumClient with application context for network checks
     */
    fun initialize(context: Context) {
        Log.i(TAG, "Initializing ElectrumClient with context")
        this.context = context.applicationContext
        circuitBreaker = EndpointCircuitBreaker(
            SharedPreferencesEndpointHealthStore(
                this.context!!.getSharedPreferences(HEALTH_PREFERENCES, Context.MODE_PRIVATE),
            ),
        )
    }
    
    /**
     * Set a listener for network status changes
     */
    fun setNetworkStatusListener(listener: NetworkStatusListener) {
        Log.d(TAG, "Setting network status listener")
        this.networkStatusListener = listener
    }
    
    /**
     * Interface for listening to network status changes
     */
    interface NetworkStatusListener {
        fun onNetworkStatusChanged(isConnected: Boolean)
        fun onConnectionError(error: String)
        fun onConnectionSuccess()
    }
    
    /**
     * Check if the device has network connectivity
     */
    private fun isNetworkAvailable(): Boolean {
        // A context is optional for widget/direct callers. In that case the
        // bounded socket connection itself is the source of truth.
        val hasNetwork = context?.let { NetworkUtils.isNetworkAvailable(it) } ?: true
        Log.d(TAG, "Network available: $hasNetwork")
        return hasNetwork
    }
    
    /**
     * Connect to the next available Electrum server with network checks
     */
    suspend fun connectToNextAvailable(
        servers: List<ElectrumServer> = hardcodedPeers,
        validateCertificates: Boolean = true,
        connectTimeout: Long = 5000,
        excluding: Set<String> = emptySet(),
    ): Boolean = withContext(Dispatchers.IO) {
        val startTime = System.currentTimeMillis()
        Log.i(TAG, "Starting connection attempt to Electrum server. Server count: ${servers.size}")
        
        // Check network availability first
        if (!isNetworkAvailable()) {
            Log.e(TAG, "No network connection available. Connection attempt aborted.")
            networkStatusListener?.onNetworkStatusChanged(false)
            return@withContext false
        }
        
        val candidates = circuitBreaker.candidates(servers, excluding)
        for ((serverIndex, server) in candidates.withIndex()) {
            currentCoroutineContext().ensureActive()
            Log.d(TAG, "Trying server ${serverIndex + 1}/${candidates.size}: ${server.host}:${server.port} (SSL: ${server.isSsl})")
            try {
                if (withTimeout(connectTimeout) { connect(server, validateCertificates, connectTimeout.toInt()) }) {
                    networkStatusListener?.onConnectionSuccess()
                    Log.i(TAG, "Successfully connected to ${server.host}:${server.port}")
                    return@withContext true
                }
                if (!isNetworkAvailable()) return@withContext false
            } catch (error: TimeoutCancellationException) {
                circuitBreaker.recordFailure(server)
                close()
                Log.e(TAG, "Connection to ${server.host}:${server.port} timed out after ${connectTimeout}ms")
            }
        }
        
        val totalDuration = System.currentTimeMillis() - startTime
        
        Log.e(TAG, "Failed to connect to an eligible Electrum server after ${totalDuration}ms")
        networkStatusListener?.onConnectionError("Failed to connect to an eligible Electrum server")
        false
    }
    
    /**
     * Log the server details upon successful connection
     */
    private fun logServerDetails(server: ElectrumServer) {
        Log.i(TAG, "Connected to Electrum server: ${server.host}:${server.port} (SSL: ${server.isSsl})")
    }

    /**
     * Connect to a specific Electrum server with network check
     */
    suspend fun connect(
        server: ElectrumServer,
        validateCertificates: Boolean = true,
        connectTimeout: Int = 5000,
    ): Boolean = withContext(Dispatchers.IO) {
        val startTime = System.currentTimeMillis()
        Log.d(TAG, "Attempting direct connection to ${server.host}:${server.port} (SSL: ${server.isSsl})")

        var result = false

        if (!isNetworkAvailable()) {
            Log.e(TAG, "Cannot connect to ${server.host}: No network connection available")
            networkStatusListener?.onNetworkStatusChanged(false)
            return@withContext false
        }

        try {
            close() // Close any existing connection
            currentEndpoint = server
            Log.d(TAG, "Creating ${if (server.isSsl) "SSL " else ""}socket to ${server.host}:${server.port}")

            val newSocket = if (server.isSsl) {
                createSslSocket(server.host, server.port, validateCertificates, connectTimeout)
            } else {
                createSocket(server.host, server.port, connectTimeout)
            }
            socket = newSocket

            Log.d(TAG, "Socket created successfully. Setting timeout and getting streams.")
            socket?.soTimeout = 10000 // 10 seconds read timeout
            outputStream = newSocket.getOutputStream()
            inputReader = BufferedReader(InputStreamReader(newSocket.getInputStream()))

            // Testing the connection with simple version request
            val versionRequest = "{\"id\": 0, \"method\": \"server.version\", \"params\": [\"BlueWallet\", \"1.4\"]}\n"
            Log.d(TAG, "Sending version request to verify connection")
            if (!send(versionRequest.toByteArray())) return@withContext false

            val response = receive()
            if (response.isNotEmpty()) {
                val responseStr = String(response)
                Log.d(TAG, "Received server version response: $responseStr")
                networkStatusListener?.onNetworkStatusChanged(true)
                logServerDetails(server) // Log server details here
                circuitBreaker.recordSuccess(server)
                result = true
            } else {
                Log.w(TAG, "Empty response from server when verifying connection")
                networkStatusListener?.onConnectionError("Empty response from server")
                close()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error connecting to Electrum server: ${e.javaClass.simpleName} - ${e.message}")
            networkStatusListener?.onConnectionError("Error connecting: ${e.message}")
            if (e !is CancellationException) {
                circuitBreaker.recordFailure(server, permanent = e is SSLHandshakeException)
            }
            close()
            if (e is CancellationException) throw e
        }

        val duration = System.currentTimeMillis() - startTime
        Log.d(TAG, "Connection attempt to ${server.host}:${server.port} completed in ${duration}ms, result: $result")

        result
    }
    
    /**
     * Send data to the connected Electrum server with network check
     */
    suspend fun send(data: ByteArray): Boolean = withContext(Dispatchers.IO) {
        val message = String(data).trim()
        val messagePreview = if (message.length > 100) message.substring(0, 100) + "..." else message
        Log.d(TAG, "Sending to Electrum: $messagePreview")
        
        if (!isNetworkAvailable()) {
            Log.e(TAG, "Cannot send data: No network connection available")
            networkStatusListener?.onNetworkStatusChanged(false)
            close()
            return@withContext false
        }
        
        try {
            val stream = outputStream ?: return@withContext false
            stream.write(data)
            stream.flush()
            Log.d(TAG, "Data sent successfully")
            return@withContext true
        } catch (e: Exception) {
            Log.e(TAG, "Error sending data to Electrum server: ${e.javaClass.simpleName} - ${e.message}")
            networkStatusListener?.onConnectionError("Error sending data: ${e.message}")
            currentEndpoint?.let(circuitBreaker::recordFailure)
            close()
            return@withContext false
        }
    }
    
    /**
     * Receive data from the connected Electrum server with timeout handling
     */
    suspend fun receive(): ByteArray = withContext(Dispatchers.IO) {
        Log.d(TAG, "Waiting to receive data from Electrum server")
        val startTime = System.currentTimeMillis()
        
        try {
            val response = try {
                inputReader?.readLine().orEmpty()
            } catch (e: SocketTimeoutException) {
                Log.e(TAG, "Socket read timed out after ${System.currentTimeMillis() - startTime}ms")
                networkStatusListener?.onConnectionError("Socket read timed out")
                currentEndpoint?.let(circuitBreaker::recordFailure)
                close()
                ""
            }

            val responseData = response.toByteArray()
            val responsePreview = if (response.length > 100) response.take(100) + "..." else response
            
            if (responseData.isNotEmpty()) {
                val duration = System.currentTimeMillis() - startTime
                Log.d(TAG, "Received data (${responseData.size} bytes) in ${duration}ms: $responsePreview")
            } else {
                Log.w(TAG, "Received empty response from Electrum server")
                currentEndpoint?.let(circuitBreaker::recordFailure)
                close()
            }
            
            return@withContext responseData
        } catch (e: Exception) {
            Log.e(TAG, "Error receiving data from Electrum server: ${e.javaClass.simpleName} - ${e.message}")
            networkStatusListener?.onConnectionError("Error receiving data: ${e.message}")
            currentEndpoint?.let(circuitBreaker::recordFailure)
            close()
            return@withContext ByteArray(0)
        }
    }

    /**
     * Primary receive API. Collection keeps reading newline-delimited Electrum
     * messages and owns the socket lifetime.
     */
    fun messages(): Flow<ByteArray> = electrumMessageFlow(::receive, ::close)
    
    /**
     * Close the connection to the Electrum server
     */
    @Synchronized
    fun close() {
        try {
            inputReader?.close()
            outputStream?.close()
            socket?.close()
        } catch (e: Exception) {
            Log.e(TAG, "Error closing Electrum connection", e)
        } finally {
            inputReader = null
            outputStream = null
            socket = null
            currentEndpoint = null
        }
    }
    
    /**
     * Create an SSL socket with optional certificate validation
     */
    private fun createSslSocket(host: String, port: Int, validateCertificates: Boolean, connectTimeout: Int): SSLSocket {
        val sslContext = SSLContext.getInstance("TLS")
        
        if (!validateCertificates) {
            val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
                override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
                override fun checkClientTrusted(certs: Array<X509Certificate>, authType: String) {}
                override fun checkServerTrusted(certs: Array<X509Certificate>, authType: String) {}
            })
            
            sslContext.init(null, trustAllCerts, SecureRandom())
        } else {
            sslContext.init(null, null, null)
        }
        
        val factory: SSLSocketFactory = sslContext.socketFactory
        val socket = factory.createSocket() as SSLSocket
        return try {
            socket.connect(InetSocketAddress(host, port), connectTimeout)
            socket.soTimeout = 10000
            socket.startHandshake()
            socket
        } catch (error: Exception) {
            socket.close()
            throw error
        }
    }

    private fun createSocket(host: String, port: Int, connectTimeout: Int): Socket {
        val socket = Socket()
        return try {
            socket.connect(InetSocketAddress(host, port), connectTimeout)
            socket
        } catch (error: Exception) {
            socket.close()
            throw error
        }
    }

    private fun getNextPeer(): ElectrumServer {
        val savedPeer = getSavedPeer()
        return if (savedPeer != null) {
            Log.d(TAG, "Using saved peer: ${savedPeer.host}:${savedPeer.port} (SSL: ${savedPeer.isSsl})")
            savedPeer
        } else {
            Log.d(TAG, "No saved peer found. Using default hardcoded peers.")
            hardcodedPeers.random()
        }
    }

 
    private fun getSavedPeer(): ElectrumServer? {
        // implement later
        return null
    }
}

internal fun electrumMessageFlow(
    receive: suspend () -> ByteArray,
    close: () -> Unit,
): Flow<ByteArray> = flow {
    while (currentCoroutineContext().isActive) {
        val message = receive()
        check(message.isNotEmpty()) { "Electrum connection closed without a message" }
        emit(message)
    }
}.onCompletion {
    close()
}.flowOn(Dispatchers.IO)

internal data class EndpointHealth(
    val failureCount: Int = 0,
    val retryAfterMillis: Long = 0,
    val lastSuccessMillis: Long? = null,
)

internal interface EndpointHealthStore {
    fun load(): Map<String, EndpointHealth>
    fun save(health: Map<String, EndpointHealth>)
}

internal class InMemoryEndpointHealthStore : EndpointHealthStore {
    private var health = emptyMap<String, EndpointHealth>()
    override fun load(): Map<String, EndpointHealth> = health
    override fun save(health: Map<String, EndpointHealth>) { this.health = health.toMap() }
}

internal class SharedPreferencesEndpointHealthStore(
    private val preferences: SharedPreferences,
) : EndpointHealthStore {
    override fun load(): Map<String, EndpointHealth> {
        val root = runCatching { JSONObject(preferences.getString(KEY, "{}") ?: "{}") }.getOrElse { return emptyMap() }
        return root.keys().asSequence().associateWith { key ->
            val value = root.getJSONObject(key)
            EndpointHealth(
                failureCount = value.optInt("failureCount"),
                retryAfterMillis = value.optLong("retryAfterMillis"),
                lastSuccessMillis = value.optLong("lastSuccessMillis").takeIf { value.has("lastSuccessMillis") },
            )
        }
    }

    override fun save(health: Map<String, EndpointHealth>) {
        val root = JSONObject()
        health.forEach { (key, value) ->
            root.put(key, JSONObject().apply {
                put("failureCount", value.failureCount)
                put("retryAfterMillis", value.retryAfterMillis)
                value.lastSuccessMillis?.let { put("lastSuccessMillis", it) }
            })
        }
        preferences.edit().putString(KEY, root.toString()).apply()
    }

    private companion object { const val KEY = "health" }
}

internal class EndpointCircuitBreaker(
    private val store: EndpointHealthStore = InMemoryEndpointHealthStore(),
    private val nowMillis: () -> Long = System::currentTimeMillis,
    private val jitter: () -> Double = { kotlin.random.Random.nextDouble(-0.2, 0.2) },
) {
    private val health = store.load().toMutableMap()
    private var cursor = 0

    @Synchronized
    fun candidates(
        servers: List<ElectrumClient.ElectrumServer>,
        excludedKeys: Set<String> = emptySet(),
    ): List<ElectrumClient.ElectrumServer> {
        val candidates = servers.filterNot { key(it) in excludedKeys }
        if (candidates.isEmpty()) return emptyList()

        val now = nowMillis()
        val healthy = candidates.filter { (health[key(it)]?.retryAfterMillis ?: 0) <= now }
        if (healthy.isEmpty()) {
            return listOf(candidates.minBy { health[key(it)]?.retryAfterMillis ?: 0 })
        }

        val preferred = healthy.maxByOrNull { health[key(it)]?.lastSuccessMillis ?: Long.MIN_VALUE }
        if (preferred != null && health[key(preferred)]?.lastSuccessMillis != null) {
            return listOf(preferred) + healthy.filterNot { key(it) == key(preferred) }
        }

        val offset = cursor % healthy.size
        cursor = (cursor + 1) % healthy.size
        return healthy.drop(offset) + healthy.take(offset)
    }

    @Synchronized
    fun recordSuccess(server: ElectrumClient.ElectrumServer) {
        health[key(server)] = EndpointHealth(lastSuccessMillis = nowMillis())
        store.save(health)
    }

    @Synchronized
    fun recordFailure(server: ElectrumClient.ElectrumServer, permanent: Boolean = false) {
        val endpointKey = key(server)
        val previous = health[endpointKey] ?: EndpointHealth()
        val failureCount = if (permanent) maxOf(4, previous.failureCount + 1) else previous.failureCount + 1
        val delays = longArrayOf(30_000, 120_000, 600_000, 1_800_000)
        val baseDelay = delays[minOf(failureCount - 1, delays.lastIndex)]
        val multiplier = (1 + jitter()).coerceIn(0.8, 1.2)
        health[endpointKey] = previous.copy(
            failureCount = failureCount,
            retryAfterMillis = nowMillis() + (baseDelay * multiplier).toLong(),
        )
        store.save(health)
    }

    @Synchronized fun health(server: ElectrumClient.ElectrumServer): EndpointHealth = health[key(server)] ?: EndpointHealth()

    companion object {
        fun key(server: ElectrumClient.ElectrumServer): String =
            "${server.host.lowercase()}:${server.port}:${if (server.isSsl) "tls" else "tcp"}"
    }
}
