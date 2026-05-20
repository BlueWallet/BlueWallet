import Clipboard from '@react-native-clipboard/clipboard';
import { encodeQR } from 'qr';
import React, { useCallback, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import Share from 'react-native-share';
import Svg, { Defs, Image as SvgImage, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import loc from '../loc';
import { ActionIcons } from '../typings/ActionIcons';
import ToolTipMenu from './TooltipMenu';
import { Action } from './types';

type ErrorCorrectionLevel = 'H' | 'Q' | 'M' | 'L';

interface QRCodeProps {
  value: string;
  size: number;
  isLogoRendered?: boolean;
  isMenuAvailable?: boolean;
  logoSize?: number;
  ecl?: ErrorCorrectionLevel;
  onError?: (error?: unknown) => void;
}

const GRADIENT_ID = 'qrgrad';
const GRADIENT_STOP_1 = '#0c2550';
const GRADIENT_STOP_2 = '#1e3a8a';
const BACKGROUND = '#FFFFFF';
const LOGO_BACKGROUND = '#FFFFFF';

const eclMap: Record<ErrorCorrectionLevel, 'low' | 'medium' | 'quartile' | 'high'> = {
  L: 'low',
  M: 'medium',
  Q: 'quartile',
  H: 'high',
};

const actionIcons: { [key: string]: ActionIcons } = {
  Copy: { iconValue: 'doc.on.doc' },
  Share: { iconValue: 'square.and.arrow.up' },
};

const actionKeys = { Copy: 'copy', Share: 'share' };

// Copy-as-image is iOS/macOS-only — @react-native-clipboard/clipboard's setImage
// is not implemented on Android. Android users still get text-copy via the
// dedicated CopyTextToClipboard control rendered next to the QR on every screen.
const menuActions: Action[] =
  Platform.OS === 'ios' || Platform.OS === 'macos'
    ? [
        { id: actionKeys.Copy, text: loc.transactions.details_copy, icon: actionIcons.Copy },
        { id: actionKeys.Share, text: loc.receive.details_share, icon: actionIcons.Share },
      ]
    : [{ id: actionKeys.Share, text: loc.receive.details_share, icon: actionIcons.Share }];

const roundUpToOdd = (n: number): number => {
  const rounded = Math.ceil(n);
  return rounded % 2 === 0 ? rounded + 1 : rounded;
};

const MATRIX_CACHE_MAX = 128;
const matrixCache = new Map<string, boolean[][]>();

const getCachedMatrix = (value: string, ecl: ErrorCorrectionLevel): boolean[][] => {
  const key = `${ecl}|${value}`;
  const hit = matrixCache.get(key);
  if (hit) {
    matrixCache.delete(key);
    matrixCache.set(key, hit);
    return hit;
  }
  const m = encodeQR(value, 'raw', { ecc: eclMap[ecl], border: 0 });
  matrixCache.set(key, m);
  if (matrixCache.size > MATRIX_CACHE_MAX) {
    const first = matrixCache.keys().next().value;
    if (first !== undefined) matrixCache.delete(first);
  }
  return m;
};

type RenderPlan = {
  N: number;
  cell: number;
  dataPath: string;
  finderOrigins: Array<[number, number]>;
  logoCells: number;
  logoStart: number;
};

const PLAN_CACHE_MAX = 64;
const planCache = new Map<string, RenderPlan>();

const getCachedPlan = (value: string, ecl: ErrorCorrectionLevel, size: number, isLogoRendered: boolean, logoSize: number): RenderPlan => {
  const key = `${ecl}|${size}|${isLogoRendered ? 'L' + logoSize : 'NL'}|${value}`;
  const hit = planCache.get(key);
  if (hit) {
    planCache.delete(key);
    planCache.set(key, hit);
    return hit;
  }

  const matrix = getCachedMatrix(value, ecl);
  const N = matrix.length;
  const cell = size / (N + 2);

  let logoCells = 0;
  let logoStart = 0;
  if (isLogoRendered) {
    const desired = (logoSize + cell) / cell;
    logoCells = Math.min(roundUpToOdd(desired), N);
    logoStart = Math.floor((N - logoCells) / 2);
  }
  const logoEnd = logoStart + logoCells;

  const finderOrigins: Array<[number, number]> =
    N >= 7
      ? [
          [0, 0],
          [0, N - 7],
          [N - 7, 0],
        ]
      : [];
  const isInsideFinder = (r: number, c: number): boolean =>
    finderOrigins.some(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7);

  let dataPath = '';
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!matrix[r][c]) continue;
      if (isLogoRendered && r >= logoStart && r < logoEnd && c >= logoStart && c < logoEnd) continue;
      if (isInsideFinder(r, c)) continue;
      dataPath += `M${(c + 1) * cell} ${(r + 1) * cell}h${cell}v${cell}h-${cell}z`;
    }
  }

  const plan: RenderPlan = { N, cell, dataPath, finderOrigins, logoCells, logoStart };
  planCache.set(key, plan);
  if (planCache.size > PLAN_CACHE_MAX) {
    const first = planCache.keys().next().value;
    if (first !== undefined) planCache.delete(first);
  }
  return plan;
};

