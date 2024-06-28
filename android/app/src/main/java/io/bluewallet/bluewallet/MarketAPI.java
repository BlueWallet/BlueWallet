package io.bluewallet.bluewallet;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;

public class MarketAPI {

    public static String fetchPrice(Context context, String currency) {
        try {
            // Load the JSON file from assets
            InputStreamReader is = new InputStreamReader(context.getAssets().open("fiatUnits.json"));
            StringBuilder json = new StringBuilder();
            int data = is.read();
            while (data != -1) {
                json.append((char) data);
                data = is.read();
            }
            is.close();

            JSONObject jsonObject = new JSONObject(json.toString());
            JSONObject currencyInfo = jsonObject.getJSONObject(currency);
            String source = currencyInfo.getString("source");
            String endPointKey = currencyInfo.getString("endPointKey");

            String urlString = buildURLString(source, endPointKey);
            URI uri = new URI(urlString);
            URL url = uri.toURL();
            HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
            urlConnection.setRequestMethod("GET");
            urlConnection.connect();

            int responseCode = urlConnection.getResponseCode();
            if (responseCode != 200) {
                return null;
            }

            InputStreamReader reader = new InputStreamReader(urlConnection.getInputStream());
            StringBuilder jsonResponse = new StringBuilder();
            int read;
            char[] buffer = new char[1024];
            while ((read = reader.read(buffer)) != -1) {
                jsonResponse.append(buffer, 0, read);
            }

            return parseJSONBasedOnSource(jsonResponse.toString(), source, endPointKey);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    private static String buildURLString(String source, String endPointKey) {
        switch (source) {
            case "Yadio":
                return "https://api.yadio.io/json/" + endPointKey;
            case "YadioConvert":
                return "https://api.yadio.io/convert/1/BTC/" + endPointKey;
            case "Exir":
                return "https://api.exir.io/v1/ticker?symbol=btc-irt";
            case "wazirx":
                return "https://api.wazirx.com/api/v2/tickers/btcinr";
            case "Bitstamp":
                return "https://www.bitstamp.net/api/v2/ticker/btc" + endPointKey.toLowerCase();
            case "Coinbase":
                return "https://api.coinbase.com/v2/prices/BTC-" + endPointKey.toUpperCase() + "/buy";
            case "CoinGecko":
                return "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=" + endPointKey.toLowerCase();
            case "BNR":
                return "https://www.bnr.ro/nbrfxrates.xml";
            case "Kraken":
                return "https://api.kraken.com/0/public/Ticker?pair=XXBTZ" + endPointKey.toUpperCase();
            default:
                return "https://api.coindesk.com/v1/bpi/currentprice/" + endPointKey + ".json";
        }
    }

    private static String parseJSONBasedOnSource(String jsonString, String source, String endPointKey) {
        try {
            JSONObject json = new JSONObject(jsonString);
            switch (source) {
                case "Yadio":
                    JSONObject rateDict = json.getJSONObject(endPointKey);
                    return rateDict.getString("price");
                case "YadioConvert":
                    return json.getString("rate");
                case "CoinGecko":
                    JSONObject bitcoinDict = json.getJSONObject("bitcoin");
                    return bitcoinDict.getString(endPointKey.toLowerCase());
                case "Exir":
                    return json.getString("last");
                case "Bitstamp":
                    return json.getString("last");
                case "wazirx":
                    JSONObject tickerDict = json.getJSONObject("ticker");
                    return tickerDict.getString("buy");
                case "Coinbase":
                    JSONObject data = json.getJSONObject("data");
                    return data.getString("amount");
                case "Kraken":
                    JSONObject result = json.getJSONObject("result");
                    JSONObject tickerData = result.getJSONObject("XXBTZ" + endPointKey.toUpperCase());
                    JSONArray c = tickerData.getJSONArray("c");
                    return c.getString(0);
                default:
                    return null;
            }
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}