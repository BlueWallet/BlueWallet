/**
 * Tx bowtie / Sankey-style flow chart utils.
 * Ported from mempool.space tx-bowtie-graph (Bitcoin-only, no Liquid).
 */

const LINE_LIMIT = 50;
const MAX_STRANDS = 24;
const MIN_WEIGHT = 2;
const MAX_COMBINED_WEIGHT = 100;
const ZERO_VALUE_WIDTH = 60;
const ZERO_VALUE_THICKNESS = 20;

/** Light blue accent for inputs when not using per-strand colors */
const FALLBACK_INPUT_COLOR = '#DBEFFD';

export type XputType = 'input' | 'output' | 'fee';

export interface Xput {
  type: XputType;
  value?: number;
  rest?: number;
  txid?: string;
  index?: number;
}

export interface SvgLine {
  path: string;
  strokeWidth: number;
  zeroValue?: boolean;
  stroke?: string;
}

export interface BuildInputOutputResult {
  inputData: Xput[];
  outputData: Xput[];
  totalValue: number;
}

function toSats(v: number): number {
  return v < 1 ? Math.round(v * 100_000_000) : Math.round(v);
}

/**
 * Build input/output arrays and total from tx data. Prefer txFromElectrum (vin/vout with value).
 * All values normalized to sats.
 */
export function buildInputOutputData(
  tx: { inputs?: Array<{ value?: number; txid?: string }>; outputs?: Array<{ value?: number }> } | null,
  txFromElectrum: { vin: Array<{ value?: number; txid?: string }>; vout: Array<{ value?: number }> } | null,
  calculatedFee: number | null,
): BuildInputOutputResult | null {
  const vin = txFromElectrum?.vin ?? tx?.inputs;
  const vout = txFromElectrum?.vout ?? tx?.outputs;
  if (!vin?.length || !vout?.length) return null;

  const inputData: Xput[] = vin.slice(0, LINE_LIMIT).map((v, i) => ({
    type: 'input',
    value: v.value != null ? toSats(v.value) : undefined,
    txid: v.txid,
    index: i,
  }));

  if (vin.length > LINE_LIMIT) {
    const valueOfRest = vin.slice(LINE_LIMIT).reduce((r, v) => r + (v.value != null ? toSats(v.value) : 0), 0);
    inputData.push({ type: 'input', value: valueOfRest, rest: vin.length - LINE_LIMIT });
  }

  let outputData: Xput[] = [];
  if (calculatedFee != null && calculatedFee > 0) {
    outputData.push({ type: 'fee', value: calculatedFee });
  }
  vout.forEach((v, i) => {
    const val = v.value != null ? toSats(v.value) : undefined;
    outputData.push({ type: 'output', value: val, index: i });
  });

  if (outputData.length > LINE_LIMIT) {
    const valueOfRest = outputData.slice(LINE_LIMIT).reduce((r, x) => r + (x.value ?? 0), 0);
    const outputCount = outputData.length;
    outputData = outputData.slice(0, LINE_LIMIT);
    outputData.push({ type: 'output', value: valueOfRest, rest: outputCount - LINE_LIMIT });
  }

  const totalValue = calcTotalValueFromXputs(inputData, outputData);
  return { inputData, outputData, totalValue };
}

function calcTotalValueFromXputs(inputData: Xput[], outputData: Xput[]): number {
  const sumInputs = inputData.reduce((a, x) => a + (x.value ?? 0), 0);
  const sumOutputs = outputData.reduce((a, x) => a + (x.value ?? 0), 0);
  return Math.max(sumInputs, sumOutputs, 1);
}

function inputColorFromTxid(txid: string | undefined): string {
  if (!txid || txid.length < 6) return FALLBACK_INPUT_COLOR;
  const hex = txid.substring(0, 6);
  if (!/^[0-9a-fA-f]+$/.test(hex)) return FALLBACK_INPUT_COLOR;
  return `#${hex}`;
}

export interface LayoutOptions {
  width: number;
  height: number;
  lineLimit?: number;
  maxStrands?: number;
  minWeight?: number;
  maxCombinedWeight?: number;
}

