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
        private const val RETRY_DELAY_MS = 1000L
        
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
    
    data class ElectrumServer(val host: String, val port: Int, val isSsl: Boolean)

    fun initialize(context: Context) {
        this.context = context
    }

    private fun isNetworkAvailable(): Boolean {
        return context?.let { NetworkUtils.isNetworkAvailable(it) } ?: false
    }

    /**
     * Try connecting to each server in order, with retries per server.
     */
    suspend fun connectToNextAvailable(
        servers: List<ElectrumServer> = hardcodedPeers,
        validateCertificates: Boolean = true,
        connectTimeout: Long = 5000
    ): Boolean = withContext(Dispatchers.IO) {
        if (!isNetworkAvailable()) return@withContext false

        for (server in servers) {
            for (attempt in 1..MAX_RETRIES) {
                try {
                    withTimeout(connectTimeout) {
                        if (connect(server, validateCertificates)) return@withTimeout
                    }
                    // If we get here and socket is connected, we're done
                    if (socket?.isConnected == true) return@withContext true
                } catch (e: TimeoutCancellationException) {
                    if (attempt < MAX_RETRIES) delay(RETRY_DELAY_MS)
                } catch (e: Exception) {
                    if (attempt < MAX_RETRIES) delay(RETRY_DELAY_MS)
                }
            }
        }

        Log.e(TAG, "Failed to connect to any Electrum server")
        false
    }

    /**
     * Connect to a specific Electrum server.
     */
    suspend fun connect(
        server: ElectrumServer,
        validateCertificates: Boolean = true
    ): Boolean = withContext(Dispatchers.IO) {
        if (!isNetworkAvailable()) return@withContext false

        try {
            close()

            socket = if (server.isSsl) {
                createSslSocket(server.host, server.port, validateCertificates)
            } else {
                Socket(server.host, server.port)
            }

            socket?.soTimeout = 10000
            outputStream = socket?.getOutputStream()
            inputReader = BufferedReader(InputStreamReader(socket?.getInputStream()))

            // Verify with version handshake
            val versionRequest = "{\"id\": 0, \"method\": \"server.version\", \"params\": [\"BlueWallet\", \"1.4\"]}\n"
            send(versionRequest.toByteArray())

            val response = receive()
            return@withContext response.isNotEmpty()
        } catch (e: Exception) {
            Log.e(TAG, "Error connecting to ${server.host}:${server.port}: ${e.message}")
            close()
            return@withContext false
        }
    }
    
    /**
     * Send data to the connected server.
     */
    suspend fun send(data: ByteArray): Boolean = withContext(Dispatchers.IO) {
        if (!isNetworkAvailable()) return@withContext false
        
        try {
            outputStream?.write(data)
            outputStream?.flush()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error sending data: ${e.message}")
            false
        }
    }
    
    /**
     * Receive a JSON response from the server.
     */
    suspend fun receive(): ByteArray = withContext(Dispatchers.IO) {
        try {
            val response = StringBuilder()
            var line: String? = null
            
            try {
                while (inputReader?.readLine()?.also { line = it } != null) {
                    response.append(line)
                    if (line?.contains("}") == true) break
                }
            } catch (_: SocketTimeoutException) {}
            
            response.toString().toByteArray()
        } catch (e: Exception) {
            Log.e(TAG, "Error receiving data: ${e.message}")
            ByteArray(0)
        }
    }
    
    fun close() {
        try {
            inputReader?.close()
            outputStream?.close()
            socket?.close()
        } catch (_: Exception) {}
        finally {
            inputReader = null
            outputStream = null
            socket = null
        }
    }
    
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
        
        return sslContext.socketFactory.createSocket(host, port) as SSLSocket
    }
}
