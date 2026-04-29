import React from 'react';
import { configure, render } from '@testing-library/react-native';

import QRCode from '../../components/QRCode';

configure({ defaultIncludeHiddenElements: true });

const mockEncodeQR = jest.fn();

jest.mock('qr', () => ({
  __esModule: true,
  encodeQR: (...args: unknown[]) => mockEncodeQR(...args),
  default: (...args: unknown[]) => mockEncodeQR(...args),
}));

jest.mock('../../components/TooltipMenu', () => {
  const ReactLocal = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => ReactLocal.createElement(ReactLocal.Fragment, null, children),
  };
});

const makeMatrix = (n: number, fill: boolean | ((r: number, c: number) => boolean)): boolean[][] => {
  const m: boolean[][] = [];
  for (let r = 0; r < n; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < n; c++) {
      row.push(typeof fill === 'function' ? fill(r, c) : fill);
    }
    m.push(row);
  }
  return m;
};

type ParsedCell = { x: number; y: number; w: number; h: number };
const parseDataPath = (d: string): ParsedCell[] => {
  const re = /M(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)h(-?\d+(?:\.\d+)?)v(-?\d+(?:\.\d+)?)h-(-?\d+(?:\.\d+)?)z/g;
  const out: ParsedCell[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    out.push({ x: parseFloat(m[1]), y: parseFloat(m[2]), w: parseFloat(m[3]), h: parseFloat(m[4]) });
  }
  return out;
};

let testCounter = 0;
const uniqueValue = () => `test-value-${++testCounter}-${Math.random()}`;

