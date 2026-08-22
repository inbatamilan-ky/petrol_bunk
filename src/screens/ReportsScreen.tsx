import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {
  FileSpreadsheet,
  Printer,
  Search,
  ChevronDown,
  Layers,
  CreditCard,
  Banknote,
  TrendingUp,
  Receipt,
  Users,
} from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { colors, typography } from '../theme/colors';
import { formatCurrency, formatLitres, formatDate, getTodayDateString } from '../utils/formatters';
import { exportToCSV } from '../utils/exportHelpers';

type ReportCategory =
  | 'all_parties'
  | 'sale'
  | 'purchase'
  | 'all_transactions'
  | 'cashflow'
  | 'pnl';

export const ReportsScreen: React.FC = () => {
  const { shifts, customers, expenses, products, creditTransactions, creditPayments } = useBunk();

  const [activeReport, setActiveReport] = useState<ReportCategory>('all_parties');
  const [searchQuery, setSearchQuery] = useState('');

  // Aggregates
  const totalFuelSales = shifts.reduce((sum, s) => sum + s.totalSalesAmount, 0);
  const totalFuelLitres = shifts.reduce((sum, s) => sum + s.totalLitresSold, 0);
  const totalCash = shifts.reduce((sum, s) => sum + s.collections.cash, 0);
  const totalUPI = shifts.reduce((sum, s) => sum + s.collections.upiGpay, 0);
  const totalCard = shifts.reduce((sum, s) => sum + s.collections.card, 0);
  const totalCreditSales = shifts.reduce((sum, s) => sum + s.collections.creditSales, 0);
  const totalExpenses = expenses.reduce((sum, e) => (e.isCreditNote ? sum - e.amount : sum + e.amount), 0);
  const totalReceivable = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const totalCreditLimit = customers.reduce((sum, c) => sum + c.creditLimit, 0);
  const totalCreditTxAmount = creditTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalCreditTxLitres = creditTransactions.reduce((sum, tx) => sum + tx.litres, 0);

  // Estimated fuel margin (@ ₹3.50/L)
  const estimatedFuelMargin = totalFuelLitres * 3.50;
  const netOperatingProfit = estimatedFuelMargin - totalExpenses;

  // Filtered party list for "all_parties"
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const match =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery));
      return match;
    });
  }, [customers, searchQuery]);

  // Filtered expenses for "purchase"
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const match =
        e.expenseTypeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.voucherNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.paidTo && e.paidTo.toLowerCase().includes(searchQuery.toLowerCase()));
      return match;
    });
  }, [expenses, searchQuery]);

  // Filtered transactions for "all_transactions"
  const filteredTransactions = useMemo(() => {
    return creditTransactions.filter((tx) => {
      const match =
        tx.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.slipNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.vehicleNo && tx.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase()));
      return match;
    });
  }, [creditTransactions, searchQuery]);

  // Export handlers
  const handleExportExcel = () => {
    if (activeReport === 'all_parties') {
      const headers = ['#', 'PARTY NAME', 'CODE', 'PHONE', 'RECEIVABLE BALANCE (₹)', 'CREDIT LIMIT (₹)'];
      const rows = filteredCustomers.map((c, i) => [
        i + 1,
        c.name,
        c.code,
        c.phone || '-',
        c.outstandingBalance,
        c.creditLimit,
      ]);
      exportToCSV(`All_Parties_Report_${getTodayDateString()}`, headers, rows);
    } else if (activeReport === 'sale') {
      const headers = ['Shift Date', 'Shift No', 'Pump', 'Operator', 'Litres Sold', 'Total Sales (₹)', 'Status'];
      const rows = shifts.map((s) => [
        s.shiftDate,
        s.shiftNo,
        `Pump ${s.pumpNo}`,
        s.operatorName,
        s.totalLitresSold,
        s.totalSalesAmount,
        s.status,
      ]);
      exportToCSV(`Sales_Report_${getTodayDateString()}`, headers, rows);
    } else if (activeReport === 'purchase') {
      const headers = ['Date', 'Voucher No', 'Expense Category', 'Paid To', 'Paid By', 'Amount (₹)'];
      const rows = filteredExpenses.map((e) => [
        e.date,
        e.voucherNo,
        e.expenseTypeName,
        e.paidTo || '-',
        e.paidBy || '-',
        e.amount,
      ]);
      exportToCSV(`Expenses_Report_${getTodayDateString()}`, headers, rows);
    } else if (activeReport === 'all_transactions') {
      const headers = ['Date', 'Slip No', 'Customer Name', 'Vehicle No', 'Product', 'Litres', 'Rate (₹)', 'Amount (₹)'];
      const rows = filteredTransactions.map((tx) => [
        tx.date,
        tx.slipNo,
        tx.customerName,
        tx.vehicleNo || '-',
        tx.productName,
        tx.litres,
        tx.rate,
        tx.amount,
      ]);
      exportToCSV(`Credit_Transactions_Report_${getTodayDateString()}`, headers, rows);
    } else if (activeReport === 'cashflow') {
      const headers = ['Mode', 'Total Collected (₹)', 'Percentage of Sales'];
      const total = totalFuelSales || 1;
      const rows = [
        ['Cash Collections', totalCash, `${Math.round((totalCash / total) * 100)}%`],
        ['UPI / Digital (GPay/PhonePe)', totalUPI, `${Math.round((totalUPI / total) * 100)}%`],
        ['Card / POS Swipes', totalCard, `${Math.round((totalCard / total) * 100)}%`],
        ['Credit Fuel Chits', totalCreditSales, `${Math.round((totalCreditSales / total) * 100)}%`],
      ];
      exportToCSV(`Collections_Summary_${getTodayDateString()}`, headers, rows);
    } else if (activeReport === 'pnl') {
      const headers = ['Item', 'Amount (₹)'];
      const rows = [
        ['Total Gross Fuel Sales', totalFuelSales],
        ['Estimated Dealer Commission Margin (@ ₹3.50/L)', estimatedFuelMargin],
        ['Total Operating Expenses', totalExpenses],
        ['Estimated Net Operating Profit', netOperatingProfit],
      ];
      exportToCSV(`PnL_Statement_${getTodayDateString()}`, headers, rows);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderSubSidebar = () => {
    const reportGroups = [
      {
        title: 'Party reports',
        items: [
          { id: 'all_parties', label: 'All Parties & Balances', icon: Users },
        ],
      },
      {
        title: 'Transaction reports',
        items: [
          { id: 'sale', label: 'Daily Sales Sheet', icon: Layers },
          { id: 'purchase', label: 'Expenses & Purchases', icon: Receipt },
          { id: 'all_transactions', label: 'Credit Transactions', icon: CreditCard },
          { id: 'cashflow', label: 'Payment Modes Split', icon: Banknote },
          { id: 'pnl', label: 'Profit & Loss Statement', icon: TrendingUp },
        ],
      },
    ];

    return (
      <View style={styles.subSidebar}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {reportGroups.map((grp) => (
            <View key={grp.title} style={styles.groupContainer}>
              <Text style={styles.groupHeader}>{grp.title}</Text>
              {grp.items.map((item) => {
                const isActive = activeReport === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.subNavItem, isActive && styles.subNavItemActive]}
                    onPress={() => {
                      setActiveReport(item.id as ReportCategory);
                      setSearchQuery('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.subNavText, isActive && styles.subNavTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderContent = () => {
    switch (activeReport) {
      // ── 1. ALL PARTIES & BALANCES ──────────────────────────────────────────
      case 'all_parties':
        return (
          <View style={styles.reportMainCard}>
            <View style={styles.tableActionBar}>
              <View style={styles.filterLeft}>
                <View style={styles.dropdownButton}>
                  <Text style={styles.dropdownText}>All Parties ({customers.length})</Text>
                  <ChevronDown size={14} color="#64748B" />
                </View>
              </View>

              <View style={styles.actionRight}>
                <TouchableOpacity style={styles.actionPillBtn} onPress={handleExportExcel} activeOpacity={0.7}>
                  <FileSpreadsheet size={15} color="#16A34A" />
                  <Text style={styles.actionPillText}>Excel Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionPillBtn} onPress={handlePrint} activeOpacity={0.7}>
                  <Printer size={15} color="#007DC6" />
                  <Text style={styles.actionPillText}>Print</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchFieldWrap}>
                <Search size={14} color="#64748B" />
                <TextInput
                  style={styles.tableSearchInput}
                  placeholder="Search party by name, code or phone..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <View style={styles.tableWrapper}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thText, { width: 40 }]}>#</Text>
                <Text style={[styles.thText, { flex: 2 }]}>PARTY NAME</Text>
                <Text style={[styles.thText, { width: 90 }]}>CODE</Text>
                <Text style={[styles.thText, { width: 120 }]}>PHONE NO.</Text>
                <Text style={[styles.thText, { width: 140, textAlign: 'right' }]}>RECEIVABLE BAL</Text>
                <Text style={[styles.thText, { width: 120, textAlign: 'right' }]}>CREDIT LIMIT</Text>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                {filteredCustomers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No parties match your search.</Text>
                  </View>
                ) : (
                  filteredCustomers.map((cust, idx) => (
                    <View key={cust.id} style={styles.tableRow}>
                      <Text style={[styles.tdText, { width: 40, color: '#94A3B8' }]}>{idx + 1}</Text>
                      <Text style={[styles.tdTextBold, { flex: 2 }]}>{cust.name}</Text>
                      <Text style={[styles.tdTextMono, { width: 90, color: '#007DC6' }]}>{cust.code}</Text>
                      <Text style={[styles.tdText, { width: 120, color: '#64748B' }]}>{cust.phone || '-'}</Text>
                      <Text
                        style={[
                          styles.tdTextMono,
                          {
                            width: 140,
                            textAlign: 'right',
                            color: cust.outstandingBalance > 0 ? '#EA580C' : '#16A34A',
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {formatCurrency(cust.outstandingBalance)}
                      </Text>
                      <Text style={[styles.tdTextMono, { width: 120, textAlign: 'right', color: '#475569' }]}>
                        {formatCurrency(cust.creditLimit)}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>

            <View style={styles.summaryFooterBar}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Receivable:</Text>
                <Text style={[styles.summaryVal, { color: '#EA580C' }]}>{formatCurrency(totalReceivable)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Credit Limit:</Text>
                <Text style={[styles.summaryVal, { color: '#007DC6' }]}>{formatCurrency(totalCreditLimit)}</Text>
              </View>
            </View>
          </View>
        );

      // ── 2. DAILY SALES REGISTER ─────────────────────────────────────────────
      case 'sale':
        return (
          <View style={styles.reportMainCard}>
            <View style={styles.tableActionBar}>
              <Text style={styles.sectionHeading}>Daily Shift Sales Register</Text>
              <View style={styles.actionRight}>
                <TouchableOpacity style={styles.actionPillBtn} onPress={handleExportExcel} activeOpacity={0.7}>
                  <FileSpreadsheet size={15} color="#16A34A" />
                  <Text style={styles.actionPillText}>Excel Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionPillBtn} onPress={handlePrint} activeOpacity={0.7}>
                  <Printer size={15} color="#007DC6" />
                  <Text style={styles.actionPillText}>Print</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.tableWrapper}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thText, { width: 90 }]}>DATE</Text>
                <Text style={[styles.thText, { width: 100 }]}>SHIFT NO</Text>
                <Text style={[styles.thText, { width: 80 }]}>PUMP</Text>
                <Text style={[styles.thText, { flex: 1.5 }]}>OPERATOR</Text>
                <Text style={[styles.thText, { width: 110, textAlign: 'right' }]}>VOLUME (L)</Text>
                <Text style={[styles.thText, { width: 130, textAlign: 'right' }]}>GROSS SALES</Text>
                <Text style={[styles.thText, { width: 90, textAlign: 'right' }]}>STATUS</Text>
              </View>
              <ScrollView style={{ maxHeight: 420 }}>
                {shifts.map((s) => (
                  <View key={s.id} style={styles.tableRow}>
                    <Text style={[styles.tdText, { width: 90 }]}>{formatDate(s.shiftDate)}</Text>
                    <Text style={[styles.tdTextMono, { width: 100, color: '#007DC6' }]}>{s.shiftNo}</Text>
                    <Text style={[styles.tdText, { width: 80 }]}>Pump {s.pumpNo}</Text>
                    <Text style={[styles.tdTextBold, { flex: 1.5 }]}>{s.operatorName}</Text>
                    <Text style={[styles.tdTextMono, { width: 110, textAlign: 'right', color: '#0284C7' }]}>
                      {formatLitres(s.totalLitresSold)}
                    </Text>
                    <Text style={[styles.tdTextMono, { width: 130, textAlign: 'right', color: '#16A34A', fontWeight: '700' }]}>
                      {formatCurrency(s.totalSalesAmount)}
                    </Text>
                    <Text style={[styles.tdText, { width: 90, textAlign: 'right', color: '#64748B' }]}>{s.status}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.summaryFooterBar}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Volume Sold:</Text>
                <Text style={[styles.summaryVal, { color: '#0284C7' }]}>{formatLitres(totalFuelLitres)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Gross Sales:</Text>
                <Text style={[styles.summaryVal, { color: '#16A34A' }]}>{formatCurrency(totalFuelSales)}</Text>
              </View>
            </View>
          </View>
        );

      // ── 3. EXPENSES & PURCHASES ─────────────────────────────────────────────
      case 'purchase':
        return (
          <View style={styles.reportMainCard}>
            <View style={styles.tableActionBar}>
              <Text style={styles.sectionHeading}>Daily Bunk Expenses & Purchases</Text>
              <View style={styles.actionRight}>
                <TouchableOpacity style={styles.actionPillBtn} onPress={handleExportExcel} activeOpacity={0.7}>
                  <FileSpreadsheet size={15} color="#16A34A" />
                  <Text style={styles.actionPillText}>Excel Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionPillBtn} onPress={handlePrint} activeOpacity={0.7}>
                  <Printer size={15} color="#007DC6" />
                  <Text style={styles.actionPillText}>Print</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchFieldWrap}>
                <Search size={14} color="#64748B" />
                <TextInput
                  style={styles.tableSearchInput}
                  placeholder="Search expense category, voucher or payee..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <View style={styles.tableWrapper}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thText, { width: 90 }]}>DATE</Text>
                <Text style={[styles.thText, { width: 100 }]}>VOUCHER #</Text>
                <Text style={[styles.thText, { flex: 1.5 }]}>EXPENSE CATEGORY</Text>
                <Text style={[styles.thText, { width: 120 }]}>PAID TO</Text>
                <Text style={[styles.thText, { width: 100 }]}>PAID BY</Text>
                <Text style={[styles.thText, { width: 120, textAlign: 'right' }]}>AMOUNT</Text>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                {filteredExpenses.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No expense vouchers found.</Text>
                  </View>
                ) : (
                  filteredExpenses.map((exp) => (
                    <View key={exp.id} style={styles.tableRow}>
                      <Text style={[styles.tdText, { width: 90 }]}>{formatDate(exp.date)}</Text>
                      <Text style={[styles.tdTextMono, { width: 100, color: '#007DC6' }]}>{exp.voucherNo}</Text>
                      <Text style={[styles.tdTextBold, { flex: 1.5 }]}>{exp.expenseTypeName}</Text>
                      <Text style={[styles.tdText, { width: 120, color: '#64748B' }]}>{exp.paidTo || '-'}</Text>
                      <Text style={[styles.tdText, { width: 100, color: '#64748B' }]}>{exp.paidBy || '-'}</Text>
                      <Text style={[styles.tdTextMono, { width: 120, textAlign: 'right', color: '#EF4444', fontWeight: '700' }]}>
                        {formatCurrency(exp.amount)}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>

            <View style={styles.summaryFooterBar}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Vouchers:</Text>
                <Text style={[styles.summaryVal, { color: '#64748B' }]}>{expenses.length}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Expenses:</Text>
                <Text style={[styles.summaryVal, { color: '#EF4444' }]}>{formatCurrency(totalExpenses)}</Text>
              </View>
            </View>
          </View>
        );

      // ── 4. CREDIT TRANSACTIONS ──────────────────────────────────────────────
      case 'all_transactions':
        return (
          <View style={styles.reportMainCard}>
            <View style={styles.tableActionBar}>
              <Text style={styles.sectionHeading}>Credit Sale Chits & Transactions</Text>
              <View style={styles.actionRight}>
                <TouchableOpacity style={styles.actionPillBtn} onPress={handleExportExcel} activeOpacity={0.7}>
                  <FileSpreadsheet size={15} color="#16A34A" />
                  <Text style={styles.actionPillText}>Excel Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionPillBtn} onPress={handlePrint} activeOpacity={0.7}>
                  <Printer size={15} color="#007DC6" />
                  <Text style={styles.actionPillText}>Print</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchFieldWrap}>
                <Search size={14} color="#64748B" />
                <TextInput
                  style={styles.tableSearchInput}
                  placeholder="Search by customer, slip no, vehicle or fuel..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <View style={styles.tableWrapper}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thText, { width: 85 }]}>DATE</Text>
                <Text style={[styles.thText, { width: 95 }]}>SLIP NO</Text>
                <Text style={[styles.thText, { flex: 1.5 }]}>CUSTOMER</Text>
                <Text style={[styles.thText, { width: 100 }]}>VEHICLE</Text>
                <Text style={[styles.thText, { width: 80 }]}>PRODUCT</Text>
                <Text style={[styles.thText, { width: 80, textAlign: 'right' }]}>LITRES</Text>
                <Text style={[styles.thText, { width: 110, textAlign: 'right' }]}>AMOUNT</Text>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                {filteredTransactions.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No credit transactions found.</Text>
                  </View>
                ) : (
                  filteredTransactions.map((tx) => (
                    <View key={tx.id} style={styles.tableRow}>
                      <Text style={[styles.tdText, { width: 85 }]}>{formatDate(tx.date)}</Text>
                      <Text style={[styles.tdTextMono, { width: 95, color: '#007DC6' }]}>{tx.slipNo}</Text>
                      <Text style={[styles.tdTextBold, { flex: 1.5 }]}>{tx.customerName}</Text>
                      <Text style={[styles.tdTextMono, { width: 100, color: '#64748B' }]}>{tx.vehicleNo || '-'}</Text>
                      <Text style={[styles.tdText, { width: 80 }]}>{tx.productName}</Text>
                      <Text style={[styles.tdTextMono, { width: 80, textAlign: 'right', color: '#0284C7' }]}>
                        {formatLitres(tx.litres)}
                      </Text>
                      <Text style={[styles.tdTextMono, { width: 110, textAlign: 'right', color: '#EA580C', fontWeight: '700' }]}>
                        {formatCurrency(tx.amount)}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>

            <View style={styles.summaryFooterBar}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Credit Litres:</Text>
                <Text style={[styles.summaryVal, { color: '#0284C7' }]}>{formatLitres(totalCreditTxLitres)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Credit Amount:</Text>
                <Text style={[styles.summaryVal, { color: '#EA580C' }]}>{formatCurrency(totalCreditTxAmount)}</Text>
              </View>
            </View>
          </View>
        );

      // ── 5. PAYMENT MODES BREAKDOWN ──────────────────────────────────────────
      case 'cashflow':
        return (
          <View style={styles.reportMainCard}>
            <View style={styles.tableActionBar}>
              <Text style={styles.sectionHeading}>Payment Collections & Mode Breakdown</Text>
              <View style={styles.actionRight}>
                <TouchableOpacity style={styles.actionPillBtn} onPress={handleExportExcel} activeOpacity={0.7}>
                  <FileSpreadsheet size={15} color="#16A34A" />
                  <Text style={styles.actionPillText}>Excel Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionPillBtn} onPress={handlePrint} activeOpacity={0.7}>
                  <Printer size={15} color="#007DC6" />
                  <Text style={styles.actionPillText}>Print</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modesSummaryGrid}>
              <View style={[styles.modeCard, { borderLeftColor: '#16A34A' }]}>
                <Text style={styles.modeCardLabel}>PHYSICAL CASH COLLECTIONS</Text>
                <Text style={styles.modeCardVal}>{formatCurrency(totalCash)}</Text>
                <Text style={styles.modeCardPct}>{Math.round((totalCash / (totalFuelSales || 1)) * 100)}% of total sales</Text>
              </View>

              <View style={[styles.modeCard, { borderLeftColor: '#7C3AED' }]}>
                <Text style={styles.modeCardLabel}>UPI / GPAY / PHONEPE</Text>
                <Text style={styles.modeCardVal}>{formatCurrency(totalUPI)}</Text>
                <Text style={styles.modeCardPct}>{Math.round((totalUPI / (totalFuelSales || 1)) * 100)}% of total sales</Text>
              </View>

              <View style={[styles.modeCard, { borderLeftColor: '#007DC6' }]}>
                <Text style={styles.modeCardLabel}>CARD / POS SWIPES</Text>
                <Text style={styles.modeCardVal}>{formatCurrency(totalCard)}</Text>
                <Text style={styles.modeCardPct}>{Math.round((totalCard / (totalFuelSales || 1)) * 100)}% of total sales</Text>
              </View>

              <View style={[styles.modeCard, { borderLeftColor: '#EA580C' }]}>
                <Text style={styles.modeCardLabel}>CREDIT FUEL CHITS</Text>
                <Text style={styles.modeCardVal}>{formatCurrency(totalCreditSales)}</Text>
                <Text style={styles.modeCardPct}>{Math.round((totalCreditSales / (totalFuelSales || 1)) * 100)}% of total sales</Text>
              </View>
            </View>

            <View style={styles.summaryFooterBar}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Sales Reconciled:</Text>
                <Text style={[styles.summaryVal, { color: '#007DC6' }]}>{formatCurrency(totalFuelSales)}</Text>
              </View>
            </View>
          </View>
        );

      // ── 6. PROFIT & LOSS ───────────────────────────────────────────────────
      case 'pnl':
        return (
          <View style={styles.reportMainCard}>
            <View style={styles.tableActionBar}>
              <Text style={styles.sectionHeading}>Station Operating Profit & Loss Statement</Text>
              <View style={styles.actionRight}>
                <TouchableOpacity style={styles.actionPillBtn} onPress={handleExportExcel} activeOpacity={0.7}>
                  <FileSpreadsheet size={15} color="#16A34A" />
                  <Text style={styles.actionPillText}>Excel Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionPillBtn} onPress={handlePrint} activeOpacity={0.7}>
                  <Printer size={15} color="#007DC6" />
                  <Text style={styles.actionPillText}>Print</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.pnlBox}>
              <View style={styles.pnlRow}>
                <Text style={styles.pnlLabel}>A. Total Gross Fuel Revenue:</Text>
                <Text style={styles.pnlVal}>{formatCurrency(totalFuelSales)}</Text>
              </View>
              <View style={styles.pnlRow}>
                <Text style={styles.pnlLabel}>B. Estimated Dealer Commission Margin (@ ₹3.50/L):</Text>
                <Text style={[styles.pnlVal, { color: '#007DC6' }]}>+ {formatCurrency(estimatedFuelMargin)}</Text>
              </View>
              <View style={styles.pnlRow}>
                <Text style={styles.pnlLabel}>C. Total Operational Expenses (Staff, EB, Maintenance, Bata):</Text>
                <Text style={[styles.pnlVal, { color: '#EF4444' }]}>- {formatCurrency(totalExpenses)}</Text>
              </View>
              <View style={styles.pnlDivider} />
              <View style={styles.pnlRow}>
                <Text style={styles.pnlGrandLabel}>ESTIMATED NET OPERATING PROFIT (B - C):</Text>
                <Text
                  style={[
                    styles.pnlGrandVal,
                    { color: netOperatingProfit >= 0 ? '#16A34A' : '#EF4444' },
                  ]}
                >
                  {formatCurrency(netOperatingProfit)}
                </Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.twoColumnWrapper}>
        {renderSubSidebar()}
        <View style={styles.mainPanel}>{renderContent()}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  twoColumnWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  // Sub Sidebar (Left Column)
  subSidebar: {
    width: 210,
    backgroundColor: '#F1F5F9', // Clean light cyan/slate
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingVertical: 12,
  },
  groupContainer: {
    marginBottom: 16,
  },
  groupHeader: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subNavItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 1,
  },
  subNavItemActive: {
    backgroundColor: '#E2E8F0',
    borderLeftWidth: 3,
    borderLeftColor: '#007DC6', // BP Primary Blue
  },
  subNavText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '500',
  },
  subNavTextActive: {
    color: '#007DC6',
    fontWeight: '700',
  },
  // Main Panel (Right Column)
  mainPanel: {
    flex: 1,
    padding: 14,
  },
  reportMainCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  tableActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  dropdownText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  actionPillText: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeading: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  searchRow: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    outlineStyle: 'none' as any,
    padding: 0,
  },
  tableWrapper: {
    flex: 1,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tdText: {
    color: '#334155',
    fontSize: 12,
  },
  tdTextBold: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
  },
  tdTextMono: {
    fontSize: 12,
    fontFamily: typography.monoFont,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 10,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  summaryFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  summaryDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#CBD5E1',
  },
  modesSummaryGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  modeCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
  },
  modeCardLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  modeCardVal: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: typography.monoFont,
    marginVertical: 4,
  },
  modeCardPct: {
    color: '#64748B',
    fontSize: 11,
  },
  pnlBox: {
    padding: 20,
    gap: 12,
  },
  pnlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pnlLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '500',
  },
  pnlVal: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.monoFont,
  },
  pnlDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },
  pnlGrandLabel: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  pnlGrandVal: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
});


