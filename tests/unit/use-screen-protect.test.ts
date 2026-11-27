import { act, cleanup, renderHook } from '@testing-library/react-native';
import { CaptureProtection } from 'react-native-capture-protection';
import { useScreenProtect } from '../../hooks/useScreenProtect';

jest.mock('../../blue_modules/environment', () => ({ isDesktop: false }));

const settle = (ms = 50) => act(() => jest.advanceTimersByTimeAsync(ms));

describe('useScreenProtect', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (CaptureProtection.prevent as jest.Mock).mockClear();
    (CaptureProtection.allow as jest.Mock).mockClear();
  });
  // The holder count lives at module level: unmount everything and let the release run, so each
  // test starts from zero holders and no pending release.
  afterEach(async () => {
    cleanup();
    await jest.advanceTimersByTimeAsync(5000);
    jest.useRealTimers();
  });

  it('reports ready only after protection is on', async () => {
    const { result } = renderHook(() => useScreenProtect());
    expect(result.current.isProtectionReady).toBe(false);

    act(() => {
      result.current.enableScreenProtect();
    });
    await settle();

    expect(CaptureProtection.prevent).toHaveBeenCalledTimes(1);
    expect(result.current.isProtectionReady).toBe(true);
  });

  it('keeps protection on through the closing frames, then lifts it', async () => {
    const { result } = renderHook(() => useScreenProtect());
    act(() => {
      result.current.enableScreenProtect();
    });
    await settle();

    act(() => {
      result.current.disableScreenProtect();
    });
    expect(result.current.isProtectionReady).toBe(false);
    await settle(500);
    expect(CaptureProtection.allow).not.toHaveBeenCalled();
    await settle(600);
    expect(CaptureProtection.allow).toHaveBeenCalledTimes(1);
  });

  it('does not lift protection while another screen still holds it', async () => {
    const a = renderHook(() => useScreenProtect());
    const b = renderHook(() => useScreenProtect());
    act(() => {
      a.result.current.enableScreenProtect();
      b.result.current.enableScreenProtect();
    });
    await settle();

    act(() => {
      a.result.current.disableScreenProtect();
    });
    await settle(2000);
    expect(CaptureProtection.allow).not.toHaveBeenCalled();

    b.unmount();
    await settle(2000);
    expect(CaptureProtection.allow).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending release when a new screen takes protection', async () => {
    const a = renderHook(() => useScreenProtect());
    act(() => {
      a.result.current.enableScreenProtect();
    });
    await settle();
    a.unmount();
    await settle(500);

    const b = renderHook(() => useScreenProtect());
    act(() => {
      b.result.current.enableScreenProtect();
    });
    await settle(2000);
    expect(CaptureProtection.allow).not.toHaveBeenCalled();
    b.unmount();
  });

  // H09: a failed FLAG_SECURE must not be reported as protected.
  it('keeps secrets hidden and reports failure when protection cannot be enabled', async () => {
    (CaptureProtection.prevent as jest.Mock).mockRejectedValue(new Error('no activity'));
    const { result } = renderHook(() => useScreenProtect());
    act(() => {
      result.current.enableScreenProtect();
    });
    await settle(1000);

    expect(CaptureProtection.prevent).toHaveBeenCalledTimes(2); // first try + one automatic retry
    expect(result.current.isProtectionReady).toBe(false);
    expect(result.current.isProtectionFailed).toBe(true);
    (CaptureProtection.prevent as jest.Mock).mockReset().mockResolvedValue(undefined);
  });

  it('becomes ready when the automatic retry succeeds', async () => {
    (CaptureProtection.prevent as jest.Mock).mockRejectedValueOnce(new Error('mid transition')).mockResolvedValue(undefined);
    const { result } = renderHook(() => useScreenProtect());
    act(() => {
      result.current.enableScreenProtect();
    });
    await settle(1000);

    expect(result.current.isProtectionReady).toBe(true);
    expect(result.current.isProtectionFailed).toBe(false);
  });

  it('retries on demand after a failure, without counting the screen twice', async () => {
    (CaptureProtection.prevent as jest.Mock).mockRejectedValue(new Error('no activity'));
    const { result, unmount } = renderHook(() => useScreenProtect());
    act(() => {
      result.current.enableScreenProtect();
    });
    await settle(1000);
    expect(result.current.isProtectionFailed).toBe(true);

    (CaptureProtection.prevent as jest.Mock).mockReset().mockResolvedValue(undefined);
    act(() => {
      result.current.enableScreenProtect(); // the retry button, or regaining focus
    });
    await settle();
    expect(result.current.isProtectionReady).toBe(true);
    expect(result.current.isProtectionFailed).toBe(false);

    unmount();
    await settle(2000);
    expect(CaptureProtection.allow).toHaveBeenCalledTimes(1); // one holder, one release
  });

  it('does not mark a screen ready after it went away during the wait', async () => {
    (CaptureProtection.prevent as jest.Mock).mockRejectedValueOnce(new Error('mid transition')).mockResolvedValue(undefined);
    const { result } = renderHook(() => useScreenProtect());
    act(() => {
      result.current.enableScreenProtect();
    });
    act(() => {
      result.current.disableScreenProtect();
    });
    await settle(1000);
    expect(result.current.isProtectionReady).toBe(false);
    expect(result.current.isProtectionFailed).toBe(false);
  });

  it('ignores a disable from a screen that never enabled', async () => {
    const a = renderHook(() => useScreenProtect());
    const b = renderHook(() => useScreenProtect());
    act(() => {
      a.result.current.enableScreenProtect();
    });
    await settle();

    act(() => {
      b.result.current.disableScreenProtect();
    });
    await settle(2000);
    expect(CaptureProtection.allow).not.toHaveBeenCalled();
    a.unmount();
  });
});