export interface LayoutResult {
  inputs: SvgLine[];
  outputs: SvgLine[];
  middle: SvgLine;
  hasLine: boolean;
}

export function computeBowtieLayout(
  inputData: Xput[],
  outputData: Xput[],
  totalValue: number,
  opts: LayoutOptions,
): LayoutResult {
  const {
    width,
    height,
    maxStrands = MAX_STRANDS,
    minWeight = MIN_WEIGHT,
    maxCombinedWeight = MAX_COMBINED_WEIGHT,
  } = opts;

  const midWidth = Math.min(10, Math.ceil(width / 100));
  const txWidth = width - 20;
  const combinedWeight = Math.min(maxCombinedWeight, Math.floor((txWidth - 2 * midWidth) / 6));
  const connectorWidth = (width - txWidth) / 2;
  const zeroValueWidth = Math.max(20, Math.min(txWidth / 2 - midWidth - 110, ZERO_VALUE_WIDTH));

  const inputs = initLines(
    'in',
    inputData,
    totalValue,
    maxStrands,
    {
      width,
      height,
      midWidth,
      txWidth,
      connectorWidth,
      combinedWeight,
      zeroValueWidth,
      minWeight,
    },
    false,
  );
  const outputs = initLines(
    'out',
    outputData,
    totalValue,
    maxStrands,
    {
      width,
      height,
      midWidth,
      txWidth,
      connectorWidth,
      combinedWeight,
      zeroValueWidth,
      minWeight,
    },
    false,
  );

  const middle: SvgLine = {
    path: `M ${width / 2 - midWidth} ${height / 2 + 0.25} L ${width / 2 + midWidth} ${height / 2 + 0.25}`,
    strokeWidth: combinedWeight + 0.5,
  };

  const hasLine =
    inputs.some(l => !l.zeroValue) && outputs.some(l => !l.zeroValue);

  return { inputs, outputs, middle, hasLine };
}

interface LineParams {
  width: number;
  height: number;
  midWidth: number;
  txWidth: number;
  connectorWidth: number;
  combinedWeight: number;
  zeroValueWidth: number;
  minWeight: number;
}

function initLines(
  side: 'in' | 'out',
  xputs: Xput[],
  total: number,
  maxVisibleStrands: number,
  params: LineParams,
  assignInputColors: boolean,
): SvgLine[] {
  const { combinedWeight, minWeight, zeroValueWidth } = params;

  let weights: number[];
  if (!total) {
    weights = xputs.map(() => combinedWeight / xputs.length);
  } else {
    let unknownCount = 0;
    let unknownTotal = total;
    xputs.forEach(put => {
      if (put.value == null) unknownCount++;
      else unknownTotal -= put.value;
    });
    const unknownShare = unknownCount > 0 ? unknownTotal / unknownCount : 0;
    weights = xputs.map(
      put => (combinedWeight * (put.value == null ? unknownShare : put.value)) / total,
    );
  }

  return linesFromWeights(side, xputs, weights, maxVisibleStrands, params, assignInputColors);
}

