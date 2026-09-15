package io.bluewallet.bluewallet

import android.app.appsearch.AppSearchManager
import android.app.appsearch.AppSearchSchema
import android.app.appsearch.AppSearchSession
import android.app.appsearch.BatchResultCallback
import android.app.appsearch.GenericDocument
import android.app.appsearch.PutDocumentsRequest
import android.app.appsearch.RemoveByDocumentIdRequest
import android.app.appsearch.ReportUsageRequest
import android.app.appsearch.SearchSpec
import android.app.appsearch.SetSchemaRequest
import android.content.Context
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Promise
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.util.concurrent.Executor

@RequiresApi(Build.VERSION_CODES.S)
internal object AndroidAppSearchIndex {
    private const val TAG = "BlueWalletAppSearch"
    private const val DATABASE = "bluewallet"
    private const val NAMESPACE = "bluewallet"
    private const val SCHEMA = "BlueWalletItem"
    private const val STATE_PREFERENCES = "bluewallet_app_search"
    private const val STATE_KEY = "fingerprints"
    private val executor = Executor { command -> command.run() }

    private val schema: AppSearchSchema = AppSearchSchema.Builder(SCHEMA)
        .addProperty(searchableString("name", AppSearchSchema.PropertyConfig.CARDINALITY_REQUIRED))
        .addProperty(searchableString("description", AppSearchSchema.PropertyConfig.CARDINALITY_OPTIONAL))
        .addProperty(searchableString("keywords", AppSearchSchema.PropertyConfig.CARDINALITY_REPEATED))
        .addProperty(unindexedString("url", AppSearchSchema.PropertyConfig.CARDINALITY_REQUIRED))
        .addProperty(unindexedString("domain", AppSearchSchema.PropertyConfig.CARDINALITY_REQUIRED))
        .build()

    fun replace(context: Context, itemsJson: String, promise: Promise) {
        val parsed = try {
            parseItems(itemsJson)
        } catch (error: Exception) {
            promise.reject("app_search_invalid_json", error.message, error)
            return
        }

        openSession(context) { session, error ->
            if (error != null || session == null) {
                promise.reject("app_search_open_failed", error?.message, error)
                return@openSession
            }

            val schemaRequest = SetSchemaRequest.Builder()
                .addSchemas(schema)
                .setSchemaTypeDisplayedBySystem(SCHEMA, true)
                .build()
            session.setSchema(schemaRequest, executor, executor) { schemaResult ->
                if (!schemaResult.isSuccess) {
                    session.close()
                    promise.reject("app_search_schema_failed", schemaResult.errorMessage)
                    return@setSchema
                }
                synchronize(context, session, parsed, promise)
            }
        }
    }

    fun delete(context: Context, promise: Promise) {
        openSession(context) { session, error ->
            if (error != null || session == null) {
                promise.reject("app_search_open_failed", error?.message, error)
                return@openSession
            }
            val searchSpec = SearchSpec.Builder().addFilterNamespaces(NAMESPACE).build()
            session.remove("", searchSpec, executor) { result ->
                context.getSharedPreferences(STATE_PREFERENCES, Context.MODE_PRIVATE).edit().remove(STATE_KEY).apply()
                session.close()
                if (result.isSuccess) promise.resolve(null) else promise.reject("app_search_delete_failed", result.errorMessage)
            }
        }
    }

    fun reportUsage(context: Context, identifier: String) {
        openSession(context) { session, error ->
            if (error != null || session == null) {
                Log.w(TAG, "Unable to open AppSearch for usage reporting", error)
                return@openSession
            }
            val request = ReportUsageRequest.Builder(NAMESPACE, identifier)
                .setUsageTimestampMillis(System.currentTimeMillis())
                .build()
            session.reportUsage(request, executor) { result ->
                if (!result.isSuccess) Log.w(TAG, "Unable to report AppSearch usage: ${result.errorMessage}")
                session.close()
            }
        }
    }

    private fun synchronize(context: Context, session: AppSearchSession, parsed: ParsedItems, promise: Promise) {
        val preferences = context.getSharedPreferences(STATE_PREFERENCES, Context.MODE_PRIVATE)
        val previous = decodeFingerprints(preferences.getString(STATE_KEY, null))
        val changed = parsed.documents.filter { previous[it.id] != parsed.fingerprints[it.id] }
        val removed = previous.keys - parsed.fingerprints.keys

        putDocuments(session, changed) { putError ->
            if (putError != null) {
                session.close()
                promise.reject("app_search_index_failed", putError.message, putError)
                return@putDocuments
            }
            removeDocuments(session, removed) { removeError ->
                if (removeError != null) {
                    session.close()
                    promise.reject("app_search_delete_failed", removeError.message, removeError)
                    return@removeDocuments
                }
                preferences.edit().putString(STATE_KEY, JSONObject(parsed.fingerprints as Map<*, *>).toString()).apply()
                session.close()
                Log.d(TAG, "Indexed ${changed.size} changed items; removed ${removed.size}; total ${parsed.documents.size}")
                promise.resolve(parsed.documents.size)
            }
        }
    }

