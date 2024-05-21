package io.bluewallet.bluewallet.widget

import android.content.Context
import com.squareup.okhttp.OkHttpClient
import com.squareup.okhttp.Request
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import java.io.IOException

object MarketAPI {

    private val client = OkHttpClient()

    suspend fun fetchPrice(context: Context): MarketData? {
        val json = context.assets.open("fiatUnits.json").bufferedReader().use { it.readText() }
        val fiatInfoMap: Map<String, FiatInfo> = Json.decodeFromString(json)
        val fiatInfo = fiatInfoMap["USD"] ?: return null

        val request = Request.Builder()
            .url("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${fiatInfo.endPointKey}")
            .build()

        return withContext(Dispatchers.IO) {
            try {
                val response = client.newCall(request).execute()
                if (!response.isSuccessful) throw IOException("Unexpected code $response")

                val responseData = response.body()?.string() ?: return@withContext null
                val price = Json.parseToJsonElement(responseData).jsonObject["bitcoin"]?.jsonObject?.get(fiatInfo.endPointKey.lowercase())?.toString() ?: return@withContext null
                MarketData(price = "$${price.trim('"')}", lastUpdate = System.currentTimeMillis().toString())
            } catch (e: IOException) {
                e.printStackTrace()
                null
            }
        }
    }
}
