import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Fuel, ShieldCheck, UserCheck, LogOut, Clock, Sparkles } from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { colors, typography } from '../theme/colors';
import { formatCurrency } from '../utils/formatters';
import { UserRole } from '../types';

export const Header: React.FC = () => {
  const { role, setRole, products, activeShift, logout, currentUser } = useBunk();

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
  };

  const handleLogout = () => {
    if (window.confirm('Sign out of FuelPulse?')) {
      logout();
    }
  };

  return (
    <View style={styles.headerContainer}>
      {/* Top Main Bar */}
      <View style={styles.topRow}>
        <View style={styles.stationInfo}>
          <View style={styles.logoBadge}>
            <Fuel size={20} color="#FFFFFF" />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.stationName}>FuelPulse</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>PRO</Text>
              </View>
            </View>
            <Text style={styles.stationSub}>KY Petrol Bunk • IOC-49821</Text>
          </View>
        </View>

        {/* Role Switcher & User Profile */}
        <View style={styles.roleGroup}>
          <View style={styles.roleTabs}>
            {(['Owner', 'Manager'] as UserRole[]).map((r) => {
              const isActive = role === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleTab, isActive && styles.roleTabActive]}
                  onPress={() => handleRoleChange(r)}
                  activeOpacity={0.7}
                >
                  {r === 'Owner' ? (
                    <ShieldCheck size={14} color={isActive ? '#FFFFFF' : '#64748B'} />
                  ) : (
                    <UserCheck size={14} color={isActive ? '#FFFFFF' : '#64748B'} />
                  )}
                  <Text style={[styles.roleTabText, isActive && styles.roleTabTextActive]}>
                    {r} {r === 'Owner' ? '(1)' : '(2)'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            accessibilityLabel="Sign Out"
            activeOpacity={0.7}
          >
            <LogOut size={14} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Ticker & Shift Banner */}
      <View style={styles.tickerRow}>
        {/* Active Rates Ticker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ratesContainer}>
          <Text style={styles.rateTickerLabel}>TODAY'S RATES:</Text>
          {products.slice(0, 3).map((prod) => (
            <View key={prod.id} style={styles.ratePill}>
              <View style={[styles.rateColorTag, { backgroundColor: prod.color }]} />
              <Text style={styles.rateProdName}>{prod.code}:</Text>
              <Text style={styles.rateValue}>{formatCurrency(prod.currentRate)}/L</Text>
            </View>
          ))}
        </ScrollView>

        {/* Shift Badge */}
        <View style={styles.shiftBadge}>
          <Clock size={12} color={activeShift ? '#10B981' : '#F59E0B'} />
          <Text style={styles.shiftBadgeText}>
            {activeShift
              ? `${activeShift.shiftType} Shift • Pump #${activeShift.pumpNo} • ${activeShift.operatorName}`
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stationName: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  versionBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  versionText: {
    color: '#1D4ED8',
    fontSize: 9,
    fontWeight: '800',
  },
  stationSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
    fontWeight: '500',
  },
  roleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2.5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    backgroundColor: '#0284C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  roleTabText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  roleTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  logoutBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  rateTickerLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  rateColorTag: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rateProdName: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  rateValue: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.monoFont,
  },
  shiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  shiftBadgeText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
});
