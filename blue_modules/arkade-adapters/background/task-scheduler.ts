import BackgroundFetch from "react-native-background-fetch";

const TASK_ID = "io.bluewallet.bluewallet.arkadeSync";

/** Async callback executed each time the background fetch or foreground poll fires. */
export type SyncCallback = () => Promise<void>;

let _syncCallback: SyncCallback | null = null;

/**
 * Register a recurring background fetch that calls `syncCallback`.
 *
 * On iOS the minimum interval is 15 minutes and the OS decides
 * the actual cadence.  On Android `startOnBoot` keeps the task
 * alive across reboots.
 */
export async function registerArkadeBackgroundTask(
  syncCallback: SyncCallback,
): Promise<void> {
  _syncCallback = syncCallback;

  await BackgroundFetch.configure(
    {
      minimumFetchInterval: 15, // iOS minimum is 15 min
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
    },
    async (taskId: string) => {
      try {
        if (_syncCallback) {
          await _syncCallback();
        }
      } catch (error) {
        console.log("[ArkadeSync] Background task error:", error);
      }
      BackgroundFetch.finish(taskId);
    },
    (taskId: string) => {
      console.log("[ArkadeSync] Task timed out:", taskId);
      BackgroundFetch.finish(taskId);
    },
  );
}

/**
 * Stop the background fetch and clear the callback reference.
 */
export async function unregisterArkadeBackgroundTask(): Promise<void> {
  _syncCallback = null;
  await BackgroundFetch.stop(TASK_ID);
}
