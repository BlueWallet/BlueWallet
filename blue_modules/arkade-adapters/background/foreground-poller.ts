import { AppState, type AppStateStatus } from 'react-native';

import { runSwapQueue } from './task-scheduler';
import { swapTaskQueue } from './swap-queue';
import type { TaskResult } from '@arkade-os/sdk/worker/expo';

let _intervalId: ReturnType<typeof setInterval> | null = null;
let _appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let _intervalMs = 30_000;
let _onResults: ((results: TaskResult[]) => void) | null = null;
let _onTick: (() => void) | null = null;

async function _tick(): Promise<void> {
  try {
    // Run queued tasks
    const results = await runSwapQueue();

    // Consume outbox results (background + foreground)
    const outboxResults = await swapTaskQueue.getResults();
    if (outboxResults.length > 0) {
      if (_onResults) {
        _onResults(outboxResults);
      }
      await swapTaskQueue.acknowledgeResults(outboxResults.map(r => r.id));
    }

    // Also deliver this run's results
    if (results.length > 0 && _onResults) {
      _onResults(results);
    }
  } catch (error) {
    console.log('[ArkadeSync] Foreground poll error:', error);
  }

  _onTick?.();
}

function _startInterval(): void {
  if (_intervalId) return;
  _intervalId = setInterval(_tick, _intervalMs);
}

function _stopInterval(): void {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

function _handleAppStateChange(state: AppStateStatus): void {
  if (state === 'active') {
    _startInterval();
  } else {
    _stopInterval();
  }
}

/**
 * Start a `setInterval`-based polling loop that runs the swap task queue
 * every `intervalMs` milliseconds while the app is in the foreground.
 *
 * Automatically pauses when the app backgrounds and resumes when it
 * comes back to the foreground.
 *
 * @param onResults - Callback invoked with outbox results for UI refresh / notifications.
 * @param intervalMs - Poll interval in milliseconds (default 30s).
 * @param onTick - Callback invoked unconditionally at the end of every tick (for balance polling).
 */
export function startPolling(onResults?: (results: TaskResult[]) => void, intervalMs = 30_000, onTick?: () => void): void {
  _onResults = onResults ?? null;
  _onTick = onTick ?? null;
  _intervalMs = intervalMs;

  _startInterval();

  _appStateSubscription = AppState.addEventListener('change', _handleAppStateChange);
}

/**
 * Stop the foreground polling loop and clean up listeners.
 */
export function stopPolling(): void {
  _stopInterval();
  _appStateSubscription?.remove();
  _appStateSubscription = null;
  _onResults = null;
  _onTick = null;
}
