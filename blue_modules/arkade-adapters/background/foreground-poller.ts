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
    // runSwapQueue pushes each result into the outbox, so getResults() is the
    // single source of truth across foreground, background, and headless runs.
    await runSwapQueue();

    const outboxResults = await swapTaskQueue.getResults();
    if (outboxResults.length > 0) {
      _onResults?.(outboxResults);
      await swapTaskQueue.acknowledgeResults(outboxResults.map(r => r.id));
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

export interface PollingOptions {
  onResults?: (results: TaskResult[]) => void;
  onTick?: () => void;
  intervalMs?: number;
}

/**
 * Start a `setInterval`-based polling loop that runs the swap task queue
 * while the app is in the foreground. Automatically pauses when the app
 * backgrounds and resumes when it comes back to the foreground.
 *
 * Idempotent — a second call without an intervening `stopPolling()` is a
 * no-op, preventing duplicate AppState listeners on unexpected re-entry.
 */
export function startPolling(opts: PollingOptions = {}): void {
  if (_appStateSubscription) return;

  _onResults = opts.onResults ?? null;
  _onTick = opts.onTick ?? null;
  _intervalMs = opts.intervalMs ?? 30_000;

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
