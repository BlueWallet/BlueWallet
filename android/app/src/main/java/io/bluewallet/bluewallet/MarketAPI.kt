package io.bluewallet.bluewallet

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

object MarketAPI {

    private const val TAG = "MarketAPI"
    private const val HARD_CODED_JSON = "{\n" +
            "    \"USD\": {\n" +
            "        \"endPointKey\": \"USD\",\n" +
            "        \"locale\": \"en-US\",\n" +
            "        \"source\": \"Kraken\",\n" +
            "        \"symbol\": \"$\",\n" +
            "        \"country\": \"United States (US Dollar)\"\n" +
            "    }\n" +
            "}"
    
    var baseUrl: String? = null

    fun fetchPrice(context: Context, currency: String): String? {
        return try {
            val json = JSONObject(HARD_CODED_JSON)
            val currencyInfo = json.getJSONObject(currency)
            val source = currencyInfo.getString("source")
            val endPointKey = currencyInfo.getString("endPointKey")

            val urlString = buildURLString(source, endPointKey)
            Log.d(TAG, "Fetching price from URL: $urlString")

            val url = URL(urlString)
            val urlConnection = url.openConnection() as HttpURLConnection
            urlConnection.requestMethod = "GET"
            urlConnection.connect()

            val responseCode = urlConnection.responseCode
            if (responseCode != 200) {
                Log.e(TAG, "Failed to fetch price. Response code: $responseCode")
                return null
            }

            val reader = InputStreamReader(urlConnection.inputStream)
            val jsonResponse = StringBuilder()
            val buffer = CharArray(1024)
            var read: Int
            while (reader.read(buffer).also { read = it } != -1) {
                jsonResponse.append(buffer, 0, read)
            }

            parseJSONBasedOnSource(jsonResponse.toString(), source, endPointKey)
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching price", e)
            null
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
                "wazirx" -> "https://api.wazirx.com/api/v2/tickers/btcinr"
                "Bitstamp" -> "https://www.bitstamp.net/api/v2/ticker/btc${endPointKey.lowercase()}"
                "Coinbase" -> "https://api.coinbase.com/v2/prices/BTC-${endPointKey.uppercase()}/buy"
                "CoinGecko" -> "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${endPointKey.lowercase()}"
                "BNR" -> "https://www.bnr.ro/nbrfxrates.xml"
                "Kraken" -> "https://api.kraken.com/0/public/Ticker?pair=XXBTZ${endPointKey.uppercase()}"
                else -> "https://api.coindesk.com/v1/bpi/currentprice/$endPointKey.json"
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
                "wazirx" -> json.getJSONObject("ticker").getString("buy")
                "Coinbase" -> json.getJSONObject("data").getString("amount")
                "Kraken" -> json.getJSONObject("result").getJSONObject("XXBTZ${endPointKey.uppercase()}").getJSONArray("c").getString(0)
                else -> null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing price", e)
            null
        }
    }
}