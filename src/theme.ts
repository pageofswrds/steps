import { DarkTheme, DefaultTheme, type Theme } from 'expo-router'
import { useColorScheme } from 'react-native'

/**
 * Every colour in the app, in one place, twice — once for light mode and once
 * for dark.
 *
 * Nothing here decides *when* to switch. The phone does that: iOS tells the app
 * which mode it's in (including when it flips at sunset), `useColorScheme()`
 * below hears it, and every screen redraws. You never write an if-statement
 * about it.
 *
 * To restyle the app, change a value here rather than hunting through screens.
 * If you add a colour, add it to BOTH palettes or TypeScript will complain —
 * which is on purpose, so a new colour can never be light-mode-only.
 */

const light = {
  /** Behind everything. */
  background: '#ffffff',
  /** Panels that sit on top of the background — journal cards, and so on. */
  card: '#e4eefa',
  /** Ordinary reading text. */
  text: '#11161c',
  /** Captions, timestamps, anything secondary. */
  muted: '#666666',
  /** Hairline rules between rows. */
  hairline: '#cccccc',
  /** Links, the selected tab, anything tappable. */
  accent: '#4a90d9',
  /** Destructive things. Delete buttons. */
  danger: '#c0392b',

  /** Chart bars, lightest first — darker the more you walked. */
  bars: ['#b8d4ee', '#7fb2e0', '#4a90d9', '#2f6fb5', '#1f5490'],
  /** The dashed goal lines: the main one, then the quieter markers. */
  goalLine: '#b3b3b3',
  goalLineFaint: '#dcdcdc',
  goalLabel: '#8c8c8c',
  goalLabelFaint: '#bdbdbd',
}

/** The same set of names, in dark. Every key in `light` must appear here too. */
const dark: typeof light = {
  background: '#0f1115',
  card: '#1b2430',
  text: '#f2f3f5',
  muted: '#9a9ea6',
  hairline: '#2c313a',
  // A touch lighter than the light-mode accent: the same blue on a dark
  // background reads heavier than it does on white.
  accent: '#6aa9e8',
  danger: '#ff6f5e',

  // NOTE the order is flipped. In light mode a big day draws DARK, because dark
  // stands out against white. On a dark background that reads backwards — a
  // near-navy bar would sink into the page and your best day would be the one
  // you could barely see. So here a big day draws BRIGHT. Same idea in both
  // modes: more steps, more contrast against whatever is behind it.
  bars: ['#2c4f73', '#3a6fa5', '#4a90d9', '#7fb2e0', '#b8d4ee'],
  goalLine: '#5b616b',
  goalLineFaint: '#3a3f48',
  goalLabel: '#8b9099',
  goalLabelFaint: '#5f646c',
}

export type Palette = typeof light

/**
 * The colours for whichever mode the phone is in right now.
 *
 *   const c = usePalette()
 *   <Text style={{ color: c.muted }}>steps today</Text>
 *
 * Call it at the top of a screen, like the data hooks. When the phone switches
 * between light and dark, everything using it redraws on its own.
 */
export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light
}

/**
 * The same colours, handed to the navigation bars — headers, the tab bar, the
 * background behind a screen while it's sliding in. Those are drawn for us
 * rather than by us, so they need telling separately.
 */
export function useNavigationTheme(): Theme {
  const isDark = useColorScheme() === 'dark'
  const c = isDark ? dark : light
  const base = isDark ? DarkTheme : DefaultTheme

  return {
    ...base, // keeps the system fonts
    dark: isDark,
    colors: {
      ...base.colors,
      primary: c.accent,
      background: c.background,
      card: c.background,
      text: c.text,
      border: c.hairline,
    },
  }
}
