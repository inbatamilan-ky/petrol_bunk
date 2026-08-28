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
  accentColor = '#0284C7',
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
        <View style={[styles.iconBox, { backgroundColor: accentColor + '18' }]}>
          <Icon size={16} color={accentColor} />
        </View>
      </View>

      <Text style={styles.value}>{value}</Text>

      {(subtitle || trend) && (
        <View style={styles.footer}>
          {trend && (
            <Text style={[styles.trend, { color: trendPositive ? '#10B981' : '#EF4444' }]}>
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
    backgroundColor: colors.surface,
    borderRadius: 10,
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
    marginBottom: 6,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  trend: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
});
