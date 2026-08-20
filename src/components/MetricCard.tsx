import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography } from '../theme/colors';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  accentColor?: string;
  trend?: string;
  trendPositive?: boolean;
  onPress?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor = colors.primary,
  trend,
  trendPositive = true,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: accentColor }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.iconBox, { backgroundColor: accentColor + '20' }]}>
          <Icon size={18} color={accentColor} />
        </View>
      </View>

      <Text style={styles.value}>{value}</Text>

      {(subtitle || trend) && (
        <View style={styles.footer}>
          {trend && (
            <Text style={[styles.trend, { color: trendPositive ? colors.success : colors.danger }]}>
              {trendPositive ? '▲ ' : '▼ '}
              {trend}
            </Text>
          )}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    minWidth: 160,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    color: '#000',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: typography.monoFont,
    letterSpacing: -0.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
    flexWrap: 'wrap',
  },
  trend: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
