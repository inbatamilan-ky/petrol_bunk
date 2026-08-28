import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CalendarX2, RefreshCw } from 'lucide-react';
import { colors } from '../theme/colors';

interface NoDataViewProps {
  title?: string;
  message?: string;
  selectedDate?: string;
  onResetDate?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  style?: any;
}

export const NoDataView: React.FC<NoDataViewProps> = ({
  title = 'No Data Available',
  message,
  selectedDate,
  onResetDate,
  actionLabel,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <CalendarX2 size={28} color={colors.warning || '#F59E0B'} />
      </View>

      <Text style={styles.title}>{title}</Text>

      <Text style={styles.message}>
        {message ||
          (selectedDate
            ? `No records found for date ${selectedDate}.`
            : 'No entries or records found for the selected criteria.')}
      </Text>

      <View style={styles.btnRow}>
        {onResetDate && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onResetDate}>
            <RefreshCw size={13} color={colors.textPrimary} />
            <Text style={styles.secondaryBtnText}>View Today</Text>
          </TouchableOpacity>
        )}

        {actionLabel && onAction && (
          <TouchableOpacity style={styles.primaryBtn} onPress={onAction}>
            <Text style={styles.primaryBtnText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated || '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border || '#334155',
    marginVertical: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary || '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: colors.textMuted || '#94A3B8',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
    marginBottom: 16,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary || '#F8FAFC',
  },
  primaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
