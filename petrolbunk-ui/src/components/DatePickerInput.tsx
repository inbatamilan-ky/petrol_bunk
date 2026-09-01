import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Calendar, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';
import { colors, typography } from '../theme/colors';
import { formatDate, getTodayDateString } from '../utils/formatters';

export interface DatePickerInputProps {
  label?: string;
  value: string; // YYYY-MM-DD format
  onChange: (dateStr: string) => void;
  placeholder?: string;
  maxDate?: string; // default to today
  minDate?: string;
  allowClear?: boolean;
  onClear?: () => void;
  style?: any;
}

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select date...',
  maxDate = getTodayDateString(),
  minDate,
  allowClear = false,
  onClear,
  style,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  // Parse current value or fallback to today for calendar view navigation
  const initialDate = useMemo(() => {
    if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-11

  const todayStr = getTodayDateString();

  const handleOpen = () => {
    if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    } else {
      const now = new Date();
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
    }
    setModalVisible(true);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    // Check if next month is beyond maxDate year/month
    if (maxDate) {
      const [maxY, maxM] = maxDate.split('-').map(Number);
      if (viewYear > maxY || (viewYear === maxY && viewMonth + 1 > maxM - 1)) {
        return;
      }
    }
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const canGoNextMonth = useMemo(() => {
    if (!maxDate) return true;
    const [maxY, maxM] = maxDate.split('-').map(Number);
    if (viewYear < maxY) return true;
    if (viewYear === maxY && viewMonth < maxM - 1) return true;
    return false;
  }, [viewYear, viewMonth, maxDate]);

  // Generate days in month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: Array<{
      dayNum: number;
      dateStr: string;
      isDisabled: boolean;
      isSelected: boolean;
      isToday: boolean;
    } | null> = [];

    // Empty padding cells before first day
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(viewMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${viewYear}-${mStr}-${dStr}`;

      let isDisabled = false;
      if (maxDate && dateStr > maxDate) {
        isDisabled = true;
      }
      if (minDate && dateStr < minDate) {
        isDisabled = true;
      }

      days.push({
        dayNum: d,
        dateStr,
        isDisabled,
        isSelected: value === dateStr,
        isToday: todayStr === dateStr,
      });
    }

    return days;
  }, [viewYear, viewMonth, value, maxDate, minDate, todayStr]);

  const handleSelectDate = (dateStr: string) => {
    if (maxDate && dateStr > maxDate) return;
    if (minDate && dateStr < minDate) return;
    onChange(dateStr);
    setModalVisible(false);
  };

  const handleSelectToday = () => {
    if (maxDate && todayStr > maxDate) return;
    onChange(todayStr);
    setModalVisible(false);
  };

  const displayText = useMemo(() => {
    if (!value) return placeholder;
    if (value === todayStr) return `Today (${formatDate(value)})`;
    return formatDate(value);
  }, [value, todayStr, placeholder]);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.inputButton, !value && styles.inputButtonEmpty]}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <Calendar size={15} color={value ? colors.primary : colors.textMuted} style={styles.icon} />
        <Text style={[styles.inputText, !value && styles.inputTextPlaceholder]}>
          {displayText}
        </Text>
        {allowClear && value ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={(e) => {
              e.stopPropagation();
              if (onClear) onClear();
              else onChange('');
            }}
          >
            <X size={13} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalCard}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleRow}>
                <Calendar size={16} color={colors.primary} />
                <Text style={styles.modalTitle}>Select Date</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Month & Year Navigation */}
            <View style={styles.navRow}>
              <TouchableOpacity style={styles.navBtn} onPress={handlePrevMonth}>
                <ChevronLeft size={18} color={colors.textPrimary} />
              </TouchableOpacity>

              <Text style={styles.navMonthYear}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>

              <TouchableOpacity
                style={[styles.navBtn, !canGoNextMonth && styles.navBtnDisabled]}
                onPress={handleNextMonth}
                disabled={!canGoNextMonth}
              >
                <ChevronRight
                  size={18}
                  color={canGoNextMonth ? colors.textPrimary : colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Days of week header */}
            <View style={styles.weekdaysRow}>
              {DAYS_OF_WEEK.map((dw) => (
                <Text key={dw} style={styles.weekdayText}>
                  {dw}
                </Text>
              ))}
            </View>

            {/* Calendar Days Grid */}
            <View style={styles.daysGrid}>
              {calendarDays.map((item, idx) => {
                if (!item) {
                  return <View key={`empty-${idx}`} style={styles.dayCell} />;
                }

                return (
                  <TouchableOpacity
                    key={item.dateStr}
                    style={[
                      styles.dayCell,
                      item.isToday && styles.dayCellToday,
                      item.isSelected && styles.dayCellSelected,
                      item.isDisabled && styles.dayCellDisabled,
                    ]}
                    onPress={() => handleSelectDate(item.dateStr)}
                    disabled={item.isDisabled}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        item.isToday && styles.dayTextToday,
                        item.isSelected && styles.dayTextSelected,
                        item.isDisabled && styles.dayTextDisabled,
                      ]}
                    >
                      {item.dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notice if beyond today is blocked */}
            <View style={styles.footerBar}>
              <Text style={styles.hintText}>* Future dates beyond today are disabled</Text>
              <View style={styles.footerActions}>
                {allowClear && (
                  <TouchableOpacity
                    style={styles.todayBtn}
                    onPress={() => {
                      if (onClear) onClear();
                      else onChange('');
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.todayBtnText}>All Dates</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.todayBtnPrimary} onPress={handleSelectToday}>
                  <Clock size={13} color="#000" />
                  <Text style={styles.todayBtnPrimaryText}>Today</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated || '#1E293B',
    borderWidth: 1,
    borderColor: colors.border || '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 38,
  },
  inputButtonEmpty: {
    borderColor: colors.border,
  },
  icon: {
    marginRight: 8,
  },
  inputText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary || '#F8FAFC',
  },
  inputTextPlaceholder: {
    color: colors.textMuted || '#94A3B8',
    fontWeight: '400',
  },
  clearBtn: {
    padding: 3,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navMonthYear: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekdayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 8,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayTextDisabled: {
    color: '#CBD5E1',
  },
  footerBar: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'column',
    gap: 8,
  },
  hintText: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  todayBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  todayBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

});
