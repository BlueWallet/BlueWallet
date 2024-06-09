package io.bluewallet.bluewallet;

import org.json.JSONArray;
import org.json.JSONObject;

public class MarketAPI {

    public static String buildURLString(String source, String endPointKey) {
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

    public static String parsePriceFromJSON(JSONObject jsonObject, String source, String endPointKey) throws Exception {
        switch (source) {
            case "Yadio":
                JSONObject rateDict = jsonObject.getJSONObject(endPointKey);
                return rateDict.getString("price");
            case "YadioConvert":
                return jsonObject.getString("rate");
            case "CoinGecko":
                JSONObject bitcoinDict = jsonObject.getJSONObject("bitcoin");
                return bitcoinDict.getString(endPointKey.toLowerCase());
            case "Exir":
                return jsonObject.getString("last");
            case "Bitstamp":
                return jsonObject.getString("last");
            case "wazirx":
                JSONObject tickerDict = jsonObject.getJSONObject("ticker");
                return tickerDict.getString("buy");
            case "Coinbase":
                JSONObject data = jsonObject.getJSONObject("data");
                return data.getString("amount");
            case "Kraken":
                JSONObject result = jsonObject.getJSONObject("result");
                JSONObject tickerData = result.getJSONObject("XXBTZ" + endPointKey.toUpperCase());
                JSONArray c = tickerData.getJSONArray("c");
                return c.getString(0);
            default:
                JSONObject bpi = jsonObject.getJSONObject("bpi");
                JSONObject currency = bpi.getJSONObject(endPointKey);
                return currency.getString("rate_float");
        }
    }
}
