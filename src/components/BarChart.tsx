import { Text, View } from 'react-native'
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import { usePalette } from '../theme'

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
 * How many steps each shade covers when shading `'by-steps'`. Every 5,000 steps
 * moves the bar one rung along the ladder of blues. The ladder itself lives in
 * `src/theme.ts`, because it has to be different in light and dark mode.
 */
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
  shading = 'by-steps',
  barFill = 0.6,
  labelEvery = 1,
}: {
  data: { label: string; value: number }[]
  height?: number
  /** Horizontal goal lines, in steps. The biggest one is *the* goal and draws
   *  strongest; the rest are quieter markers along the way. Pass `[]` for none —
   *  which is what you want for a chart of hours, since no single hour comes
   *  anywhere near a daily goal and the lines would flatten every bar. */
  goals?: number[]
  /**
   * How the colour ladder is decided.
   *
   *   'by-steps'   — a rung every 5,000 steps. Right for whole days, where the
   *                  colour means a fixed amount of walking.
   *   'by-biggest' — the ladder is spread across whatever the biggest bar on
   *                  screen is. Right for hours, where nothing gets close to
   *                  5,000 and every bar would otherwise come out the same
   *                  pale blue.
   */
  shading?: 'by-steps' | 'by-biggest'
  /** How much of its slot each bar fills, 0 to 1. The rest is the gap. Thin
   *  charts with many bars want this higher — 24 hourly bars at 0.6 look like
   *  hairs. */
  barFill?: number
  /** Draw every Nth label. 1 labels every bar; 6 labels every sixth, which is
   *  what 24 hours needs to stay readable. */
  labelEvery?: number
}) {
  const c = usePalette()
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

  // The biggest bar actually on screen — what 'by-biggest' shading measures against.
  const biggest = Math.max(1, ...data.map((d) => d.value))

  const slot = plotWidth / Math.max(1, data.length)
  const barWidth = slot * barFill

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
            stroke={isMain ? c.goalLine : c.goalLineFaint}
            strokeWidth={isMain ? 1 : 0.75}
            strokeDasharray={isMain ? '5 4' : '3 4'}
          />
        ))}

        {goalLines.map(({ goal, y, isMain }) => (
          <SvgText key={goal} x={plotWidth + 5} y={y + 3.5} fontSize={9} fill={isMain ? c.goalLabel : c.goalLabelFaint}>
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
          const fill = colorFor(d.value, c.bars, shading === 'by-biggest' ? biggest / c.bars.length : BAND_SIZE)

          // Keys are by index, not label: the day view passes many bars with
          // the same (empty) label.
          return ROUNDING === 'all' ? (
            <Rect key={i} x={x} y={y} width={barWidth} height={barHeight} rx={r} fill={fill} />
          ) : (
            <Path key={i} d={topRoundedBar(x, y, barWidth, barHeight, r)} fill={fill} />
          )
        })}

        {data.map((d, i) => (
          <SvgText key={i} x={i * slot + slot / 2} y={height - 4} fontSize={10} fill={c.muted} textAnchor="middle">
            {d.label}
          </SvgText>
        ))}
      </Svg>
      {data.length === 0 && <Text style={{ color: c.muted }}>No data yet</Text>}
    </View>
  )
}

/**
 * Which blue a bar draws in: one rung along the ladder for every `band` of
 * value, holding at the last rung after that. With a band of 5,000, 4,999 steps
 * sits on rung one and 40,000 draws the same as 20,000. Which end of the ladder
 * is light and which is dark depends on light/dark mode — see `src/theme.ts`.
 */
function colorFor(value: number, ladder: string[], band: number) {
  const rung = Math.floor(value / Math.max(1, band))
  return ladder[Math.min(rung, ladder.length - 1)]
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