function linesFromWeights(
  side: 'in' | 'out',
  xputs: Xput[],
  weights: number[],
  maxVisibleStrands: number,
  params: LineParams,
  assignInputColors: boolean,
): SvgLine[] {
  const {
    width,
    height,
    midWidth,
    txWidth,
    connectorWidth,
    combinedWeight,
    zeroValueWidth,
    minWeight,
  } = params;

  const lineParams = weights.map((w, i) => ({
    weight: w,
    thickness:
      xputs[i].value === 0
        ? ZERO_VALUE_THICKNESS
        : Math.min(combinedWeight + 0.5, Math.max(minWeight - 1, w) + 1),
    offset: 0,
    innerY: 0,
    outerY: 0,
  }));

  const visibleStrands = Math.min(maxVisibleStrands, xputs.length);
  const gaps = visibleStrands - 1;
  const innerTop = height / 2 - combinedWeight / 2;
  const innerBottom = innerTop + combinedWeight + 0.5;
  let lastOuter = 0;
  let lastInner = innerTop;
  const spacing = Math.max(4, (height - lineParams.slice(0, visibleStrands).reduce((a, v) => a + v.thickness, 0)) / (gaps || 1));

  let offset = 0;
  let minOffset = 0;
  let lastWeight = 0;
  let pad = 0;

  lineParams.forEach((line, i) => {
    if (xputs[i].value === 0) {
      line.outerY = lastOuter + ZERO_VALUE_THICKNESS / 2;
      if (xputs.length === 1) line.outerY = height / 2;
      lastOuter += ZERO_VALUE_THICKNESS + spacing;
      return;
    }

    line.outerY = lastOuter + line.thickness / 2;
    line.innerY = Math.min(
      innerBottom - line.thickness / 2,
      Math.max(innerTop + line.thickness / 2, lastInner + line.weight / 2),
    );
    if (xputs.length === 1) line.outerY = height / 2;

    lastOuter += line.thickness + spacing;
    lastInner += line.weight;

    if (!xputs[i].rest) {
      const w = (txWidth - Math.max(lastWeight, line.weight) - connectorWidth * 2) / 2;
      const y1 = line.outerY;
      const y2 = line.innerY;
      const t = (lastWeight + line.weight) / 2;
      const dx = 0.75 * w;
      const dy = 1.5 * (y2 - y1);
      const a = Math.atan2(dy, dx);
      if (Math.sin(a) !== 0) {
        offset += Math.max(Math.min((t * (1 - Math.cos(a))) / Math.sin(a), t), -t);
      }
      line.offset = offset;
      minOffset = Math.min(minOffset, offset);
      pad = Math.max(pad, line.thickness / 2);
      lastWeight = line.weight;
    }
  });

  lineParams.forEach(line => {
    line.offset -= minOffset;
  });

  const maxOffset = Math.max(...lineParams.map(l => l.offset), 0);

  return lineParams.map((line, i) => {
    const stroke = assignInputColors && xputs[i].type === 'input' ? inputColorFromTxid(xputs[i].txid) : undefined;
    if (xputs[i].value === 0) {
      return {
        path: makeZeroValuePath(side, line.outerY, width, connectorWidth, zeroValueWidth),
        strokeWidth: ZERO_VALUE_THICKNESS,
        zeroValue: true,
        stroke,
      };
    }
    return {
      path: makePath(side, line.outerY, line.innerY, line.thickness, line.offset, pad + maxOffset, {
        width,
        midWidth,
        connectorWidth,
      }),
      strokeWidth: line.thickness,
      stroke,
    };
  });
}

function makePath(
  side: 'in' | 'out',
  outer: number,
  inner: number,
  weight: number,
  offset: number,
  pad: number,
  p: { width: number; midWidth: number; connectorWidth: number },
): string {
  const { width, midWidth, connectorWidth } = p;
  const start = weight * 0.5 + connectorWidth;
  const curveStart = Math.max(start + 5, pad + connectorWidth - offset);
  const end = width / 2 - midWidth * 0.9 + 1;
  const curveEnd = end - offset - 10;
  const midpoint = (curveStart + curveEnd) / 2;

  let o = outer;
  if (Math.round(outer) === Math.round(inner)) o -= 1;

  if (side === 'in') {
    return `M ${start} ${o} L ${curveStart} ${o} C ${midpoint} ${o}, ${midpoint} ${inner}, ${curveEnd} ${inner} L ${end} ${inner}`;
  }
  return `M ${width - start} ${o} L ${width - curveStart} ${o} C ${width - midpoint} ${o}, ${width - midpoint} ${inner}, ${width - curveEnd} ${inner} L ${width - end} ${inner}`;
}

function makeZeroValuePath(
  side: 'in' | 'out',
  y: number,
  width: number,
  connectorWidth: number,
  zeroValueWidth: number,
): string {
  const offset = ZERO_VALUE_THICKNESS / 2;
  const start = connectorWidth / 2 + 10;
  if (side === 'in') {
    return `M ${start + offset} ${y} L ${start + zeroValueWidth + offset} ${y}`;
  }
  return `M ${width - start - offset} ${y} L ${width - start - zeroValueWidth - offset} ${y}`;
}
