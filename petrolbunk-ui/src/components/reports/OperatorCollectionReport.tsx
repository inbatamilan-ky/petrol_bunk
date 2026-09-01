import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  User,
  Users,
  Fuel,
  Calendar,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Banknote,
  QrCode,
  Truck,
  FileText,
  Clock,
  ChevronRight,
  X,
  TrendingUp,
  TrendingDown,
  Info,
  Sliders,
  DollarSign,
} from 'lucide-react';
import { useBunk } from '../../context/BunkContext';
import { tallyApi } from '../../services/tallyApi';
import { apiFetch } from '../../api/client';
import { OperatorSessionRow, DailyTally, TallyTotals } from '../../types';
import { formatCurrency, formatRate, formatDate, getTodayDateString } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportHelpers';
import { DatePickerInput } from '../DatePickerInput';
import { colors } from '../../theme/colors';

interface OperatorAggregated {
  operatorId: string;
  operatorName: string;
  sessionCount: number;
  pumps: number[];
  shifts: string[];
  cash: number;
  card: number;
  gpay: number;
  phonepe: number;
  paytm: number;
  digitalTotal: number;
  fleet: number;
  credit: number;
  totalSales: number;
  advanceAmount: number;
  expectedCash: number;
  actualCash: number;
  cashVariance: number;
  meterSales: number;
  meterVariance: number;
  sessions: OperatorSessionRow[];
}