    private fun putDocuments(session: AppSearchSession, documents: List<GenericDocument>, completion: (Exception?) -> Unit) {
        if (documents.isEmpty()) {
            completion(null)
            return
        }
        val request = PutDocumentsRequest.Builder().addGenericDocuments(documents).build()
        session.put(request, executor, batchCallback("index", completion))
    }

    private fun removeDocuments(session: AppSearchSession, identifiers: Set<String>, completion: (Exception?) -> Unit) {
        if (identifiers.isEmpty()) {
            completion(null)
            return
        }
        val request = RemoveByDocumentIdRequest.Builder(NAMESPACE).addIds(identifiers).build()
        session.remove(request, executor, batchCallback("delete", completion))
    }

    private fun batchCallback(operation: String, completion: (Exception?) -> Unit) =
        object : BatchResultCallback<String, Void> {
            override fun onResult(result: android.app.appsearch.AppSearchBatchResult<String, Void>) {
                val failure = result.failures.values.firstOrNull()
                completion(failure?.let { IllegalStateException("AppSearch $operation failed: ${it.errorMessage}") })
            }

            override fun onSystemError(error: Throwable?) {
                completion(Exception("AppSearch $operation failed", error))
            }
        }

    private fun openSession(context: Context, completion: (AppSearchSession?, Exception?) -> Unit) {
        val manager = context.getSystemService(AppSearchManager::class.java)
        val searchContext = AppSearchManager.SearchContext.Builder(DATABASE).build()
        manager.createSearchSession(searchContext, executor) { result ->
            if (result.isSuccess) completion(result.resultValue, null)
            else completion(null, IllegalStateException(result.errorMessage))
        }
    }

    private fun parseItems(itemsJson: String): ParsedItems {
        val array = JSONArray(itemsJson)
        val documents = ArrayList<GenericDocument>(array.length())
        val fingerprints = LinkedHashMap<String, String>(array.length())
        repeat(array.length()) { index ->
            val item = array.getJSONObject(index)
            val identifier = item.getString("identifier")
            val title = item.getString("title")
            val description = item.optString("description")
            val keywordsJson = item.optJSONArray("keywords") ?: JSONArray()
            val keywords = Array(keywordsJson.length()) { keywordIndex -> keywordsJson.getString(keywordIndex) }
            val url = deepLinkFor(identifier) ?: return@repeat
            val builder = GenericDocument.Builder<GenericDocument.Builder<*>>(NAMESPACE, identifier, SCHEMA)
                .setPropertyString("name", title)
                .setPropertyString("url", url)
                .setPropertyString("domain", item.getString("domain"))
                .setScore(item.optInt("rankingHint", 0))
            if (description.isNotEmpty()) builder.setPropertyString("description", description)
            if (keywords.isNotEmpty()) builder.setPropertyString("keywords", *keywords)
            if (item.has("lastUsedAt")) builder.setCreationTimestampMillis(item.getLong("lastUsedAt") * 1000)
            documents.add(builder.build())
            fingerprints[identifier] = sha256(item.toString())
        }
        return ParsedItems(documents, fingerprints)
    }

    private fun deepLinkFor(identifier: String): String? {
        val parts = identifier.split(":", limit = 3)
        return when {
            parts.size == 2 && parts[0] == "wallet" -> Uri.Builder().scheme("bluewallet").authority("wallet").appendPath(parts[1]).build().toString()
            parts.size == 3 && parts[0] == "transaction" -> Uri.Builder().scheme("bluewallet").authority("transaction")
                .appendQueryParameter("walletID", parts[1]).appendQueryParameter("txid", parts[2]).build().toString()
            parts.size == 2 && parts[0] == "contact" -> Uri.Builder().scheme("bluewallet").authority("contact")
                .appendQueryParameter("paymentCode", parts[1]).build().toString()
            else -> null
        }
    }

    private fun decodeFingerprints(value: String?): Map<String, String> {
        if (value == null) return emptyMap()
        return try {
            val json = JSONObject(value)
            json.keys().asSequence().associateWith { json.getString(it) }
        } catch (_: Exception) {
            emptyMap()
        }
    }

    private fun sha256(value: String): String = MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray())
        .joinToString("") { "%02x".format(it) }

    private fun searchableString(name: String, cardinality: Int) = AppSearchSchema.StringPropertyConfig.Builder(name)
        .setCardinality(cardinality)
        .setIndexingType(AppSearchSchema.StringPropertyConfig.INDEXING_TYPE_PREFIXES)
        .setTokenizerType(AppSearchSchema.StringPropertyConfig.TOKENIZER_TYPE_PLAIN)
        .build()

    private fun unindexedString(name: String, cardinality: Int) = AppSearchSchema.StringPropertyConfig.Builder(name)
        .setCardinality(cardinality)
        .setIndexingType(AppSearchSchema.StringPropertyConfig.INDEXING_TYPE_NONE)
        .setTokenizerType(AppSearchSchema.StringPropertyConfig.TOKENIZER_TYPE_NONE)
        .build()

    private data class ParsedItems(val documents: List<GenericDocument>, val fingerprints: Map<String, String>)
}
