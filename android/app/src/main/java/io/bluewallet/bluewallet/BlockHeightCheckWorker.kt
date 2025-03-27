package io.bluewallet.bluewallet

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Worker that periodically checks Bitcoin block height and refreshes widgets
 * when a new block is detected.
 */
class BlockHeightCheckWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    
    companion object {
        private const val TAG = "BlockHeightCheckWorker"
        private const val SHARED_PREF_NAME = "group.io.bluewallet.bluewallet"
        private const val KEY_LAST_KNOWN_BLOCK_HEIGHT = "last_known_block_height"
    }
    
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        Log.i(TAG, "Starting Bitcoin block height check")
        
        try {
            // Check network availability
            if (!NetworkUtils.isNetworkAvailable(applicationContext)) {
                Log.d(TAG, "No network connection available for block height check")
                return@withContext Result.retry()
            }
            
            val sharedPrefs = applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            val lastKnownHeight = sharedPrefs.getInt(KEY_LAST_KNOWN_BLOCK_HEIGHT, -1)
            
            Log.d(TAG, "Last known block height: $lastKnownHeight")
            
            // Initialize Electrum client
            val electrumClient = ElectrumClient()
            electrumClient.initialize(applicationContext)
            
            // Set listeners for logging
            electrumClient.setNetworkStatusListener(object : ElectrumClient.NetworkStatusListener {
                override fun onNetworkStatusChanged(isConnected: Boolean) {
                    Log.d(TAG, "Block check - Network: ${if (isConnected) "Connected" else "Disconnected"}")
                }
                
                override fun onConnectionError(error: String) {
                    Log.e(TAG, "Block check - Connection error: $error")
                }
                
                override fun onConnectionSuccess() {
                    Log.d(TAG, "Block check - Connected successfully")
                }
            })
            
            // Fetch current block height
            val currentHeight = electrumClient.fetchBlockHeight()
            electrumClient.close()
            
            if (currentHeight <= 0) {
                Log.e(TAG, "Failed to fetch valid block height")
                return@withContext Result.retry()
            }
            
            Log.i(TAG, "Current Bitcoin block height: $currentHeight")
            
            // Check if block height has changed
            if (lastKnownHeight > 0 && currentHeight > lastKnownHeight) {
                Log.i(TAG, "New Bitcoin block detected! Height changed from $lastKnownHeight to $currentHeight")
                
                // Update all market widgets to reflect the new block
                val marketWidgetIds = MarketWidget.getAllWidgetIds(applicationContext)
                if (marketWidgetIds.isNotEmpty()) {
                    Log.d(TAG, "Updating ${marketWidgetIds.size} market widgets with new block data")
                    MarketWidget.refreshAllWidgetsImmediately(applicationContext)
                }
            } else if (currentHeight > 0) {
                Log.d(TAG, "No new blocks detected. Current height: $currentHeight")
            }
            
            // Always update the stored block height if valid
            if (currentHeight > 0) {
                sharedPrefs.edit().putInt(KEY_LAST_KNOWN_BLOCK_HEIGHT, currentHeight).apply()
            }
            
            // Schedule the next check
            MarketWidgetUpdateWorker.scheduleBlockHeightChecks(applicationContext)
            
            return@withContext Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Error checking block height", e)
            return@withContext Result.retry()
        }
    }
}
