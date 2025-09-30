export const BrandColors = {
  white: '#FFFFFF',
  terracotta600: '#A84A43',
  terracotta500: '#C1635B',
  terracotta400: '#D47A71',
  oxblood700: '#7D322E',
  rose300: '#E59A90',
  placeholderAverage: '#9E4E49',

  black: '#000000',
  transparent: 'transparent',
} as const;

export const Animations = {
  durations: {
    fade: 450,
    scale: 300,
    delaySmall: 120,
    pulse: 2200,
  },
  easing: {
    inOut: [0.4, 0.0, 0.2, 1.0],
    out: [0.0, 0.0, 0.2, 1.0],
  },
} as const;

export const Layout = {
  safeAreaPadding: {
    top: true,
    bottom: true,
    left: true,
    right: true,
  },
  breakpoints: {
    phoneCompact: 360,
    phoneRegular: 450,
    tabletLarge: 768,
  },
} as const;