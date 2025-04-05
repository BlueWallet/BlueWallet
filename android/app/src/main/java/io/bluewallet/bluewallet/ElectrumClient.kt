package io.bluewallet.bluewallet

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.Socket
import java.net.SocketTimeoutException
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocket
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

class ElectrumClient {
    companion object {
        private const val TAG = "ElectrumClient"
        private const val MAX_RETRIES = 3
        private const val RETRY_DELAY_MS = 1000L // 1 second delay between retries
        
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
    
    data class ElectrumServer(val host: String, val port: Int, val isSsl: Boolean)
    
    /**
     * Initialize ElectrumClient with application context for network checks
     */
    fun initialize(context: Context) {
        Log.i(TAG, "Initializing ElectrumClient with context")
        this.context = context
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
        val hasNetwork = context?.let { NetworkUtils.isNetworkAvailable(it) } ?: false
        Log.d(TAG, "Network available: $hasNetwork")
        return hasNetwork
    }
    
    /**
     * Connect to the next available Electrum server with network checks
     */
    suspend fun connectToNextAvailable(
        servers: List<ElectrumServer> = hardcodedPeers,
        validateCertificates: Boolean = true,
        connectTimeout: Long = 5000 // 5 seconds
    ): Boolean = withContext(Dispatchers.IO) {
        val startTime = System.currentTimeMillis()
        Log.i(TAG, "Starting connection attempt to Electrum server. Server count: ${servers.size}")
        
        // Check network availability first
        if (!isNetworkAvailable()) {
            Log.e(TAG, "No network connection available. Connection attempt aborted.")
            networkStatusListener?.onNetworkStatusChanged(false)
            return@withContext false
        }
        
        var connected = false
        var lastError: Exception? = null
        
        for (serverIndex in servers.indices) {
            val server = servers[serverIndex]
            if (connected) break
            
            Log.d(TAG, "Trying server ${serverIndex+1}/${servers.size}: ${server.host}:${server.port} (SSL: ${server.isSsl})")
            
            // Try up to MAX_RETRIES times per server
            for (attempt in 1..MAX_RETRIES) {
                try {
                    Log.d(TAG, "Connection attempt $attempt/$MAX_RETRIES to ${server.host}:${server.port} (SSL: ${server.isSsl})")
                    val attemptStartTime = System.currentTimeMillis()
                    
                    withTimeout(connectTimeout) {
                        if (connect(server, validateCertificates)) {
                            val attemptDuration = System.currentTimeMillis() - attemptStartTime
                            Log.i(TAG, "Successfully connected to ${server.host}:${server.port} in ${attemptDuration}ms")
                            networkStatusListener?.onConnectionSuccess()
                            connected = true
                        } else {
                            Log.w(TAG, "Failed to connect to ${server.host}:${server.port} - connect() returned false")
                        }
                    }
                } catch (e: TimeoutCancellationException) {
                    lastError = e
                    Log.e(TAG, "Connection to ${server.host}:${server.port} timed out after ${connectTimeout}ms (attempt $attempt)")
                    if (attempt < MAX_RETRIES) {
                        Log.d(TAG, "Retrying after ${RETRY_DELAY_MS}ms delay")
                        delay(RETRY_DELAY_MS)
                    }
                } catch (e: Exception) {
                    lastError = e
                    Log.e(TAG, "Error connecting to ${server.host}:${server.port} (attempt $attempt): ${e.message}")
                    if (attempt < MAX_RETRIES) {
                        Log.d(TAG, "Retrying after ${RETRY_DELAY_MS}ms delay")
                        delay(RETRY_DELAY_MS)
                    }
                }
            }
        }
        
        val totalDuration = System.currentTimeMillis() - startTime
        
        if (!connected) {
            Log.e(TAG, "Failed to connect to any Electrum server after ${totalDuration}ms. Last error: ${lastError?.message}")
            networkStatusListener?.onConnectionError("Failed to connect to any Electrum server: ${lastError?.message}")
        } else {
            Log.i(TAG, "Successfully connected to an Electrum server in ${totalDuration}ms")
        }
        
        connected
    }
    
    /**
     * Connect to a specific Electrum server with network check
     */
    suspend fun connect(
        server: ElectrumServer,
        validateCertificates: Boolean = true
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
            Log.d(TAG, "Creating ${if (server.isSsl) "SSL " else ""}socket to ${server.host}:${server.port}")
            
            socket = if (server.isSsl) {
                createSslSocket(server.host, server.port, validateCertificates)
            } else {
                Socket(server.host, server.port)
            }
            
            Log.d(TAG, "Socket created successfully. Setting timeout and getting streams.")
            socket?.soTimeout = 10000 // 10 seconds read timeout
            outputStream = socket?.getOutputStream()
            inputReader = BufferedReader(InputStreamReader(socket?.getInputStream()))
            
            // Testing the connection with simple version request
            val versionRequest = "{\"id\": 0, \"method\": \"server.version\", \"params\": [\"BlueWallet\", \"1.4\"]}\n"
            Log.d(TAG, "Sending version request to verify connection")
            send(versionRequest.toByteArray())
            
            val response = receive()
            if (response.isNotEmpty()) {
                val responseStr = String(response)
                Log.d(TAG, "Received server version response: $responseStr")
                networkStatusListener?.onNetworkStatusChanged(true)
                result = true
            } else {
                Log.w(TAG, "Empty response from server when verifying connection")
                networkStatusListener?.onConnectionError("Empty response from server")
                close()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error connecting to Electrum server: ${e.javaClass.simpleName} - ${e.message}")
            networkStatusListener?.onConnectionError("Error connecting: ${e.message}")
            close()
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
            return@withContext false
        }
        
        try {
            outputStream?.write(data)
            outputStream?.flush()
            Log.d(TAG, "Data sent successfully")
            return@withContext true
        } catch (e: Exception) {
            Log.e(TAG, "Error sending data to Electrum server: ${e.javaClass.simpleName} - ${e.message}")
            networkStatusListener?.onConnectionError("Error sending data: ${e.message}")
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
            val response = StringBuilder()
            var line: String? = null
            
            try {
                while (inputReader?.readLine()?.also { line = it } != null) {
                    response.append(line)
                    // Break after receiving a complete JSON object
                    if (line?.contains("}") == true) {
                        break
                    }
                }
            } catch (e: SocketTimeoutException) {
                Log.e(TAG, "Socket read timed out after ${System.currentTimeMillis() - startTime}ms")
                networkStatusListener?.onConnectionError("Socket read timed out")
            }
            
            val responseData = response.toString().toByteArray()
            val responsePreview = if (response.length > 100) response.substring(0, 100) + "..." else response.toString()
            
            if (responseData.isNotEmpty()) {
                val duration = System.currentTimeMillis() - startTime
                Log.d(TAG, "Received data (${responseData.size} bytes) in ${duration}ms: $responsePreview")
            } else {
                Log.w(TAG, "Received empty response from Electrum server")
            }
            
            return@withContext responseData
        } catch (e: Exception) {
            Log.e(TAG, "Error receiving data from Electrum server: ${e.javaClass.simpleName} - ${e.message}")
            networkStatusListener?.onConnectionError("Error receiving data: ${e.message}")
            return@withContext ByteArray(0)
        }
    }
    
    /**
     * Close the connection to the Electrum server
     */
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
        }
    }
    
    /**
     * Create an SSL socket with optional certificate validation
     */
    private fun createSslSocket(host: String, port: Int, validateCertificates: Boolean): SSLSocket {
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
        return factory.createSocket(host, port) as SSLSocket
    }
}
