import { Text, View } from 'react-native'
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg'

/**
 * A deliberately simple bar chart, drawn with SVG.
 *
 * This is a TEMPLATE — copy it, rename it, restyle it, break it. The idea:
 *   1. Decide how tall the chart counts up to, so every bar can be scaled to it.
 *   2. Divide the width into one slot per data point.
 *   3. Draw a bar per point whose height is value / max of the drawing area.
 *
 * Ideas still to try: a color per weekday, animating heights with
 * react-native-reanimated, or rebuilding it in @shopify/react-native-skia
 * for gradients and glow.
 */

/**
 * The blues a bar can draw in, lightest first. The more you walked, the darker
 * the bar — one step down this list for every BAND_SIZE steps.
 *
 * It stops at a deep denim rather than going all the way to navy: past a point
 * a dark bar just reads as a black shape and you lose the sense of a ladder.
 * If you want it bolder, darken the last two; if you want it airier, lighten
 * the first two. Adding a sixth color here extends the ladder on its own.
 */
const BAR_COLORS = [
  '#b8d4ee', // under 5k   — light
  '#7fb2e0', // 5k–10k
  '#4a90d9', // 10k–15k    — the original blue
  '#2f6fb5', // 15k–20k
  '#1f5490', // 20k and up — deepest, and where the ladder stops
]

/** How many steps each shade covers. Every 5,000 steps darkens the bar once. */
const BAND_SIZE = 5000

/**
 * Which corners get rounded.
 *
 *   'top' — just the tops. Every bar stays planted on the same floor, which is
 *           what lets your eye compare their heights. This is the usual choice
 *           for a chart like this one.
 *   'all' — all four corners, the rounded-capsule look you see in a lot of iOS
 *           fitness apps.
 *
 * Flip this to 'all', save, and look at your phone — it changes instantly, and
 * you'll know within a second which one you like.
 */
const ROUNDING: 'top' | 'all' = 'top'

/**
 * How round, as a fraction of the bar's width. A quarter looks like a bar with
 * softened corners; much more and it starts looking like a lollipop.
 */
const ROUNDNESS = 0.25

export function BarChart({
  data,
  height = 160,
  goals = [5000, 10000],
}: {
  data: { label: string; value: number }[]
  height?: number
  /** Horizontal goal lines, in steps. The biggest one is *the* goal — it draws
   *  strongest, and any bar that reaches it turns warm. The rest are quieter
   *  markers along the way. */
  goals?: number[]
}) {
  const width = 340
  const labelSpace = 18 // room under the chart for the date labels
  const goalLabelSpace = 30 // room at the right for the "5k" / "10k" labels
  const chartHeight = height - labelSpace
  const plotWidth = width - goalLabelSpace

  // The chart counts up to your goal OR your best day, whichever is bigger. So
  // the goal line is always on screen — and on a day you beat it, the chart
  // grows and your bar towers over the line instead of being clipped by it.
  const max = Math.max(1, ...goals, ...data.map((d) => d.value))

  // The biggest goal is the one that counts as "met".
  const mainGoal = goals.length > 0 ? Math.max(...goals) : Infinity

  const slot = plotWidth / Math.max(1, data.length)
  const barWidth = slot * 0.6 // 60% bar, 40% gap

  /** Turn a step count into a y position — 0 sits on the floor, max at the top. */
  const yFor = (value: number) => chartHeight - (value / max) * chartHeight

  // Each goal worked out once: where its line sits, and whether it's the main one.
  const goalLines = goals
    .filter((goal) => goal > 0 && goal <= max)
    .map((goal) => ({ goal, y: yFor(goal), isMain: goal === mainGoal }))

  return (
    <View>
      <Svg width={width} height={height}>
        {/* The goal lines are drawn FIRST so the bars sit on top of them. The
            bars are the subject; these are just the ruler behind. */}
        {goalLines.map(({ goal, y, isMain }) => (
          <Line
            key={goal}
            x1={0}
            y1={y}
            x2={plotWidth}
            y2={y}
            stroke={isMain ? '#b3b3b3' : '#dcdcdc'}
            strokeWidth={isMain ? 1 : 0.75}
            strokeDasharray={isMain ? '5 4' : '3 4'}
          />
        ))}

        {goalLines.map(({ goal, y, isMain }) => (
          <SvgText key={goal} x={plotWidth + 5} y={y + 3.5} fontSize={9} fill={isMain ? '#8c8c8c' : '#bdbdbd'}>
            {formatGoal(goal)}
          </SvgText>
        ))}

        {data.map((d, i) => {
          const barHeight = (d.value / max) * chartHeight
          if (barHeight <= 0) return null // a zero day draws nothing

          const x = i * slot + (slot - barWidth) / 2
          const y = chartHeight - barHeight
          // Never round more than half the bar's height, or a short day turns
          // into a pill instead of a bar.
          const r = Math.min(barWidth * ROUNDNESS, barHeight / 2)
          const fill = colorFor(d.value)

          return ROUNDING === 'all' ? (
            <Rect key={d.label} x={x} y={y} width={barWidth} height={barHeight} rx={r} fill={fill} />
          ) : (
            <Path key={d.label} d={topRoundedBar(x, y, barWidth, barHeight, r)} fill={fill} />
          )
        })}

        {data.map((d, i) => (
          <SvgText key={d.label} x={i * slot + slot / 2} y={height - 4} fontSize={10} fill="#666" textAnchor="middle">
            {d.label}
          </SvgText>
        ))}
      </Svg>
      {data.length === 0 && <Text>No data yet</Text>}
    </View>
  )
}

/**
 * Which blue a day draws in: one shade darker for every BAND_SIZE steps, and
 * everything past the last shade stays at the darkest. 4,999 steps is the
 * lightest; 5,000 moves up a shade; 40,000 draws the same as 20,000.
 */
function colorFor(value: number) {
  const band = Math.floor(value / BAND_SIZE)
  return BAR_COLORS[Math.min(band, BAR_COLORS.length - 1)]
}

/** 5000 → "5k", 10000 → "10k", 7500 → "7.5k". */
function formatGoal(goal: number) {
  const thousands = goal / 1000
  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`
}

/**
 * The outline of a bar with only its top two corners rounded: up the left side,
 * curve over the top-left, across, curve down the top-right, then straight down
 * to the floor and closed along the bottom.
 */
function topRoundedBar(x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h))
  return [
    `M ${x} ${y + h}`,
    `L ${x} ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    `L ${x + w - radius} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + radius}`,
    `L ${x + w} ${y + h}`,
    'Z',
  ].join(' ')
}
