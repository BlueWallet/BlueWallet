import { AppState, AppStateStatus, Dimensions, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { isDesktop } from './environment';

type NativeSizeClassPayload = {
  horizontal?: number;
  vertical?: number;
  sizeClass?: number;
  orientation?: string;
  isLargeScreen?: boolean;
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

// Size class definitions following iOS conventions
export enum SizeClass {
  Compact, // Small size (iPhone width or height in landscape)
  Regular, // Standard size (iPad, or iPhone height in portrait)
  Large, // Additional size for larger screens (not in iOS, but useful for our app)
}

// Interface for the result of getSizeClass
export interface SizeClassInfo {
  // Size classes
  horizontalSizeClass: SizeClass;
  verticalSizeClass: SizeClass;

  // Overall size class (derived from horizontal and vertical)
  sizeClass: SizeClass;

  // Orientation
  orientation: 'portrait' | 'landscape';

  // Helper properties
  isCompact: boolean;
  isLarge: boolean;

  // Legacy support
  isLargeScreen: boolean;
}

const normalizeOrientation = (orientation?: string): 'portrait' | 'landscape' => (orientation === 'landscape' ? 'landscape' : 'portrait');

const coerceSizeClassValue = (value?: number): SizeClass => {
  if (value === SizeClass.Compact || value === SizeClass.Regular || value === SizeClass.Large) {
    return value;
  }
  return SizeClass.Regular;
};

const calculateFromDimensions = (): SizeClassInfo => {
  const { width, height } = Dimensions.get('window');
  const isLandscape = width > height;
  const orientation = isLandscape ? 'landscape' : 'portrait';

  const horizontalSizeClass =
    Platform.OS === 'ios' && Platform.isPad
      ? SizeClass.Regular
      : isDesktop
        ? SizeClass.Large
        : isLandscape && width >= 667
          ? SizeClass.Regular
          : SizeClass.Compact;

  const verticalSizeClass =
    Platform.OS === 'ios' && Platform.isPad
      ? SizeClass.Regular
      : isDesktop
        ? SizeClass.Large
        : isLandscape
          ? SizeClass.Compact
          : SizeClass.Regular;

  const sizeClass = coerceSizeClassValue(horizontalSizeClass);
  const isLargeScreen = sizeClass === SizeClass.Large;

  return {
    horizontalSizeClass,
    verticalSizeClass,
    sizeClass,
    orientation,
    isCompact: sizeClass === SizeClass.Compact,
    isLarge: sizeClass === SizeClass.Large,
    isLargeScreen,
  };
};

const normalizeNativePayload = (payload?: NativeSizeClassPayload | null): SizeClassInfo | null => {
  if (!payload) {
    return null;
  }

  const horizontalSizeClass = coerceSizeClassValue(payload.horizontal);
  const verticalSizeClass = coerceSizeClassValue(payload.vertical);
  const sizeClass = coerceSizeClassValue(payload.sizeClass);

  const isLargeScreen = payload.isLargeScreen ?? sizeClass === SizeClass.Large;
  const orientation = normalizeOrientation(payload.orientation);

  return {
    horizontalSizeClass,
    verticalSizeClass,
    sizeClass,
    orientation,
    isCompact: sizeClass === SizeClass.Compact,
    isLarge: sizeClass === SizeClass.Large,
    isLargeScreen,
  };
};

let cachedSizeClassInfo: SizeClassInfo = calculateFromDimensions();
let nativeInitRequested = false;

const fetchNativeSizeClass = async (): Promise<SizeClassInfo | null> => {
  if (!sizeClassNativeModule?.getCurrentSizeClass) {
    return null;
  }

  try {
    const result = await sizeClassNativeModule.getCurrentSizeClass();
    return normalizeNativePayload(result);
  } catch (error) {
    console.debug('[SizeClass] Failed to read native size class', error);
    return null;
  }
};

/**
 * Get current size class information.
 */
export function getSizeClass(): SizeClassInfo {
  if (!sizeClassNativeModule) {
    cachedSizeClassInfo = calculateFromDimensions();
  } else if (!nativeInitRequested) {
    nativeInitRequested = true;
    fetchNativeSizeClass().then(nativeInfo => {
      if (nativeInfo) {
        cachedSizeClassInfo = nativeInfo;
      }
    });
  }

  return cachedSizeClassInfo;
}

/**
 * React hook to use size classes in components
 */
export function useSizeClass(): SizeClassInfo {
  const [sizeClassInfo, setSizeClassInfo] = useState<SizeClassInfo>(cachedSizeClassInfo);

  useEffect(() => {
    let isMounted = true;

    const applySizeClass = (info: SizeClassInfo) => {
      if (!isMounted) return;
      cachedSizeClassInfo = info;
      setSizeClassInfo(info);
      console.debug(
        `[SizeClass] Updated:`,
        `horizontal=${SizeClass[info.horizontalSizeClass]}`,
        `vertical=${SizeClass[info.verticalSizeClass]}`,
        `orientation=${info.orientation}`,
        `isLargeScreen=${info.isLargeScreen}`,
      );
    };

    const updateFromDimensions = () => {
      const calculated = calculateFromDimensions();
      applySizeClass(calculated);
    };

    const requestNativeUpdate = async () => {
      const nativeInfo = await fetchNativeSizeClass();
      if (nativeInfo) {
        applySizeClass(nativeInfo);
      }
    };

    const dimensionSubscription = Dimensions.addEventListener('change', () => {
      updateFromDimensions();
      requestNativeUpdate();
    });

    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        requestNativeUpdate();
      }
    });

    const nativeSubscription = sizeClassNativeEmitter?.addListener(NATIVE_EVENT_NAME, (payload: NativeSizeClassPayload) => {
      const normalized = normalizeNativePayload(payload);
      if (normalized) {
        applySizeClass(normalized);
      }
    });

    // Kick off an initial native fetch to override the heuristic when available.
    requestNativeUpdate();

    return () => {
      isMounted = false;
      dimensionSubscription.remove();
      appStateSubscription.remove();
      nativeSubscription?.remove();
    };
  }, []);

  return sizeClassInfo;
}