const QRCode: React.FC<QRCodeProps> = ({
  value = '',
  size,
  isLogoRendered = true,
  isMenuAvailable = true,
  logoSize = 90,
  ecl = 'H',
  onError,
}) => {
  const svgRef = useRef<Svg>(null);

  const plan = useMemo<RenderPlan | null>(() => {
    try {
      return getCachedPlan(value, ecl, size, isLogoRendered, logoSize);
    } catch (e) {
      onError?.(e);
      return null;
    }
  }, [value, ecl, size, isLogoRendered, logoSize, onError]);

  const handleCopy = useCallback(() => {
    if (!svgRef.current) return;
    svgRef.current.toDataURL((data: string) => {
      if (data) Clipboard.setImage(data);
    });
  }, []);

  const handleShare = useCallback(() => {
    if (!svgRef.current) return;
    svgRef.current.toDataURL((data: string) => {
      if (!data) {
        console.warn('QRCode: toDataURL returned empty data');
        return;
      }
      const cleaned = data.replace(/(\r\n|\n|\r)/gm, '');
      Share.open({
        url: `data:image/png;base64,${cleaned}`,
        type: 'image/png',
        filename: 'qrcode',
        failOnCancel: false,
        // Workaround for Android FileProvider crash with data: URLs since react-native-share@12.1.1.
        // Accepted at runtime but missing from ShareOptions types as of 12.2.6.
        // See https://github.com/react-native-share/react-native-share/issues/1683
        // @ts-expect-error - useInternalStorage missing from ShareOptions type
        useInternalStorage: true,
      }).catch((error: Error) => console.warn('QRCode share failed:', error));
    });
  }, []);

  const onPressMenuItem = useCallback(
    (id: string) => {
      if (id === actionKeys.Copy) handleCopy();
      else if (id === actionKeys.Share) handleShare();
    },
    [handleCopy, handleShare],
  );

  const stylesHook = StyleSheet.create({
    placeholder: { width: size, height: size, backgroundColor: BACKGROUND },
  });

  const qrButtonStyle: ViewStyle = {
    width: size,
    height: size,
    justifyContent: 'center',
    alignItems: 'center',
  };

  const renderQR = useMemo(() => {
    if (!plan) return null;
    const { cell, dataPath, finderOrigins, logoCells, logoStart } = plan;
    const gradFill = `url(#${GRADIENT_ID})`;

    const finderShapes: React.ReactElement[] = [];
    const outerR = 2 * cell;
    const holeR = 1.25 * cell;
    const dotR = 0.9 * cell;
    finderOrigins.forEach(([fr, fc], i) => {
      const x = (fc + 1) * cell;
      const y = (fr + 1) * cell;
      finderShapes.push(
        <Rect
          key={`finder-frame-${i}`}
          testID="qr-finder-frame"
          x={x}
          y={y}
          width={7 * cell}
          height={7 * cell}
          rx={outerR}
          ry={outerR}
          fill={gradFill}
        />,
        <Rect
          key={`finder-hole-${i}`}
          testID="qr-finder-hole"
          x={x + cell}
          y={y + cell}
          width={5 * cell}
          height={5 * cell}
          rx={holeR}
          ry={holeR}
          fill={BACKGROUND}
        />,
        <Rect
          key={`finder-dot-${i}`}
          testID="qr-finder-dot"
          x={x + 2 * cell}
          y={y + 2 * cell}
          width={3 * cell}
          height={3 * cell}
          rx={dotR}
          ry={dotR}
          fill={gradFill}
        />,
      );
    });

    const backdropX = (logoStart + 1) * cell;
    const backdropY = (logoStart + 1) * cell;
    const backdropSize = logoCells * cell;
    const logoCenter = size / 2;

    return (
      <Svg ref={svgRef} testID="BitcoinAddressQRCode" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id={GRADIENT_ID} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={size} y2={size}>
            <Stop offset="0" stopColor={GRADIENT_STOP_1} />
            <Stop offset="1" stopColor={GRADIENT_STOP_2} />
          </LinearGradient>
        </Defs>
        <Rect testID="qr-background" x={0} y={0} width={size} height={size} fill={BACKGROUND} />
        {dataPath ? <Path testID="qr-cells-path" d={dataPath} fill={gradFill} /> : null}
        {finderShapes}
        {isLogoRendered && logoCells > 0 && (
          <>
            <Rect
              testID="qr-logo-backdrop"
              x={backdropX}
              y={backdropY}
              width={backdropSize}
              height={backdropSize}
              rx={cell * 0.5}
              ry={cell * 0.5}
              fill={LOGO_BACKGROUND}
            />
            <SvgImage
              testID="qr-logo-image"
              href={require('../img/qr-code.png')}
              x={logoCenter - logoSize / 2}
              y={logoCenter - logoSize / 2}
              width={logoSize}
              height={logoSize}
              preserveAspectRatio="xMidYMid meet"
            />
          </>
        )}
      </Svg>
    );
  }, [plan, size, isLogoRendered, logoSize]);

  const content = renderQR ?? <View testID="qr-placeholder" style={stylesHook.placeholder} />;

  return (
    <View
      style={styles.container}
      accessibilityIgnoresInvertColors
      importantForAccessibility="no-hide-descendants"
      accessibilityRole="image"
      accessibilityLabel={loc.receive.qrcode_for_the_address}
    >
      {isMenuAvailable ? (
        <ToolTipMenu
          actions={menuActions}
          onPressMenuItem={onPressMenuItem}
          shouldOpenOnLongPress
          isButton
          enableAndroidRipple={false}
          buttonStyle={qrButtonStyle}
        >
          {content}
        </ToolTipMenu>
      ) : (
        content
      )}
    </View>
  );
};

export default QRCode;

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
