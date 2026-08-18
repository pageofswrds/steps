import { Tabs } from 'expo-router'
import { SymbolView, type SFSymbol } from 'expo-symbols'

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

/** The blue the selected tab lights up in — the same one the chart's bars use. */
const ACTIVE_COLOR = '#4a90d9'

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: ACTIVE_COLOR }}>
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
