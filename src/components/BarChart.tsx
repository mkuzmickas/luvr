import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/lib/theme';

/**
 * Simple horizontal bar chart built from plain Views (renders reliably on web
 * and native). Each bar is scaled against `max`. Colors come from the theme.
 */
export default function BarChart({
  values,
  labels,
  max = 10,
}: {
  values: number[];
  labels: string[];
  max?: number;
}) {
  return (
    <View style={styles.wrap}>
      {labels.map((label, i) => {
        const v = Math.max(0, Math.min(max, values[i] ?? 0));
        const pct = (v / max) * 100;
        return (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.value}>{v.toFixed(1)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    width: 64,
    color: theme.colors.primaryText,
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 16,
  },
  track: {
    flex: 1,
    height: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 7,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.colors.brightTeal,
    borderRadius: 7,
  },
  value: {
    width: 32,
    textAlign: 'right',
    color: theme.colors.secondaryText,
    fontSize: 12,
  },
});
