import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  FileSpreadsheet,
  PlusCircle,
  Save,
  Trash2,
  User,
  X
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';

import { useCreditLedgerContext } from '../context/CreditLedgerContext';
import { colors } from '../theme/colors';
import { CreditPaymentMode } from '../types';
import { formatCurrency, formatRate, formatDate, getTodayDateString } from '../utils/formatters';


export const CreditLedgerScreen: React.FC = () => {
  const {
    customers,
    products,
    pumps,
    creditTransactions,
    creditPayments,
    addCreditSale,
    deleteCreditSale,
    recordCreditRepayment,
    deleteCreditRepayment,
    addCustomer,
  } = useCreditLedgerContext();

  const [activeTab, setActiveTab] = useState<'MATRIX' | 'CUSTOMERS' | 'SALES' | 'COLLECTIONS'>('MATRIX');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // 12-Month Khata Ledger State (Default to April 2024 or Current Month)
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState<string>('2024-04');
  const [selectedCell, setSelectedCell] = useState<{ customerId: string; customerName: string; date: string } | null>(null);

  // Available Fiscal Months (April 2024 → March 2025 + Current)
  const fiscalMonths = useMemo(() => [
    { key: '2024-04', label: 'Apr 2024' },
    { key: '2024-05', label: 'May 2024' },
    { key: '2024-06', label: 'Jun 2024' },
    { key: '2024-07', label: 'Jul 2024' },
    { key: '2024-08', label: 'Aug 2024' },
    { key: '2024-09', label: 'Sep 2024' },
    { key: '2024-10', label: 'Oct 2024' },
    { key: '2024-11', label: 'Nov 2024' },
    { key: '2024-12', label: 'Dec 2024' },
    { key: '2025-01', label: 'Jan 2025' },
    { key: '2025-02', label: 'Feb 2025' },
    { key: '2025-03', label: 'Mar 2025' },
  ], []);

  // Modals
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [showNewCustModal, setShowNewCustModal] = useState(false);

  // New Credit Sale Form
  const [saleDate, setSaleDate] = useState<string>(getTodayDateString());
  const [saleCustId, setSaleCustId] = useState<string>('');
  const [salePumpId, setSalePumpId] = useState<string>('');
  const [saleProductId, setSaleProductId] = useState<string>('');
  const [saleLitres, setSaleLitres] = useState('100.00');
  const [saleRemarks, setSaleRemarks] = useState('');

  // Repayment Form
  const [payDate, setPayDate] = useState<string>(getTodayDateString());
  const [payCustId, setPayCustId] = useState<string>('');
  const [payAmount, setPayAmount] = useState('10000');
  const [payMode, setPayMode] = useState<CreditPaymentMode>('Cash');

  // New Customer Form
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Total outstanding across all customers
  const totalOutstanding = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.outstandingBalance, 0);
  }, [customers]);

  const totalCreditSales = useMemo(() => {
    return creditTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [creditTransactions]);

  const totalRepayments = useMemo(() => {
    return creditPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [creditPayments]);

  // ── Monthly Khata Matrix Computations ─────────────────────────────────────
  const daysInSelectedMonth = useMemo(() => {
    const parts = selectedMonth.split('-');
    const y = parseInt(parts[0], 10) || 2024;
    const m = parseInt(parts[1], 10) || 4;
    const count = new Date(y, m, 0).getDate();
    const days: { dateStr: string; dayNum: number; display: string }[] = [];
    for (let d = 1; d <= count; d++) {
      const dayStr = d < 10 ? `0${d}` : `${d}`;
      const fullDate = `${parts[0]}-${parts[1]}-${dayStr}`;
      const dt = new Date(y, m - 1, d);
      const weekday = dt.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({
        dateStr: fullDate,
        dayNum: d,
        display: `${dayStr} (${weekday})`,
      });
    }
    return days;
  }, [selectedMonth]);

  const monthMatrixData = useMemo(() => {
    // Map transactions & payments by `${customerId}_${date}`
    const salesMap: { [key: string]: number } = {};
    const paysMap: { [key: string]: number } = {};

    creditTransactions.forEach(tx => {
      if (tx.date && tx.date.startsWith(selectedMonth)) {
        const k = `${tx.customerId}_${tx.date}`;
        salesMap[k] = (salesMap[k] || 0) + (tx.amount || 0);
      }
    });

    creditPayments.forEach(p => {
      if (p.date && p.date.startsWith(selectedMonth)) {
        const k = `${p.customerId}_${p.date}`;
        paysMap[k] = (paysMap[k] || 0) + (p.amount || 0);
      }
    });

    // Customer rows
    const customerRows = customers.map(cust => {
      let monthCredit = 0;
      let monthPays = 0;
      const dailyMap: { [dateStr: string]: { credit: number; pay: number } } = {};

      daysInSelectedMonth.forEach(d => {
        const k = `${cust.id}_${d.dateStr}`;
        const cr = salesMap[k] || 0;
        const py = paysMap[k] || 0;
        monthCredit += cr;
        monthPays += py;
        dailyMap[d.dateStr] = { credit: cr, pay: py };
      });

      const opening = cust.openingBalance || 0;
      const closing = opening + monthCredit - monthPays;

      return {
        customer: cust,
        opening,
        dailyMap,
        monthCredit,
        monthPays,
        closing,
      };
    });

    // Daily totals across all customers
    const dailyTotals: { [dateStr: string]: { totalCredit: number; totalPay: number } } = {};
    let grandMonthCredit = 0;
    let grandMonthPays = 0;

    daysInSelectedMonth.forEach(d => {
      let dCredit = 0;
      let dPay = 0;
      customerRows.forEach(cRow => {
        const entry = cRow.dailyMap[d.dateStr];
        if (entry) {
          dCredit += entry.credit;
          dPay += entry.pay;
        }
      });
      dailyTotals[d.dateStr] = { totalCredit: dCredit, totalPay: dPay };
      grandMonthCredit += dCredit;
      grandMonthPays += dPay;
    });

    const grandOpening = customerRows.reduce((sum, r) => sum + r.opening, 0);
    const grandClosing = grandOpening + grandMonthCredit - grandMonthPays;

    return {
      customerRows,
      dailyTotals,
      grandMonthCredit,
      grandMonthPays,
      grandOpening,
      grandClosing,
    };
  }, [customers, creditTransactions, creditPayments, selectedMonth, daysInSelectedMonth]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
  }, [customers, searchQuery]);

  const filteredSales = useMemo(() => {
    if (!searchQuery.trim() && !selectedCustomerId) return creditTransactions;
    return creditTransactions.filter(tx => {
      if (selectedCustomerId && tx.customerId !== selectedCustomerId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (tx.customerName && tx.customerName.toLowerCase().includes(q)) ||
          (tx.productName && tx.productName.toLowerCase().includes(q));
      }
      return true;
    });
  }, [creditTransactions, selectedCustomerId, searchQuery]);

  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim() && !selectedCustomerId) return creditPayments;
    return creditPayments.filter(p => {
      if (selectedCustomerId && p.customerId !== selectedCustomerId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (p.customerName && p.customerName.toLowerCase().includes(q)) || p.paymentMode.toLowerCase().includes(q);
      }
      return true;
    });
  }, [creditPayments, selectedCustomerId, searchQuery]);

  // Handlers
  const handleCreateCustomer = async () => {
    if (!newCustName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }
    try {
      await addCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
      });
      setShowNewCustModal(false);
      setNewCustName('');
      setNewCustPhone('');
      Alert.alert('Success', 'Customer added successfully!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create customer');
    }
  };

  const handleCreateSale = async () => {
    const custId = saleCustId || customers[0]?.id;
    const pumpId = salePumpId || pumps[0]?.id;
    const prodId = saleProductId || products[0]?.id;
    const litres = parseFloat(saleLitres);

    if (!custId || !pumpId || !prodId || isNaN(litres) || litres <= 0) {
      Alert.alert('Error', 'Please fill in all credit sale details');
      return;
    }

    try {
      await addCreditSale({
        date: saleDate,
        pumpId,
        customerId: custId,
        productId: prodId,
        litres,
        remarks: saleRemarks,
      });
      setShowAddSaleModal(false);
      setSaleRemarks('');
      Alert.alert('Success', 'Credit sale recorded!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to record credit sale');
    }
  };

  const handleRecordRepayment = async () => {
    const custId = payCustId || customers[0]?.id;
    const amt = parseFloat(payAmount);

    if (!custId || isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Please enter valid repayment amount');
      return;
    }

    try {
      await recordCreditRepayment({
        date: payDate,
        customerId: custId,
        amount: amt,
        paymentMode: payMode,
      });
      setShowRepaymentModal(false);
      Alert.alert('Success', 'Credit repayment recorded!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to record repayment');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Credit Ledger & Collections</Text>
          <Text style={styles.headerSubtitle}>
            Block C (Customer Credit Sales) & Block E (Payment Collections)
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setShowNewCustModal(true)}
          >
            <User size={16} color={colors.text} />
            <Text style={styles.secondaryBtnText}>+ New Customer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setSaleCustId(customers[0]?.id || '');
              setSalePumpId(pumps[0]?.id || '');
              setSaleProductId(products[0]?.id || '');
              setShowAddSaleModal(true);
            }}
          >
            <PlusCircle size={16} color="#FFF" />
            <Text style={styles.primaryBtnText}>Credit Sale (Block C)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#10B981' }]}
            onPress={() => {
              setPayCustId(customers[0]?.id || '');
              setShowRepaymentModal(true);
            }}
          >
            <ArrowDownLeft size={16} color="#FFF" />
            <Text style={styles.primaryBtnText}>Collection (Block E)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Top Strip */}
      <View style={styles.kpiStrip}>
        <View style={[styles.kpiCard, { borderColor: '#EF4444' }]}>
          <Text style={styles.kpiLabel}>Total Outstanding</Text>
          <Text style={[styles.kpiValue, { color: '#EF4444' }]}>{formatCurrency(totalOutstanding)}</Text>
          <Text style={styles.kpiSub}>{customers.length} Active Accounts</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#F59E0B' }]}>
          <Text style={styles.kpiLabel}>Total Credit Sales</Text>
          <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>{formatCurrency(totalCreditSales)}</Text>
          <Text style={styles.kpiSub}>Block C Records</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#10B981' }]}>
          <Text style={styles.kpiLabel}>Total Repayments</Text>
          <Text style={[styles.kpiValue, { color: '#10B981' }]}>{formatCurrency(totalRepayments)}</Text>
          <Text style={styles.kpiSub}>Block E Collections</Text>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabNav}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'MATRIX' && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab('MATRIX');
            setSelectedCustomerId('');
          }}
        >
          <FileSpreadsheet size={16} color={activeTab === 'MATRIX' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === 'MATRIX' && styles.tabBtnTextActive]}>
            Monthly Khata Matrix (12-Month Grid)
          </Text>

        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'CUSTOMERS' && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab('CUSTOMERS');
            setSelectedCustomerId('');
          }}
        >
          <User size={16} color={activeTab === 'CUSTOMERS' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === 'CUSTOMERS' && styles.tabBtnTextActive]}>
            Customer Accounts ({customers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'SALES' && styles.tabBtnActive]}
          onPress={() => setActiveTab('SALES')}
        >
          <ArrowUpRight size={16} color={activeTab === 'SALES' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === 'SALES' && styles.tabBtnTextActive]}>
            Credit Sales List
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'COLLECTIONS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('COLLECTIONS')}
        >
          <ArrowDownLeft size={16} color={activeTab === 'COLLECTIONS' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === 'COLLECTIONS' && styles.tabBtnTextActive]}>
            Collections List
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── TAB 1: MONTHLY KHATA SPREADSHEET MATRIX ────────────────────── */}
        {activeTab === 'MATRIX' && (
          <View style={{ gap: 16 }}>
            {/* Month Selector Bar */}
            <View style={styles.monthSelectorCard}>
              <View style={styles.monthSelectorHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <CalendarDays size={18} color={colors.primary} />
                  <Text style={styles.monthSelectorTitle}>
                    Monthly Ledger Cycle
                  </Text>
                </View>
                 
              </View>

              {/* Month Pills Slider */}
               

              {/* Month Snapshot KPI Badges */}
              <View style={styles.monthKpiRow}>
                <View style={styles.monthKpiItem}>
                  <Text style={styles.monthKpiLabel}>Month Opening</Text>
                  <Text style={[styles.monthKpiVal, { color: '#3B82F6' }]}>
                    {formatCurrency(monthMatrixData.grandOpening)}
                  </Text>
                </View>
                <View style={styles.monthKpiItem}>
                  <Text style={styles.monthKpiLabel}>+ Credit Issued</Text>
                  <Text style={[styles.monthKpiVal, { color: '#F59E0B' }]}>
                    {formatCurrency(monthMatrixData.grandMonthCredit)}
                  </Text>
                </View>
                <View style={styles.monthKpiItem}>
                  <Text style={styles.monthKpiLabel}>- Collections</Text>
                  <Text style={[styles.monthKpiVal, { color: '#10B981' }]}>
                    {formatCurrency(monthMatrixData.grandMonthPays)}
                  </Text>
                </View>
                <View style={[styles.monthKpiItem, { borderRightWidth: 0 }]}>
                  <Text style={styles.monthKpiLabel}>= Closing Balance</Text>
                  <Text style={[styles.monthKpiVal, { color: '#EF4444' }]}>
                    {formatCurrency(monthMatrixData.grandClosing)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Matrix Table Container */}
            <View style={styles.matrixContainer}>
              <View style={styles.matrixBanner}>
                <View>
                  <Text style={styles.matrixBannerTitle}>
                    {fiscalMonths.find(m => m.key === selectedMonth)?.label || selectedMonth} — Master Credit & Khata Matrix
                  </Text>
                  <Text style={styles.matrixBannerSub}>
                    Showing {monthMatrixData.customerRows.length} accounts across {daysInSelectedMonth.length} calendar days. Click any cell to log transactions.
                  </Text>
                </View>
              </View>

              <ScrollView horizontal style={styles.matrixScroll}>
                <View>
                  {/* Table Header: Day Col | Customer Columns | Row Total Col */}
                  <View style={styles.matrixHeaderRow}>
                    <View style={[styles.matrixCell, styles.matrixDateCol]}>
                      <Text style={styles.matrixHeaderColText}>Date / Day</Text>
                    </View>
                    {monthMatrixData.customerRows.map(r => (
                      <View key={r.customer.id} style={[styles.matrixCell, styles.matrixCustHeaderCol]}>
                        <Text style={styles.matrixCustHeaderText} numberOfLines={1}>
                          {r.customer.name}
                        </Text>
                        {r.customer.phone ? (
                          <Text style={styles.matrixCustHeaderSub} numberOfLines={1}>
                            {r.customer.phone}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                    <View style={[styles.matrixCell, styles.matrixTotalColHeader]}>
                      <Text style={styles.matrixTotalHeaderText}>Daily Total</Text>
                    </View>
                  </View>

                  {/* ── ROW 0: OPENING BALANCE ──────────────────────────────── */}
                  <View style={[styles.matrixRow, styles.matrixOpeningRow]}>
                    <View style={[styles.matrixCell, styles.matrixDateCol, { backgroundColor: '#EFF6FF' }]}>
                      <Text style={[styles.matrixDateText, { color: '#1E40AF', fontWeight: '800' }]}>
                        Opening Balance
                      </Text>
                      <Text style={{ fontSize: 9, color: '#3B82F6' }}>Opening Dues</Text>
                    </View>
                    {monthMatrixData.customerRows.map(r => (
                      <View key={r.customer.id} style={[styles.matrixCell, styles.matrixCustCol, { backgroundColor: '#EFF6FF' }]}>
                        <Text style={[styles.matrixOpeningVal, r.opening > 0 ? { color: '#1E40AF', fontWeight: '700' } : { color: '#94A3B8' }]}>
                          {r.opening > 0 ? formatCurrency(r.opening) : '-'}
                        </Text>
                      </View>
                    ))}
                    <View style={[styles.matrixCell, styles.matrixTotalCol, { backgroundColor: '#DBEAFE' }]}>
                      <Text style={[styles.matrixTotalRowVal, { color: '#1E3A8A', fontWeight: '800' }]}>
                        {formatCurrency(monthMatrixData.grandOpening)}
                      </Text>
                    </View>
                  </View>

                  {/* Rows 1..31: DAILY TRANSACTION CELLS */}
                  {daysInSelectedMonth.map(d => {
                    const dTotal = monthMatrixData.dailyTotals[d.dateStr] || { totalCredit: 0, totalPay: 0 };
                    const hasDailyActivity = dTotal.totalCredit > 0 || dTotal.totalPay > 0;
                    return (
                      <View
                        key={d.dateStr}
                        style={[
                          styles.matrixRow,
                          hasDailyActivity && styles.matrixRowActive,
                        ]}
                      >
                        {/* Day Label */}
                        <View style={[styles.matrixCell, styles.matrixDateCol]}>
                          <Text style={styles.matrixDateText}>{d.display}</Text>
                        </View>

                        {/* Customer Cells */}
                        {monthMatrixData.customerRows.map(r => {
                          const cell = r.dailyMap[d.dateStr] || { credit: 0, pay: 0 };
                          const hasActivity = cell.credit > 0 || cell.pay > 0;
                          return (
                            <TouchableOpacity
                              key={r.customer.id}
                              style={[
                                styles.matrixCell,
                                styles.matrixCustCol,
                                hasActivity && styles.matrixCellActive,
                              ]}
                              onPress={() =>
                                setSelectedCell({
                                  customerId: r.customer.id,
                                  customerName: r.customer.name,
                                  date: d.dateStr,
                                })
                              }
                            >
                              {cell.pay > 0 ? (
                                <View style={styles.payBadge}>
                                  <Text style={styles.payBadgeText}>
                                    ↓ ₹{cell.pay.toLocaleString()}
                                  </Text>
                                </View>
                              ) : null}
                              {cell.credit > 0 ? (
                                <View style={styles.creditBadge}>
                                  <Text style={styles.creditBadgeText}>
                                    ↑ ₹{cell.credit.toLocaleString()}
                                  </Text>
                                </View>
                              ) : null}
                              {!hasActivity ? (
                                <Text style={styles.matrixEmptyCellText}>-</Text>
                              ) : null}
                            </TouchableOpacity>
                          );
                        })}

                        {/* Daily Total Column */}
                        <View style={[styles.matrixCell, styles.matrixTotalCol]}>
                          {dTotal.totalPay > 0 ? (
                            <Text style={styles.dailyPayTotalText}>
                              - {formatCurrency(dTotal.totalPay)}
                            </Text>
                          ) : null}
                          {dTotal.totalCredit > 0 ? (
                            <Text style={styles.dailyCreditTotalText}>
                              + {formatCurrency(dTotal.totalCredit)}
                            </Text>
                          ) : null}
                          {!hasDailyActivity ? (
                            <Text style={styles.matrixEmptyCellText}>-</Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}

                  {/* ── FOOTER ROW 1: TOTAL CREDIT GIVEN ────────────────────── */}
                  <View style={[styles.matrixRow, styles.matrixCreditFooterRow]}>
                    <View style={[styles.matrixCell, styles.matrixDateCol, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.matrixDateText, { color: '#92400E', fontWeight: '800' }]}>
                        Total Credit
                      </Text>
                      <Text style={{ fontSize: 9, color: '#B45309' }}>Month Bills</Text>
                    </View>
                    {monthMatrixData.customerRows.map(r => (
                      <View key={r.customer.id} style={[styles.matrixCell, styles.matrixCustCol, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.matrixOpeningVal, { color: '#92400E', fontWeight: '700' }]}>
                          {r.monthCredit > 0 ? formatCurrency(r.monthCredit) : '-'}
                        </Text>
                      </View>
                    ))}
                    <View style={[styles.matrixCell, styles.matrixTotalCol, { backgroundColor: '#FDE68A' }]}>
                      <Text style={[styles.matrixTotalRowVal, { color: '#78350F', fontWeight: '800' }]}>
                        + {formatCurrency(monthMatrixData.grandMonthCredit)}
                      </Text>
                    </View>
                  </View>

                  {/* ── FOOTER ROW 2: TOTAL COLLECTIONS ────────────────────── */}
                  <View style={[styles.matrixRow, styles.matrixPayFooterRow]}>
                    <View style={[styles.matrixCell, styles.matrixDateCol, { backgroundColor: '#ECFDF5' }]}>
                      <Text style={[styles.matrixDateText, { color: '#065F46', fontWeight: '800' }]}>
                        Total Collections
                      </Text>
                      <Text style={{ fontSize: 9, color: '#047857' }}>Month Repayments</Text>
                    </View>
                    {monthMatrixData.customerRows.map(r => (
                      <View key={r.customer.id} style={[styles.matrixCell, styles.matrixCustCol, { backgroundColor: '#ECFDF5' }]}>
                        <Text style={[styles.matrixOpeningVal, { color: '#065F46', fontWeight: '700' }]}>
                          {r.monthPays > 0 ? formatCurrency(r.monthPays) : '-'}
                        </Text>
                      </View>
                    ))}
                    <View style={[styles.matrixCell, styles.matrixTotalCol, { backgroundColor: '#A7F3D0' }]}>
                      <Text style={[styles.matrixTotalRowVal, { color: '#064E3B', fontWeight: '800' }]}>
                        - {formatCurrency(monthMatrixData.grandMonthPays)}
                      </Text>
                    </View>
                  </View>

                  {/* ── FOOTER ROW 3: CLOSING BALANCE (CARRY FORWARD) ───────── */}
                  <View style={[styles.matrixRow, styles.matrixClosingFooterRow]}>
                    <View style={[styles.matrixCell, styles.matrixDateCol, { backgroundColor: '#F5F3FF' }]}>
                      <Text style={[styles.matrixDateText, { color: '#5B21B6', fontWeight: '800' }]}>
                        Closing Balance
                      </Text>
                      <Text style={{ fontSize: 9, color: '#6D28D9' }}>Carry Fwd Next Mo</Text>
                    </View>
                    {monthMatrixData.customerRows.map(r => (
                      <View key={r.customer.id} style={[styles.matrixCell, styles.matrixCustCol, { backgroundColor: '#F5F3FF' }]}>
                        <Text style={[styles.matrixOpeningVal, { color: '#5B21B6', fontWeight: '800' }]}>
                          {formatCurrency(r.closing)}
                        </Text>
                      </View>
                    ))}
                    <View style={[styles.matrixCell, styles.matrixTotalCol, { backgroundColor: '#DDD6FE' }]}>
                      <Text style={[styles.matrixTotalRowVal, { color: '#4C1D95', fontWeight: '800' }]}>
                        = {formatCurrency(monthMatrixData.grandClosing)}
                      </Text>
                    </View>
                  </View>

                </View>
              </ScrollView>
            </View>
          </View>
        )}

        {/* ── TAB 2: CUSTOMERS ───────────────────────────────────────────── */}
        {activeTab === 'CUSTOMERS' && (
          <View style={styles.grid}>
            {filteredCustomers.map(cust => (
              <View key={cust.id} style={styles.customerCard}>
                <View style={styles.customerCardHeader}>
                  <View style={styles.customerAvatar}>
                    <Text style={styles.avatarText}>{cust.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={styles.customerName}>{cust.name}</Text>
                    {cust.phone ? <Text style={styles.customerPhone}>{cust.phone}</Text> : null}
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Outstanding Balance</Text>
                  <Text style={[styles.balanceVal, cust.outstandingBalance > 0 && { color: '#EF4444' }]}>
                    {formatCurrency(cust.outstandingBalance)}
                  </Text>
                </View>

                <View style={styles.cardBtnRow}>
                  <TouchableOpacity
                    style={styles.smallSaleBtn}
                    onPress={() => {
                      setSaleCustId(cust.id);
                      setShowAddSaleModal(true);
                    }}
                  >
                    <Text style={styles.smallSaleBtnText}>+ Sale</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallPayBtn}
                    onPress={() => {
                      setPayCustId(cust.id);
                      setShowRepaymentModal(true);
                    }}
                  >
                    <Text style={styles.smallPayBtnText}>+ Collect</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 2: CREDIT SALES (Block C) */}
        {activeTab === 'SALES' && (
          <View style={styles.listContainer}>
            {filteredSales.map(tx => (
              <View key={tx.id} style={styles.txCard}>
                <View style={styles.txLeft}>
                  <View style={[styles.txIconBox, { backgroundColor: '#FEF3C7' }]}>
                    <ArrowUpRight size={18} color="#D97706" />
                  </View>
                  <View>
                    <Text style={styles.txCustomer}>{tx.customerName || 'Customer'}</Text>
                    <Text style={styles.txSub}>
                      {formatDate(tx.date)} • {tx.productName} • {tx.litres} L @ ₹{tx.rate}
                    </Text>
                    {tx.remarks ? <Text style={styles.txRemarks}>{tx.remarks}</Text> : null}
                  </View>
                </View>

                <View style={styles.txRight}>
                  <Text style={styles.txAmount}>{formatCurrency(tx.amount)}</Text>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => {
                      Alert.alert('Confirm Delete', 'Delete this credit sale?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteCreditSale(tx.id) },
                      ]);
                    }}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: COLLECTIONS (Block E) */}
        {activeTab === 'COLLECTIONS' && (
          <View style={styles.listContainer}>
            {filteredPayments.map(p => (
              <View key={p.id} style={styles.txCard}>
                <View style={styles.txLeft}>
                  <View style={[styles.txIconBox, { backgroundColor: '#D1FAE5' }]}>
                    <ArrowDownLeft size={18} color="#059669" />
                  </View>
                  <View>
                    <Text style={styles.txCustomer}>{p.customerName || 'Customer'}</Text>
                    <Text style={styles.txSub}>
                      {formatDate(p.date)} • Mode: <Text style={{ fontWeight: '700' }}>{p.paymentMode}</Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.txRight}>
                  <Text style={[styles.txAmount, { color: '#10B981' }]}>{formatCurrency(p.amount)}</Text>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => {
                      Alert.alert('Confirm Delete', 'Delete this repayment entry?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteCreditRepayment(p.id) },
                      ]);
                    }}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Customer Modal */}
      <Modal visible={showNewCustModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Customer Account</Text>
              <TouchableOpacity onPress={() => setShowNewCustModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1, maxHeight: 520 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Customer Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCustName}
                  onChangeText={setNewCustName}
                  placeholder="e.g. sathish, kpj, velmurugan"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Phone Number (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="phone-pad"
                  value={newCustPhone}
                  onChangeText={setNewCustPhone}
                  placeholder="e.g. +91 98401 23456"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowNewCustModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateCustomer}>
                <Save size={16} color="#FFF" />
                <Text style={styles.primaryBtnText}>Save Customer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Credit Sale Modal (Block C) */}
      <Modal visible={showAddSaleModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Credit Sale (Block C)</Text>
              <TouchableOpacity onPress={() => setShowAddSaleModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1, maxHeight: 520 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={saleDate}
                  onChangeText={setSaleDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Customer</Text>
                <ScrollView horizontal style={{ maxHeight: 44 }} showsHorizontalScrollIndicator={true}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {customers.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.pillBtn, (saleCustId === c.id || (!saleCustId && customers[0]?.id === c.id)) && styles.pillBtnActive]}
                        onPress={() => setSaleCustId(c.id)}
                      >
                        <Text style={[styles.pillBtnText, (saleCustId === c.id || (!saleCustId && customers[0]?.id === c.id)) && styles.pillBtnTextActive]}>
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Pump</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {pumps.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.pillBtn, (salePumpId === p.id || (!salePumpId && pumps[0]?.id === p.id)) && styles.pillBtnActive]}
                      onPress={() => setSalePumpId(p.id)}
                    >
                      <Text style={[styles.pillBtnText, (salePumpId === p.id || (!salePumpId && pumps[0]?.id === p.id)) && styles.pillBtnTextActive]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Product</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {products.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.pillBtn, (saleProductId === p.id || (!saleProductId && products[0]?.id === p.id)) && styles.pillBtnActive]}
                      onPress={() => setSaleProductId(p.id)}
                    >
                      <Text style={[styles.pillBtnText, (saleProductId === p.id || (!saleProductId && products[0]?.id === p.id)) && styles.pillBtnTextActive]}>
                        {p.name} ({formatRate(p.currentRate)})
                      </Text>

                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Litres Sold</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={saleLitres}
                  onChangeText={setSaleLitres}
                  placeholder="100.00"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Remarks (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={saleRemarks}
                  onChangeText={setSaleRemarks}
                  placeholder="e.g. Tanker credit"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddSaleModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateSale}>
                <Save size={16} color="#FFF" />
                <Text style={styles.primaryBtnText}>Save Credit Sale</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Record Repayment Modal (Block E) */}
      <Modal visible={showRepaymentModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cash & Digital Collection (Block E)</Text>
              <TouchableOpacity onPress={() => setShowRepaymentModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1, maxHeight: 520 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={payDate}
                  onChangeText={setPayDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Customer</Text>
                <ScrollView horizontal style={{ maxHeight: 44 }} showsHorizontalScrollIndicator={true}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {customers.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.pillBtn, (payCustId === c.id || (!payCustId && customers[0]?.id === c.id)) && styles.pillBtnActive]}
                        onPress={() => setPayCustId(c.id)}
                      >
                        <Text style={[styles.pillBtnText, (payCustId === c.id || (!payCustId && customers[0]?.id === c.id)) && styles.pillBtnTextActive]}>
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Payment Mode (Block E)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {(['Cash', 'Card', 'FC', 'Paytm', 'Cheque', 'Bank Transfer', 'Gpay'] as CreditPaymentMode[]).map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.pillBtn, payMode === m && styles.pillBtnActive]}
                      onPress={() => setPayMode(m)}
                    >
                      <Text style={[styles.pillBtnText, payMode === m && styles.pillBtnTextActive]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Amount Collected (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={payAmount}
                  onChangeText={setPayAmount}
                  placeholder="10000"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowRepaymentModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#10B981' }]} onPress={handleRecordRepayment}>
                <Save size={16} color="#FFF" />
                <Text style={styles.primaryBtnText}>Save Collection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quick Cell Action Modal */}
      <Modal visible={!!selectedCell} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Quick Action for {selectedCell?.customerName}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  Selected Date: {selectedCell?.date ? formatDate(selectedCell.date) : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedCell(null)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, marginVertical: 10 }}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#F59E0B', justifyContent: 'center', paddingVertical: 12 }]}
                onPress={() => {
                  if (selectedCell) {
                    setSaleCustId(selectedCell.customerId);
                    setSaleDate(selectedCell.date);
                    setSalePumpId(pumps[0]?.id || '');
                    setSaleProductId(products[0]?.id || '');
                    setSelectedCell(null);
                    setShowAddSaleModal(true);
                  }
                }}
              >
                <ArrowUpRight size={16} color="#FFF" />
                <Text style={styles.primaryBtnText}>+ Add Credit Sale on This Date</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#10B981', justifyContent: 'center', paddingVertical: 12 }]}
                onPress={() => {
                  if (selectedCell) {
                    setPayCustId(selectedCell.customerId);
                    setPayDate(selectedCell.date);
                    setSelectedCell(null);
                    setShowRepaymentModal(true);
                  }
                }}
              >
                <ArrowDownLeft size={16} color="#FFF" />
                <Text style={styles.primaryBtnText}>+ Record Payment / Collection on This Date</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSelectedCell(null)}>
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  primaryBtnText: {
    color: '#6F7BF5',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF1F5',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6F7BF5',
  },
  kpiStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: 'transparent',
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF1F5',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 10,
    color: '#9AA5B1',
    marginTop: 2,
  },
  tabNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    gap: 8,
    flexWrap: 'wrap',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  tabBtnActive: {
    borderColor: '#6F7BF5',
    backgroundColor: '#6F7BF5',
    shadowColor: '#6F7BF5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  contentScroll: {
    flex: 1,
    padding: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  customerCard: {
    width: '31%',
    minWidth: 260,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  customerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  customerPhone: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  balanceVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  cardBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallSaleBtn: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
  },
  smallSaleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  smallPayBtn: {
    flex: 1,
    backgroundColor: '#D1FAE5',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
  },
  smallPayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  listContainer: {
    gap: 10,
  },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txCustomer: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  txSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  txRemarks: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  txRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D97706',
  },
  deleteBtn: {
    padding: 4,
  },
  monthSelectorCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  monthSelectorHeader: {
    marginBottom: 12,
  },
  monthSelectorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  monthSelectorSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  monthPillsScroll: {
    marginBottom: 14,
  },
  monthPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  monthPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  monthPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  monthPillTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  monthKpiRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexWrap: 'wrap',
  },
  monthKpiItem: {
    flex: 1,
    minWidth: 110,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  monthKpiLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  monthKpiVal: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  matrixContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  matrixBanner: {
    padding: 14,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  matrixBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E40AF',
  },
  matrixBannerSub: {
    fontSize: 12,
    color: '#2563EB',
    marginTop: 2,
  },
  matrixScroll: {
    margin: 0,
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  matrixRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  matrixRowActive: {
    backgroundColor: '#F8FAFC',
  },
  matrixOpeningRow: {
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 2,
    borderBottomColor: '#BFDBFE',
  },
  matrixCreditFooterRow: {
    backgroundColor: '#FEF3C7',
    borderTopWidth: 2,
    borderTopColor: '#FDE68A',
  },
  matrixPayFooterRow: {
    backgroundColor: '#ECFDF5',
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0',
  },
  matrixClosingFooterRow: {
    backgroundColor: '#F5F3FF',
    borderTopWidth: 2,
    borderTopColor: '#DDD6FE',
  },
  matrixCell: {
    width: 145,
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    minHeight: 44,
  },
  matrixDateCol: {
    width: 115,
    backgroundColor: colors.background,
    alignItems: 'flex-start',
    paddingLeft: 10,
  },
  matrixDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  matrixCustHeaderCol: {
    width: 145,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  matrixCustHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  matrixCustHeaderSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  matrixTotalColHeader: {
    width: 145,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  matrixHeaderColText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  matrixTotalHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },

  matrixCustCol: {
    width: 145,
  },
  matrixCellActive: {
    backgroundColor: '#FEF3C7',
  },
  matrixTotalCol: {
    width: 145,
    backgroundColor: colors.background,
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  matrixOpeningVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  matrixTotalRowVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  payBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
    width: '100%',
    alignItems: 'center',
  },
  payBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  creditBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
  },
  creditBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  matrixEmptyCellText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  dailyPayTotalText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  dailyCreditTotalText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  pillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  pillBtnTextActive: {
    color: '#FFF',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
