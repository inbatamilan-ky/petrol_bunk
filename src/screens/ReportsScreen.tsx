import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {
  FileText,
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  Layers,
  CreditCard,
  Banknote,
  TrendingUp,
  PieChart,
} from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { colors, typography } from '../theme/colors';
import { formatCurrency, formatLitres, formatDate, getTodayDateString } from '../utils/formatters';
import { exportToCSV } from '../utils/exportHelpers';

export const ReportsScreen: React.FC = () => {
  const { shifts, customers, expenses, products, pumps } = useBunk();

  const [activeTab, setActiveTab] = useState<'sales' | 'collections' | 'credit' | 'pnl'>('sales');

  // Aggregates
  const totalFuelSales = shifts.reduce((sum, s) => sum + s.totalSalesAmount, 0);
  const totalFuelLitres = shifts.reduce((sum, s) => sum + s.totalLitresSold, 0);
  const totalCash = shifts.reduce((sum, s) => sum + s.collections.cash, 0);
  const totalUPI = shifts.reduce((sum, s) => sum + s.collections.upiGpay, 0);
  const totalCard = shifts.reduce((sum, s) => sum + s.collections.card, 0);
  const totalCreditSales = shifts.reduce((sum, s) => sum + s.collections.creditSales, 0);
  const totalExpenses = expenses.reduce((sum, e) => (e.isCreditNote ? sum - e.amount : sum + e.amount), 0);
  const totalCreditBalance = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);

  // Approximate fuel gross margin (e.g. ₹3.50/L dealer margin)
  const estimatedFuelMargin = totalFuelLitres * 3.50;
  const netOperatingProfit = estimatedFuelMargin - totalExpenses;

  // Export CSV for current tab
  const handleExport = () => {
    if (activeTab === 'sales') {
      const headers = ['Shift Date', 'Shift No', 'Pump', 'Operator', 'Litres Sold', 'Total Sales (₹)', 'Shortage/Excess (₹)'];
      const rows = shifts.map((s) => [
        s.shiftDate,
        s.shiftNo,
        `Pump ${s.pumpNo}`,
        s.operatorName,
        s.totalLitresSold,
        s.totalSalesAmount,
        s.shortageOrExcess,
      ]);
      exportToCSV(`Daily_Sales_Report_${getTodayDateString()}`, headers, rows);
    } else if (activeTab === 'collections') {
      const headers = ['Shift No', 'Date', 'Cash (₹)', 'UPI/GPay (₹)', 'Card (₹)', 'Credit (₹)', 'Total Collected (₹)'];
      const rows = shifts.map((s) => [
        s.shiftNo,
        s.shiftDate,
        s.collections.cash,
        s.collections.upiGpay,
        s.collections.card,
        s.collections.creditSales,
        s.totalCollected,
      ]);
      exportToCSV(`Collections_Reconciliation_${getTodayDateString()}`, headers, rows);
    } else if (activeTab === 'credit') {
      const headers = ['Customer Code', 'Customer Name', 'Phone', 'Credit Limit (₹)', 'Outstanding Balance (₹)', 'Utilization %'];
      const rows = customers.map((c) => [
        c.code,
        c.name,
        c.phone,
        c.creditLimit,
        c.outstandingBalance,
        `${Math.round((c.outstandingBalance / c.creditLimit) * 100)}%`,
      ]);
      exportToCSV(`Credit_Customer_Outstanding_${getTodayDateString()}`, headers, rows);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Reports & Financial Statements</Text>
          <Text style={styles.screenSubtitle}>
            Shift logs, payment reconciliations, customer aging & P&L statements
          </Text>
        </View>

        <View style={styles.btnGroup}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.8}>
            <FileSpreadsheet size={15} color="#FFFFFF" />
            <Text style={styles.exportBtnText}>Export CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.printBtn} onPress={handlePrint} activeOpacity={0.8}>
            <Printer size={15} color="#000" />
            <Text style={styles.printBtnText}>Print Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Report Tabs */}
      <View style={styles.tabBar}>
        {[
          { id: 'sales', label: '1. Daily Sales Sheet', icon: Layers },
          { id: 'collections', label: '2. Payment Modes Split', icon: Banknote },
          { id: 'credit', label: '3. Credit Customer Aging', icon: CreditCard },
          { id: 'pnl', label: '4. Profit & Loss Overview', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id as any)}
              activeOpacity={0.7}
            >
              <Icon size={16} color={isActive ? '#FFFFFF' : colors.textSecondary} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab 1: Daily Sales Sheet (Excel Format) */}
      {activeTab === 'sales' && (
        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>Daily Sales & Meter Settlement Record</Text>
            <Text style={styles.reportSub}>Format matching station Daily Accounts register</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.colHeader, { width: 90 }]}>DATE</Text>
              <Text style={[styles.colHeader, { width: 110 }]}>SHIFT #</Text>
              <Text style={[styles.colHeader, { width: 70 }]}>PUMP</Text>
              <Text style={[styles.colHeader, { flex: 1.5 }]}>OPERATOR</Text>
              <Text style={[styles.colHeader, { width: 110, textAlign: 'right' }]}>VOLUME (L)</Text>
              <Text style={[styles.colHeader, { width: 120, textAlign: 'right' }]}>GROSS SALES (₹)</Text>
              <Text style={[styles.colHeader, { width: 100, textAlign: 'right' }]}>STATUS</Text>
            </View>

            {shifts.map((s) => (
              <View key={s.id} style={styles.tableRow}>
                <Text style={[styles.cell, { width: 90 }]}>{formatDate(s.shiftDate)}</Text>
                <Text style={[styles.cellMono, { width: 110 }]}>{s.shiftNo}</Text>
                <Text style={[styles.cell, { width: 70 }]}>Pump {s.pumpNo}</Text>
                <Text style={[styles.cell, { flex: 1.5 }]}>{s.operatorName}</Text>
                <Text style={[styles.cellMono, { width: 110, textAlign: 'right', color: '#38BDF8' }]}>
                  {formatLitres(s.totalLitresSold)}
                </Text>
                <Text style={[styles.cellMono, { width: 120, textAlign: 'right', color: colors.cashGreen }]}>
                  {formatCurrency(s.totalSalesAmount)}
                </Text>
                <View style={{ width: 100, alignItems: 'flex-end' }}>
                  <View style={[styles.statusBadge, { backgroundColor: s.status === 'CLOSED' ? colors.surfaceHighlight : colors.success + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: s.status === 'CLOSED' ? colors.textSecondary : colors.success }]}>
                      {s.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Total Footer Row */}
            <View style={styles.totalFooterRow}>
              <Text style={[styles.totalFooterLabel, { flex: 1 }]}>TOTAL STATION SALES:</Text>
              <Text style={[styles.totalFooterVal, { color: '#38BDF8', width: 110, textAlign: 'right' }]}>
                {formatLitres(totalFuelLitres)}
              </Text>
              <Text style={[styles.totalFooterVal, { color: colors.cashGreen, width: 120, textAlign: 'right' }]}>
                {formatCurrency(totalFuelSales)}
              </Text>
              <View style={{ width: 100 }} />
            </View>
          </View>
        </View>
      )}

      {/* Tab 2: Payment Modes Breakdown */}
      {activeTab === 'collections' && (
        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>Payment Collections & Mode Split</Text>
            <Text style={styles.reportSub}>Reconciliation of physical cash vs digital streams</Text>
          </View>

          <View style={styles.modesSummaryGrid}>
            <View style={[styles.modeCard, { borderLeftColor: colors.cashGreen }]}>
              <Text style={styles.modeCardLabel}>CASH COLLECTIONS</Text>
              <Text style={styles.modeCardVal}>{formatCurrency(totalCash)}</Text>
              <Text style={styles.modeCardPct}>{Math.round((totalCash / (totalFuelSales || 1)) * 100)}% of sales</Text>
            </View>

            <View style={[styles.modeCard, { borderLeftColor: colors.upiPurple }]}>
              <Text style={styles.modeCardLabel}>UPI / GPAY / PHONEPE</Text>
              <Text style={styles.modeCardVal}>{formatCurrency(totalUPI)}</Text>
              <Text style={styles.modeCardPct}>{Math.round((totalUPI / (totalFuelSales || 1)) * 100)}% of sales</Text>
            </View>

            <View style={[styles.modeCard, { borderLeftColor: colors.cardBlue }]}>
              <Text style={styles.modeCardLabel}>CARD / POS SWIPES</Text>
              <Text style={styles.modeCardVal}>{formatCurrency(totalCard)}</Text>
              <Text style={styles.modeCardPct}>{Math.round((totalCard / (totalFuelSales || 1)) * 100)}% of sales</Text>
            </View>

            <View style={[styles.modeCard, { borderLeftColor: colors.creditOrange }]}>
              <Text style={styles.modeCardLabel}>CREDIT FUEL CHITS</Text>
              <Text style={styles.modeCardVal}>{formatCurrency(totalCreditSales)}</Text>
              <Text style={styles.modeCardPct}>{Math.round((totalCreditSales / (totalFuelSales || 1)) * 100)}% of sales</Text>
            </View>
          </View>
        </View>
      )}

      {/* Tab 3: Credit Customer Aging */}
      {activeTab === 'credit' && (
        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>Credit Customer Outstanding & Risk Analysis</Text>
            <Text style={styles.reportSub}>Ledger balances extracted from Credit Customer ledger</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.colHeader, { width: 70 }]}>CODE</Text>
              <Text style={[styles.colHeader, { flex: 1.5 }]}>CUSTOMER NAME</Text>
              <Text style={[styles.colHeader, { width: 120 }]}>PHONE</Text>
              <Text style={[styles.colHeader, { width: 120, textAlign: 'right' }]}>CREDIT LIMIT (₹)</Text>
              <Text style={[styles.colHeader, { width: 130, textAlign: 'right' }]}>OUTSTANDING (₹)</Text>
              <Text style={[styles.colHeader, { width: 90, textAlign: 'right' }]}>USED %</Text>
            </View>

            {customers.map((c) => {
              const usedPct = Math.min(100, Math.round((c.outstandingBalance / c.creditLimit) * 100));
              const isOver = usedPct >= 80;
              return (
                <View key={c.id} style={styles.tableRow}>
                  <Text style={[styles.cellMono, { width: 70, color: colors.accent }]}>{c.code}</Text>
                  <Text style={[styles.cell, { flex: 1.5, fontWeight: '700' }]}>{c.name}</Text>
                  <Text style={[styles.cell, { width: 120, color: colors.textSecondary }]}>{c.phone}</Text>
                  <Text style={[styles.cellMono, { width: 120, textAlign: 'right' }]}>
                    {formatCurrency(c.creditLimit)}
                  </Text>
                  <Text
                    style={[
                      styles.cellMono,
                      { width: 130, textAlign: 'right', color: colors.creditOrange, fontWeight: '800' },
                    ]}
                  >
                    {formatCurrency(c.outstandingBalance)}
                  </Text>
                  <Text
                    style={[
                      styles.cellMono,
                      { width: 90, textAlign: 'right', color: isOver ? colors.danger : colors.cashGreen, fontWeight: '800' },
                    ]}
                  >
                    {usedPct}%
                  </Text>
                </View>
              );
            })}

            <View style={styles.totalFooterRow}>
              <Text style={[styles.totalFooterLabel, { flex: 1 }]}>TOTAL CREDIT OUTSTANDING:</Text>
              <Text style={[styles.totalFooterVal, { color: colors.creditOrange, width: 130, textAlign: 'right' }]}>
                {formatCurrency(totalCreditBalance)}
              </Text>
              <View style={{ width: 90 }} />
            </View>
          </View>
        </View>
      )}

      {/* Tab 4: Profit & Loss Statement */}
      {activeTab === 'pnl' && (
        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>Station Operating Profit & Loss Statement</Text>
            <Text style={styles.reportSub}>Dealer gross margins, operational expenses & net return</Text>
          </View>

          <View style={styles.pnlContainer}>
            <View style={styles.pnlRow}>
              <Text style={styles.pnlLabel}>A. Total Gross Fuel Revenue:</Text>
              <Text style={styles.pnlVal}>{formatCurrency(totalFuelSales)}</Text>
            </View>

            <View style={styles.pnlRow}>
              <Text style={styles.pnlLabel}>B. Estimated Dealer Commission Margin (@ ₹3.50/L):</Text>
              <Text style={[styles.pnlVal, { color: colors.accent }]}>
                + {formatCurrency(estimatedFuelMargin)}
              </Text>
            </View>

            <View style={styles.pnlRow}>
              <Text style={styles.pnlLabel}>C. Total Operational Expenses (Staff, EB, Maintenance, Bata):</Text>
              <Text style={[styles.pnlVal, { color: colors.danger }]}>
                - {formatCurrency(totalExpenses)}
              </Text>
            </View>

            <View style={styles.pnlDivider} />

            <View style={styles.pnlRow}>
              <Text style={styles.pnlGrandLabel}>ESTIMATED NET OPERATING PROFIT (B - C):</Text>
              <Text
                style={[
                  styles.pnlGrandVal,
                  { color: netOperatingProfit >= 0 ? colors.cashGreen : colors.danger },
                ]}
              >
                {formatCurrency(netOperatingProfit)}
              </Text>
            </View>
          </View>
        </View>
      )}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  screenTitle: {
    color: '#000',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  btnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  exportBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  printBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    flexWrap: 'wrap',
    gap: 6,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  reportHeader: {
    gap: 2,
  },
  reportTitle: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  reportSub: {
    color: colors.textMuted,
    fontSize: 11,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colHeader: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  cell: {
    color: colors.textPrimary,
    fontSize: 11,
  },
  cellMono: {
    fontSize: 11,
    fontFamily: typography.monoFont,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  totalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  totalFooterLabel: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  totalFooterVal: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  modesSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  modeCardLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  modeCardVal: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: typography.monoFont,
    marginVertical: 4,
  },
  modeCardPct: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  pnlContainer: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  pnlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pnlLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  pnlVal: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.monoFont,
  },
  pnlDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 6,
  },
  pnlGrandLabel: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
  },
  pnlGrandVal: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
});
