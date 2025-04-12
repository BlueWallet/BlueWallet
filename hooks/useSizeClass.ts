// This file reexports from the main sizeClass module for backward compatibility
import { useSizeClass as useSizeClassOriginal, SizeClass, useIsLargeScreen } from '../blue_modules/sizeClass';
import type { SizeClassInfo } from '../blue_modules/sizeClass';

export { SizeClass, useIsLargeScreen };
export type { SizeClassInfo };

// Main hook
export const useSizeClass = useSizeClassOriginal;
