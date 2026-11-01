import { isDesktop } from './environment';

/** Shortest window edge required for the persistent sidebar layout. */
export const WIDE_LAYOUT_MIN_LENGTH = 744;

export const shouldUseWideLayout = (width: number, height: number, desktop = isDesktop): boolean =>
  desktop || Math.min(width, height) >= WIDE_LAYOUT_MIN_LENGTH;
