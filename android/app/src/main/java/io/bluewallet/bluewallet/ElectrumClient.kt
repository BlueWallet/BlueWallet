package io.bluewallet.bluewallet

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.TimeoutCancellationException
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
    
    data class ElectrumServer(val host: String, val port: Int, val isSsl: Boolean)
    
    /**
     * Connect to the next available Electrum server
     */
    suspend fun connectToNextAvailable(
        servers: List<ElectrumServer> = hardcodedPeers,
        validateCertificates: Boolean = true,
        connectTimeout: Long = 5000 // 5 seconds
    ): Boolean = withContext(Dispatchers.IO) {
        var connected = false
        
        for (server in servers) {
            if (connected) break
            
            try {
                Log.d(TAG, "Attempting to connect to ${server.host}:${server.port} (SSL: ${server.isSsl})")
                withTimeout(connectTimeout) {
                    if (connect(server, validateCertificates)) {
                        Log.d(TAG, "Successfully connected to ${server.host}:${server.port}")
                        connected = true
                    }
                }
            } catch (e: TimeoutCancellationException) {
                Log.e(TAG, "Connection to ${server.host}:${server.port} timed out", e)
            } catch (e: Exception) {
                Log.e(TAG, "Error connecting to ${server.host}:${server.port}", e)
            }
        }
        
        if (!connected) {
            Log.e(TAG, "Failed to connect to any Electrum server")
        }
        
        connected
    }
    
    /**
     * Connect to a specific Electrum server
     */
    suspend fun connect(
        server: ElectrumServer,
        validateCertificates: Boolean = true
    ): Boolean = withContext(Dispatchers.IO) {
        var result = false
        
        try {
            close() // Close any existing connection
            
            socket = if (server.isSsl) {
                createSslSocket(server.host, server.port, validateCertificates)
            } else {
                Socket(server.host, server.port)
            }
            
            socket?.soTimeout = 10000 // 10 seconds read timeout
            outputStream = socket?.getOutputStream()
            inputReader = BufferedReader(InputStreamReader(socket?.getInputStream()))
            
            // Testing the connection with simple version request
            val versionRequest = "{\"id\": 0, \"method\": \"server.version\", \"params\": [\"BlueWallet\", \"1.4\"]}\n"
            send(versionRequest.toByteArray())
            
            val response = receive()
            if (response.isNotEmpty()) {
                result = true
            } else {
                close()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error connecting to Electrum server", e)
            close()
        }
        
        result
    }
    
    /**
     * Send data to the connected Electrum server
     */
    suspend fun send(data: ByteArray): Boolean = withContext(Dispatchers.IO) {
        try {
            outputStream?.write(data)
            outputStream?.flush()
            return@withContext true
        } catch (e: Exception) {
            Log.e(TAG, "Error sending data to Electrum server", e)
            return@withContext false
        }
    }
    
    /**
     * Receive data from the connected Electrum server
     */
    suspend fun receive(): ByteArray = withContext(Dispatchers.IO) {
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
                Log.e(TAG, "Socket read timed out", e)
            }
            
            return@withContext response.toString().toByteArray()
        } catch (e: Exception) {
            Log.e(TAG, "Error receiving data from Electrum server", e)
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
