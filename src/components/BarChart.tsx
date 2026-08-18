import { Text, View } from 'react-native'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'

/**
 * A deliberately simple bar chart, drawn with SVG rectangles.
 *
 * This is a TEMPLATE — copy it, rename it, restyle it, break it. The idea:
 *   1. Find the biggest value, so every bar can be scaled relative to it.
 *   2. Divide the width into one slot per data point.
 *   3. Draw a <Rect> per point whose height is value / max of the drawing area.
 *
 * Ideas to try: rounded corners (rx), a color per weekday, a horizontal
 * goal line (<Line>), animating heights with react-native-reanimated,
 * or rebuilding it in @shopify/react-native-skia for gradients and glow.
 */
export function BarChart({ data, height = 160 }: { data: { label: string; value: number }[]; height?: number }) {
  const width = 340
  const labelSpace = 18
  const chartHeight = height - labelSpace
  const max = Math.max(1, ...data.map((d) => d.value))
  const slot = width / Math.max(1, data.length)
  const barWidth = slot * 0.6 // 60% bar, 40% gap

  return (
    <View>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const barHeight = (d.value / max) * chartHeight
          return (
            <Rect
              key={i}
              x={i * slot + (slot - barWidth) / 2}
              y={chartHeight - barHeight}
              width={barWidth}
              height={barHeight}
              fill="#4a90d9"
            />
          )
        })}
        {data.map((d, i) => (
          <SvgText key={i} x={i * slot + slot / 2} y={height - 4} fontSize={10} fill="#666" textAnchor="middle">
            {d.label}
          </SvgText>
        ))}
      </Svg>
      {data.length === 0 && <Text>No data yet</Text>}
    </View>
  )
}
