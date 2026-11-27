package org.neurai.neuraiwallet

import android.content.Context
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkRequest
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/**
 * Fetches the XNA market once for both Neurai widgets and redraws them.
 * Work exists only while a widget is on a home screen (H31): every 15
 * minutes with a network, plus right away when a widget is added or the
 * currency changes. Without a network nothing runs here; the system's widget
 * update (`updatePeriodMillis`) redraws them, marking old data.
 */
class NeuraiWidgetWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "NeuraiWidgetWorker"
        private const val PERIODIC_WORK = "neurai_widget_periodic"
        private const val NOW_WORK = "neurai_widget_now"
        private const val REPEAT_MINUTES = 15L
        /** Work the Bitcoin widgets scheduled; cancelled so it never runs again. */
        private val LEGACY_WORK = listOf(
            "bitcoin_price_widget_update_work",
            "bitcoin_price_network_retry_work",
            "market_widget_update_work",
            "market_network_retry_work",
        )

        private val online = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

        /** Keeps the periodic update while a widget exists, and stops it otherwise. */
        fun schedule(context: Context) {
            val workManager = WorkManager.getInstance(context)
            LEGACY_WORK.forEach { workManager.cancelUniqueWork(it) }
            if (!NeuraiWidgets.hasWidgets(context)) {
                cancelAll(context)
                return
            }
            val periodic = PeriodicWorkRequestBuilder<NeuraiWidgetWorker>(REPEAT_MINUTES, TimeUnit.MINUTES)
                .setConstraints(online)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, WorkRequest.MIN_BACKOFF_MILLIS, TimeUnit.MILLISECONDS)
                .build()
            // UPDATE keeps the schedule and applies changes to a request already queued.
            workManager.enqueueUniquePeriodicWork(PERIODIC_WORK, ExistingPeriodicWorkPolicy.UPDATE, periodic)
        }

        /** One update as soon as there is a network. */
        fun updateNow(context: Context) {
            if (!NeuraiWidgets.hasWidgets(context)) return
            val now = OneTimeWorkRequestBuilder<NeuraiWidgetWorker>()
                .setConstraints(online)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, WorkRequest.MIN_BACKOFF_MILLIS, TimeUnit.MILLISECONDS)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(NOW_WORK, ExistingWorkPolicy.REPLACE, now)
        }

        fun cancelAll(context: Context) {
            val workManager = WorkManager.getInstance(context)
            workManager.cancelUniqueWork(PERIODIC_WORK)
            workManager.cancelUniqueWork(NOW_WORK)
        }
    }

    override suspend fun doWork(): Result {
        val context = applicationContext
        // The last widget may have been removed since this work was queued.
        if (!NeuraiWidgets.hasWidgets(context)) {
            cancelAll(context)
            return Result.success()
        }
        return try {
            val quote = NeuraiMarket.fetch(NeuraiMarket.preferredCurrency(context))
            if (quote != null) NeuraiMarket.store(context, quote)
            NeuraiWidgets.renderAll(context)
            if (quote != null) Result.success() else Result.retry()
        } catch (e: RateLimitException) {
            // Asked to slow down: keep what is shown and wait for the next period.
            Log.w(TAG, "market data rate limited; next try in $REPEAT_MINUTES minutes")
            NeuraiWidgets.renderAll(context)
            Result.success()
        }
    }
}
