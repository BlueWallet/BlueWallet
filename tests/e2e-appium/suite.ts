import { Driver, attemptContext, launch, relaunch, saveArtifacts, startVideo, stopVideo } from './driver';

type TestCase = (title: string, body: (driver: Driver) => Promise<void>, timeout?: number) => void;
type CatalystTest = TestCase & { skip: TestCase };

export async function step<T>(label: string, action: () => Promise<T>): Promise<T> {
  const started = Date.now();
  process.stdout.write(`[Catalyst] Step started: ${label}\n`);
  try {
    const result = await action();
    process.stdout.write(`[Catalyst] Step completed: ${label} (${Date.now() - started} ms)\n`);
    return result;
  } catch (error) {
    process.stdout.write(`[Catalyst] Step failed: ${label} (${Date.now() - started} ms)\n`);
    throw error;
  }
}

// Every attempt resets its own app state. Failed attempts also discard the
// WebDriver session, so a crash or timed-out command cannot poison the retry.
export function catalystSuite(name: string, define: (test: CatalystTest) => void) {
  describe(name, () => {
    let driver: Driver | undefined;
    let attemptState: {
      passed: boolean;
      recording: boolean;
      closed: boolean;
      artifactName: string;
    };
    const attempts = new Map<string, number>();
    const runId = Date.now();
    const record = !!process.env.CI || process.env.E2E_RECORD_VIDEO === '1';
    const retries = Number(process.env.E2E_RETRIES ?? 0);
    if (!Number.isInteger(retries) || retries < 0) throw new Error('E2E_RETRIES must be a non-negative integer');
    jest.retryTimes(retries, { logErrorsBeforeRetry: true });

    beforeEach(async () => {
      const title = expect.getState().currentTestName ?? name;
      const attempt = (attempts.get(title) ?? 0) + 1;
      attempts.set(title, attempt);
      attemptState = {
        passed: false,
        recording: false,
        closed: false,
        artifactName: `${runId}-${title}-attempt-${attempt}`,
      };
      process.stdout.write(`[Catalyst] Starting: ${title} (attempt ${attempt}/${retries + 1})\n`);
      driver ??= await launch();
      if (record) {
        await startVideo(driver);
        attemptState.recording = true;
      }
      await relaunch(driver, { reset: true });
    }, 660_000); // The first launch may compile WebDriverAgentMac.

    afterEach(async () => {
      const state = attemptState;
      state.closed = true;
      const attemptDriver = driver;
      if (!attemptDriver) return;
      // Cleanup must retain its own session even if a hook exceeds its deadline.
      if (!state.passed) driver = undefined;
      // Hooks run even when Jest times out the body. A catch inside the body does not.
      try {
        if (!state.passed) await saveArtifacts(attemptDriver, state.artifactName);
      } catch (error) {
        console.warn('[Catalyst] Could not save failure artifacts:', error);
      } finally {
        try {
          if (state.recording) await stopVideo(attemptDriver, state.passed ? undefined : state.artifactName.replace(/\W/g, '-'));
        } catch (error) {
          console.warn('[Catalyst] Could not stop video:', error);
        } finally {
          if (!state.passed) {
            await attemptDriver.deleteSession();
          }
        }
      }
    }, 420_000); // Native log (30s) plus up to six WebDriver requests (60s each).

    afterAll(async () => {
      if (driver) await driver.deleteSession();
    });

    const test: TestCase = (title, body, timeout) => {
      it(
        title,
        async () => {
          if (!driver) throw new Error('Catalyst session was not initialized');
          const state = attemptState;
          await attemptContext.run(state, body, driver);
          if (!state.closed) {
            state.passed = true;
            process.stdout.write(
              `[Catalyst] Passed: ${title} (attempt ${attempts.get(expect.getState().currentTestName ?? name)}/${retries + 1})\n`,
            );
          }
        },
        timeout,
      );
    };
    const skip: TestCase = (title, body, timeout) => it.skip(title, () => body(driver!), timeout);
    define(Object.assign(test, { skip }));
  });
}