export const OperatorCollectionReport: React.FC = () => {
  const { activeBranchId, operators, pumps } = useBunk();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedShift, setSelectedShift] = useState<string>('ALL');
  const [selectedPump, setSelectedPump] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [sessions, setSessions] = useState<OperatorSessionRow[]>([]);
  const [selectedOperatorDetails, setSelectedOperatorDetails] = useState<OperatorAggregated | null>(null);
  const [showDrilldownModal, setShowDrilldownModal] = useState<boolean>(false);

  // Fetch sessions for selected date
  const loadSessions = useCallback(async () => {
    if (!selectedDate) return;
    setIsLoading(true);
    try {
      const tally = await tallyApi.getDaily(selectedDate, activeBranchId);
      setSessions(tally.sessions || []);
    } catch (err) {
      console.warn('Error loading operator collections:', err);
      // Fallback: fetch directly from pump-attribution
      try {
        const raw = await apiFetch(`/api/pump-attribution?attribution_date=${selectedDate}`);
        if (Array.isArray(raw)) {
          const mapped: OperatorSessionRow[] = raw.map((r: any) => ({
            sessionId: r.id,
            operatorName: r.operator_name || 'Staff',
            pumpNo: r.pump_no || 1,
            pumpName: `Pump ${r.pump_no || 1}`,
            shiftType: r.shift_type || null,
            timeIn: r.time_in ? String(r.time_in).slice(0, 5) : null,
            timeOut: r.time_out ? String(r.time_out).slice(0, 5) : null,
            cash: Number(r.cash_collected || 0),
            card: Number(r.card_collected || 0),
            gpay: Number(r.gpay_collected || 0),
            phonepe: Number(r.phone_pay_collected || 0),
            paytm: Number(r.paytm_collected || 0),
            fleet: Number(r.fleet_card_collected || 0),
            credit: Number(r.credit_sales || 0),
            totalSales: Number(r.total_amount || 0),
            meterSales: r.meter_sales_amount != null ? Number(r.meter_sales_amount) : null,
            meterVariance: r.meter_variance != null ? Number(r.meter_variance) : null,
            advanceAmount: Number(r.advance_amount || 0),
            expectedCash: r.expected_cash_handover != null ? Number(r.expected_cash_handover) : null,
            actualCash: r.actual_cash_handover != null ? Number(r.actual_cash_handover) : null,
            cashVariance: r.cash_variance != null ? Number(r.cash_variance) : null,
            status: r.status || 'DRAFT',
          }));
          setSessions(mapped);
        }
      } catch (e2) {
        console.error('Fallback fetch error:', e2);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, activeBranchId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Filter sessions by shift, pump, search query
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchShift = selectedShift === 'ALL' || s.shiftType === selectedShift;
      const matchPump = selectedPump === 'ALL' || String(s.pumpNo) === selectedPump;
      const matchSearch =
        searchQuery.trim() === '' ||
        s.operatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(s.pumpNo).includes(searchQuery);
      return matchShift && matchPump && matchSearch;
    });
  }, [sessions, selectedShift, selectedPump, searchQuery]);

  // Aggregate by Operator (combines multiple shifts into one row)
  const operatorSummaryList: OperatorAggregated[] = useMemo(() => {
    const map = new Map<string, OperatorAggregated>();

    filteredSessions.forEach((s) => {
      const key = s.operatorName.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          operatorId: s.sessionId,
          operatorName: s.operatorName,
          sessionCount: 0,
          pumps: [],
          shifts: [],
          cash: 0,
          card: 0,
          gpay: 0,
          phonepe: 0,
          paytm: 0,
          digitalTotal: 0,
          fleet: 0,
          credit: 0,
          totalSales: 0,
          advanceAmount: 0,
          expectedCash: 0,
          actualCash: 0,
          cashVariance: 0,
          meterSales: 0,
          meterVariance: 0,
          sessions: [],
        });
      }

      const agg = map.get(key)!;
      agg.sessionCount += 1;
      if (!agg.pumps.includes(s.pumpNo)) agg.pumps.push(s.pumpNo);
      if (s.shiftType && !agg.shifts.includes(s.shiftType)) agg.shifts.push(s.shiftType);

      agg.cash += s.cash;
      agg.card += s.card;
      agg.gpay += s.gpay;
      agg.phonepe += s.phonepe;
      agg.paytm += s.paytm;
      agg.digitalTotal += s.card + s.gpay + s.phonepe + s.paytm;
      agg.fleet += s.fleet;
      agg.credit += s.credit;
      agg.totalSales += s.totalSales;
      agg.advanceAmount += s.advanceAmount;
      agg.expectedCash += s.expectedCash || 0;
      agg.actualCash += s.actualCash || 0;
      agg.cashVariance += s.cashVariance || 0;
      agg.meterSales += s.meterSales || 0;
      agg.meterVariance += s.meterVariance || 0;
      agg.sessions.push(s);
    });

    return Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredSessions]);

  // Overall Totals
  const totals = useMemo(() => {
    return operatorSummaryList.reduce(
      (acc, op) => ({
        totalSales: acc.totalSales + op.totalSales,
        cash: acc.cash + op.cash,
        card: acc.card + op.card,
        digitalTotal: acc.digitalTotal + op.digitalTotal,
        fleet: acc.fleet + op.fleet,
        credit: acc.credit + op.credit,
        advance: acc.advance + op.advanceAmount,
        expectedCash: acc.expectedCash + op.expectedCash,
        actualCash: acc.actualCash + op.actualCash,
        variance: acc.variance + op.cashVariance,
        sessionCount: acc.sessionCount + op.sessionCount,
      }),
      {
        totalSales: 0,
        cash: 0,
        card: 0,
        digitalTotal: 0,
        fleet: 0,
        credit: 0,
        advance: 0,
        expectedCash: 0,
        actualCash: 0,
        variance: 0,
        sessionCount: 0,
      }
    );
  }, [operatorSummaryList]);

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Operator Name',
      'Sessions Worked',
      'Pumps',
      'Shifts',
      'Physical Cash (₹)',
      'Card Swipes (₹)',
      'GPay (₹)',
      'PhonePe (₹)',
      'Paytm (₹)',
      'Digital Total (₹)',
      'Fleet Card (₹)',
      'Credit Khata (₹)',
      'Total Fuel Sales (₹)',
      'Advance / Bata (₹)',
      'Expected Handover (₹)',
      'Actual Handover (₹)',
      'Cash Variance (₹)',
    ];

    const rows = operatorSummaryList.map((op) => [
      selectedDate,
      `"${op.operatorName}"`,
      op.sessionCount,
      `"P${op.pumps.join(', P')}"`,
      `"${op.shifts.join(', ') || 'General'}"`,
      op.cash,
      op.card,
      op.gpay,
      op.phonepe,
      op.paytm,
      op.digitalTotal,
      op.fleet,
      op.credit,
      op.totalSales,
      op.advanceAmount,
      op.expectedCash,
      op.actualCash,
      op.cashVariance,
    ]);

    exportToCSV(`Operator_Collections_${selectedDate}`, headers, rows);
  };

  const handleOpenDrilldown = (op: OperatorAggregated) => {
    setSelectedOperatorDetails(op);
    setShowDrilldownModal(true);
  };

  return (
    <View style={styles.container}>
      {/* ── Top Header & Filter Controls ────────────────────────────── */}
      <View style={styles.filterCard}>
        <View style={styles.filterTopRow}>
          <View style={{ flex: 1, minWidth: 240 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Users size={20} color={colors.primary} />
              <Text style={styles.reportTitle}>Operator Collection & Handover Report</Text>
            </View>
            <Text style={styles.reportSubtitle}>
              Tracks who collected how much on which pump, shift-wise payment breakdowns, and cash handover shortages.
            </Text>
          </View>

          <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV} activeOpacity={0.8}>
            <FileSpreadsheet size={15} color="#FFFFFF" />
            <Text style={styles.exportBtnText}>Export Excel (.csv)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterControlsRow}>
          {/* Date Picker */}
          <View style={styles.filterControlItem}>
            <Text style={styles.filterLabel}>BUSINESS DATE</Text>
            <DatePickerInput
              value={selectedDate}
              onChange={setSelectedDate}
              maxDate={getTodayDateString()}
            />
          </View>

          {/* Shift Filter */}
          <View style={styles.filterControlItem}>
            <Text style={styles.filterLabel}>SHIFT</Text>
            <View style={styles.pillGroup}>
              {['ALL', 'MORNING', 'EVENING', 'NIGHT'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterPill, selectedShift === s && styles.filterPillActive]}
                  onPress={() => setSelectedShift(s)}
                >
                  <Text style={[styles.filterPillText, selectedShift === s && styles.filterPillTextActive]}>
                    {s === 'ALL' ? 'All Shifts' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pump Filter */}
          <View style={styles.filterControlItem}>
            <Text style={styles.filterLabel}>PUMP</Text>
            <View style={styles.pillGroup}>
              <TouchableOpacity
                style={[styles.filterPill, selectedPump === 'ALL' && styles.filterPillActive]}
                onPress={() => setSelectedPump('ALL')}
              >
                <Text style={[styles.filterPillText, selectedPump === 'ALL' && styles.filterPillTextActive]}>
                  All Pumps
                </Text>
              </TouchableOpacity>
              {pumps.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.filterPill, selectedPump === String(p.pumpNo) && styles.filterPillActive]}
                  onPress={() => setSelectedPump(String(p.pumpNo))}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      selectedPump === String(p.pumpNo) && styles.filterPillTextActive,
                    ]}
                  >
                    P{p.pumpNo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Search Input */}
          <View style={[styles.filterControlItem, { flex: 1, minWidth: 200 }]}>
            <Text style={styles.filterLabel}>SEARCH OPERATOR</Text>
            <View style={styles.searchBox}>
              <Search size={14} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder="Filter by operator name..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
        </View>
      </View>

      {/* ── Executive Summary KPI Banner ─────────────────────────────── */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLbl}>TOTAL REVENUE</Text>
          <Text style={[styles.kpiVal, { color: '#0F172A' }]}>{formatCurrency(totals.totalSales)}</Text>
          <Text style={styles.kpiSub}>{totals.sessionCount} Sessions Attributed</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLbl}>PHYSICAL CASH</Text>
          <Text style={[styles.kpiVal, { color: '#16A34A' }]}>{formatCurrency(totals.cash)}</Text>
          <Text style={styles.kpiSub}>Ground Cash Collected</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLbl}>DIGITAL & CARD</Text>
          <Text style={[styles.kpiVal, { color: '#2563EB' }]}>{formatCurrency(totals.digitalTotal)}</Text>
          <Text style={styles.kpiSub}>Card + GPay + PhonePe + Paytm</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLbl}>CREDIT KHATA</Text>
          <Text style={[styles.kpiVal, { color: '#D97706' }]}>{formatCurrency(totals.credit)}</Text>
          <Text style={styles.kpiSub}>Fleet Billed Fuel</Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            totals.variance < 0 && { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
          ]}
        >
          <Text style={styles.kpiLbl}>CASH SHORTAGE / VARIANCE</Text>
          <Text
            style={[
              styles.kpiVal,
              { color: totals.variance === 0 ? '#16A34A' : totals.variance < 0 ? '#DC2626' : '#D97706' },
            ]}
          >
            {totals.variance === 0 ? '₹0 Exact' : formatCurrency(totals.variance)}
          </Text>
          <Text style={styles.kpiSub}>
            {totals.variance === 0
              ? 'Handover Balanced'
              : totals.variance < 0
              ? 'Shortage from Safe'
              : 'Excess Cash'}
          </Text>
        </View>
      </View>

      {/* ── Master Operator Collections Table ────────────────────────── */}
      <View style={styles.tableCard}>
        <View style={styles.tableHeaderBar}>
          <Text style={styles.tableTitle}>
            Operator Summary — {formatDate(selectedDate)} ({operatorSummaryList.length} Active Staff)
          </Text>
          <Text style={styles.tableSubtitle}>Click on any operator row to view full payment audit breakdown</Text>
        </View>

        {isLoading ? (
          <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 12, color: '#64748B', fontSize: 13 }}>Loading operator sessions…</Text>
          </View>
        ) : operatorSummaryList.length === 0 ? (
          <View style={styles.emptyState}>
            <AlertTriangle size={32} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Operator Sessions Recorded</Text>
            <Text style={styles.emptyText}>
              No staff session collections found for {formatDate(selectedDate)} matching the selected filters.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              {/* Table Column Headers */}
              <View style={styles.tableRowHeader}>
                <Text style={[styles.th, { width: 160 }]}>OPERATOR</Text>
                <Text style={[styles.th, { width: 85, textAlign: 'center' }]}>SESSIONS</Text>
                <Text style={[styles.th, { width: 85, textAlign: 'center' }]}>PUMPS</Text>
                <Text style={[styles.th, { width: 115, textAlign: 'right' }]}>CASH</Text>
                <Text style={[styles.th, { width: 115, textAlign: 'right' }]}>DIGITAL (UPI)</Text>
                <Text style={[styles.th, { width: 100, textAlign: 'right' }]}>CARD</Text>
                <Text style={[styles.th, { width: 100, textAlign: 'right' }]}>FLEET</Text>
                <Text style={[styles.th, { width: 110, textAlign: 'right' }]}>CREDIT</Text>
                <Text style={[styles.th, { width: 130, textAlign: 'right', color: '#0F172A' }]}>TOTAL SALES</Text>
                <Text style={[styles.th, { width: 115, textAlign: 'right' }]}>ACTUAL HANDOVER</Text>
                <Text style={[styles.th, { width: 115, textAlign: 'right' }]}>VARIANCE</Text>
                <Text style={[styles.th, { width: 100, textAlign: 'center' }]}>ACTION</Text>
              </View>

              {/* Table Body */}
              {operatorSummaryList.map((op, index) => {
                const isBalanced = op.cashVariance === 0;
                const isShortage = op.cashVariance < 0;

                return (
                  <TouchableOpacity
                    key={op.operatorName + index}
                    style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
                    onPress={() => handleOpenDrilldown(op)}
                    activeOpacity={0.7}
                  >
                    {/* Operator Name */}
                    <View style={[styles.tdCell, { width: 160 }]}>
                      <View style={styles.operatorAvatar}>
                        <Text style={styles.avatarText}>{op.operatorName.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.operatorNameText} numberOfLines={1}>
                          {op.operatorName}
                        </Text>
                        <Text style={styles.operatorShiftSub}>
                          {op.shifts.join(', ') || 'Shift'}
                        </Text>
                      </View>
                    </View>

                    {/* Sessions count */}
                    <View style={[styles.tdCell, { width: 85, justifyContent: 'center' }]}>
                      <View style={styles.sessionCountBadge}>
                        <Text style={styles.sessionCountText}>{op.sessionCount}</Text>
                      </View>
                    </View>

                    {/* Pumps */}
                    <View style={[styles.tdCell, { width: 85, justifyContent: 'center' }]}>
                      <Text style={styles.pumpListText}>P{op.pumps.join(', P')}</Text>
                    </View>

                    {/* Cash */}
                    <Text style={[styles.td, { width: 115, textAlign: 'right', color: '#16A34A', fontWeight: '700' }]}>
                      {formatCurrency(op.cash)}
                    </Text>

                    {/* Digital UPI */}
                    <Text style={[styles.td, { width: 115, textAlign: 'right', color: '#2563EB' }]}>
                      {formatCurrency(op.gpay + op.phonepe + op.paytm)}
                    </Text>

                    {/* Card */}
                    <Text style={[styles.td, { width: 100, textAlign: 'right', color: '#475569' }]}>
                      {formatCurrency(op.card)}
                    </Text>

                    {/* Fleet */}
                    <Text style={[styles.td, { width: 100, textAlign: 'right', color: '#475569' }]}>
                      {formatCurrency(op.fleet)}
                    </Text>

                    {/* Credit */}
                    <Text style={[styles.td, { width: 110, textAlign: 'right', color: '#D97706' }]}>
                      {formatCurrency(op.credit)}
                    </Text>

                    {/* Total Sales */}
                    <Text style={[styles.tdBold, { width: 130, textAlign: 'right', color: '#0F172A' }]}>
                      {formatCurrency(op.totalSales)}
                    </Text>

                    {/* Actual Handover */}
                    <Text style={[styles.td, { width: 115, textAlign: 'right' }]}>
                      {op.actualCash > 0 ? formatCurrency(op.actualCash) : '—'}
                    </Text>

                    {/* Variance */}
                    <View style={[styles.tdCell, { width: 115, justifyContent: 'flex-end' }]}>
                      <View
                        style={[
                          styles.varianceBadge,
                          {
                            backgroundColor: isBalanced ? '#ECFDF5' : isShortage ? '#FEF2F2' : '#FFFBEB',
                            borderColor: isBalanced ? '#A7F3D0' : isShortage ? '#FECACA' : '#FDE68A',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.varianceBadgeText,
                            { color: isBalanced ? '#059669' : isShortage ? '#DC2626' : '#D97706' },
                          ]}
                        >
                          {isBalanced ? '₹0' : formatCurrency(op.cashVariance)}
                        </Text>
                      </View>
                    </View>

                    {/* Action Button */}
                    <View style={[styles.tdCell, { width: 100, justifyContent: 'center' }]}>
                      <View style={styles.viewBtn}>
                        <Text style={styles.viewBtnText}>Details</Text>
                        <ChevronRight size={13} color="#2563EB" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Total Summary Footer Row */}
              <View style={styles.tableFooterRow}>
                <Text style={[styles.thBold, { width: 160 }]}>DAY TOTALS</Text>
                <Text style={[styles.thBold, { width: 85, textAlign: 'center' }]}>{totals.sessionCount}</Text>
                <Text style={[styles.thBold, { width: 85, textAlign: 'center' }]}>—</Text>
                <Text style={[styles.thBold, { width: 115, textAlign: 'right', color: '#16A34A' }]}>
                  {formatCurrency(totals.cash)}
                </Text>
                <Text style={[styles.thBold, { width: 115, textAlign: 'right', color: '#2563EB' }]}>
                  {formatCurrency(totals.digitalTotal - totals.card)}
                </Text>
                <Text style={[styles.thBold, { width: 100, textAlign: 'right' }]}>
                  {formatCurrency(totals.card)}
                </Text>
                <Text style={[styles.thBold, { width: 100, textAlign: 'right' }]}>
                  {formatCurrency(totals.fleet)}
                </Text>
                <Text style={[styles.thBold, { width: 110, textAlign: 'right', color: '#D97706' }]}>
                  {formatCurrency(totals.credit)}
                </Text>
                <Text style={[styles.thBold, { width: 130, textAlign: 'right', color: '#0F172A', fontSize: 13 }]}>
                  {formatCurrency(totals.totalSales)}
                </Text>
                <Text style={[styles.thBold, { width: 115, textAlign: 'right' }]}>
                  {formatCurrency(totals.actualCash)}
                </Text>
                <Text
                  style={[
                    styles.thBold,
                    {
                      width: 115,
                      textAlign: 'right',
                      color: totals.variance === 0 ? '#16A34A' : '#DC2626',
                    },
                  ]}
                >
                  {formatCurrency(totals.variance)}
                </Text>
                <Text style={[styles.thBold, { width: 100, textAlign: 'center' }]}>—</Text>
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* ══════════════════════════════════════════════════════════════════
          DRILLDOWN MODAL: OPERATOR SESSION COLLECTION DETAILS
          ══════════════════════════════════════════════════════════════════ */}
      {selectedOperatorDetails && (
        <Modal
          visible={showDrilldownModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDrilldownModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>
                      {selectedOperatorDetails.operatorName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.modalTitle}>{selectedOperatorDetails.operatorName}</Text>
                      <View style={styles.sessionTag}>
                        <Text style={styles.sessionTagText}>
                          {selectedOperatorDetails.sessionCount} Shifts on {formatDate(selectedDate)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.modalSubtitle}>
                      Total Attributed Sales: {formatCurrency(selectedOperatorDetails.totalSales)} • Cash Variance:{' '}
                      {formatCurrency(selectedOperatorDetails.cashVariance)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setShowDrilldownModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Modal Body: List each individual session card */}
              <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={true}>
                <View style={{ padding: 20, gap: 18 }}>
                  {selectedOperatorDetails.sessions.map((sess, idx) => (
                    <View key={sess.sessionId || idx} style={styles.sessionDetailCard}>
                      <View style={styles.sessionDetailHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={styles.pumpBadge}>
                            <Fuel size={13} color="#2563EB" />
                            <Text style={styles.pumpBadgeText}>Pump {sess.pumpNo}</Text>
                          </View>
                          <Text style={styles.sessionShiftTitle}>
                            {sess.shiftType || 'General Shift'} ({sess.timeIn || '06:00'} - {sess.timeOut || '14:00'})
                          </Text>
                        </View>
                        <Text style={styles.sessionTotalAmount}>{formatCurrency(sess.totalSales)}</Text>
                      </View>

                      {/* 7-Line Payment Breakdown */}
                      <View style={styles.breakdownGrid}>
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>Physical Cash</Text>
                          <Text style={[styles.breakdownVal, { color: '#16A34A' }]}>{formatCurrency(sess.cash)}</Text>
                        </View>
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>Card Swipe</Text>
                          <Text style={styles.breakdownVal}>{formatCurrency(sess.card)}</Text>
                        </View>
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>GPay</Text>
                          <Text style={styles.breakdownVal}>{formatCurrency(sess.gpay)}</Text>
                        </View>
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>PhonePe</Text>
                          <Text style={styles.breakdownVal}>{formatCurrency(sess.phonepe)}</Text>
                        </View>
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>Paytm</Text>
                          <Text style={styles.breakdownVal}>{formatCurrency(sess.paytm)}</Text>
                        </View>
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>Fleet Card</Text>
                          <Text style={styles.breakdownVal}>{formatCurrency(sess.fleet)}</Text>
                        </View>
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>Credit Khata</Text>
                          <Text style={[styles.breakdownVal, { color: '#D97706' }]}>{formatCurrency(sess.credit)}</Text>
                        </View>
                      </View>

                      {/* Handover & Cash Reconciliation Box */}
                      <View style={styles.handoverBox}>
                        <Text style={styles.handoverBoxTitle}>CASH HANDOVER RECONCILIATION</Text>
                        <View style={styles.handoverRow}>
                          <Text style={styles.handoverLabel}>Cash Collected:</Text>
                          <Text style={styles.handoverVal}>{formatCurrency(sess.cash)}</Text>
                        </View>
                        <View style={styles.handoverRow}>
                          <Text style={styles.handoverLabel}>Less Advance / Bata:</Text>
                          <Text style={[styles.handoverVal, { color: '#DC2626' }]}>
                            - {formatCurrency(sess.advanceAmount)}
                          </Text>
                        </View>
                        <View style={[styles.handoverRow, styles.handoverDivider]}>
                          <Text style={[styles.handoverLabel, { fontWeight: '700' }]}>Expected Cash in Safe:</Text>
                          <Text style={[styles.handoverVal, { fontWeight: '700' }]}>
                            = {formatCurrency(sess.expectedCash ?? sess.cash - sess.advanceAmount)}
                          </Text>
                        </View>
                        <View style={styles.handoverRow}>
                          <Text style={styles.handoverLabel}>Actual Cash Handed Over:</Text>
                          <Text style={[styles.handoverVal, { fontWeight: '700', color: '#2563EB' }]}>
                            {sess.actualCash != null ? formatCurrency(sess.actualCash) : 'Pending Count'}
                          </Text>
                        </View>
                        <View style={[styles.handoverRow, { marginTop: 4 }]}>
                          <Text style={[styles.handoverLabel, { fontWeight: '800' }]}>Cash Shortage / Excess:</Text>
                          <Text
                            style={[
                              styles.handoverVal,
                              {
                                fontWeight: '800',
                                color:
                                  sess.cashVariance === 0
                                    ? '#16A34A'
                                    : (sess.cashVariance ?? 0) < 0
                                    ? '#DC2626'
                                    : '#D97706',
                              },
                            ]}
                          >
                            {sess.cashVariance === 0 ? '₹0 Balanced' : formatCurrency(sess.cashVariance ?? 0)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    gap: 16,
  },
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 14,
  },
  filterTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  reportSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  filterControlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  filterControlItem: {
    gap: 4,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  pillGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterPillActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    padding: 0,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 4,
  },
  kpiLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  kpiSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  tableHeaderBar: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  tableSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  tableRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  thBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowAlt: {
    backgroundColor: '#FAFBFD',
  },
  tableFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderTopWidth: 1.5,
    borderTopColor: '#CBD5E1',
  },
  td: {
    fontSize: 12,
    color: '#334155',
  },
  tdBold: {
    fontSize: 13,
    fontWeight: '800',
  },
  tdCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  operatorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  operatorNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  operatorShiftSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  sessionCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sessionCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  pumpListText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  varianceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  varianceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 380,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 620,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sessionTag: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sessionTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  sessionDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  sessionDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  pumpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pumpBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  sessionShiftTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  sessionTotalAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  breakdownItem: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  breakdownLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  handoverBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 6,
  },
  handoverBoxTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  handoverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  handoverDivider: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: 4,
  },
  handoverLabel: {
    fontSize: 12,
    color: '#475569',
  },
  handoverVal: {
    fontSize: 12,
    color: '#0F172A',
  },
});
