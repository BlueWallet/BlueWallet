package io.bluewallet.bluewallet

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL

object MarketAPI {

    private const val HARD_CODED_JSON = """
        {
            "USD": {
                "endPointKey": "USD",
                "locale": "en-US",
                "source": "Kraken",
                "symbol": "$",
                "country": "United States (US Dollar)"
            }
        }
    """

    fun fetchPrice(context: Context, currency: String): String? {
        return try {
            val json = JSONObject(HARD_CODED_JSON)
            val currencyInfo = json.getJSONObject(currency)
            val source = currencyInfo.getString("source")
            val endPointKey = currencyInfo.getString("endPointKey")

            val urlString = buildURLString(source, endPointKey)
            Log.d("MarketAPI", "Fetching price from: $urlString")
            URI(urlString).toURL().run {
                (openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connect()
                }.run {
                    if (responseCode != HttpURLConnection.HTTP_OK) return null

                    InputStreamReader(inputStream).use { reader ->
                        val jsonResponse = StringBuilder()
                        val buffer = CharArray(1024)
                        var read: Int
                        while (reader.read(buffer).also { read = it } != -1) {
                            jsonResponse.append(buffer, 0, read)
                        }
                        parseJSONBasedOnSource(jsonResponse.toString(), source, endPointKey)
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    private fun buildURLString(source: String, endPointKey: String): String {
        return when (source) {
            "Yadio" -> "https://api.yadio.io/json/$endPointKey"
            "YadioConvert" -> "https://api.yadio.io/convert/1/BTC/$endPointKey"
            "Exir" -> "https://api.exir.io/v1/ticker?symbol=btc-irt"
            "wazirx" -> "https://api.wazirx.com/api/v2/tickers/btcinr"
            "Bitstamp" -> "https://www.bitstamp.net/api/v2/ticker/btc${endPointKey.toLowerCase()}"
            "Coinbase" -> "https://api.coinbase.com/v2/prices/BTC-${endPointKey.toUpperCase()}/buy"
            "CoinGecko" -> "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${endPointKey.toLowerCase()}"
            "BNR" -> "https://www.bnr.ro/nbrfxrates.xml"
            "Kraken" -> "https://api.kraken.com/0/public/Ticker?pair=XXBTZ${endPointKey.toUpperCase()}"
            else -> "https://api.coindesk.com/v1/bpi/currentprice/$endPointKey.json"
        }
    }

    private fun parseJSONBasedOnSource(jsonString: String, source: String, endPointKey: String): String? {
        return try {
            val json = JSONObject(jsonString)
            when (source) {
                "Yadio" -> json.getJSONObject(endPointKey).getString("price")
                "YadioConvert" -> json.getString("rate")
                "CoinGecko" -> json.getJSONObject("bitcoin").getString(endPointKey.toLowerCase())
                "Exir", "Bitstamp" -> json.getString("last")
                "wazirx" -> json.getJSONObject("ticker").getString("buy")
                "Coinbase" -> json.getJSONObject("data").getString("amount")
                "Kraken" -> json.getJSONObject("result").getJSONObject("XXBTZ${endPointKey.toUpperCase()}").getJSONArray("c").getString(0)
                else -> null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
