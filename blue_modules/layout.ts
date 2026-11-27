/** Window width required for the persistent sidebar layout. */
export const WIDE_LAYOUT_MIN_WIDTH = 700;

/**
 * Use the available width instead of the device type so large phones in
 * landscape, tablets, Catalyst, and Android all adapt in the same way.
 */
export const shouldUseWideLayout = (width: number): boolean => width >= WIDE_LAYOUT_MIN_WIDTH;
