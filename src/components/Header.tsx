import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Fuel, ShieldCheck, UserCheck, Wrench, RefreshCw, Clock } from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { colors, typography } from '../theme/colors';
import { formatCurrency } from '../utils/formatters';
import { UserRole } from '../types';

export const Header: React.FC = () => {
  const { role, setRole, products, activeShift, resetAllData } = useBunk();

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
  };

  const handleReset = () => {
    if (window.confirm('Reset all demo shift records and ledger transactions back to initial state?')) {
      resetAllData();
    }
  };

  return (
    <View style={styles.headerContainer}>
      {/* Top Main Bar */}
      <View style={styles.topRow}>
        <View style={styles.stationInfo}>
          <View style={styles.logoBadge}>
            <Fuel size={20} color="#000" />
          </View>
          <View>
            <Text style={styles.stationName}>SRI MURUGAN AGENCIES</Text>
            <Text style={styles.stationSub}>IOCL Retail Outlet • Bunk Code: IOC-49821</Text>
          </View>
        </View>

        {/* Role Switcher */}
        <View style={styles.roleGroup}>
          <Text style={styles.roleLabel}>Active Role:</Text>
          <View style={styles.roleTabs}>
            {(['Owner', 'Manager', 'Operator'] as UserRole[]).map((r) => {
              const isActive = role === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleTab, isActive && styles.roleTabActive]}
                  onPress={() => handleRoleChange(r)}
                  activeOpacity={0.7}
                >
                  {r === 'Owner' && <ShieldCheck size={14} color={isActive ? '#FFFFFF' : colors.textSecondary} />}
                  {r === 'Manager' && <UserCheck size={14} color={isActive ? '#FFFFFF' : colors.textSecondary} />}
                  {r === 'Operator' && <Wrench size={14} color={isActive ? '#FFFFFF' : colors.textSecondary} />}
                  <Text style={[styles.roleTabText, isActive && styles.roleTabTextActive]}>{r}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.resetBtn} onPress={handleReset} title="Reset Data">
            <RefreshCw size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Ticker & Shift Banner */}
      <View style={styles.tickerRow}>
        {/* Active Rates Ticker */}
        <View style={styles.ratesContainer}>
          <Text style={styles.rateTickerLabel}>TODAY'S RATES:</Text>
          {products.slice(0, 3).map((prod) => (
            <View key={prod.id} style={styles.ratePill}>
              <View style={[styles.rateColorTag, { backgroundColor: prod.color }]} />
              <Text style={styles.rateProdName}>{prod.code}:</Text>
              <Text style={styles.rateValue}>{formatCurrency(prod.currentRate)}/L</Text>
            </View>
          ))}
        </View>

        {/* Shift Badge */}
        <View style={styles.shiftBadge}>
          <Clock size={13} color={activeShift ? colors.success : colors.warning} />
          <Text style={styles.shiftBadgeText}>
            {activeShift
              ? `${activeShift.shiftType} Shift • Pump ${activeShift.pumpNo} • ${activeShift.operatorName}`
              : 'No Active Shift'}
          </Text>
          {activeShift && <View style={styles.livePulse} />}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  stationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  stationName: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stationSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  roleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  roleTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  roleTabActive: {
    backgroundColor: colors.primary,
  },
  roleTabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  roleTabTextActive: {
    color: '#FFFFFF',
  },
  resetBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: 'wrap',
    gap: 8,
  },
  ratesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  rateTickerLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 5,
  },
  rateColorTag: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rateProdName: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  rateValue: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.monoFont,
  },
  shiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  shiftBadgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
});
