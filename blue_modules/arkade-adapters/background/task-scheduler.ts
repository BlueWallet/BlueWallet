import BackgroundFetch from 'react-native-background-fetch';
import type { TaskResult } from '@arkade-os/sdk/worker/expo';
import { swapTaskQueue, SWAP_MONITOR_TASK_TYPE } from './swap-queue';
import { swapMonitorProcessor, type SwapProcessorDeps } from './swap-processor';
import type { SwapMonitorPayload } from './swap-queue';
import { BlueApp, LightningArkWallet } from '../../../class';


/**
 * Factory that returns a map of namespace → SwapProcessorDeps.
 * Called on each background/headless wake to get fresh dependencies.
 */
export type DepsFactory = () => Promise<Map<string, SwapProcessorDeps>>;

let _depsFactory: DepsFactory | null = null;

let _runId = 0;

function getRandomId(): string {
  return `${Date.now()}-${++_runId}`;
}

/**
 * Run the swap task queue, dispatching each task to the correct wallet's deps
 * based on the task's namespace.
 */
async function runSwapQueue(): Promise<TaskResult[]> {
  if (!_depsFactory) return [];

  const depsMap = await _depsFactory();
  const tasks = await swapTaskQueue.getTasks(SWAP_MONITOR_TASK_TYPE);
  const results: TaskResult[] = [];

  for (const task of tasks) {
    const payload = task.data as unknown as SwapMonitorPayload;
    const deps = depsMap.get(payload.namespace);

    if (!deps) {
      // No wallet for this namespace (maybe deleted); skip for now, reconcile will clean up
      continue;
    }

    let partial: Omit<TaskResult, 'id' | 'executedAt'>;
    try {
      partial = await swapMonitorProcessor.execute(task, deps);
    } catch (error) {
      partial = {
        taskItemId: task.id,
        type: SWAP_MONITOR_TASK_TYPE,
        status: 'failed',
        data: { error: error instanceof Error ? error.message : String(error) },
      };
    }

    const result: TaskResult = {
      ...partial,
      id: getRandomId(),
      executedAt: Date.now(),
    };

    await swapTaskQueue.pushResult(result);

    // Remove task if swap reached final state
    if (result.data?.isFinal || result.status === 'noop') {
      await swapTaskQueue.removeTask(task.id);
    }

    results.push(result);
  }

  return results;
}

/**
 * Register a recurring background fetch that runs the swap task queue.
 *
 * On iOS the minimum interval is 15 minutes and the OS decides the actual cadence.
 * On Android `startOnBoot` keeps the task alive across reboots.
 */
export async function registerArkadeBackgroundTask(depsFactory: DepsFactory): Promise<void> {
  _depsFactory = depsFactory;

  const status = await BackgroundFetch.configure(
    {
      minimumFetchInterval: 15, // iOS minimum is 15 min
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
    },
    async (taskId: string) => {
      try {
        await runSwapQueue();
      } catch (error) {
        console.log('[ArkadeSync] Background task error:', error);
      }
      BackgroundFetch.finish(taskId);
    },
    (taskId: string) => {
      console.log('[ArkadeSync] Task timed out:', taskId);
      BackgroundFetch.finish(taskId);
    },
  );

  if (status !== BackgroundFetch.STATUS_AVAILABLE) {
    console.log('[ArkadeSync] BackgroundFetch not available, status:', status);
  }
}

/**
 * Stop the background fetch and clear the deps factory reference.
 */
export async function unregisterArkadeBackgroundTask(): Promise<void> {
  _depsFactory = null;
  await BackgroundFetch.stop();
}

/**
 * Build SwapProcessorDeps by loading wallets directly from disk.
 * Used in headless mode where the React tree never mounts and _depsFactory is null.
 */
async function buildDepsFromDisk(): Promise<Map<string, SwapProcessorDeps>> {
  const depsMap = new Map<string, SwapProcessorDeps>();

  try {
    const app = BlueApp.getInstance();

    // Can't prompt for password in headless mode — skip encrypted storage
    if (await app.storageIsEncrypted()) {
      console.log('[ArkadeSync] Storage is encrypted, skipping headless swap processing');
      return depsMap;
    }

    const loaded = await app.loadFromDisk();
    if (!loaded) {
      console.log('[ArkadeSync] Failed to load wallets from disk in headless mode');
      return depsMap;
    }

    const arkWallets = app.wallets.filter(w => w.type === LightningArkWallet.type) as LightningArkWallet[];

    for (const wallet of arkWallets) {
      try {
        await wallet.init();
        const walletDeps = wallet.getProcessorDeps();
        if (walletDeps) {
          depsMap.set(wallet.getNamespace(), walletDeps);
        }
      } catch (error) {
        console.log('[ArkadeSync] Headless: failed to init wallet:', error);
      }
    }
  } catch (error) {
    console.log('[ArkadeSync] Headless: buildDepsFromDisk failed:', error);
  }

  return depsMap;
}

/**
 * Headless task handler for Android — runs after app termination.
 *
 * Must be registered at global scope in index.js via
 * `BackgroundFetch.registerHeadlessTask(headlessSwapTask)`.
 */
export async function headlessSwapTask({ taskId }: { taskId: string }): Promise<void> {
  try {
    // In headless mode the React tree never mounts, so _depsFactory is null.
    // Bootstrap deps from disk so runSwapQueue() can actually process swaps.
    if (!_depsFactory) {
      _depsFactory = buildDepsFromDisk;
    }

    await runSwapQueue();
  } catch (error) {
    console.log('[ArkadeSync] Headless task error:', error);
  }
  BackgroundFetch.finish(taskId);
}

/**
 * Run the swap queue on demand (used by the foreground poller).
 * Returns the results for outbox consumption.
 */
export { runSwapQueue };
