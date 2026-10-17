import { Driver, launch, relaunch, saveArtifacts, startVideo, stopVideo } from './driver';

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

// Every case, and every retry of it, gets its own WebDriver session and a reset app,
// like `device.launchApp({ newInstance: true })` in Detox. The session is deleted after
// the case, so a body that outlived its Jest timeout cannot reach the next case.
export function catalystSuite(name: string, define: (test: CatalystTest) => void) {
  describe(name, () => {
    let driver: Driver | undefined;
    let attempt = { failed: true };
    const record = !!process.env.CI || process.env.E2E_RECORD_VIDEO === '1';
    const retries = Number(process.env.E2E_RETRIES ?? 0);
    if (!Number.isInteger(retries) || retries < 0) throw new Error('E2E_RETRIES must be a non-negative integer');
    jest.retryTimes(retries, { logErrorsBeforeRetry: true });

    beforeEach(async () => {
      attempt = { failed: true };
      driver = await launch();
      if (record) await startVideo(driver);
      await relaunch(driver, { reset: true });
    }, 660_000); // The first launch may compile WebDriverAgentMac.

    afterEach(async () => {
      const session = driver;
      driver = undefined;
      if (!session) return;
      const { failed } = attempt;
      const artifactName = `${Date.now()}-${expect.getState().currentTestName ?? name}`;
      // Hooks run even when Jest times out the body. A catch inside the body does not.
      try {
        if (failed) await saveArtifacts(session, artifactName);
      } catch (error) {
        console.warn('[Catalyst] Could not save failure artifacts:', error);
      } finally {
        try {
          if (record) await stopVideo(session, failed ? artifactName.replace(/\W/g, '-') : undefined);
        } catch (error) {
          console.warn('[Catalyst] Could not stop video:', error);
        } finally {
          await session.deleteSession();
        }
      }
    }, 420_000); // Native log (30s) plus up to six WebDriver requests (60s each).

    const test: TestCase = (title, body, timeout) =>
      it(
        title,
        async () => {
          if (!driver) throw new Error('Catalyst session was not initialized');
          // A body that completes after its timeout only touches its own attempt record.
          const current = attempt;
          await body(driver);
          current.failed = false;
        },
        timeout,
      );
    const skip: TestCase = (title, body, timeout) => it.skip(title, () => body(driver!), timeout);
    define(Object.assign(test, { skip }));
  });
}
