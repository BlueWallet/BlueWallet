package io.bluewallet.bluewallet

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Currency
import kotlin.math.min

object MarketAPI {

    private const val TAG = "MarketAPI"
    private val client = OkHttpClient()
    private val numberFormatter = NumberFormat.getNumberInstance()
    private val electrumClient = ElectrumClient()
    
    private var lastFetchedFee: String? = null

    // Single indicator for error/unavailable
    private const val ERROR_INDICATOR = "!"
    
    var baseUrl: String? = null
    
    data class ApiResponse(val body: String?, val code: Int)
    data class PriceResult(val rateDouble: Double, val formattedRate: String?)

    suspend fun fetchPrice(context: Context, currency: String): String? {
        Log.i(TAG, "Fetching Bitcoin price for currency: $currency")
        val startTime = System.currentTimeMillis()
        
        return try {
            val response = fetchPriceWithResponse(context, currency)
            val duration = System.currentTimeMillis() - startTime
            
            if (response.code == 200) {
                Log.i(TAG, "Successfully fetched price in ${duration}ms: ${response.body}")
                response.body
            } else {
                Log.e(TAG, "Failed to fetch price in ${duration}ms, response code: ${response.code}")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching price for $currency", e)
            null
        }
    }
    
    suspend fun fetchPriceWithResponse(context: Context, currency: String): ApiResponse {
        val startTime = System.currentTimeMillis()
        Log.d(TAG, "Starting price fetch for currency: $currency")
        
        try {
            // Load the currency info from JSON
            val fiatUnitsJson = context.assets.open("fiatUnits.json").bufferedReader().use { it.readText() }
            val json = JSONObject(fiatUnitsJson)
            
            if (!json.has(currency)) {
                Log.e(TAG, "Currency $currency not found in fiatUnits.json")
                return ApiResponse(null, 404)
            }
            
            val currencyInfo = json.getJSONObject(currency)
            val source = currencyInfo.getString("source")
            val endPointKey = currencyInfo.getString("endPointKey")
            
            Log.d(TAG, "Using price source: $source, endpoint key: $endPointKey")

            val urlString = buildURLString(source, endPointKey)
            Log.d(TAG, "Fetching price from URL: $urlString")

            val request = Request.Builder().url(urlString).build()
            val apiStartTime = System.currentTimeMillis()
            
            val response = withContext(Dispatchers.IO) { client.newCall(request).execute() }
            val apiDuration = System.currentTimeMillis() - apiStartTime
            
            val responseCode = response.code
            Log.d(TAG, "Price API response received in ${apiDuration}ms, response code: $responseCode")
            
            if (responseCode == 429) {
                Log.e(TAG, "Rate limited by API ($source). Response code: $responseCode, Headers: ${response.headers}")
                return ApiResponse(null, responseCode)
            }

            if (!response.isSuccessful) {
                Log.e(TAG, "Failed to fetch price from $source. Response code: $responseCode")
                return ApiResponse(null, responseCode)
            }

            val jsonResponse = response.body?.string()
            Log.d(TAG, "Raw response from $source: $jsonResponse")
            
            val parsedResult = if (jsonResponse != null) {
                parseJSONBasedOnSource(jsonResponse, source, endPointKey)
            } else null
            
            val totalDuration = System.currentTimeMillis() - startTime
            if (parsedResult != null) {
                Log.i(TAG, "Successfully parsed price for $currency from $source: $parsedResult (total time: ${totalDuration}ms)")
            } else {
                Log.e(TAG, "Failed to parse price for $currency from $source (total time: ${totalDuration}ms)")
            }
            
            return ApiResponse(parsedResult, responseCode)
        } catch (e: Exception) {
            val totalDuration = System.currentTimeMillis() - startTime
            Log.e(TAG, "Error fetching price for $currency after ${totalDuration}ms: ${e.javaClass.simpleName} - ${e.message}")
            return ApiResponse(null, -1)
        }
    }

    private fun buildURLString(source: String, endPointKey: String): String {
        return if (baseUrl != null) {
            baseUrl + endPointKey
        } else {
            when (source) {
                "Yadio" -> "https://api.yadio.io/json/$endPointKey"
                "YadioConvert" -> "https://api.yadio.io/convert/1/BTC/$endPointKey"
                "Exir" -> "https://api.exir.io/v1/ticker?symbol=btc-irt"
                "coinpaprika" -> "https://api.coinpaprika.com/v1/tickers/btc-bitcoin?quotes=INR"
                "Bitstamp" -> "https://www.bitstamp.net/api/v2/ticker/btc${endPointKey.lowercase()}"
                "Coinbase" -> "https://api.coinbase.com/v2/prices/BTC-${endPointKey.uppercase()}/buy"
                "CoinGecko" -> "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${endPointKey.lowercase()}"
                "BNR" -> "https://www.bnr.ro/nbrfxrates.xml"
                "Kraken" -> "https://api.kraken.com/0/public/Ticker?pair=XXBTZ${endPointKey.uppercase()}"
                "CoinDesk" -> "https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=${endPointKey.uppercase()}"
                else -> "https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=${endPointKey.uppercase()}"
            }
        }
    }

    private fun parseJSONBasedOnSource(jsonString: String, source: String, endPointKey: String): String? {
        return try {
            val json = JSONObject(jsonString)
            when (source) {
                "Yadio" -> json.getJSONObject(endPointKey).getString("price")
                "YadioConvert" -> json.getString("rate")
                "CoinGecko" -> json.getJSONObject("bitcoin").getString(endPointKey.lowercase())
                "Exir" -> json.getString("last")
                "Bitstamp" -> json.getString("last")
                "coinpaprika" -> json.getJSONObject("quotes").getJSONObject("INR").getString("price")
                "Coinbase" -> json.getJSONObject("data").getString("amount")
                "Kraken" -> json.getJSONObject("result").getJSONObject("XXBTZ${endPointKey.uppercase()}").getJSONArray("c").getString(0)
                "CoinDesk" -> {
                    val rate = json.optDouble(endPointKey.uppercase(), -1.0)
                    if (rate < 0) null else rate.toString()
                }
                else -> null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing price", e)
            null
        }
    }
    
    /**
     * Fetch the next block fee from Electrum servers with network awareness
     */
    suspend fun fetchNextBlockFee(context: Context): String {
        val startTime = System.currentTimeMillis()
        Log.i(TAG, "Fetching next block fee from Electrum")
        
        // Initialize ElectrumClient with context if not already done
        electrumClient.initialize(context)
        
        // Set up network status listener
        electrumClient.setNetworkStatusListener(object : ElectrumClient.NetworkStatusListener {
            override fun onNetworkStatusChanged(isConnected: Boolean) {
                Log.d(TAG, "Electrum network status changed: ${if (isConnected) "Connected" else "Disconnected"}")
            }
            
            override fun onConnectionError(error: String) {
                Log.e(TAG, "Electrum connection error: $error")
            }
            
            override fun onConnectionSuccess() {
                Log.d(TAG, "Successfully connected to Electrum server")
            }
        })
        
        try {
            // Check network connectivity first
            if (!NetworkUtils.isNetworkAvailable(context)) {
                Log.e(TAG, "No network connection available for fetching next block fee")
                return ERROR_INDICATOR
            }
            
            // For direct testing with hardcoded value
            val useTestValue = false
            if (useTestValue) {
                Log.w(TAG, "Using TEST VALUE for next block fee")
                return "25"
            }
            
            // First try connecting directly for fee histogram
            Log.d(TAG, "Attempting to connect directly to Electrum server for fee")
            var success = electrumClient.connectToNextAvailable(validateCertificates = false)

            if (success) {
                Log.i(TAG, "Connected to Electrum server: ${ElectrumClient.hardcodedPeers}")
            } else {
                Log.e(TAG, "Failed to connect to any Electrum server on first attempt. Retrying once more.")
            }
            
            if (!success) {
                Log.e(TAG, "Failed to connect to any Electrum server on first attempt. Retrying once more.")
                // Short delay before retry
                delay(1000)
                success = electrumClient.connectToNextAvailable(validateCertificates = false)
                
                if (!success) {
                    Log.e(TAG, "Failed to connect to any Electrum server after retry. Fee unavailable.")
                    return ERROR_INDICATOR
                }
            }
            
            Log.d(TAG, "Successfully connected to Electrum server. Sending fee histogram request")
            val message = "{\"id\": 1, \"method\": \"mempool.get_fee_histogram\", \"params\": []}\n"
            if (!electrumClient.send(message.toByteArray())) {
                Log.e(TAG, "Failed to send fee histogram request. Fee unavailable.")
                return ERROR_INDICATOR
            }
            
            Log.d(TAG, "Waiting for fee histogram response")
            val receivedData = electrumClient.receive()
            if (receivedData.isEmpty()) {
                Log.e(TAG, "Empty response from Electrum server when requesting fee histogram. Fee unavailable.")
                return ERROR_INDICATOR
            }
            
            val jsonString = String(receivedData)
            Log.d(TAG, "Received fee histogram: $jsonString")
            
            try {
                val json = JSONObject(jsonString)
                if (!json.has("result")) {
                    Log.e(TAG, "Invalid fee histogram response - missing 'result' field. Fee unavailable.")
                    return ERROR_INDICATOR
                }
                
                val feeHistogram = json.getJSONArray("result")
                if (feeHistogram.length() == 0) {
                    Log.e(TAG, "Empty fee histogram array. Fee unavailable.")
                    return ERROR_INDICATOR
                }
                
                Log.d(TAG, "Calculating fee from ${feeHistogram.length()} data points")
                
                val feeRate = calculateFeeFromHistogram(feeHistogram, 1)
                if (feeRate <= 0) {
                    Log.e(TAG, "Invalid fee rate calculated: $feeRate. Fee unavailable.")
                    return ERROR_INDICATOR
                }
                
                val formattedFee = feeRate.toInt().toString()
                
                Log.i(TAG, "Successfully calculated next block fee: $formattedFee sat/vB")
                return formattedFee
            } catch (e: Exception) {
                Log.e(TAG, "Error parsing fee histogram JSON: ${e.message}", e)
                return ERROR_INDICATOR
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching next block fee: ${e.message}", e)
            return ERROR_INDICATOR
        } finally {
            electrumClient.close()
        }
    }
    
    /**
     * Calculate the estimated fee from the fee histogram
     * 
     * @param feeHistogram the fee histogram from Electrum
     * @param targetBlocks the target number of blocks to confirm in
     * @return the fee rate in sat/vB that would get confirmed in the target number of blocks
     */
    private fun calculateFeeFromHistogram(feeHistogram: JSONArray, targetBlocks: Int): Double {
        try {
            Log.d(TAG, "Calculating fee from histogram with ${feeHistogram.length()} entries for $targetBlocks blocks")
            
            // Transform histogram - accumulate vsize until we reach the target block size
            val blockSize = 1000000 // 1MB block size
            var totalVsize = 0.0
            val histogramToUse = mutableListOf<Pair<Double, Double>>() // (fee, vsize)
            
            for (i in 0 until feeHistogram.length()) {
                val entry = feeHistogram.getJSONArray(i)
                val feeRate = entry.getDouble(0)
                var vsize = entry.getDouble(1)
                var timeToStop = false
                
                if (totalVsize + vsize >= blockSize * targetBlocks) {
                    // Only take what we need to fill the target block size
                    vsize = blockSize * targetBlocks - totalVsize
                    timeToStop = true
                }
                
                histogramToUse.add(Pair(feeRate, vsize))
                totalVsize += vsize
                
                Log.v(TAG, "Fee entry: rate=$feeRate, vsize=$vsize, accumulated=$totalVsize")
                
                if (timeToStop) break
            }
            
            Log.d(TAG, "Transformed histogram has ${histogramToUse.size} entries with total vsize $totalVsize")
            
            // Create a weighted flat array (similar to the JS implementation)
            val histogramFlat = mutableListOf<Double>()
            for ((fee, vsize) in histogramToUse) {
                // Divide by a factor to keep the array size manageable
                val count = (vsize / 25000.0).toInt().coerceAtLeast(1)
                repeat(count) {
                    histogramFlat.add(fee)
                }
            }
            
            if (histogramFlat.isEmpty()) {
                Log.e(TAG, "Empty flat histogram array")
                return 0.0 // Return 0 to indicate failure, will be caught and converted to ERROR_INDICATOR
            }
            
            // Sort the flat array
            histogramFlat.sort()
            
            // Calculate the median (50th percentile)
            val median = calculatePercentile(histogramFlat, 0.5)
            val result = median.coerceAtLeast(2.0) // Minimum 2 sat/vB
            
            Log.d(TAG, "Calculated median fee rate: $median, final rate: $result sat/vB")
            return result
            
        } catch (e: Exception) {
            Log.e(TAG, "Error calculating fee from histogram: ${e.message}", e)
            return 0.0 // Return 0 to indicate failure, will be caught and converted to ERROR_INDICATOR
        }
    }
    
    /**
     * Calculate the percentile of a sorted list of values
     * 
     * @param sortedValues the sorted list of values
     * @param percentile the percentile to calculate (0.0 - 1.0)
     * @return the percentile value
     */
    private fun calculatePercentile(sortedValues: List<Double>, percentile: Double): Double {
        if (sortedValues.isEmpty()) return 0.0
        
        val index = (percentile * sortedValues.size).toInt().coerceIn(0, sortedValues.size - 1)
        return sortedValues[index]
    }
    
    /**
     * Format price with currency symbol
     */
    fun formatCurrencyAmount(amount: Double, currencyCode: String): String {
        val formatter = NumberFormat.getCurrencyInstance()
        try {
            formatter.currency = Currency.getInstance(currencyCode)
            formatter.maximumFractionDigits = 0 // Ensure no fractional parts
        } catch (e: Exception) {
            Log.e(TAG, "Invalid currency code: $currencyCode", e)
        }
        return formatter.format(amount.toInt()) // Convert to integer before formatting
    }
    
    /**
     * Fetch complete market data including price and next block fee
     */
    suspend fun fetchMarketData(context: Context, currency: String): MarketData {
        val startTime = System.currentTimeMillis()
        Log.i(TAG, "Starting market data fetch for currency: $currency")
        
        val marketData = MarketData(nextBlock = "...", sats = "...", price = "...", rate = 0.0)
        
        try {
            // Check network connectivity first
            if (!NetworkUtils.isNetworkAvailable(context)) {
                Log.e(TAG, "No network connection available for fetching market data")
                return marketData.apply { 
                    nextBlock = ERROR_INDICATOR
                    sats = ERROR_INDICATOR
                    price = ERROR_INDICATOR
                }
            }
            
            // 1. Fetch price
            Log.d(TAG, "Fetching price for $currency")
            val priceStartTime = System.currentTimeMillis()
            val response = fetchPriceWithResponse(context, currency)
            val priceDuration = System.currentTimeMillis() - priceStartTime
            
            if (response.code == 429) {
                Log.e(TAG, "Rate limited by price API, aborting market data fetch")
                throw RateLimitException("Rate limited by price API")
            }
            
            val priceStr = response.body
            if (priceStr != null) {
                val rate = priceStr.toDoubleOrNull() ?: 0.0
                marketData.rate = rate
                Log.d(TAG, "Parsed price rate: $rate")
                
                if (rate > 0) {
                    // Format price with currency symbol - convert to integer
                    marketData.price = formatCurrencyAmount(rate, currency)
                    Log.d(TAG, "Formatted price: ${marketData.price}")
                    
                    // Calculate sats - convert to integer for display
                    val satsValue = ((10 / rate) * 10000000).toInt()
                    marketData.sats = numberFormatter.format(satsValue)
                    Log.d(TAG, "Calculated sats: ${marketData.sats}")
                } else {
                    Log.w(TAG, "Price rate is zero or negative: $rate")
                }
            } else {
                Log.w(TAG, "No price data received")
            }
            
            // 2. Fetch next block fee - Always run this, regardless of price fetch result
            Log.d(TAG, "Fetching next block fee")
            val feeStartTime = System.currentTimeMillis()
            val nextBlockFee = fetchNextBlockFee(context)
            val feeDuration = System.currentTimeMillis() - feeStartTime
            
            Log.d(TAG, "Next block fee fetched in ${feeDuration}ms: $nextBlockFee")
            marketData.nextBlock = nextBlockFee
            Log.i(TAG, "Set nextBlock fee in marketData: ${marketData.nextBlock}")
            
            val totalDuration = System.currentTimeMillis() - startTime
            Log.i(TAG, "Market data fetch completed in ${totalDuration}ms: $marketData")
            
        } catch (e: RateLimitException) {
            Log.e(TAG, "Rate limit exception during market data fetch: ${e.message}")
            throw e
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            Log.e(TAG, "Error fetching market data after ${duration}ms: ${e.javaClass.simpleName} - ${e.message}", e)
        }
        
        return marketData
    }
}