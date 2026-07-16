/* eslint-disable react/prop-types */
const React = require('react');
const { View } = require('react-native');

function makeMock(name) {
  const Component = ({ children, testID, ...rest }) => React.createElement(View, { ...rest, testID: testID ?? 'svg-' + name }, children);
  Component.displayName = name;
  return Component;
}

const Svg = makeMock('Svg');
const Rect = makeMock('Rect');
const Circle = makeMock('Circle');
const Defs = makeMock('Defs');
const LinearGradient = makeMock('LinearGradient');
const RadialGradient = makeMock('RadialGradient');
const Stop = makeMock('Stop');
const G = makeMock('G');
const SvgImage = makeMock('Image');
const Path = makeMock('Path');
const ClipPath = makeMock('ClipPath');
const Mask = makeMock('Mask');
const Polygon = makeMock('Polygon');
const Polyline = makeMock('Polyline');
const Line = makeMock('Line');
const Ellipse = makeMock('Ellipse');
const Text = makeMock('Text');
const TSpan = makeMock('TSpan');
const Use = makeMock('Use');
const Symbol = makeMock('Symbol');
const Pattern = makeMock('Pattern');

module.exports = {
  __esModule: true,
  default: Svg,
  Svg,
  Rect,
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  G,
  Image: SvgImage,
  Path,
  ClipPath,
  Mask,
  Polygon,
  Polyline,
  Line,
  Ellipse,
  Text,
  TSpan,
  Use,
  Symbol,
  Pattern,
};
