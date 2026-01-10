/**
 * (c) Copyright 2024 by Coinkite Inc. This file is in the public domain.
 *
 * Main entry point for the library.
 */

// import { renderQRImage } from './image.ts';
import { joinQRs } from './join.ts';
import { detectFileType, splitQRs } from './split.ts';

export * from './types';
export { detectFileType, joinQRs, splitQRs };

// EOF
