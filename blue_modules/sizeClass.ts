import { Dimensions, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { useEffect, useState } from 'react';

type NativeSizeClassPayload = {
  horizontal?: number;
  vertical?: number;
};

const sizeClassNativeModule = NativeModules.SizeClassEmitter as
  | {
      getCurrentSizeClass?: () => Promise<NativeSizeClassPayload>;
      addListener: (eventType: string) => any;
      removeListeners: (count: number) => void;
    }
  | undefined;

const sizeClassNativeEmitter = sizeClassNativeModule ? new NativeEventEmitter(sizeClassNativeModule) : null;
const NATIVE_EVENT_NAME = 'sizeClassDidChange';

// Values mirror UIUserInterfaceSizeClass on iOS and Material window-size-class breakpoints on Android.
export enum SizeClass {
  Compact = 0,
  Regular = 1,
  Large = 2,
}

export interface SizeClassInfo {
  horizontalSizeClass: SizeClass;
  verticalSizeClass: SizeClass;
}

const DEFAULT_SIZE_CLASS_INFO: SizeClassInfo = {
  horizontalSizeClass: SizeClass.Compact,
  verticalSizeClass: SizeClass.Regular,
};

const coerceSizeClassValue = (value?: number): SizeClass => {
  if (value === SizeClass.Compact || value === SizeClass.Regular || value === SizeClass.Large) {
    return value;
  }
  return SizeClass.Regular;
};

const normalizeNativePayload = (payload?: NativeSizeClassPayload | null): SizeClassInfo | null => {
  if (!payload) return null;
  return {
    horizontalSizeClass: coerceSizeClassValue(payload.horizontal),
    verticalSizeClass: coerceSizeClassValue(payload.vertical),
  };
};

// Dimensions-based fallback when native module is unavailable (desktop, web, test harness).
const COMPACT_WIDTH_MAX = Platform.OS === 'android' ? 600 : 768;
const MEDIUM_WIDTH_MAX = Platform.OS === 'android' ? 840 : 1024;
const COMPACT_HEIGHT_MAX = Platform.OS === 'android' ? 480 : 480;

const sizeClassFromDimensions = (): SizeClassInfo => {
  const { width, height } = Dimensions.get('window');
  // Use dp-equivalent values (RN Dimensions already returns dp on Android, points on iOS).
  const horizontalSizeClass: SizeClass =
    width < COMPACT_WIDTH_MAX ? SizeClass.Compact : width < MEDIUM_WIDTH_MAX ? SizeClass.Regular : SizeClass.Large;
  const verticalSizeClass: SizeClass = height < COMPACT_HEIGHT_MAX ? SizeClass.Compact : SizeClass.Regular;
  return { horizontalSizeClass, verticalSizeClass };
};

let cachedSizeClassInfo: SizeClassInfo = sizeClassNativeModule ? DEFAULT_SIZE_CLASS_INFO : sizeClassFromDimensions();
let nativeInitRequested = false;

const fetchNativeSizeClass = async (): Promise<SizeClassInfo | null> => {
  if (!sizeClassNativeModule?.getCurrentSizeClass) return null;
  try {
    const result = await sizeClassNativeModule.getCurrentSizeClass();
    return normalizeNativePayload(result);
  } catch (error) {
    console.debug('[SizeClass] Failed to read native size class', error);
    return null;
  }
};

export function getSizeClass(): SizeClassInfo {
  if (!nativeInitRequested && sizeClassNativeModule) {
    nativeInitRequested = true;
    fetchNativeSizeClass().then(info => {
      if (info) cachedSizeClassInfo = info;
    });
  }
  return cachedSizeClassInfo;
}

/**
 * React hook that returns the current horizontal and vertical size classes
 * sourced directly from native UIKit / Android trait system.
 */
export function useSizeClass(): SizeClassInfo {
  const [info, setInfo] = useState<SizeClassInfo>(cachedSizeClassInfo);

  useEffect(() => {
    let mounted = true;

    const apply = (next: SizeClassInfo) => {
      if (!mounted) return;
      cachedSizeClassInfo = next;
      setInfo(next);
    };

    const nativeSub = sizeClassNativeEmitter?.addListener(NATIVE_EVENT_NAME, (payload: NativeSizeClassPayload) => {
      const normalized = normalizeNativePayload(payload);
      if (normalized) apply(normalized);
    });

    // When native module is unavailable, listen to Dimensions changes as fallback.
    const dimensionsSub = !sizeClassNativeModule
      ? Dimensions.addEventListener('change', () => {
          apply(sizeClassFromDimensions());
        })
      : null;

    fetchNativeSizeClass().then(native => {
      if (native) apply(native);
    });

    return () => {
      mounted = false;
      nativeSub?.remove();
      dimensionsSub?.remove();
    };
  }, []);

  return info;
}
