import {
  Banknote,
  ChevronRight,
  CreditCard,
  Fuel,
  Receipt,
} from 'lucide-react';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MetricCard } from '../components/MetricCard';
import { ScreenId } from '../components/NavigationBar';
import { useDashboardContext } from '../context/DashboardContext';
import { colors } from '../theme/colors';
import { formatCurrency, formatDate, formatLitres, formatMeter } from '../utils/formatters';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const {
    products,
    pumps,
    customers,
    expenses,
    totalSalesToday,
    totalLitresToday,
    totalCashCollected,
    totalExpenses,
    totalCreditOutstanding,
    netCashOnHand,
    shifts,
  } = useDashboardContext();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      {/* Top Welcome & Quick Actions */}
      <View style={styles.topSection}>
        <Text style={styles.greetingTitle}>Bunk Operations Overview</Text>
      </View>

      {/* KPI Metrics Row */}
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Today's Fuel Sales"
          value={formatCurrency(totalSalesToday)}
          subtitle={`${formatLitres(totalLitresToday)} sold`}
          icon={Fuel}
          accentColor={colors.petrol}
          trendPositive={true}
          onPress={() => onNavigate('tanks')}
        />

        <MetricCard
          title="Cash on Hand"
          value={formatCurrency(netCashOnHand)}
          icon={Banknote}
          accentColor={colors.cashGreen}
          onPress={() => onNavigate('cashbank')}
        />

        <MetricCard
          title="Credit Outstanding"
          value={formatCurrency(totalCreditOutstanding)}
          icon={CreditCard}
          accentColor={colors.creditOrange}
          trendPositive={false}
          onPress={() => onNavigate('credit')}
        />

        <MetricCard
          title="Daily Expenses"
          value={formatCurrency(totalExpenses)}
          icon={Receipt}
          accentColor={colors.speed}
          onPress={() => onNavigate('expenses')}
        />
      </View>

      {/* Live Pump Status Matrix */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dispenser & Nozzle Status</Text>
          <TouchableOpacity onPress={() => onNavigate('tanks')} style={styles.linkRow}>
            <Text style={styles.linkText}>Meter Readings (Block B)</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.pumpsGrid}>
          {pumps.map(pump => (
            <View key={pump.id} style={styles.pumpCard}>
              <View style={styles.pumpCardHeader}>
                <Text style={styles.pumpName}>{pump.name}</Text>
                <View style={styles.pumpBadge}>
                  <Text style={styles.pumpBadgeText}>{pump.nozzles.length} Nozzles</Text>
                </View>
              </View>

              <View style={styles.nozzlesContainer}>
                {pump.nozzles.map(noz => (
                  <View key={noz.id} style={styles.nozzleItem}>
                    <View style={styles.nozzleTop}>
                      <Text style={styles.nozzleNumber}>Nozzle {noz.nozzleNo}</Text>
                      <Text style={styles.fuelCodeText}>{noz.productName || 'Fuel'}</Text>
                    </View>

                    <View style={styles.meterDisplay}>
                      <Text style={styles.meterLabel}></Text>
                      <Text style={styles.meterValue}>{formatMeter(noz.currentMeterReading)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Operator Attributions */}
      <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Shifts</Text>
            <TouchableOpacity onPress={() => onNavigate('shifts')} style={styles.linkRow}>
              <Text style={styles.linkText}>All Shifts</Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

        {shifts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No operator sessions recorded yet today.</Text>
          </View>
        ) : (
          <View style={styles.shiftsList}>
            {shifts.slice(0, 5).map((attr: any) => (
              <View key={attr.id} style={styles.shiftCard}>
                <View style={styles.shiftCardLeft}>
                  <Text style={styles.shiftNoText}>Pump {attr.pumpNo}</Text>
                  <Text style={styles.shiftDetailsText}>
                    {attr.operatorName} • {formatDate(attr.attributionDate)} ({attr.timeIn || '06:00'} - {attr.timeOut || '14:00'})
                  </Text>
                </View>

                  <View style={styles.shiftCardRight}>
                    <Text style={[styles.shiftAmountText, isClosed && { color: colors.inactiveGrey }]}>{formatCurrency(shift.totalSalesAmount)}</Text>
                    {/* <TouchableOpacity
                      style={styles.printSlipBtn}
                      onPress={() => openShiftThermal(shift)}
                      activeOpacity={0.7}
                    >
                      <Printer size={13} color={colors.textSecondary} />
                      <Text style={styles.printSlipText}>POS Slip</Text>
                    </TouchableOpacity> */}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 20,
    gap: 20,
  },
  topSection: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#7F9FE0',
    ...(Platform.OS === 'web'
      ? { backgroundImage: 'linear-gradient(90deg, #7F9FE0 0%, #8FD3C9 100%)' }
      : {}),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  greetingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  greetingSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  shiftStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionPills: {
    flexDirection: 'row',
    gap: 10,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  actionPillText: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '700',
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    padding: 16,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6F7BF5',
  },

  pumpsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  pumpCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
  },
  pumpCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pumpName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  pumpBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pumpBadgeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  nozzlesContainer: {
    gap: 10,
  },
  nozzleItem: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
  },
  nozzleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nozzleNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  fuelCodeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  meterDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  meterValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  shiftsList: {
    gap: 10,
  },
  shiftCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
  },
  shiftCardLeft: {
    gap: 2,
  },
  shiftNoText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  shiftDetailsText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  shiftCardRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  shiftAmountText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  shiftNetText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});