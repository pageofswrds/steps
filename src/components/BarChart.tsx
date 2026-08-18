import { useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import * as Haptics from 'expo-haptics'
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
 * The chart is also touchable, the way Apple Health's is: tap a bar (or touch
 * and slide across the chart) and that bar stays bright while the others dim,
 * with a little callout above it showing the exact number. How that works is
 * explained where it happens, below.
 *
 * Ideas still to try: a color per weekday, animating heights with
 * react-native-reanimated, or rebuilding it in @shopify/react-native-skia
 * for gradients and glow.
 */

/**
 * How many steps each shade covers. Every 5,000 steps moves the bar one step
 * along the ladder of blues. The ladder itself lives in `src/theme.ts`, because
 * it has to be different in light and dark mode — see the note there.
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

/** Room above the chart for the callout to float in. */
const CALLOUT_SPACE = 48

/** How faded the OTHER bars go while one is selected. 1 is no fade at all. */
const DIM = 0.35

export function BarChart({
  data,
  height = 160,
  goals = [5000, 10000],
  onDetailPress,
}: {
  data: {
    label: string
    value: number
    /** What the callout calls this bar — 'Tue, Aug 12', '2–3 PM'. Falls back
     *  to `label` if you don't provide one. */
    detail?: string
  }[]
  height?: number
  /** Horizontal goal lines, in steps. The biggest one is *the* goal and draws
   *  strongest; the rest are quieter markers along the way. */
  goals?: number[]
  /** If given, the callout grows a chevron and becomes a link: tapping it (or
   *  tapping the selected bar a second time) calls this with the bar's index.
   *  The Today screen uses it to open the day behind a week bar. Leave it off
   *  and a second tap just clears the selection. */
  onDetailPress?: (index: number) => void
}) {
  const c = usePalette()
  const width = 340
  const labelSpace = 18 // room under the chart for the date labels
  const goalLabelSpace = 30 // room at the right for the "5k" / "10k" labels
  // The callout's headroom is ADDED above the chart, so the bars stay exactly
  // as tall as they'd be without it.
  const chartHeight = height - labelSpace
  const svgHeight = height + CALLOUT_SPACE
  const plotWidth = width - goalLabelSpace

  // Which bar is selected, or null for none. The ref is a copy the touch
  // handlers can read without going stale mid-gesture — always change both,
  // through select() / clear() below.
  const [selected, setSelected] = useState<number | null>(null)
  const selectedRef = useRef<number | null>(null)

  // If the data shrank underneath a selection (the screen can hand us a new
  // array any time), quietly drop it rather than point at a bar that's gone.
  const sel = selected !== null && selected < data.length ? selected : null

  // The chart counts up to your goal OR your best day, whichever is bigger. So
  // the goal line is always on screen — and on a day you beat it, the chart
  // grows and your bar towers over the line instead of being clipped by it.
  const max = Math.max(1, ...goals, ...data.map((d) => d.value))

  // The biggest goal is the one that counts as "met".
  const mainGoal = goals.length > 0 ? Math.max(...goals) : Infinity

  const slot = plotWidth / Math.max(1, data.length)
  const barWidth = slot * 0.6 // 60% bar, 40% gap

  /** Turn a step count into a y position — 0 sits on the floor, max at the top
   *  of the plot (which starts below the callout's headroom). */
  const yFor = (value: number) => CALLOUT_SPACE + chartHeight - (value / max) * chartHeight

  // Each goal worked out once: where its line sits, and whether it's the main one.
  const goalLines = goals
    .filter((goal) => goal > 0 && goal <= max)
    .map((goal) => ({ goal, y: yFor(goal), isMain: goal === mainGoal }))

  /** Which bar a horizontal position lands in — the WHOLE column counts, gaps
   *  and all, so even a zero day (which draws no bar) can be picked. Touches in
   *  the label gutter on the right belong to no bar. */
  const indexAt = (x: number): number | null => {
    if (data.length === 0 || x < 0 || x >= plotWidth) return null
    return Math.min(data.length - 1, Math.floor(x / slot))
  }

  /** Where the callout sits for bar i. Worked out the same way when drawing it
   *  and when checking whether a tap hit it. SVG can't measure text, so the
   *  width is estimated from how many characters each line has. */
  const calloutFor = (i: number) => {
    const d = data[i]
    const detailText = d.detail ?? d.label
    const valueText = `${d.value.toLocaleString()} steps`
    const w = Math.max(detailText.length * 6, valueText.length * 8) + 24 + (onDetailPress ? 12 : 0)
    const h = 38
    const barCenter = i * slot + slot / 2
    // Centered over its bar, but never sliding off either edge of the chart.
    const x = Math.min(Math.max(barCenter - w / 2, 0), width - w)
    return { x, y: 2, w, h, barCenter, detailText, valueText }
  }

  const select = (index: number) => {
    if (index === selectedRef.current) return
    selectedRef.current = index
    setSelected(index)
    // The tiny click you feel as the selection moves bar to bar.
    Haptics.selectionAsync()
  }

  const clear = () => {
    selectedRef.current = null
    setSelected(null)
  }

  // TOUCH, in two gestures raced against each other — whichever recognizes
  // first wins:
  //
  //   tap — select the bar under the finger. Tapping the bar that's already
  //         selected follows the link if there is one, otherwise deselects.
  //         Tapping the callout follows the link. Tapping the gutter clears.
  //
  //   pan — Apple Health's scrub: touch and slide sideways and the selection
  //         follows your finger. It only claims the touch after ~10 points of
  //         HORIZONTAL movement and gives up on vertical movement, so it never
  //         steals the screen's up-and-down scrolling.
  //
  // `runOnJS(true)` just means "run these handlers as ordinary JavaScript" —
  // without it, gesture code runs on the animation thread and can't touch
  // React state.
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e, success) => {
      if (!success) return
      const current = selectedRef.current
      if (current !== null && current < data.length && onDetailPress) {
        const box = calloutFor(current)
        if (e.x >= box.x && e.x <= box.x + box.w && e.y >= box.y && e.y <= box.y + box.h) {
          onDetailPress(current)
          return
        }
      }
      const index = indexAt(e.x)
      if (index === null) return clear()
      if (index === current) return onDetailPress ? onDetailPress(index) : clear()
      select(index)
    })

  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onStart((e) => {
      const index = indexAt(e.x)
      if (index !== null) select(index)
    })
    .onUpdate((e) => {
      const index = indexAt(e.x)
      if (index !== null) select(index)
    })

  const callout = sel !== null ? calloutFor(sel) : null

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View>
        <Svg width={width} height={svgHeight}>
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
            const y = yFor(d.value)
            // Never round more than half the bar's height, or a short day turns
            // into a pill instead of a bar.
            const r = Math.min(barWidth * ROUNDNESS, barHeight / 2)
            const fill = colorFor(d.value, c.bars)
            // While one bar is selected, all the OTHERS fade back — that's the
            // whole highlight, no extra drawing needed.
            const opacity = sel === null || sel === i ? 1 : DIM

            // Keys are by index, not label: the day view passes many bars with
            // the same (empty) label.
            return ROUNDING === 'all' ? (
              <Rect key={i} x={x} y={y} width={barWidth} height={barHeight} rx={r} fill={fill} fillOpacity={opacity} />
            ) : (
              <Path key={i} d={topRoundedBar(x, y, barWidth, barHeight, r)} fill={fill} fillOpacity={opacity} />
            )
          })}

          {data.map((d, i) => (
            <SvgText key={i} x={i * slot + slot / 2} y={svgHeight - 4} fontSize={10} fill={c.muted} textAnchor="middle">
              {d.label}
            </SvgText>
          ))}

          {/* The callout: a thin stem down to the selected bar, then a small
              card with the bar's name and its exact count. Drawn last so it
              floats over everything. */}
          {callout && sel !== null && (
            <>
              <Line
                x1={callout.barCenter}
                y1={callout.y + callout.h}
                x2={callout.barCenter}
                y2={yFor(data[sel].value)}
                stroke={c.goalLine}
                strokeWidth={1}
              />
              <Rect
                x={callout.x}
                y={callout.y}
                width={callout.w}
                height={callout.h}
                rx={8}
                fill={c.card}
                stroke={c.hairline}
                strokeWidth={1}
              />
              <SvgText x={callout.x + 12} y={callout.y + 15} fontSize={10} fill={c.muted}>
                {callout.detailText}
              </SvgText>
              <SvgText x={callout.x + 12} y={callout.y + 30} fontSize={14} fontWeight="bold" fill={c.text}>
                {callout.valueText}
              </SvgText>
              {onDetailPress && (
                <SvgText x={callout.x + callout.w - 16} y={callout.y + 25} fontSize={16} fill={c.accent}>
                  ›
                </SvgText>
              )}
            </>
          )}
        </Svg>
        {data.length === 0 && <Text style={{ color: c.muted }}>No data yet</Text>}
      </View>
    </GestureDetector>
  )
}

/**
 * Which blue a day draws in: one rung along the ladder for every BAND_SIZE
 * steps, holding at the last rung after that. 4,999 steps sits on rung one,
 * 5,000 moves up one, and 40,000 draws the same as 20,000. Which end of the
 * ladder is light and which is dark depends on the mode — see `src/theme.ts`.
 */
function colorFor(value: number, ladder: string[]) {
  const band = Math.floor(value / BAND_SIZE)
  return ladder[Math.min(band, ladder.length - 1)]
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
