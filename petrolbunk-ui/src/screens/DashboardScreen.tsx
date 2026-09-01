import {
  Banknote,
  ChevronRight,
  CreditCard,
  Fuel,
  Printer,
  Receipt
} from 'lucide-react';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MetricCard } from '../components/MetricCard';
import { ScreenId } from '../components/NavigationBar';
import { ThermalReceiptData, ThermalReceiptModal } from '../components/ThermalReceiptModal';
import { useDashboardContext } from '../context/DashboardContext';
import { colors, typography } from '../theme/colors';
import { formatCurrency, formatDate, formatLitres, formatMeter } from '../utils/formatters';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const {
    products,
    pumps,
    shifts,
    customers,
    expenses,
    activeShift,
    role,
  } = useDashboardContext();

  const [receiptData, setReceiptData] = useState<ThermalReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Compute Aggregates
  const totalSalesToday = shifts.reduce((sum: number, s) => sum + s.totalSalesAmount, 0);
  const totalLitresToday = shifts.reduce((sum, s) => sum + s.totalLitresSold, 0);
  const totalCashCollected = shifts.reduce((sum, s) => sum + s.collections.cash, 0);
  const totalExpenses = expenses.reduce((sum, e) => (e.isCreditNote ? sum - e.amount : sum + e.amount), 0);
  const totalCreditOutstanding = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);

  const netCashOnHand = Math.max(0, totalCashCollected - totalExpenses);

  const openShiftThermal = (shift: typeof shifts[0]) => {
    const data: ThermalReceiptData = {
      title: 'SHIFT SETTLEMENT SUMMARY',
      receiptNo: shift.shiftNo,
      dateStr: shift.shiftDate,
      operatorName: shift.operatorName,
      pumpNo: shift.pumpNo,
      items: shift.meterReadings.map((r) => ({
        name: `${r.productName} (Noz ${r.nozzleNo})`,
        qty: `${formatLitres(r.litresSold)}`,
        rate: `₹${r.rate}`,
        amount: r.grossAmount || 0,
      })),
      subtotal: shift.totalSalesAmount,
      expensesDeducted: shift.expensesDeducted,
      netPayable: shift.totalCollected,
      paymentMode: `Cash: ${formatCurrency(shift.collections.cash)} | UPI: ${formatCurrency(shift.collections.upiGpay)} | Credit: ${formatCurrency(shift.collections.creditSales)}`,
      remarks: shift.notes || (shift.shortageOrExcess < 0 ? `Shortage: ${formatCurrency(shift.shortageOrExcess)}` : 'Shift balanced.'),
      footerNote: 'VERIFIED & RECONCILED WITH BUNK LEDGER',
    };
    setReceiptData(data);
    setShowReceipt(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Top Welcome & Quick Actions */}
      <View style={styles.topSection}>
        <View>
          <Text style={styles.greetingTitle}>Bunk Operations Overview</Text>
           
        </View>

        <View style={styles.actionPills}>
          {/* <TouchableOpacity
            style={[styles.actionPill, { backgroundColor: colors.primary }]}
            onPress={() => onNavigate('shifts')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionPillText}>
              {activeShift ? 'Manage Active Shift' : 'Open New Shift'}
            </Text>
          </TouchableOpacity> */}

          {/* <TouchableOpacity
            style={[styles.actionPill, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => onNavigate('credit')}
            activeOpacity={0.8}
          >
            <CreditCard size={14} color={colors.accent} />
            <Text style={styles.actionPillText}>New Credit Bill</Text>
          </TouchableOpacity> */}
        </View>
      </View>

      {/* KPI Metrics Row */}
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Today's Fuel Sales"
          value={formatCurrency(totalSalesToday)}
          subtitle={"Total litres: "+formatLitres(totalLitresToday)}
          icon={Fuel}
          accentColor={colors.petrol}
           
          trendPositive={true}
          onPress={() => onNavigate('reports')}
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
          <TouchableOpacity onPress={() => onNavigate('shifts')} style={styles.linkRow}>
            <Text style={styles.linkText}>View Shifts</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.pumpsGrid}>
          {pumps.map((pump) => {
            const shiftForPump = shifts.find((s) => s.pumpId === pump.id && s.status === 'IN_PROGRESS');
            const isInactive = pump.status === 'INACTIVE';
            const isMaintenance = pump.status === 'MAINTENANCE';

            return (
              <View key={pump.id} style={[styles.pumpCard, isInactive && { opacity: 0.8, borderColor: '#FCA5A5' }]}>
                <View style={styles.pumpCardHeader}>
                  <Text style={styles.pumpName}>Pump {pump.pumpNo}</Text>
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: isInactive ? '#F1F5F9' : isMaintenance ? '#FEF3C7' : '#DEF7EC',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: '800',
                        color: isInactive ? '#475569' : isMaintenance ? '#D97706' : '#03543F',
                      }}
                    >
                      {pump.status}
                    </Text>
                  </View>
                </View>

                {shiftForPump && (
                  <View style={styles.operatorInfoRow}>
                    <Text style={styles.operatorInfoLabel}>Operator:</Text>
                    <Text style={styles.operatorInfoVal}>{shiftForPump.operatorName}</Text>
                  </View>
                )}

                <View style={styles.nozzlesContainer}>
                  {pump.nozzles.map((noz) => (
                    <View key={noz.id} style={styles.nozzleItem}>
                      <View style={styles.nozzleTop}>
                        <Text style={styles.nozzleNumber}>Nozzle {noz.nozzleNo}</Text>
                        <Text style={[styles.fuelCodeText, { color: noz.color }]}>{noz.fuelCode}</Text>
                      </View>

                      <View style={styles.meterDisplay}>
                        <Text style={styles.meterLabel}>TOTALIZER METER</Text>
                        <Text style={styles.meterValue}>{formatMeter(noz.currentMeterReading)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Recent Shifts & Settlement Section */}
      <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Shifts</Text>
            <TouchableOpacity onPress={() => onNavigate('shifts')} style={styles.linkRow}>
              <Text style={styles.linkText}>All Shifts</Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.shiftsList}>
            {shifts.slice(0, 4).map((shift) => {
              const isClosed = shift.status === 'CLOSED';
              return (
                <View key={shift.id} style={[styles.shiftCard, isClosed && styles.shiftCardClosed]}>
                  <View style={styles.shiftCardLeft}>
                    <View style={styles.shiftNoRow}>
                      <Text style={[styles.shiftNoText, isClosed && { color: colors.inactiveGrey }]}>{shift.shiftNo}</Text>
                    </View>

                    <Text style={[styles.shiftDetailsText, isClosed && { color: colors.inactiveText }]}>
                      Pump {shift.pumpNo} • {shift.operatorName} • {formatDate(shift.shiftDate)} ({shift.shiftType})
                    </Text>
                    <Text style={[styles.shiftVolumeText, isClosed && { color: colors.inactiveMuted }]}>
                      Volume: {formatLitres(shift.totalLitresSold)}
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
              );
            })}
          </View>
        </View>
      {/* High-Risk Credit Customers Warning Bar */}
       

      {/* Thermal Receipt Modal */}
      <ThermalReceiptModal
        visible={showReceipt}
        onClose={() => setShowReceipt(false)}
        data={receiptData}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  greetingTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  greetingSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  actionPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  linkText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  pumpsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pumpCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  pumpCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pumpName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  operatorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  operatorInfoLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  operatorInfoVal: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  nozzlesContainer: {
    marginTop: 10,
    gap: 8,
  },
  nozzleItem: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nozzleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nozzleNumber: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  fuelCodeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  meterDisplay: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 6,
    marginTop: 2,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  meterLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  meterValue: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: typography.monoFont,
    letterSpacing: 0.5,
  },
  shiftsList: {
    gap: 10,
  },
  shiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shiftCardLeft: {
    flex: 1,
    gap: 2,
  },
  shiftCardClosed: {
    backgroundColor: colors.inactiveBg,
    borderColor: colors.inactiveBorder,
    opacity: 0.9,
  },
  shiftNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftNoText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.monoFont,
  },
  shiftStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  shiftStatusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  shiftDetailsText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  shiftVolumeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: typography.monoFont,
  },
  shiftCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  shiftAmountText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  printSlipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  printSlipText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  creditWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.creditOrange,
    padding: 14,
    flexWrap: 'wrap',
    gap: 12,
  },
  creditWarningLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  creditWarningTitle: {
    color: '#9A3412',
    fontSize: 13,
    fontWeight: '700',
  },
  creditWarningSub: {
    color: '#C2410C',
    fontSize: 11,
    marginTop: 2,
  },
  creditViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.creditOrange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  creditViewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});