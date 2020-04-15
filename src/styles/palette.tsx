export const palette = {
  primary: '#f70949',
  secondary: '#ebc15c',
  textSecondary: 'rgb(238, 196, 100)',
  textBlack: '#000',
  textRed: 'rgb(230, 93, 93)',
  textWhiteMuted: 'rgba(255, 255, 255, 0.54)',
  textGrey: 'rgb(148, 149, 149)',
  gradientPrimaryFirst: 'rgb(247, 9, 73)',
  gradientPrimarySecond: 'rgb(31, 1, 31)',
  gradientSecondaryFirst: 'rgb(255, 214, 99)',
  gradientSecondarySecond: 'rgb(200, 156, 101)',
  background: '#fff',
  border: 'rgb(204, 204, 204)',
  error: 'rgb(244, 94, 89)',
  shadow: 'rgba(0, 0, 0, 0.12)',
  transparent: 'transparent',
  white: 'rgb(255, 255, 255)',
};

export const gradients = {
  Primary: {
    colors: [palette.gradientPrimaryFirst, palette.gradientPrimarySecond],
    start: { x: 1, y: -0.46 },
    end: { x: 1, y: 1.02 },
  },
  Secondary: {
    colors: [palette.gradientSecondaryFirst, palette.gradientSecondarySecond],
    start: { x: 1, y: 0 },
    end: { x: 1, y: 1 },
  },
};