describe('QRCode', () => {
  beforeEach(() => {
    mockEncodeQR.mockReset();
  });

  it('renders without crashing for a typical value', () => {
    mockEncodeQR.mockReturnValue(makeMatrix(21, (r, c) => (r + c) % 2 === 0));
    const tree = render(<QRCode value={uniqueValue()} size={200} isLogoRendered={false} isMenuAvailable={false} />);
    expect(tree.toJSON()).not.toBeNull();
  });

  it('renders root Svg sized to the size prop', () => {
    mockEncodeQR.mockReturnValue(makeMatrix(21, false));
    const { getByTestId } = render(<QRCode value={uniqueValue()} size={240} isLogoRendered={false} isMenuAvailable={false} />);
    const svg = getByTestId('BitcoinAddressQRCode');
    expect(svg.props.width).toBe(240);
    expect(svg.props.height).toBe(240);
  });

  it('renders exactly one LinearGradient with id=qrgrad', () => {
    mockEncodeQR.mockReturnValue(makeMatrix(21, true));
    const { getAllByTestId } = render(<QRCode value={uniqueValue()} size={200} isLogoRendered={false} isMenuAvailable={false} />);
    const gradients = getAllByTestId('svg-LinearGradient');
    expect(gradients).toHaveLength(1);
    expect(gradients[0].props.id).toBe('qrgrad');
  });

  it('emits data cells in a single Path with a subpath per dark cell', () => {
    const matrix: boolean[][] = [
      [true, false, true],
      [false, true, false],
      [true, false, true],
    ];
    mockEncodeQR.mockReturnValue(matrix);
    const size = 100;
    const N = matrix.length;
    const expectedCell = size / (N + 2); // 1-cell quiet zone on each side
    const { getByTestId } = render(<QRCode value={uniqueValue()} size={size} isLogoRendered={false} isMenuAvailable={false} />);
    const path = getByTestId('qr-cells-path');
    expect(path.props.fill).toBe('url(#qrgrad)');
    const cells = parseDataPath(path.props.d);
    expect(cells).toHaveLength(5);
    cells.forEach(cell => expect(cell.w).toBeCloseTo(expectedCell));
    // First dark cell is matrix (0,0), which renders at SVG (cell, cell) due to quiet zone.
    expect(cells[0].x).toBeCloseTo(expectedCell);
    expect(cells[0].y).toBeCloseTo(expectedCell);
  });

  it('renders a grid-aligned logo backdrop and skips cells under the logo', () => {
    const N = 33;
    mockEncodeQR.mockReturnValue(makeMatrix(N, true));
    const size = 350;
    const logoSize = 90;
    const cell = size / (N + 2);

    const { getByTestId } = render(
      <QRCode value={uniqueValue()} size={size} logoSize={logoSize} isLogoRendered={true} isMenuAvailable={false} />,
    );

    const backdrop = getByTestId('qr-logo-backdrop');
    const { x, y, width, height } = backdrop.props;

    const epsilon = 1e-6;
    const isMultipleOfCell = (v: number) => Math.abs(v / cell - Math.round(v / cell)) < epsilon;
    expect(isMultipleOfCell(x)).toBe(true);
    expect(isMultipleOfCell(y)).toBe(true);
    expect(isMultipleOfCell(width)).toBe(true);
    expect(isMultipleOfCell(height)).toBe(true);
    expect(width).toBe(height);

    const path = getByTestId('qr-cells-path');
    const cells = parseDataPath(path.props.d);
    const backdropRight = x + width;
    const backdropBottom = y + height;
    const anyInside = cells.some(c => {
      const cx = c.x + c.w / 2;
      const cy = c.y + c.h / 2;
      return cx > x && cx < backdropRight && cy > y && cy < backdropBottom;
    });
    expect(anyInside).toBe(false);
  });

  it('does not render the logo image when isLogoRendered is false', () => {
    mockEncodeQR.mockReturnValue(makeMatrix(21, false));
    const { queryByTestId } = render(<QRCode value={uniqueValue()} size={200} isLogoRendered={false} isMenuAvailable={false} />);
    expect(queryByTestId('qr-logo-image')).toBeNull();
    expect(queryByTestId('qr-logo-backdrop')).toBeNull();
  });

  it('renders 3 finder patterns (frame + hole + dot) when matrix is >= 7x7', () => {
    mockEncodeQR.mockReturnValue(makeMatrix(21, true));
    const { getAllByTestId } = render(<QRCode value={uniqueValue()} size={210} isLogoRendered={false} isMenuAvailable={false} />);
    expect(getAllByTestId('qr-finder-frame')).toHaveLength(3);
    expect(getAllByTestId('qr-finder-hole')).toHaveLength(3);
    expect(getAllByTestId('qr-finder-dot')).toHaveLength(3);
  });

  it('does not emit data cells inside finder-pattern regions', () => {
    const N = 21;
    const size = 230;
    const cell = size / (N + 2);
    mockEncodeQR.mockReturnValue(makeMatrix(N, true));
    const { getByTestId } = render(<QRCode value={uniqueValue()} size={size} isLogoRendered={false} isMenuAvailable={false} />);
    const cells = parseDataPath(getByTestId('qr-cells-path').props.d);
    const finderOrigins: Array<[number, number]> = [
      [0, 0],
      [0, N - 7],
      [N - 7, 0],
    ];
    const epsilon = 1e-6;
    const anyInsideFinder = cells.some(c => {
      // Data cells are shifted by 1 cell (quiet zone); convert SVG coords back to matrix coords.
      const col = Math.round(c.x / cell + epsilon) - 1;
      const row = Math.round(c.y / cell + epsilon) - 1;
      return finderOrigins.some(([fr, fc]) => row >= fr && row < fr + 7 && col >= fc && col < fc + 7);
    });
    expect(anyInsideFinder).toBe(false);
  });

  it('reuses cached matrix across renders for the same value (encodeQR called once)', () => {
    mockEncodeQR.mockReturnValue(makeMatrix(21, true));
    const val = uniqueValue();
    const { rerender } = render(<QRCode value={val} size={200} isLogoRendered={false} isMenuAvailable={false} />);
    rerender(<QRCode value={val} size={200} isLogoRendered={false} isMenuAvailable={false} />);
    rerender(<QRCode value={val} size={200} isLogoRendered={false} isMenuAvailable={false} />);
    expect(mockEncodeQR).toHaveBeenCalledTimes(1);
  });

  it('calls onError and renders placeholder when encodeQR throws', () => {
    mockEncodeQR.mockImplementation(() => {
      throw new Error('bad input');
    });
    const onError = jest.fn();
    const { queryByTestId, getByTestId } = render(
      <QRCode value={uniqueValue()} size={150} onError={onError} isMenuAvailable={false} isLogoRendered={false} />,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(queryByTestId('BitcoinAddressQRCode')).toBeNull();
    const placeholder = getByTestId('qr-placeholder');
    expect(placeholder.props.style).toEqual(expect.objectContaining({ width: 150, height: 150 }));
  });
});
