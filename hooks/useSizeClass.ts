import { useSizeClass as useSizeClassOriginal, SizeClass } from '../blue_modules/sizeClass';
import type { SizeClassInfo } from '../blue_modules/sizeClass';

export { SizeClass };
export type { SizeClassInfo };

export const useSizeClass = useSizeClassOriginal;

export const useIsLargeScreen = useSizeClassOriginal;
