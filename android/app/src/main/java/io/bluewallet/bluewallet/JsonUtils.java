package io.bluewallet.bluewallet;

import android.content.Context;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public class JsonUtils {
    public static JSONObject loadJSONFromAsset(Context context, String fileName) {
        StringBuilder jsonString = new StringBuilder();
        try (InputStream inputStream = context.getAssets().open(fileName);
             BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                jsonString.append(line);
            }
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
        try {
            return new JSONObject(jsonString.toString());
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}
