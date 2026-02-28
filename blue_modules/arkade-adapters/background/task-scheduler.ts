import BackgroundFetch from 'react-native-background-fetch';
import { runTasks, type TaskQueue, type TaskProcessor } from '@arkade-os/sdk/worker/expo';

const TASK_ID = 'io.bluewallet.bluewallet.arkadeSync';

/**
 * Everything `runTasks()` needs to execute a processing cycle.
 * A factory function produces this at call-time so that background
 * invocations (headless JS context, no React tree) can reconstruct
 * the dependency graph on the fly.
 */
export interface TaskRunConfig {
  queue: TaskQueue;
  processors: TaskProcessor[];
  deps: Parameters<typeof runTasks>[2]; // infer the deps type from runTasks
}

// Store a factory that can reconstruct task dependencies at runtime.
// Background tasks may run in a headless context with no React tree.
let _taskFactory: (() => Promise<TaskRunConfig>) | null = null;

/**
 * Register a recurring background fetch that calls `runTasks()`.
 *
 * On iOS the minimum interval is 15 minutes and the OS decides
 * the actual cadence.  On Android `startOnBoot` keeps the task
 * alive across reboots.
 */
export async function registerArkadeBackgroundTask(factory: () => Promise<TaskRunConfig>): Promise<void> {
  _taskFactory = factory;

  await BackgroundFetch.configure(
    {
      minimumFetchInterval: 15, // iOS minimum is 15 min
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
    },
    async (taskId: string) => {
      // Called when background fetch fires
      try {
        if (_taskFactory) {
          const config = await _taskFactory();
          await runTasks(config.queue, config.processors, config.deps);
        }
      } catch (error) {
        console.log('[ArkadeSync] Background task error:', error);
      }
      BackgroundFetch.finish(taskId);
    },
    (taskId: string) => {
      // Called when task times out
      console.log('[ArkadeSync] Task timed out:', taskId);
      BackgroundFetch.finish(taskId);
    },
  );
}

/**
 * Stop the background fetch and clear the factory reference.
 */
export async function unregisterArkadeBackgroundTask(): Promise<void> {
  _taskFactory = null;
  await BackgroundFetch.stop(TASK_ID);
}
