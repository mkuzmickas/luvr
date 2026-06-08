import { useState } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Line,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';

import { theme } from '@/lib/theme';

/**
 * Radar / spider chart drawn with react-native-svg (renders identically on web
 * and native). Scales each value against `max`. Colors come from the theme.
 *
 * Sizing is responsive: `size` is treated as a maximum, and the chart shrinks to
 * fit narrow phone widths. A generous label gutter (a fixed fraction of the
 * size) keeps every axis label fully visible and never clipped at the edges.
 */
export default function RadarChart({
  values,
  labels,
  max = 10,
  size = 300,
}: {
  values: number[];
  labels: string[];
  max?: number;
  size?: number;
}) {
  const [boxWidth, setBoxWidth] = useState(0);
  const chartSize = Math.min(size, boxWidth || size);

  const cx = chartSize / 2;
  const cy = chartSize / 2;
  // Reserve ~26% of the radius on every side as a gutter for axis labels.
  const radius = chartSize / 2 - chartSize * 0.26;
  const labelRadius = radius + 16;
  const n = values.length;

  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i: number, r: number) => {
    const a = angleFor(i);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  const rings = [0.2, 0.4, 0.6, 0.8, 1];
  const ringPolys = rings.map((f) =>
    Array.from({ length: n }, (_, i) => {
      const p = point(i, radius * f);
      return `${p.x},${p.y}`;
    }).join(' '),
  );

  const dataPoints = values.map((v, i) => {
    const clamped = Math.max(0, Math.min(max, v));
    const p = point(i, radius * (clamped / max));
    return `${p.x},${p.y}`;
  });

  return (
    <View
      style={{ width: '100%', alignItems: 'center' }}
      onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}
    >
      <Svg width={chartSize} height={chartSize}>
        {/* grid rings */}
        {ringPolys.map((pts, idx) => (
          <Polygon
            key={`ring-${idx}`}
            points={pts}
            fill="none"
            stroke={theme.colors.border}
            strokeWidth={1}
          />
        ))}

        {/* spokes */}
        {Array.from({ length: n }, (_, i) => {
          const p = point(i, radius);
          return (
            <Line
              key={`spoke-${i}`}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke={theme.colors.border}
              strokeWidth={1}
            />
          );
        })}

        {/* data polygon */}
        <Polygon
          points={dataPoints.join(' ')}
          fill={theme.colors.tealAccent}
          fillOpacity={0.35}
          stroke={theme.colors.brightTeal}
          strokeWidth={2}
        />

        {/* data vertices */}
        {values.map((v, i) => {
          const clamped = Math.max(0, Math.min(max, v));
          const p = point(i, radius * (clamped / max));
          return (
            <Circle
              key={`pt-${i}`}
              cx={p.x}
              cy={p.y}
              r={3}
              fill={theme.colors.brightTeal}
            />
          );
        })}

        {/* axis labels — middle-anchored within the reserved gutter */}
        {labels.map((label, i) => {
          const p = point(i, labelRadius);
          return (
            <SvgText
              key={`label-${i}`}
              x={p.x}
              y={p.y}
              fill={theme.colors.secondaryText}
              fontSize={12}
              fontFamily="CormorantGaramond_500Medium"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
