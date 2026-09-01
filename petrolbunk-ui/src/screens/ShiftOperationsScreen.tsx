import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';

import {
  UserCheck,
  Calendar,
  PlusCircle,
  Clock,
  Save,
  Trash2,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Truck,
  FileSpreadsheet,
  Layers,
  Fuel,
  Users,
  Gauge,
  Sun,
  Sunset,
  Moon,
  ChevronRight,
  Zap,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useShiftOperationsContext } from '../context/ShiftOperationsContext';
import { useExpensesContext } from '../context/ExpensesContext';
import { useCreditLedgerContext } from '../context/CreditLedgerContext';
import { useAuthContext } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';
import { PumpDayAttribution, Pump, DailyTally, ReconciliationOut } from '../types';
import { tallyApi } from '../services/tallyApi';
import DailyKpiStrip from '../components/tally/DailyKpiStrip';
import TallyTabs, { TallyTab } from '../components/tally/TallyTabs';
import ShiftTallyTable from '../components/tally/ShiftTallyTable';
import PumpTallyTable from '../components/tally/PumpTallyTable';
import OperatorTallyTable from '../components/tally/OperatorTallyTable';
import ReconciliationCard from '../components/tally/ReconciliationCard';
import SessionEntryForm from '../components/tally/SessionEntryForm';


interface ShiftPreset {
  label: string;
  icon: any;
  timeIn: string;
  timeOut: string;
}

const SHIFT_PRESETS: ShiftPreset[] = [
  { label: 'Morning (06:00 - 14:00)', icon: Sun, timeIn: '06:00', timeOut: '14:00' },
  { label: 'Evening (14:00 - 22:00)', icon: Sunset, timeIn: '14:00', timeOut: '22:00' },
  { label: 'Night (22:00 - 06:00)', icon: Moon, timeIn: '22:00', timeOut: '06:00' },
  { label: 'Full Day (06:00 - 22:00)', icon: Clock, timeIn: '06:00', timeOut: '22:00' },
];

