import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/lib/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LUVR</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  title: {
    color: theme.colors.primaryText,
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: 4,
  },
});
