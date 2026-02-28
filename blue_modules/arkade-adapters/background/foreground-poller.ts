import { AppState, type AppStateStatus } from 'react-native';
import { runTasks } from '@arkade-os/sdk/worker/expo';

import type { TaskRunConfig } from './task-scheduler';

let _intervalId: ReturnType<typeof setInterval> | null = null;
let _appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let _taskFactory: (() => Promise<TaskRunConfig>) | null = null;
let _intervalMs = 30_000;

function _startInterval(): void {
  if (_intervalId) return;
  _intervalId = setInterval(async () => {
    try {
      if (_taskFactory) {
        const config = await _taskFactory();
        await runTasks(config.queue, config.processors, config.deps);
      }
    } catch (error) {
      console.log('[ArkadeSync] Foreground poll error:', error);
    }
  }, _intervalMs);
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
 * Start a `setInterval`-based polling loop that calls `runTasks()`
 * every `intervalMs` milliseconds while the app is in the foreground.
 *
 * Automatically pauses when the app backgrounds and resumes when it
 * comes back to the foreground, avoiding unnecessary battery drain.
 */
export function startPolling(factory: () => Promise<TaskRunConfig>, intervalMs = 30_000): void {
  _taskFactory = factory;
  _intervalMs = intervalMs;

  // Start polling immediately
  _startInterval();

  // Listen for app state changes to pause/resume
  _appStateSubscription = AppState.addEventListener('change', _handleAppStateChange);
}

/**
 * Stop the foreground polling loop and clean up listeners.
 */
export function stopPolling(): void {
  _stopInterval();
  _appStateSubscription?.remove();
  _appStateSubscription = null;
  _taskFactory = null;
}