export const ShiftOperationsScreen: React.FC = () => {
  const {
    attributions = [],
    selectedDate = getTodayDateString(),
    setSelectedDate,
    saveAttribution,
    deleteAttribution,
    pumps = [],
    operators = [],
    nozzleMeters = [],
  } = useShiftOperationsContext();

  const { expenses = [] } = useExpensesContext() || { expenses: [] };
  const { creditTransactions = [] } = useCreditLedgerContext() || { creditTransactions: [] };
  const { activeBranchId } = useAuthContext();

  // ── Tally System State ────────────────────────────────────────────────
  const [activeTallyTab, setActiveTallyTab] = useState<TallyTab>('daily');
  const [dailyTally, setDailyTally] = useState<DailyTally | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationOut | null>(null);
  const [tallyLoading, setTallyLoading] = useState(false);
  const [showTallySessionForm, setShowTallySessionForm] = useState(false);

  const fetchTally = useCallback(async (dateStr: string) => {
    if (!dateStr) return;
    setTallyLoading(true);
    try {
      const [tally, recon] = await Promise.all([
        tallyApi.getDaily(dateStr, activeBranchId),
        tallyApi.getReconciliation(dateStr, activeBranchId),
      ]);
      setDailyTally(tally);
      setReconciliation(recon);
    } catch (e) {
      console.error('Tally fetch error:', e);
    } finally {
      setTallyLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    if (selectedDate) {
      fetchTally(selectedDate);
    }
  }, [selectedDate, fetchTally, attributions]);

  const [viewMode, setViewMode] = useState<'TALLY_HUB' | 'PUMP_GROUPED' | 'OPERATOR_LIST' | 'SPREADSHEET'>('TALLY_HUB');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingAttr, setEditingAttr] = useState<PumpDayAttribution | null>(null);

  // Form State for Assigning / Editing Operator Attribution
  const [selectedPumpId, setSelectedPumpId] = useState<string>(pumps[0]?.id || '');
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(operators[0]?.id || '');
  const [timeIn, setTimeIn] = useState('06:00');
  const [timeOut, setTimeOut] = useState('14:00');
  const [advancePayment, setAdvancePayment] = useState('0');
  const [creditAcc, setCreditAcc] = useState('0');
  const [cashCollected, setCashCollected] = useState('0');
  const [cardCollected, setCardCollected] = useState('0');
  const [fleetCardCollected, setFleetCardCollected] = useState('0');
  const [creditSales, setCreditSales] = useState('0');
  const [gpayCollected, setGpayCollected] = useState('0');
  const [phonePayCollected, setPhonePayCollected] = useState('0');
  const [paytmCollected, setPaytmCollected] = useState('0');
  const [isSaving, setIsSaving] = useState(false);


  // ── Auto-Fetched Data with Safe Null Checks ───────────────────────────
  const dayExpenses = useMemo(() => {
    return (expenses || []).filter((e) => (e?.date || '').slice(0, 10) === selectedDate);
  }, [expenses, selectedDate]);

  const totalDayExpenses = useMemo(() => {
    return dayExpenses.reduce((sum, e) => sum + (Number(e?.amount) || 0), 0);
  }, [dayExpenses]);

  const totalDayAdvance = useMemo(() => {
    return dayExpenses
      .filter((e) => {
        const name = (e?.expenseTypeName || '').toLowerCase();
        return name.includes('advance') || name.includes('bata') || name.includes('salary');
      })
      .reduce((sum, e) => sum + (Number(e?.amount) || 0), 0);
  }, [dayExpenses]);

  const dayCreditTx = useMemo(() => {
    return (creditTransactions || []).filter((t) => (t?.date || '').slice(0, 10) === selectedDate);
  }, [creditTransactions, selectedDate]);

  const totalDayCredit = useMemo(() => {
    return dayCreditTx.reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);
  }, [dayCreditTx]);

  const dayNozzleMeters = useMemo(() => {
    return (nozzleMeters || []).filter((m) => (m?.readingDate || '').slice(0, 10) === selectedDate);
  }, [nozzleMeters, selectedDate]);

  const totalDayMeterSales = useMemo(() => {
    return dayNozzleMeters.reduce((sum, m) => {
      const gross = Number(m?.grossAmount ?? (m?.litresSold || 0) * (m?.sellingRate || 0)) || 0;
      return sum + gross;
    }, 0);
  }, [dayNozzleMeters]);

  const totalDayMeterLitres = useMemo(() => {
    return dayNozzleMeters.reduce((sum, m) => {
      const litres = Number(m?.litresSold ?? Math.max(0, (m?.closingMeter || 0) - (m?.openingMeter || 0))) || 0;
      return sum + litres;
    }, 0);
  }, [dayNozzleMeters]);

  // Pump-specific auto-fetch metrics for modal
  const pumpNozzleMeters = useMemo(() => {
    if (!selectedPumpId) return [];
    return dayNozzleMeters.filter((m) => m?.pumpId === selectedPumpId);
  }, [dayNozzleMeters, selectedPumpId]);

  const pumpMeterSales = useMemo(() => {
    return pumpNozzleMeters.reduce((sum, m) => {
      const gross = Number(m?.grossAmount ?? (m?.litresSold || 0) * (m?.sellingRate || 0)) || 0;
      return sum + gross;
    }, 0);
  }, [pumpNozzleMeters]);

  const pumpMeterLitres = useMemo(() => {
    return pumpNozzleMeters.reduce((sum, m) => {
      const litres = Number(m?.litresSold ?? Math.max(0, (m?.closingMeter || 0) - (m?.openingMeter || 0))) || 0;
      return sum + litres;
    }, 0);
  }, [pumpNozzleMeters]);

  const pumpCreditTx = useMemo(() => {
    if (!selectedPumpId) return dayCreditTx;
    const tagged = dayCreditTx.filter((t) => t?.pumpId === selectedPumpId);
    return tagged.length > 0 ? tagged : dayCreditTx;
  }, [dayCreditTx, selectedPumpId]);

  const pumpCreditSales = useMemo(() => {
    return pumpCreditTx.reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);
  }, [pumpCreditTx]);

  // Auto-Fetch & Auto-Populate Helper
  const handleAutoFetchValues = (overrideExisting = true) => {
    if (pumpCreditSales > 0 || overrideExisting) {
      setCreditSales(String(pumpCreditSales || 0));
    }
    if (totalDayAdvance > 0 || overrideExisting) {
      setAdvancePayment(String(totalDayAdvance || 0));
    }
    const card = parseFloat(cardCollected) || 0;
    const gpay = parseFloat(gpayCollected) || 0;
    const phonePay = parseFloat(phonePayCollected) || 0;
    const paytm = parseFloat(paytmCollected) || 0;
    const fleet = parseFloat(fleetCardCollected) || 0;
    const digital = card + gpay + phonePay + paytm + fleet;
    if (pumpMeterSales > 0) {
      const estimatedCash = Math.max(
        0,
        pumpMeterSales - (pumpCreditSales || 0) - digital
      );
      if (overrideExisting || !cashCollected || cashCollected === '0') {
        setCashCollected(String(estimatedCash || 0));
      }
    }
  };

  // Auto-recalculate suggested cash when payment modes change in modal
  const modalTotal = useMemo(() => {
    const cash = parseFloat(cashCollected) || 0;
    const card = parseFloat(cardCollected) || 0;
    const fleet = parseFloat(fleetCardCollected) || 0;
    const credit = parseFloat(creditSales) || 0;
    const gpay = parseFloat(gpayCollected) || 0;
    const phonePay = parseFloat(phonePayCollected) || 0;
    const paytm = parseFloat(paytmCollected) || 0;
    return cash + card + fleet + credit + gpay + phonePay + paytm;
  }, [cashCollected, cardCollected, fleetCardCollected, creditSales, gpayCollected, phonePayCollected, paytmCollected]);

  const modalNet = useMemo(() => {
    const adv = parseFloat(advancePayment) || 0;
    const cAcc = parseFloat(creditAcc) || 0;
    return modalTotal - adv - cAcc;
  }, [modalTotal, advancePayment, creditAcc]);

  // Computed KPIs across entire bunk (Split channels)
  const totalCash = useMemo(
    () => (attributions || []).reduce((sum, a) => sum + (Number(a?.cashCollected) || 0), 0),
    [attributions]
  );
  const totalCard = useMemo(
    () => (attributions || []).reduce((sum, a) => sum + (Number(a?.cardCollected) || 0), 0),
    [attributions]
  );
  const totalGpay = useMemo(
    () => (attributions || []).reduce((sum, a) => sum + (Number(a?.gpayCollected ?? 0) || 0), 0),
    [attributions]
  );
  const totalPhonePay = useMemo(
    () => (attributions || []).reduce((sum, a) => sum + (Number(a?.phonePayCollected ?? 0) || 0), 0),
    [attributions]
  );
  const totalPaytm = useMemo(
    () => (attributions || []).reduce((sum, a) => sum + (Number(a?.paytmCollected ?? 0) || 0), 0),
    [attributions]
  );
  const totalFleet = useMemo(
    () => (attributions || []).reduce((sum, a) => sum + (Number(a?.fleetCardCollected) || 0), 0),
    [attributions]
  );
  const totalCredit = useMemo(
    () => (attributions || []).reduce((sum, a) => sum + (Number(a?.creditSales) || 0), 0),
    [attributions]
  );
  const grandTotal = useMemo(
    () => (attributions || []).reduce((sum, a) => sum + (Number(a?.totalAmount) || 0), 0),
    [attributions]
  );
  const grandNet = useMemo(
    () => (attributions || []).reduce((sum, a) => sum + (Number(a?.netPayment) || 0), 0),
    [attributions]
  );

  // Group attributions by Pump (Allows multiple operators per pump)
  const pumpGroupedData = useMemo(() => {
    return (pumps || []).map((pump) => {
      const pumpAttrs = (attributions || []).filter(
        (a) => a?.pumpId === pump?.id || a?.pumpNo === pump?.pumpNo
      );
      const pumpTotalCash = pumpAttrs.reduce((sum, a) => sum + (Number(a?.cashCollected) || 0), 0);
      const pumpTotalCard = pumpAttrs.reduce((sum, a) => sum + (Number(a?.cardCollected) || 0), 0);
      const pumpTotalGpay = pumpAttrs.reduce((sum, a) => sum + (Number(a?.gpayCollected ?? 0) || 0), 0);
      const pumpTotalPhonePay = pumpAttrs.reduce((sum, a) => sum + (Number(a?.phonePayCollected ?? 0) || 0), 0);
      const pumpTotalPaytm = pumpAttrs.reduce((sum, a) => sum + (Number(a?.paytmCollected ?? 0) || 0), 0);
      const pumpTotalFleet = pumpAttrs.reduce((sum, a) => sum + (Number(a?.fleetCardCollected) || 0), 0);
      const pumpTotalCredit = pumpAttrs.reduce((sum, a) => sum + (Number(a?.creditSales) || 0), 0);
      const pumpTotalAmt = pumpAttrs.reduce((sum, a) => sum + (Number(a?.totalAmount) || 0), 0);
      const pumpTotalNet = pumpAttrs.reduce((sum, a) => sum + (Number(a?.netPayment) || 0), 0);

      return {
        pump,
        attributions: pumpAttrs,
        totals: {
          cash: pumpTotalCash,
          card: pumpTotalCard,
          gpay: pumpTotalGpay,
          phonePay: pumpTotalPhonePay,
          paytm: pumpTotalPaytm,
          fleet: pumpTotalFleet,
          credit: pumpTotalCredit,
          totalAmount: pumpTotalAmt,
          netPayment: pumpTotalNet,
        },
      };
    });
  }, [pumps, attributions]);

  const handleOpenAssignModal = (pumpId?: string, attr?: PumpDayAttribution) => {
    if (attr) {
      setEditingAttr(attr);
      setSelectedPumpId(attr?.pumpId || pumps[0]?.id || '');
      setSelectedOperatorId(attr?.operatorId || operators[0]?.id || '');
      setTimeIn(attr?.timeIn || '06:00');
      setTimeOut(attr?.timeOut || '14:00');
      setAdvancePayment(String(attr?.advancePayment ?? '0'));
      setCreditAcc(String(attr?.creditAcc ?? '0'));
      setCashCollected(String(attr?.cashCollected ?? '0'));
      setCardCollected(String(attr?.cardCollected ?? '0'));
      setFleetCardCollected(String(attr?.fleetCardCollected ?? '0'));
      setCreditSales(String(attr?.creditSales ?? '0'));
      setGpayCollected(String(attr?.gpayCollected ?? attr?.upiGpayCollected ?? '0'));
      setPhonePayCollected(String(attr?.phonePayCollected ?? '0'));
      setPaytmCollected(String(attr?.paytmCollected ?? '0'));
    } else {
      setEditingAttr(null);
      const targetPumpId = pumpId || pumps[0]?.id || '';
      setSelectedPumpId(targetPumpId);

      // If this pump already has morning operator, default next operator to evening (14:00 - 22:00)
      const existingForPump = (attributions || []).filter((a) => a?.pumpId === targetPumpId);
      if (existingForPump.length === 1) {
        setTimeIn('14:00');
        setTimeOut('22:00');
      } else if (existingForPump.length >= 2) {
        setTimeIn('22:00');
        setTimeOut('06:00');
      } else {
        setTimeIn('06:00');
        setTimeOut('14:00');
      }

      // Pick operator not yet assigned to this pump if available
      const usedOpIds = new Set(existingForPump.map((a) => a?.operatorId));
      const unusedOp = (operators || []).find((o) => !usedOpIds.has(o?.id));
      setSelectedOperatorId(unusedOp?.id || operators[0]?.id || '');

      // Auto-fetch initial values from Credit, Expenses & Meter for this pump
      const pCredit = (dayCreditTx || [])
        .filter((t) => !targetPumpId || t?.pumpId === targetPumpId)
        .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);

      const pMeters = (dayNozzleMeters || []).filter((m) => m?.pumpId === targetPumpId);
      const pSales = pMeters.reduce((sum, m) => {
        const gross = Number(m?.grossAmount ?? (m?.litresSold || 0) * (m?.sellingRate || 0)) || 0;
        return sum + gross;
      }, 0);

      setAdvancePayment(totalDayAdvance > 0 ? String(totalDayAdvance) : '0');
      setCreditAcc('0');
      setCreditSales(pCredit > 0 ? String(pCredit) : '0');
      setCashCollected(pSales > 0 ? String(Math.max(0, pSales - pCredit)) : '0');
      setCardCollected('0');
      setFleetCardCollected('0');
      setGpayCollected('0');
      setPhonePayCollected('0');
      setPaytmCollected('0');
    }
    setShowAssignModal(true);
  };

  const handleApplyPreset = (preset: ShiftPreset) => {
    setTimeIn(preset.timeIn);
    setTimeOut(preset.timeOut);
  };

  const handleSave = async () => {
    if (!selectedPumpId) {
      Alert.alert('Error', 'Please select a pump');
      return;
    }
    if (!selectedOperatorId) {
      Alert.alert('Error', 'Please select an operator');
      return;
    }

    const numAdv = parseFloat(advancePayment) || 0;
    const numCreditAcc = parseFloat(creditAcc) || 0;
    const numCash = parseFloat(cashCollected) || 0;
    const numCard = parseFloat(cardCollected) || 0;
    const numFleet = parseFloat(fleetCardCollected) || 0;
    const numCreditSales = parseFloat(creditSales) || 0;
    const numGpay = parseFloat(gpayCollected) || 0;
    const numPhonePay = parseFloat(phonePayCollected) || 0;
    const numPaytm = parseFloat(paytmCollected) || 0;
    const numUpi = numGpay + numPhonePay + numPaytm;

    const totalAmt = numCash + numCard + numFleet + numCreditSales + numUpi;
    const netPay = totalAmt - numAdv - numCreditAcc;

    try {
      setIsSaving(true);
      await saveAttribution({
        id: editingAttr?.id,
        attributionDate: selectedDate,
        pumpId: selectedPumpId,
        operatorId: selectedOperatorId,
        timeIn,
        timeOut,
        advancePayment: numAdv,
        creditAcc: numCreditAcc,
        cashCollected: numCash,
        cardCollected: numCard,
        fleetCardCollected: numFleet,
        creditSales: numCreditSales,
        gpayCollected: numGpay,
        phonePayCollected: numPhonePay,
        paytmCollected: numPaytm,
        upiGpayCollected: numUpi,
        totalAmount: totalAmt,
        netPayment: netPay,
      });
      setShowAssignModal(false);
      Alert.alert('Success', 'Operator shift session saved successfully!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save attribution');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Daily Pump & Operator Attribution</Text>
          <Text style={styles.headerSubtitle}>
            Block H: Multiple Operators per Pump (Morning, Evening & Night Sessions) + Block D Collections
          </Text>
        </View>

        <View style={styles.headerActions}>
          <View style={styles.dateSelectorRow}>
            <Calendar size={16} color={colors.primary} />
            <TextInput
              style={styles.dateInput}
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => handleOpenAssignModal()}
          >
            <PlusCircle size={16} color="#FFF" />
            <Text style={styles.primaryBtnText}>+ Assign Operator</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Top Strip — Split Excel Payment Channels */}
      <View style={styles.kpiStrip}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Cash Collected</Text>
          <Text style={[styles.kpiValue, { color: '#10B981' }]}>{formatCurrency(totalCash)}</Text>
          <Text style={styles.kpiSub}>Physical Cash</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Swiping Machine</Text>
          <Text style={[styles.kpiValue, { color: '#3B82F6' }]}>{formatCurrency(totalCard)}</Text>
          <Text style={styles.kpiSub}>Card POS</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Gpay</Text>
          <Text style={[styles.kpiValue, { color: '#4285F4' }]}>{formatCurrency(totalGpay)}</Text>
          <Text style={styles.kpiSub}>Google Pay</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Phone Pay</Text>
          <Text style={[styles.kpiValue, { color: '#5F259F' }]}>{formatCurrency(totalPhonePay)}</Text>
          <Text style={styles.kpiSub}>PhonePe</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Paytm</Text>
          <Text style={[styles.kpiValue, { color: '#00BAF2' }]}>{formatCurrency(totalPaytm)}</Text>
          <Text style={styles.kpiSub}>Paytm QR</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Fleet Card</Text>
          <Text style={[styles.kpiValue, { color: '#06B6D4' }]}>{formatCurrency(totalFleet)}</Text>
          <Text style={styles.kpiSub}>FC Cards</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Credit Sales</Text>
          <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>{formatCurrency(totalCredit)}</Text>
          <Text style={styles.kpiSub}>Customer Credit</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}>
          <Text style={[styles.kpiLabel, { color: '#047857' }]}>Grand Total</Text>
          <Text style={[styles.kpiValue, { color: '#065F46' }]}>{formatCurrency(grandTotal)}</Text>
          <Text style={[styles.kpiSub, { color: '#059669' }]}>Net: {formatCurrency(grandNet)}</Text>
        </View>
      </View>


      {/* ── Auto-Fetched Cross-Module Data Strip ─────────────────────── */}
      <View style={styles.autoFetchBanner}>
        <View style={styles.autoFetchHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Zap size={16} color="#F59E0B" />
            <Text style={styles.autoFetchTitle}>Live Auto-Fetched Module Feeds ({selectedDate})</Text>
          </View>
          <View style={styles.autoFetchBadge}>
            <CheckCircle2 size={12} color="#10B981" />
            <Text style={styles.autoFetchBadgeText}>Connected Feeds</Text>
          </View>
        </View>

        <View style={styles.autoFetchGrid}>
          <View style={styles.autoFetchCol}>
            <Text style={styles.autoFetchColLabel}>Nozzle Meters</Text>
            <Text style={styles.autoFetchColVal}>{formatCurrency(totalDayMeterSales)}</Text>
            <Text style={styles.autoFetchColSub}>{totalDayMeterLitres.toFixed(1)} Litres sold</Text>
          </View>

          <View style={styles.autoFetchCol}>
            <Text style={styles.autoFetchColLabel}>Credit Ledger</Text>
            <Text style={styles.autoFetchColVal}>{formatCurrency(totalDayCredit)}</Text>
            <Text style={styles.autoFetchColSub}>{dayCreditTx.length} Credit Bills</Text>
          </View>

          <View style={styles.autoFetchCol}>
            <Text style={styles.autoFetchColLabel}>Daily Expenses</Text>
            <Text style={styles.autoFetchColVal}>{formatCurrency(totalDayExpenses)}</Text>
            <Text style={styles.autoFetchColSub}>Staff Adv: {formatCurrency(totalDayAdvance)}</Text>
          </View>

          <View style={styles.autoFetchCol}>
            <Text style={styles.autoFetchColLabel}>Shift vs Meter Variance</Text>

            <Text
              style={[
                styles.autoFetchColVal,
                {
                  color:
                    Math.abs(grandTotal - totalDayMeterSales) < 1 && totalDayMeterSales > 0
                      ? '#10B981'
                      : totalDayMeterSales > 0
                      ? '#F59E0B'
                      : colors.textMuted,
                },
              ]}
            >
              {totalDayMeterSales > 0 ? formatCurrency(grandTotal - totalDayMeterSales) : '₹0.00'}
            </Text>
            <Text style={styles.autoFetchColSub}>
              {totalDayMeterSales > 0
                ? Math.abs(grandTotal - totalDayMeterSales) < 1
                  ? 'Perfect Match with Meters'
                  : grandTotal > totalDayMeterSales
                  ? 'Surplus vs Meter'
                  : 'Shortage vs Meter'
                : 'No meter readings logged'}
            </Text>
          </View>
        </View>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewToggleBar}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'TALLY_HUB' && styles.toggleBtnActive]}
          onPress={() => setViewMode('TALLY_HUB')}
        >
          <Zap size={16} color={viewMode === 'TALLY_HUB' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.toggleBtnText, viewMode === 'TALLY_HUB' && styles.toggleBtnTextActive]}>
            Daily Tally & Recon
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'PUMP_GROUPED' && styles.toggleBtnActive]}
          onPress={() => setViewMode('PUMP_GROUPED')}
        >
          <Layers size={16} color={viewMode === 'PUMP_GROUPED' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.toggleBtnText, viewMode === 'PUMP_GROUPED' && styles.toggleBtnTextActive]}>
            Pump-Wise Multi-Operator
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'OPERATOR_LIST' && styles.toggleBtnActive]}
          onPress={() => setViewMode('OPERATOR_LIST')}
        >
          <UserCheck size={16} color={viewMode === 'OPERATOR_LIST' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.toggleBtnText, viewMode === 'OPERATOR_LIST' && styles.toggleBtnTextActive]}>
            Sessions ({attributions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'SPREADSHEET' && styles.toggleBtnActive]}
          onPress={() => setViewMode('SPREADSHEET')}
        >
          <FileSpreadsheet size={16} color={viewMode === 'SPREADSHEET' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.toggleBtnText, viewMode === 'SPREADSHEET' && styles.toggleBtnTextActive]}>
            Excel Matrix
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {viewMode === 'TALLY_HUB' ? (
          <View style={tallyStyles.container}>
            {dailyTally ? (
              <>
                <View style={tallyStyles.grandTotalRow}>
                  <Text style={tallyStyles.grandTotalLabel}>TODAY'S TOTAL SALES</Text>
                  <Text style={tallyStyles.grandTotal}>
                    ₹{dailyTally.totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <DailyKpiStrip totals={dailyTally.totals} />
                <TallyTabs active={activeTallyTab} onChange={setActiveTallyTab} />
                <View style={tallyStyles.tabContent}>
                  {activeTallyTab === 'daily' && (
                    reconciliation ? (
                      <ReconciliationCard data={reconciliation} compact />
                    ) : (
                      <ActivityIndicator color="#3B82F6" style={{ marginTop: 20 }} />
                    )
                  )}
                  {activeTallyTab === 'shift' && (
                    <ShiftTallyTable shifts={dailyTally.byShift} grandTotal={dailyTally.totals.grandTotal} />
                  )}
                  {activeTallyTab === 'pump' && (
                    <PumpTallyTable pumps={dailyTally.byPump} grandTotal={dailyTally.totals.grandTotal} />
                  )}
                  {activeTallyTab === 'operator' && (
                    <OperatorTallyTable sessions={dailyTally.sessions} />
                  )}
                  {activeTallyTab === 'reconcile' && (
                    reconciliation ? (
                      <ReconciliationCard data={reconciliation} />
                    ) : (
                      <ActivityIndicator color="#3B82F6" style={{ marginTop: 20 }} />
                    )
                  )}
                </View>
              </>
            ) : tallyLoading ? (
              <View style={tallyStyles.loadingRow}>
                <ActivityIndicator color="#3B82F6" />
                <Text style={tallyStyles.loadingText}>Loading live daily tally...</Text>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Users size={44} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No Tally Data for {selectedDate}</Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 16 }]}
                  onPress={() => setShowTallySessionForm(true)}
                >
                  <PlusCircle size={16} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Create Operator Session</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : attributions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Users size={44} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Operators Assigned for {selectedDate}</Text>
            <Text style={styles.emptySub}>
              Assign morning and evening operators to Pump 1, 2, or 3 with reporting times and collections.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 16 }]}
              onPress={() => handleOpenAssignModal()}
            >
              <PlusCircle size={16} color="#FFF" />
              <Text style={styles.primaryBtnText}>Assign First Operator Now</Text>
            </TouchableOpacity>
          </View>
        ) : viewMode === 'PUMP_GROUPED' ? (
          /* ── VIEW 1: PUMP-WISE MULTI-OPERATOR GROUPED VIEW ──────────────── */

          <View style={styles.pumpGroupContainer}>
            {pumpGroupedData.map(({ pump, attributions: pAttrs, totals }) => (
              <View key={pump.id} style={styles.pumpSectionCard}>
                {/* Pump Header Strip */}
                <View style={styles.pumpSectionHeader}>
                  <View style={styles.pumpHeaderLeft}>
                    <View style={styles.pumpBadgeLarge}>
                      <Gauge size={16} color="#FFF" />
                      <Text style={styles.pumpBadgeLargeText}>Pump {pump.pumpNo}</Text>
                    </View>
                    <View>
                      <Text style={styles.pumpSectionTitle}>{pump.name}</Text>
                      <Text style={styles.pumpSectionSub}>
                        {pAttrs.length === 0
                          ? 'No operators assigned yet'
                          : `${pAttrs.length} Operator${pAttrs.length > 1 ? 's' : ''} on this pump today`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pumpHeaderRight}>
                    <TouchableOpacity
                      style={styles.addOpToPumpBtn}
                      onPress={() => handleOpenAssignModal(pump.id)}
                    >
                      <PlusCircle size={15} color="#3B82F6" />
                      <Text style={styles.addOpToPumpBtnText}>+ Add Operator / Shift</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Operator Sessions under this Pump */}
                {pAttrs.length === 0 ? (
                  <View style={styles.pumpEmptyBox}>
                    <Text style={styles.pumpEmptyText}>No operator sessions recorded for {pump.name}.</Text>
                    <TouchableOpacity
                      style={styles.inlineAddBtn}
                      onPress={() => handleOpenAssignModal(pump.id)}
                    >
                      <Text style={styles.inlineAddBtnText}>+ Assign Morning Operator</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.opCardsUnderPump}>
                    {pAttrs.map((attr, idx) => {
                      const isMorning = (attr.timeIn || '06:00') < '12:00';
                      const isNight = (attr.timeIn || '06:00') >= '21:00';
                      const shiftLabel = isNight
                        ? 'Night Session'
                        : isMorning
                        ? 'Morning Session'
                        : 'Evening Session';


                      return (
                        <View key={attr.id} style={styles.subOperatorCard}>
                          <View style={styles.subOpHeader}>
                            <View style={styles.subOpHeaderLeft}>
                              <View style={[styles.avatarCircle, { backgroundColor: isMorning ? '#3B82F6' : '#D97706' }]}>
                                <Text style={styles.avatarText}>
                                  {attr.operatorName.slice(0, 2).toUpperCase()}
                                </Text>
                              </View>
                              <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={styles.subOpName}>{attr.operatorName}</Text>
                                  <View style={[styles.shiftTag, { backgroundColor: isMorning ? '#EFF6FF' : '#FEF3C7' }]}>
                                    <Text style={[styles.shiftTagText, { color: isMorning ? '#1E40AF' : '#B45309' }]}>
                                      {shiftLabel}
                                    </Text>
                                  </View>
                                </View>
                                <View style={styles.timeBadgeRow}>
                                  <Clock size={12} color={colors.textMuted} />
                                  <Text style={styles.timeText}>
                                    Reporting: <Text style={{ fontWeight: '700', color: colors.text }}>{attr.timeIn || '06:00'}</Text> → Out: <Text style={{ fontWeight: '700', color: colors.text }}>{attr.timeOut || '14:00'}</Text>
                                  </Text>
                                </View>
                              </View>
                            </View>

                            <View style={styles.subOpActions}>
                              <TouchableOpacity
                                style={styles.editBtn}
                                onPress={() => handleOpenAssignModal(pump.id, attr)}
                              >
                                <Text style={styles.editBtnText}>Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => {
                                  Alert.alert('Confirm Delete', `Remove ${attr.operatorName} from ${pump.name}?`, [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Delete', style: 'destructive', onPress: () => deleteAttribution(attr.id) },
                                  ]);
                                }}
                              >
                                <Trash2 size={15} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Operator Collections Breakdown — Split Channels */}
                          <View style={styles.breakdownGrid}>
                            <View style={styles.breakdownRow}>
                              <Text style={styles.breakdownLabel}>Cash</Text>
                              <Text style={[styles.breakdownVal, { color: '#10B981' }]}>
                                {formatCurrency(attr.cashCollected)}
                              </Text>
                            </View>
                            <View style={styles.breakdownRow}>
                              <Text style={styles.breakdownLabel}>Swiping POS</Text>
                              <Text style={[styles.breakdownVal, { color: '#3B82F6' }]}>
                                {formatCurrency(attr.cardCollected)}
                              </Text>
                            </View>
                            <View style={styles.breakdownRow}>
                              <Text style={styles.breakdownLabel}>Gpay</Text>
                              <Text style={[styles.breakdownVal, { color: '#4285F4' }]}>
                                {formatCurrency(attr.gpayCollected ?? 0)}
                              </Text>
                            </View>
                            <View style={styles.breakdownRow}>
                              <Text style={styles.breakdownLabel}>Phone Pay</Text>
                              <Text style={[styles.breakdownVal, { color: '#5F259F' }]}>
                                {formatCurrency(attr.phonePayCollected ?? 0)}
                              </Text>
                            </View>
                            <View style={styles.breakdownRow}>
                              <Text style={styles.breakdownLabel}>Paytm</Text>
                              <Text style={[styles.breakdownVal, { color: '#00BAF2' }]}>
                                {formatCurrency(attr.paytmCollected ?? 0)}
                              </Text>
                            </View>
                            <View style={styles.breakdownRow}>
                              <Text style={styles.breakdownLabel}>Fleet Card</Text>
                              <Text style={[styles.breakdownVal, { color: '#06B6D4' }]}>
                                {formatCurrency(attr.fleetCardCollected)}
                              </Text>
                            </View>
                            <View style={styles.breakdownRow}>
                              <Text style={styles.breakdownLabel}>Credit Sales</Text>
                              <Text style={[styles.breakdownVal, { color: '#F59E0B' }]}>
                                {formatCurrency(attr.creditSales)}
                              </Text>
                            </View>
                            <View style={styles.breakdownRow}>
                              <Text style={styles.breakdownLabel}>Advance Ded.</Text>
                              <Text style={[styles.breakdownVal, { color: '#EF4444' }]}>
                                -{formatCurrency(attr.advancePayment + attr.creditAcc)}
                              </Text>
                            </View>
                            <View style={styles.breakdownRow}>
                              <Text style={styles.breakdownLabel}>Net Payment</Text>
                              <Text style={[styles.breakdownVal, { color: '#10B981', fontWeight: '800' }]}>
                                {formatCurrency(attr.netPayment)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}

                    {/* Combined Pump Summary Footer */}
                    {pAttrs.length > 1 && (
                      <View style={styles.combinedPumpSummary}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Users size={14} color="#475569" />
                          <Text style={styles.combinedLabel}>
                            Pump {pump.pumpNo} Combined ({pAttrs.length} Operators):
                          </Text>
                        </View>
                        <View style={styles.combinedValuesRow}>
                          <Text style={styles.combinedVal}>Cash: <Text style={{ color: '#10B981', fontWeight: '700' }}>{formatCurrency(totals.cash)}</Text></Text>
                          <Text style={styles.combinedVal}>Swipes: <Text style={{ color: '#3B82F6', fontWeight: '700' }}>{formatCurrency(totals.card)}</Text></Text>
                          <Text style={styles.combinedVal}>Gpay: <Text style={{ color: '#4285F4', fontWeight: '700' }}>{formatCurrency(totals.gpay)}</Text></Text>
                          <Text style={styles.combinedVal}>PhonePay: <Text style={{ color: '#5F259F', fontWeight: '700' }}>{formatCurrency(totals.phonePay)}</Text></Text>
                          <Text style={styles.combinedVal}>Paytm: <Text style={{ color: '#00BAF2', fontWeight: '700' }}>{formatCurrency(totals.paytm)}</Text></Text>
                          <Text style={styles.combinedVal}>Total: <Text style={{ color: colors.primary, fontWeight: '800' }}>{formatCurrency(totals.totalAmount)}</Text></Text>
                          <Text style={styles.combinedVal}>Net: <Text style={{ color: '#10B981', fontWeight: '800' }}>{formatCurrency(totals.netPayment)}</Text></Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : viewMode === 'OPERATOR_LIST' ? (
          /* ── VIEW 2: FLAT OPERATOR SESSIONS VIEW ─────────────────────────── */
          <View style={styles.cardsGrid}>
            {attributions.map((attr) => (
              <View key={attr.id} style={styles.operatorCard}>
                <View style={styles.operatorCardHeader}>
                  <View style={styles.operatorHeaderLeft}>
                    <View style={styles.pumpBadge}>
                      <Text style={styles.pumpBadgeText}>Pump {attr.pumpNo}</Text>
                    </View>
                    <View>
                      <Text style={styles.operatorName}>{attr.operatorName}</Text>
                      <View style={styles.timeBadgeRow}>
                        <Clock size={12} color={colors.textMuted} />
                        <Text style={styles.timeText}>
                          {attr.timeIn || '06:00'} → {attr.timeOut || '14:00'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleOpenAssignModal(attr.pumpId, attr)}
                    >
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => {
                        Alert.alert('Confirm Delete', 'Delete this operator attribution?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteAttribution(attr.id) },
                        ]);
                      }}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Operator Collections Breakdown — Split Channels */}
                <View style={styles.breakdownGrid}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Cash</Text>
                    <Text style={[styles.breakdownVal, { color: '#10B981' }]}>
                      {formatCurrency(attr.cashCollected)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Swiping POS</Text>
                    <Text style={[styles.breakdownVal, { color: '#3B82F6' }]}>
                      {formatCurrency(attr.cardCollected)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Gpay</Text>
                    <Text style={[styles.breakdownVal, { color: '#4285F4' }]}>
                      {formatCurrency(attr.gpayCollected ?? 0)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Phone Pay</Text>
                    <Text style={[styles.breakdownVal, { color: '#5F259F' }]}>
                      {formatCurrency(attr.phonePayCollected ?? 0)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Paytm</Text>
                    <Text style={[styles.breakdownVal, { color: '#00BAF2' }]}>
                      {formatCurrency(attr.paytmCollected ?? 0)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Fleet Card</Text>
                    <Text style={[styles.breakdownVal, { color: '#06B6D4' }]}>
                      {formatCurrency(attr.fleetCardCollected)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Credit Sales</Text>
                    <Text style={[styles.breakdownVal, { color: '#F59E0B' }]}>
                      {formatCurrency(attr.creditSales)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Advance / Ded.</Text>
                    <Text style={[styles.breakdownVal, { color: '#EF4444' }]}>
                      -{formatCurrency(attr.advancePayment + attr.creditAcc)}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.footerLabel}>Total Amount</Text>
                    <Text style={styles.footerVal}>{formatCurrency(attr.totalAmount)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.footerLabel}>Net Payment</Text>
                    <Text style={[styles.footerVal, { color: '#10B981' }]}>
                      {formatCurrency(attr.netPayment)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* ── VIEW 3: SPREADSHEET MATRIX (BLOCK H & D) ────────────────────── */
          <ScrollView horizontal style={styles.matrixScroll}>
            <View>
              <View style={styles.matrixHeaderRow}>
                <Text style={[styles.matrixHCell, { width: 90 }]}>Pump</Text>
                <Text style={[styles.matrixHCell, { width: 140 }]}>Operator</Text>
                <Text style={[styles.matrixHCell, { width: 110 }]}>Time (In-Out)</Text>
                <Text style={[styles.matrixHCell, { width: 100, textAlign: 'right' }]}>Cash (₹)</Text>
                <Text style={[styles.matrixHCell, { width: 100, textAlign: 'right' }]}>Swipes (₹)</Text>
                <Text style={[styles.matrixHCell, { width: 100, textAlign: 'right' }]}>Gpay (₹)</Text>
                <Text style={[styles.matrixHCell, { width: 100, textAlign: 'right' }]}>PhonePe (₹)</Text>
                <Text style={[styles.matrixHCell, { width: 100, textAlign: 'right' }]}>Paytm (₹)</Text>
                <Text style={[styles.matrixHCell, { width: 100, textAlign: 'right' }]}>Fleet (₹)</Text>
                <Text style={[styles.matrixHCell, { width: 100, textAlign: 'right' }]}>Credit (₹)</Text>
                <Text style={[styles.matrixHCell, { width: 120, textAlign: 'right' }]}>Total Amt (₹)</Text>
                <Text style={[styles.matrixHCell, { width: 120, textAlign: 'right' }]}>Net Pay (₹)</Text>
              </View>

              {attributions.map((attr) => (
                <View key={attr.id} style={styles.matrixDataRow}>
                  <Text style={[styles.matrixDCell, { width: 90, fontWeight: '700' }]}>
                    Pump {attr.pumpNo}
                  </Text>
                  <Text style={[styles.matrixDCell, { width: 140, fontWeight: '600' }]}>
                    {attr.operatorName}
                  </Text>
                  <Text style={[styles.matrixDCell, { width: 110, color: colors.textMuted }]}>
                    {attr.timeIn || '06:00'} - {attr.timeOut || '14:00'}
                  </Text>
                  <Text style={[styles.matrixDCell, { width: 100, textAlign: 'right', color: '#10B981' }]}>
                    {formatCurrency(attr.cashCollected)}
                  </Text>
                  <Text style={[styles.matrixDCell, { width: 100, textAlign: 'right', color: '#3B82F6' }]}>
                    {formatCurrency(attr.cardCollected)}
                  </Text>
                  <Text style={[styles.matrixDCell, { width: 100, textAlign: 'right', color: '#4285F4' }]}>
                    {formatCurrency(attr.gpayCollected ?? 0)}
                  </Text>
                  <Text style={[styles.matrixDCell, { width: 100, textAlign: 'right', color: '#5F259F' }]}>
                    {formatCurrency(attr.phonePayCollected ?? 0)}
                  </Text>
                  <Text style={[styles.matrixDCell, { width: 100, textAlign: 'right', color: '#00BAF2' }]}>
                    {formatCurrency(attr.paytmCollected ?? 0)}
                  </Text>
                  <Text style={[styles.matrixDCell, { width: 100, textAlign: 'right', color: '#06B6D4' }]}>
                    {formatCurrency(attr.fleetCardCollected)}
                  </Text>
                  <Text style={[styles.matrixDCell, { width: 100, textAlign: 'right', color: '#F59E0B' }]}>
                    {formatCurrency(attr.creditSales)}
                  </Text>
                  <Text style={[styles.matrixDCell, { width: 120, textAlign: 'right', fontWeight: '700' }]}>
                    {formatCurrency(attr.totalAmount)}
                  </Text>
                  <Text style={[styles.matrixDCell, { width: 120, textAlign: 'right', fontWeight: '700', color: '#10B981' }]}>
                    {formatCurrency(attr.netPayment)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </ScrollView>

      {/* Assign / Edit Operator Modal */}
      <Modal visible={showAssignModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 20 }}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingAttr ? 'Edit Operator Session' : 'Assign Operator to Pump (Multi-Operator)'}
                </Text>
                <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Pump Selection */}
              <Text style={styles.inputLabel}>Assigned Pump</Text>
              <View style={styles.pillsRow}>
                {pumps.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.pillBtn, selectedPumpId === p.id && styles.pillBtnActive]}
                    onPress={() => setSelectedPumpId(p.id)}
                  >
                    <Text style={[styles.pillBtnText, selectedPumpId === p.id && styles.pillBtnTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Operator Selection */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Attendant / Operator</Text>
              <View style={styles.pillsRow}>
                {operators.map((o) => (
                  <TouchableOpacity
                    key={o.id}
                    style={[styles.pillBtn, selectedOperatorId === o.id && styles.pillBtnActive]}
                    onPress={() => setSelectedOperatorId(o.id)}
                  >
                    <Text style={[styles.pillBtnText, selectedOperatorId === o.id && styles.pillBtnTextActive]}>
                      {o.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Shift Presets */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Shift Preset / Reporting Hours</Text>
              <View style={styles.presetsRow}>
                {SHIFT_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isActive = timeIn === preset.timeIn && timeOut === preset.timeOut;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      style={[styles.presetChip, isActive && styles.presetChipActive]}
                      onPress={() => handleApplyPreset(preset)}
                    >
                      <Icon size={13} color={isActive ? '#FFF' : colors.textSecondary} />
                      <Text style={[styles.presetChipText, isActive && styles.presetChipTextActive]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Reporting Times */}
              <View style={styles.timesRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputSubLabel}>Time In (Morning/Start)</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={timeIn}
                    onChangeText={setTimeIn}
                    placeholder="06:00"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputSubLabel}>Time Out (Evening/End)</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={timeOut}
                    onChangeText={setTimeOut}
                    placeholder="14:00"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* ── Auto-Fetched Live Data Box for Selected Pump ────────── */}
              <View style={styles.modalAutoFetchBox}>
                <View style={styles.modalAutoFetchHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="#F59E0B" />
                    <Text style={styles.modalAutoFetchTitle}>Auto-Fetched Data for this Pump & Date</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalAutoFetchBtn}
                    onPress={() => handleAutoFetchValues(true)}
                    activeOpacity={0.7}
                  >
                    <RefreshCw size={12} color="#2563EB" />
                    <Text style={styles.modalAutoFetchBtnText}>Re-Sync / Auto-Fill</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalAutoFetchGrid}>
                  <View style={styles.modalAutoFetchItem}>
                    <Text style={styles.modalAutoFetchItemLbl}>Meter Reading</Text>
                    <Text style={styles.modalAutoFetchItemVal}>{formatCurrency(pumpMeterSales)}</Text>
                    <Text style={styles.modalAutoFetchItemSub}>{pumpMeterLitres.toFixed(1)} L (this pump)</Text>
                  </View>

                  <View style={styles.modalAutoFetchItem}>
                    <Text style={styles.modalAutoFetchItemLbl}>Credit Sales</Text>
                    <Text style={styles.modalAutoFetchItemVal}>{formatCurrency(pumpCreditSales)}</Text>
                    <Text style={styles.modalAutoFetchItemSub}>{pumpCreditTx.length} Credit Entries</Text>
                  </View>

                  <View style={styles.modalAutoFetchItem}>
                    <Text style={styles.modalAutoFetchItemLbl}>Staff Advance/Bata</Text>
                    <Text style={styles.modalAutoFetchItemVal}>{formatCurrency(totalDayAdvance)}</Text>
                    <Text style={styles.modalAutoFetchItemSub}>{dayExpenses.length} Total Expenses</Text>
                  </View>
                </View>

                <Text style={styles.modalAutoFetchNote}>
                  Data auto-fetched from Nozzle Meters, Credit Ledger & Expenses. All fields below remain fully editable in case of split shifts or mismatch.
                </Text>
              </View>

              {/* Block D Collections Form — Split Excel Channels */}
              <Text style={[styles.sectionHeading, { marginTop: 16 }]}>
                Collections Breakdown (Block D — Excel Channels)
              </Text>

              <View style={styles.formGrid}>
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Cash Collected (₹)</Text>
                  <TextInput
                    style={styles.moneyInput}
                    keyboardType="numeric"
                    value={cashCollected}
                    onChangeText={setCashCollected}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Swiping Machine / POS (₹)</Text>
                  <TextInput
                    style={styles.moneyInput}
                    keyboardType="numeric"
                    value={cardCollected}
                    onChangeText={setCardCollected}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Gpay (Google Pay) (₹)</Text>
                  <TextInput
                    style={styles.moneyInput}
                    keyboardType="numeric"
                    value={gpayCollected}
                    onChangeText={setGpayCollected}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Phone Pay (PhonePe) (₹)</Text>
                  <TextInput
                    style={styles.moneyInput}
                    keyboardType="numeric"
                    value={phonePayCollected}
                    onChangeText={setPhonePayCollected}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Paytm (₹)</Text>
                  <TextInput
                    style={styles.moneyInput}
                    keyboardType="numeric"
                    value={paytmCollected}
                    onChangeText={setPaytmCollected}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Fleet Card (₹)</Text>
                  <TextInput
                    style={styles.moneyInput}
                    keyboardType="numeric"
                    value={fleetCardCollected}
                    onChangeText={setFleetCardCollected}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Credit Sales (₹)</Text>
                  <TextInput
                    style={styles.moneyInput}
                    keyboardType="numeric"
                    value={creditSales}
                    onChangeText={setCreditSales}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Advance / Bata (₹)</Text>
                  <TextInput
                    style={styles.moneyInput}
                    keyboardType="numeric"
                    value={advancePayment}
                    onChangeText={setAdvancePayment}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>


              {/* Live Session Summary Strip */}
              <View style={styles.modalSummaryStrip}>
                <View>
                  <Text style={styles.modalSummaryLbl}>Total Collection (Block D)</Text>
                  <Text style={styles.modalSummaryVal}>{formatCurrency(modalTotal)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.modalSummaryLbl}>Net Payable (After Deductions)</Text>
                  <Text style={[styles.modalSummaryVal, { color: '#10B981' }]}>
                    {formatCurrency(modalNet)}
                  </Text>
                </View>
              </View>

              {/* Modal Actions */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowAssignModal(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Save size={16} color="#FFF" />
                  <Text style={styles.primaryBtnText}>
                    {isSaving ? 'Saving…' : 'Save Operator Session'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Tally Session Entry Modal ───────────────────────────────── */}
      {showTallySessionForm && (
        <SessionEntryForm
          visible={showTallySessionForm}
          onClose={() => setShowTallySessionForm(false)}
          onSave={async (formData) => {
            await saveAttribution(formData);
            setShowTallySessionForm(false);
            if (selectedDate) {
              fetchTally(selectedDate);
            }
          }}
          operators={operators}
          pumps={pumps}
          businessDate={selectedDate}
        />
      )}
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
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  dateInput: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    width: 95,
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
    minWidth: 130,
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
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 10,
    color: '#9AA5B1',
    marginTop: 2,
  },
  viewToggleBar: {
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
  toggleBtn: {
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
  toggleBtnActive: {
    borderBottomColor: colors.primary,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  toggleBtnTextActive: {
    color: '#FFF',
  },
  contentScroll: {
    flex: 1,
    padding: 20,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 400,
    marginTop: 4,
  },
  pumpGroupContainer: {
    gap: 20,
  },
  pumpSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pumpSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexWrap: 'wrap',
    gap: 10,
  },
  pumpHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pumpBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pumpBadgeLargeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  pumpSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  pumpSectionSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  pumpHeaderRight: {
    flexDirection: 'row',
    gap: 8,
  },
  addOpToPumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addOpToPumpBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  pumpEmptyBox: {
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  pumpEmptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  inlineAddBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  inlineAddBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  opCardsUnderPump: {
    padding: 16,
    gap: 14,
  },
  subOperatorCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  subOpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subOpHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  subOpName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  shiftTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shiftTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subOpActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  combinedPumpSummary: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  combinedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  combinedValuesRow: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  combinedVal: {
    fontSize: 12,
    color: '#475569',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  operatorCard: {
    width: '31%',
    minWidth: 280,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  operatorCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  operatorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pumpBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pumpBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  operatorName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  timeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  deleteBtn: {
    padding: 4,
  },
  breakdownGrid: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  footerVal: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  matrixScroll: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  matrixHCell: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  matrixDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  matrixDCell: {
    fontSize: 13,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    width: '100%',
    maxWidth: 560,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
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
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  inputSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  presetChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#2563EB',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetChipTextActive: {
    color: '#FFF',
  },
  timesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  timeInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  formCol: {
    width: '48%',
    minWidth: 180,
  },
  moneyInput: {
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
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  // Auto-Fetch Cross-Module Strip Styles
  autoFetchBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  autoFetchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  autoFetchTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  autoFetchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  autoFetchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  autoFetchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  autoFetchCol: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  autoFetchColLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  autoFetchColVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  autoFetchColSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  // Modal Auto-Fetch Box Styles
  modalAutoFetchBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalAutoFetchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalAutoFetchTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalAutoFetchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  modalAutoFetchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  modalAutoFetchGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  modalAutoFetchItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalAutoFetchItemLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  modalAutoFetchItemVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalAutoFetchItemSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  modalAutoFetchNote: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  // Modal Summary Strip
  modalSummaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSummaryLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  modalSummaryVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
});

const tallyStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingBottom: 24,
  },
  grandTotalRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  grandTotalLabel: {
    color: '#6F7BF5',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  grandTotal: {
    color: '#0D63B8',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
  },

  tabContent: {
    marginTop: 12,
    minHeight: 220,
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});


