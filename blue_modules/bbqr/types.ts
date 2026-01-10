/**
 * (c) Copyright 2024 by Coinkite Inc. This file is in the public domain.
 *
 * Types
 */

import { ENCODING_NAMES, FILETYPE_NAMES, QR_DATA_CAPACITY } from './consts';

export type FileType = keyof typeof FILETYPE_NAMES;
export type Encoding = keyof typeof ENCODING_NAMES;
export type Version = keyof typeof QR_DATA_CAPACITY;

export type SplitOptions = {
  /**
   * The encoding to use for the split.
   * @default 'Z'
   */
  encoding?: Encoding;
  /**
   * The minimum number of QR codes to use.
   * @default 1
   */
  minSplit?: number;
  /**
   * The maximum number of QR codes to use.
   * @default 1295
   */
  maxSplit?: number;
  /**
   * The minimum version of QR code to use.
   * @default 5
   */
  minVersion?: Version;
  /**
   * The maximum version of QR code to use.
   * @default 40
   */
  maxVersion?: Version;
};

export type SplitResult = {
  version: Version;
  parts: string[];
  encoding: Encoding;
};

export type JoinResult = {
  fileType: string;
  encoding: Encoding;
  raw: Uint8Array;
};

export type ImageOptions = {
  /**
   * The type of PNG image to render:
   *
   * - `animated`: An animated PNG (APNG) with a delay between frames.
   * - `stacked`: A single PNG image with QR codes stacked vertically.
   *
   * @default `animated`
   */
  mode?: 'animated' | 'stacked';
  /**
   * The delay between frames in the animated PNG in milliseconds.
   * Ignored if `mode` is `stacked`.
   * @default 250
   */
  frameDelay?: number;
  /**
   * Whether to randomize the order of the parts.
   * Ignored if `mode` is `stacked`.
   * @default false.
   */
  randomizeOrder?: boolean;
  /**
   * The scale factor of of the QR code images.
   * A scale of 1 means 1 pixel per QR module (black dot).
   * @default 4
   */
  scale?: number;
  /**
   * The margin or "quiet zone" around the QR code.
   * Numeric values are interpreted as number of modules.
   * Percentage values like `10%` are interpreted as a percentage of the QR code size.
   * @default 4
   */
  margin?: number | `${number}%`;
};

// EOF
