import { Tabs } from 'expo-router'
import { SymbolView, type SFSymbol } from 'expo-symbols'
import { usePalette } from '../../theme'

/**
 * The tab bar.
 *
 * The icons are SF Symbols — Apple's own icon set, already on every iPhone, so
 * there is nothing to install and nothing to draw. You can browse the whole
 * library in Apple's free "SF Symbols" app, or just try a name: if it isn't a
 * real symbol, `npx tsc --noEmit` will tell you before you ever see the app.
 *
 * To swap an icon, change the `symbol` below. Some names worth trying:
 *   Today   — figure.walk · shoeprints.fill · flame · chart.bar
 *   Journal — book.closed · note.text · square.and.pencil · text.book.closed
 *   Days    — calendar · list.bullet · square.grid.3x3 · calendar.day.timeline.left
 */
const TABS: { name: string; title: string; symbol: SFSymbol }[] = [
  { name: 'today', title: 'Today', symbol: 'figure.walk' },
  { name: 'journal', title: 'Journal', symbol: 'book.closed' },
  { name: 'days', title: 'Days', symbol: 'calendar' },
]

export default function TabsLayout() {
  const c = usePalette()

  return (
    // Only the tint is set here. The bar's own background is left to iOS on
    // purpose — it already knows how to look right in light and dark, and
    // painting over it replaces a material the system draws better than we can.
    <Tabs screenOptions={{ tabBarActiveTintColor: c.accent, tabBarInactiveTintColor: c.muted }}>
      {TABS.map(({ name, title, symbol }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            // `color` and `size` are handed to us by the tab bar itself, so the
            // icon follows the system's sizing and its selected/unselected tint
            // instead of us guessing at either. The selected tab also thickens
            // slightly, which is the usual iOS way of showing which one you're on.
            tabBarIcon: ({ color, size, focused }) => (
              <SymbolView
                name={symbol}
                size={size}
                tintColor={color}
                weight={focused ? 'semibold' : 'regular'}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  )
}
