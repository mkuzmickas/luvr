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
 */
export default function RadarChart({
  values,
  labels,
  max = 10,
  size = 320,
}: {
  values: number[];
  labels: string[];
  max?: number;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 58; // leave room for axis labels
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
    <Svg width={size} height={size}>
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

      {/* axis labels */}
      {labels.map((label, i) => {
        const p = point(i, radius + 20);
        return (
          <SvgText
            key={`label-${i}`}
            x={p.x}
            y={p.y}
            fill={theme.colors.secondaryText}
            fontSize={13}
            fontFamily="CormorantGaramond_500Medium"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
}
