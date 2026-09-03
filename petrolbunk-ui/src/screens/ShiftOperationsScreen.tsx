import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Gauge,
  Layers,
  Lock,
  Moon,
  PlusCircle,
  RefreshCw,
  Save,
  Sparkles,
  Sun,
  Sunset,
  Trash2,
  Unlock,
  UserCheck,
  Users,
  X,
  Zap
} from 'lucide-react';
import DailyKpiStrip from '../components/tally/DailyKpiStrip';
import OperatorTallyTable from '../components/tally/OperatorTallyTable';
import PumpTallyTable from '../components/tally/PumpTallyTable';
import ReconciliationCard from '../components/tally/ReconciliationCard';
import SessionEntryForm from '../components/tally/SessionEntryForm';
import ShiftTallyTable from '../components/tally/ShiftTallyTable';
import TallyTabs, { TallyTab } from '../components/tally/TallyTabs';
import { useAuthContext } from '../context/AuthContext';
import { useCreditLedgerContext } from '../context/CreditLedgerContext';
import { useExpensesContext } from '../context/ExpensesContext';
import { useShiftOperationsContext } from '../context/ShiftOperationsContext';
import { tallyApi } from '../services/tallyApi';
import { colors } from '../theme/colors';
import { DailyTally, PumpDayAttribution, ReconciliationOut } from '../types';
import { formatCurrency, getTodayDateString } from '../utils/formatters';


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
    toggleShiftLock,
    pumps = [],
    operators = [],
    nozzleMeters = [],
    masterChannels = [],
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
  const [selectedNozzleIds, setSelectedNozzleIds] = useState<string[]>([]);
  const [timeIn, setTimeIn] = useState('06:00');
  const [timeOut, setTimeOut] = useState('14:00');
  const [advancePayment, setAdvancePayment] = useState('0');
  const [creditAcc, setCreditAcc] = useState('0');
  const [cashCollected, setCashCollected] = useState('0');
  // Dynamic payment channel values keyed by channel.code from masterChannels
  const [channelValues, setChannelValues] = useState<Record<string, string>>({});
  const [creditSales, setCreditSales] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  // Helper: get/set a single channel value
  const getChannel = (code: string) => channelValues[code] ?? '0';
  const setChannel = (code: string, val: string) =>
    setChannelValues(prev => ({ ...prev, [code]: val }));

  // Fallback channels when masterChannels not yet loaded (matches DB seed defaults)
  const FALLBACK_CHANNELS = [
    { id: 1, code: 'Swiping Machine', name: 'Swiping Machine', sortOrder: 1, isActive: true },
    { id: 2, code: 'Gpay',            name: 'Gpay (Google Pay)',     sortOrder: 2, isActive: true },
    { id: 3, code: 'Phone Pay',       name: 'Phone Pay (PhonePe)',   sortOrder: 3, isActive: true },
    { id: 4, code: 'Paytm',           name: 'Paytm QR/Soundbox',    sortOrder: 4, isActive: true },
    { id: 5, code: 'Fleet Card',      name: 'Fleet Card',            sortOrder: 5, isActive: true },
  ];
  const activeChannels = masterChannels.length > 0 ? masterChannels : FALLBACK_CHANNELS;

  // Map channel code → attribution field name (for saving to existing API)
  const CHANNEL_FIELD_MAP: Record<string, keyof typeof CHANNEL_VALUES_INIT> = {
    'Swiping Machine': 'cardCollected',
    'CARD':            'cardCollected',
    'POS':             'cardCollected',
    'Gpay':            'gpayCollected',
    'GPAY':            'gpayCollected',
    'Phone Pay':       'phonePayCollected',
    'PHONEPE':         'phonePayCollected',
    'Paytm':           'paytmCollected',
    'PAYTM':           'paytmCollected',
    'Fleet Card':      'fleetCardCollected',
    'FLEET':           'fleetCardCollected',
  };
  const CHANNEL_VALUES_INIT = {
    cardCollected: 0,
    gpayCollected: 0,
    phonePayCollected: 0,
    paytmCollected: 0,
    fleetCardCollected: 0,
  };


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
    // Sum all channel values to compute digital total
    const digital = activeChannels.reduce((sum, ch) => sum + (parseFloat(getChannel(ch.code)) || 0), 0);
    if (pumpMeterSales > 0) {
      const estimatedCash = Math.max(0, pumpMeterSales - (pumpCreditSales || 0) - digital);
      if (overrideExisting || !cashCollected || cashCollected === '0') {
        setCashCollected(String(estimatedCash || 0));
      }
    }
  };

  // Auto-recalculate suggested cash when payment modes change in modal
  const modalTotal = useMemo(() => {
    const cash = parseFloat(cashCollected) || 0;
    const credit = parseFloat(creditSales) || 0;
    const channelSum = activeChannels.reduce((sum, ch) => sum + (parseFloat(channelValues[ch.code] ?? '0') || 0), 0);
    return cash + credit + channelSum;
  }, [cashCollected, creditSales, channelValues, activeChannels]);

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

  // All available nozzles across all pumps
  const allAvailableNozzles = useMemo(() => {
    const list: { id: string; pumpId: string; pumpName: string; nozzleNo: number; productName: string; color: string; fuelCode: string }[] = [];
    (pumps || []).forEach((p) => {
      (p.nozzles || []).forEach((n) => {
        list.push({
          id: n.id,
          pumpId: p.id,
          pumpName: p.name,
          nozzleNo: n.nozzleNo,
          productName: n.productName || 'Fuel',
          color: n.color || (n.fuelCode === 'HSD' ? '#D97706' : '#059669'),
          fuelCode: n.fuelCode || n.productName || 'FUEL',
        });
      });
    });
    return list;
  }, [pumps]);

  const handleOpenAssignModal = (arg1?: any, arg2?: any) => {
    let attr: PumpDayAttribution | null = null;
    let targetPumpId = '';

    if (arg1 && typeof arg1 === 'object') {
      attr = arg1;
      targetPumpId = attr?.pumpId || '';
    } else if (arg2 && typeof arg2 === 'object') {
      attr = arg2;
      targetPumpId = typeof arg1 === 'string' ? arg1 : (attr?.pumpId || '');
    } else if (typeof arg1 === 'string') {
      targetPumpId = arg1;
    }

    if (attr) {
      setEditingAttr(attr);
      const pId = attr?.pumpId || pumps[0]?.id || '';
      setSelectedPumpId(pId);
      setSelectedOperatorId(attr?.operatorId || operators[0]?.id || '');
      
      const pumpObj = pumps.find((p) => p.id === pId);
      const fallbackNozzles = (pumpObj?.nozzles || []).map((n) => n.id);
      setSelectedNozzleIds(
        attr.nozzleIds && attr.nozzleIds.length > 0 ? attr.nozzleIds : fallbackNozzles
      );

      setTimeIn(attr?.timeIn || '06:00');
      setTimeOut(attr?.timeOut || '14:00');
      setAdvancePayment(String(attr?.advancePayment ?? '0'));
      setCreditAcc(String(attr?.creditAcc ?? '0'));
      setCashCollected(String(attr?.cashCollected ?? '0'));
      setCreditSales(String(attr?.creditSales ?? '0'));

      // Populate dynamic channels from attribution
      const loadedChannels: Record<string, string> = {
        'Swiping Machine': String(attr?.cardCollected ?? '0'),
        'Gpay': String(attr?.gpayCollected ?? attr?.upiGpayCollected ?? '0'),
        'Phone Pay': String(attr?.phonePayCollected ?? '0'),
        'Paytm': String(attr?.paytmCollected ?? '0'),
        'Fleet Card': String(attr?.fleetCardCollected ?? '0'),
      };
      setChannelValues(loadedChannels);
    } else {
      setEditingAttr(null);
      const targetP = targetPumpId || pumps[0]?.id || '';
      setSelectedPumpId(targetP);

      // Default select nozzles for this pump (or min 2 nozzles)
      const pumpObj = pumps.find((item) => item.id === targetP);
      const pNozzles = (pumpObj?.nozzles || []).map((n) => n.id);
      if (pNozzles.length >= 2) {
        setSelectedNozzleIds(pNozzles);
      } else {
        const allN = allAvailableNozzles.map((n) => n.id);
        setSelectedNozzleIds(allN.slice(0, 2));
      }

      // If this pump already has morning operator, default next operator to evening (14:00 - 22:00)
      const existingForPump = (attributions || []).filter((a) => a?.pumpId === targetP);
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
        .filter((t) => !targetP || t?.pumpId === targetP)
        .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);

      const pMeters = (dayNozzleMeters || []).filter((m) => m?.pumpId === targetP);
      const pSales = pMeters.reduce((sum, m) => {
        const gross = Number(m?.grossAmount ?? (m?.litresSold || 0) * (m?.sellingRate || 0)) || 0;
        return sum + gross;
      }, 0);

      setAdvancePayment(totalDayAdvance > 0 ? String(totalDayAdvance) : '0');
      setCreditAcc('0');
      setCreditSales(pCredit > 0 ? String(pCredit) : '0');
      setCashCollected(pSales > 0 ? String(Math.max(0, pSales - pCredit)) : '0');
      setChannelValues({});
    }
    setShowAssignModal(true);
  };

  const handleApplyPreset = (preset: ShiftPreset) => {
    setTimeIn(preset.timeIn);
    setTimeOut(preset.timeOut);
  };

  const handleSave = async (forceClose?: boolean) => {
    if (!selectedPumpId) {
      Alert.alert('Validation Error', 'Please select a pump');
      return;
    }
    if (!selectedOperatorId) {
      Alert.alert('Validation Error', 'Please select an attendant/operator');
      return;
    }
    if (selectedNozzleIds.length < 2) {
      Alert.alert(
        'Validation Warning',
        `An operator must be assigned to minimum 2 nozzles.\nCurrently selected: ${selectedNozzleIds.length} nozzle(s).`
      );
      return;
    }

    const numAdv = parseFloat(advancePayment) || 0;
    const numCreditAcc = parseFloat(creditAcc) || 0;
    const numCash = parseFloat(cashCollected) || 0;
    const numCreditSales = parseFloat(creditSales) || 0;

    // Digital channel amounts extracted from dynamic masterChannels
    let numCard = parseFloat(getChannel('Swiping Machine')) || parseFloat(getChannel('CARD')) || parseFloat(getChannel('POS')) || 0;
    let numGpay = parseFloat(getChannel('Gpay')) || parseFloat(getChannel('GPAY')) || 0;
    let numPhonePay = parseFloat(getChannel('Phone Pay')) || parseFloat(getChannel('PHONEPE')) || 0;
    let numPaytm = parseFloat(getChannel('Paytm')) || parseFloat(getChannel('PAYTM')) || 0;
    let numFleet = parseFloat(getChannel('Fleet Card')) || parseFloat(getChannel('FLEET')) || 0;

    // Check any dynamic channels mapped to fields
    activeChannels.forEach(ch => {
      const field = CHANNEL_FIELD_MAP[ch.code];
      const val = parseFloat(getChannel(ch.code)) || 0;
      if (field === 'cardCollected' && !numCard) numCard = val;
      else if (field === 'gpayCollected' && !numGpay) numGpay = val;
      else if (field === 'phonePayCollected' && !numPhonePay) numPhonePay = val;
      else if (field === 'paytmCollected' && !numPaytm) numPaytm = val;
      else if (field === 'fleetCardCollected' && !numFleet) numFleet = val;
    });

    const numUpi = numGpay + numPhonePay + numPaytm;
    const totalAmt = numCash + numCard + numFleet + numCreditSales + numUpi;
    const netPay = totalAmt - numAdv - numCreditAcc;

    const nozzleLabels = selectedNozzleIds.map((nzId) => {
      const match = allAvailableNozzles.find((n) => n.id === nzId);
      return match ? `${match.pumpName} - N${match.nozzleNo} (${match.fuelCode})` : nzId;
    });

    const statusToSave = forceClose ? 'CLOSED' : (editingAttr?.status || 'OPEN');

    try {
      setIsSaving(true);
      await saveAttribution({
        id: editingAttr?.id,
        attributionDate: selectedDate,
        pumpId: selectedPumpId,
        operatorId: selectedOperatorId,
        nozzleIds: selectedNozzleIds,
        nozzleNames: nozzleLabels,
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
        status: statusToSave,
      });
      setShowAssignModal(false);
      Alert.alert(
        forceClose ? '🔒 Shift Closed & Locked' : 'Shift Session Saved',
        forceClose
          ? 'Operator shift session has been finalized at end of day and locked.'
          : 'Operator shift details saved.'
      );
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
           
        </View>

        <View style={styles.headerButtons}>
          {/* {currentShift && !isClosed && (
            <TouchableOpacity
              style={[styles.saveDraftBtn, draftSavedToast && styles.saveDraftBtnSuccess]}
              onPress={handleSaveDraft}
              disabled={isSavingDraft}
              activeOpacity={0.8}
            >
              {draftSavedToast ? (
                <>
                  <CheckCircle2 size={15} color="#16A34A" />
                  <Text style={[styles.saveDraftBtnText, { color: '#16A34A' }]}>Draft Saved ✓</Text>
                </>
              ) : (
                <>
                  <Save size={15} color="#007DC6" />
                  <Text style={styles.saveDraftBtnText}>
                    {isSavingDraft ? 'Saving...' : 'Save Draft'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )} */}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => handleOpenAssignModal()}
          >
            <PlusCircle size={16} color="#1F2937" />
            <Text style={styles.primaryBtnText}>Assign Operator</Text>
          </TouchableOpacity>

        </View>
      </View>

      {/* ── Pump Filter Tabs ───────────────────────────────────────── */}
      <View style={styles.pumpFilterCard}>
        <View style={styles.pumpFilterHeader}>
          <Gauge size={15} color="#007DC6" />
          <Text style={styles.pumpFilterTitle}>PUMP DISPENSER:</Text>
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
            Daily Tally
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
            Consolidated View
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={true}>
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

              <View style={styles.metaActions}>
           

                <TouchableOpacity
                  style={styles.editShiftBtn}
                  onPress={handleOpenEditModal}
                  activeOpacity={0.8}
                >
                  <Pencil size={14} color="#0F172A" />
                  <Text style={styles.editShiftBtnText}>Edit Shift</Text>
                </TouchableOpacity>

                {role === 'Owner' && (
                  <TouchableOpacity
                    style={styles.deleteShiftBtn}
                    onPress={handleDeleteShift}
                    activeOpacity={0.8}
                  >
                    <Trash2 size={14} color="#FFFFFF" />
                    <Text style={styles.deleteShiftBtnText}>Delete</Text>
                  </TouchableOpacity>
                )}

                {!isClosed && (
                  <TouchableOpacity
                    style={styles.closeShiftBtn}
                    onPress={handleFinalCloseShift}
                    activeOpacity={0.8}
                  >
                    <FileCheck size={14} color="#FFFFFF" />
                    <Text style={styles.closeShiftBtnText}>Close Shift</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* ── Section 1: Nozzle Meter Readings Matrix ────────────────────── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionTitleHeader}>
              <View style={styles.titleIconRow}>
                <Calculator size={18} color="#007DC6" />
                <Text style={styles.sectionTitle}>1. Nozzle Meter Readings & Sales Calculation</Text>
              </View>
           
            </View>

            <View style={styles.readingsList}>
              {(() => {
                const shiftPump = pumps.find((p) => p.id === currentShift.pumpId);
                const readingsToDisplay: MeterReadingEntry[] =
                  currentShift.meterReadings && currentShift.meterReadings.length > 0
                    ? currentShift.meterReadings
                    : (shiftPump?.nozzles || []).map((noz) => {
                        const prod = products.find((p) => p.id === noz.productId);
                        return {
                          nozzleId: noz.id,
                          nozzleNo: noz.nozzleNo,
                          productName: noz.productName || prod?.name || 'Fuel',
                          fuelCode: noz.fuelCode || prod?.code || 'HSD',
                          rate: prod?.currentRate || 94.5,
                          openingReading: noz.currentMeterReading || 0,
                          closingReading: noz.currentMeterReading || 0,
                          testingLitres: 0,
                          litresSold: 0,
                          grossAmount: 0,
                        };
                      });

                if (readingsToDisplay.length === 0) {
                  return (
                    <View style={styles.emptyNozzleNotice}>
                      <AlertCircle size={16} color={colors.warning} />
                      <Text style={styles.emptyNozzleText}>
                        No nozzles configured for Pump {currentShift.pumpNo}. Please configure nozzles in Masters.
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


                      const isLocked = attr.status === 'CLOSED' || attr.status === 'LOCKED';

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
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <Text style={styles.subOpName}>{attr.operatorName}</Text>
                                  <View style={[styles.shiftTag, { backgroundColor: isMorning ? '#EFF6FF' : '#FEF3C7' }]}>
                                    <Text style={[styles.shiftTagText, { color: isMorning ? '#1E40AF' : '#B45309' }]}>
                                      {shiftLabel}
                                    </Text>
                                  </View>
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                      paddingHorizontal: 7,
                                      paddingVertical: 2,
                                      borderRadius: 12,
                                      backgroundColor: isLocked ? '#F1F5F9' : '#DEF7EC',
                                      borderWidth: 1,
                                      borderColor: isLocked ? '#CBD5E1' : '#A7F3D0',
                                    }}
                                  >
                                    {isLocked ? <Lock size={10} color="#475569" /> : null}
                                    <Text
                                      style={{
                                        fontSize: 10,
                                        fontWeight: '800',
                                        color: isLocked ? '#475569' : '#03543F',
                                      }}
                                    >
                                      {isLocked ? 'LOCKED' : '● OPEN'}
                                    </Text>
                                  </View>
                                </View>
                                <View style={styles.timeBadgeRow}>
                                  <Clock size={12} color={colors.textMuted} />
                                  <Text style={styles.timeText}>
                                    Reporting: <Text style={{ fontWeight: '700', color: colors.text }}>{attr.timeIn || '06:00'}</Text> → Out: <Text style={{ fontWeight: '700', color: colors.text }}>{attr.timeOut || '14:00'}</Text>
                                  </Text>
                                </View>

                                {/* Assigned Nozzles List */}
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                  {(attr.nozzleNames && attr.nozzleNames.length > 0
                                    ? attr.nozzleNames
                                    : (attr.nozzleIds || []).map((nid) => {
                                        const match = allAvailableNozzles.find((n) => n.id === nid);
                                        return match ? `${match.pumpName}-N${match.nozzleNo} (${match.fuelCode})` : 'Nozzle';
                                      })
                                  ).map((nName, nIdx) => (
                                    <View
                                      key={nIdx}
                                      style={{
                                        backgroundColor: '#EFF6FF',
                                        borderWidth: 1,
                                        borderColor: '#BFDBFE',
                                        borderRadius: 4,
                                        paddingHorizontal: 6,
                                        paddingVertical: 1,
                                      }}
                                    >
                                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#1E40AF' }}>
                                        ⛽ {nName}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            </View>
                          )}
                        </View>
                        <View style={[styles.rateBadge, { borderColor: (isProdInactive || isPumpInactive) ? '#CBD5E1' : prodColor + '40' }]}>
                          <Text style={[styles.rateBadgeText, { color: '#0F172A' }]}>
                            Rate: <Text style={{ fontWeight: '800', color: (isProdInactive || isPumpInactive) ? '#64748B' : prodColor }}>{formatCurrency(reading.rate)}/L</Text>
                          </Text>
                        </View>
                      </View>

                      {/* Locked Inactive Notice */}
                      {(isProdInactive || isPumpInactive) && (
                        <View style={styles.lockedNozzleBar}>
                          <AlertCircle size={12} color="#64748B" />
                          <Text style={styles.lockedNozzleBarText}>
                            {isProdInactive
                              ? `Product "${reading.productName}" is inactive in Masters. Meter entry is disabled.`
                              : `Pump ${currentShift.pumpNo} is ${shiftPump?.status} in Masters. Meter entry is disabled.`}
                          </Text>
                        </View>
                      )}

                      {/* Inputs Row */}
                      <View style={styles.inputsGrid}>
                        {/* Opening Reading */}
                        <View style={styles.inputCol}>
                          <Text style={styles.inputLabel}>Opening Meter (L)</Text>
                          <TextInput
                            style={[styles.inputField, styles.disabledInput]}
                            value={currentBuffer.opening}
                            editable={!isNozzleDisabled && role === 'Owner'}
                            onChangeText={(val) => handleReadingTextChange(reading.nozzleId, 'opening', val)}
                            keyboardType="numeric"
                          />
                        
                        </View>

                        {/* Closing Reading */}
                        <View style={[styles.inputCol, { flex: 1.2 }]}>
                          <View style={styles.inputLabelRow}>
                            <Text style={[styles.inputLabel, { color: isNozzleDisabled ? '#64748B' : '#007DC6', fontWeight: '700' }]}>
                              Closing Meter (L) {isNozzleDisabled ? '(Locked)' : '*'}
                            </Text>
                         
                          </View>
                          <TextInput
                            style={[
                              styles.inputField,
                              isNozzleDisabled ? styles.disabledInput : styles.activeInput,
                              { borderColor: !isNozzleDisabled ? '#007DC6' : '#CBD5E1' },
                            ]}
                            value={currentBuffer.closing}
                            editable={!isNozzleDisabled}
                            onChangeText={(val) => handleReadingTextChange(reading.nozzleId, 'closing', val)}
                            placeholder={isNozzleDisabled ? 'Locked (Inactive)' : 'Enter closing meter'}
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                          />
                         
                        </View>

                        {/* Testing / Calibration */}
                        {/* <View style={[styles.inputCol, { maxWidth: 110 }]}>
                          <Text style={styles.inputLabel}>Testing (L)</Text>
                          <TextInput
                            style={[
                              styles.inputField,
                              isNozzleDisabled ? styles.disabledInput : styles.activeInput,
                            ]}
                            value={currentBuffer.testing}
                            editable={!isNozzleDisabled}
                            onChangeText={(val) => handleReadingTextChange(reading.nozzleId, 'testing', val)}
                            keyboardType="numeric"
                          />
                          <Text style={styles.inputSubHint}>Returned to tank</Text>
                        </View> */}

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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.operatorName}>{attr.operatorName}</Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 12,
                            backgroundColor: (attr.status === 'CLOSED' || attr.status === 'LOCKED') ? '#F1F5F9' : '#DEF7EC',
                            borderWidth: 1,
                            borderColor: (attr.status === 'CLOSED' || attr.status === 'LOCKED') ? '#CBD5E1' : '#A7F3D0',
                          }}
                        >
                          {(attr.status === 'CLOSED' || attr.status === 'LOCKED') ? <Lock size={10} color="#475569" /> : null}
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '800',
                              color: (attr.status === 'CLOSED' || attr.status === 'LOCKED') ? '#475569' : '#03543F',
                            }}
                          >
                            {(attr.status === 'CLOSED' || attr.status === 'LOCKED') ? 'LOCKED' : '● OPEN'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.timeBadgeRow}>
                        <Clock size={12} color={colors.textMuted} />
                        <Text style={styles.timeText}>
                          {attr.timeIn || '06:00'} → {attr.timeOut || '14:00'}
                        </Text>
                      </View>

                      {/* Assigned Nozzles List */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {(attr.nozzleNames && attr.nozzleNames.length > 0
                          ? attr.nozzleNames
                          : (attr.nozzleIds || []).map((nid) => {
                              const match = allAvailableNozzles.find((n) => n.id === nid);
                              return match ? `${match.pumpName}-N${match.nozzleNo} (${match.fuelCode})` : 'Nozzle';
                            })
                        ).map((nName, nIdx) => (
                          <View
                            key={nIdx}
                            style={{
                              backgroundColor: '#EFF6FF',
                              borderWidth: 1,
                              borderColor: '#BFDBFE',
                              borderRadius: 4,
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#1E40AF' }}>
                              ⛽ {nName}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    {(attr.status === 'CLOSED' || attr.status === 'LOCKED') ? (
                      <>
                        <TouchableOpacity
                          style={[styles.editBtn, { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }]}
                          onPress={() => toggleShiftLock(attr.id, 'OPEN')}
                        >
                          <Unlock size={11} color="#0D63B8" />
                          <Text style={[styles.editBtnText, { color: '#0D63B8' }]}>Re-Open</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.editBtn, { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }]}
                          onPress={() => handleOpenAssignModal(attr.pumpId, attr)}
                        >
                          <Lock size={11} color="#64748B" />
                          <Text style={[styles.editBtnText, { color: '#64748B' }]}>View Details</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[styles.editBtn, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}
                          onPress={() => toggleShiftLock(attr.id, 'CLOSED')}
                        >
                          <Lock size={11} color="#B45309" />
                          <Text style={[styles.editBtnText, { color: '#B45309' }]}>Lock Shift</Text>
                        </TouchableOpacity>
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
                      </>
                    )}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {editingAttr?.status === 'CLOSED' || editingAttr?.status === 'LOCKED' ? (
                    <Lock size={18} color="#B45309" />
                  ) : (
                    <UserCheck size={18} color={colors.primary} />
                  )}
                  <Text style={styles.modalTitle}>
                    {editingAttr
                      ? (editingAttr.status === 'CLOSED' || editingAttr.status === 'LOCKED'
                          ? 'Finalized Shift Session (Locked)'
                          : 'Edit Operator Shift Session')
                      : 'Assign Operator (Nozzle-Wise)'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Locked Banner if Session is Closed/Locked */}
              {(editingAttr?.status === 'CLOSED' || editingAttr?.status === 'LOCKED') && (
                <View style={styles.lockedSessionBanner}>
                  <Lock size={16} color="#B45309" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lockedSessionBannerTitle}>Shift Session Finalized & Locked</Text>
                    <Text style={styles.lockedSessionBannerSub}>
                      All collections, meter sales, and staff entries are locked for end-of-day reconciliation.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.unlockQuickBtn}
                    onPress={async () => {
                      if (editingAttr) {
                        await toggleShiftLock(editingAttr.id, 'OPEN');
                        setEditingAttr({ ...editingAttr, status: 'OPEN' });
                        Alert.alert('Session Unlocked', 'Shift is now open and editable.');
                      }
                    }}
                  >
                    <Unlock size={12} color="#1E40AF" />
                    <Text style={styles.unlockQuickBtnText}>Unlock</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Pump Selection */}
              <Text style={styles.inputLabel}>Assigned Pump *</Text>
              <View style={styles.pillsRow}>
                {pumps.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.pillBtn, selectedPumpId === p.id && styles.pillBtnActive]}
                    onPress={() => {
                      if (editingAttr?.status === 'CLOSED' || editingAttr?.status === 'LOCKED') return;
                      setSelectedPumpId(p.id);
                      // Auto-select nozzles of this pump
                      const pNozzles = (p.nozzles || []).map((n) => n.id);
                      if (pNozzles.length >= 2) {
                        setSelectedNozzleIds(pNozzles);
                      }
                    }}
                    disabled={editingAttr?.status === 'CLOSED' || editingAttr?.status === 'LOCKED'}
                  >
                    <Text style={[styles.pillBtnText, selectedPumpId === p.id && styles.pillBtnTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

          {/* ── Section 3: Reconciliation Summary Box ──────────────────────── */}
          <View style={styles.settlementBox}>
            <Text style={styles.settlementTitle}>SHIFT SUMMARY</Text>

            <View style={styles.settlementRows}>
              <View style={styles.settleRow}>
                <Text style={styles.settleLabel}>Total Fuel Sales :</Text>
                <Text style={styles.settleVal}>{formatCurrency(currentShift.totalSalesAmount)}</Text>
              </View>

              <View style={styles.settleRow}>
                <Text style={styles.settleLabel}>Less Expenses Paid :</Text>
                <Text style={styles.settleVal}>- {formatCurrency(currentShift.expensesDeducted)}</Text>
              </View>

              <View style={styles.settleRow}>
                <Text style={styles.settleLabel}>Net Expected Settlement :</Text>
                <Text style={[styles.settleVal, { color: '#007DC6' }]}>
                  {formatCurrency(currentShift.totalSalesAmount - (currentShift.expensesDeducted || 0))}
                </Text>
              </View>

              <View style={styles.settleRow}>
                <Text style={styles.settleLabel}>Total Collections Counted :</Text>
                <Text style={styles.settleVal}>{formatCurrency(currentShift.totalCollected)}</Text>
              </View>

              <View style={[styles.settleRow, styles.settleRowHighlight]}>
                <Text style={styles.settleLabelBold}>HANDOVER BALANCE :</Text>
                <Text
                  style={[
                    styles.settleValBold,
                    {
                      color:
                        currentShift.shortageOrExcess === 0
                          ? '#16A34A'
                          : currentShift.shortageOrExcess < 0
                          ? '#DC2626'
                          : '#D97706',
                    },
                  ]}
                >
                  {currentShift.shortageOrExcess === 0
                    ? '₹0.00 (Zero Variance ✓)'
                    : currentShift.shortageOrExcess < 0
                    ? `- ${formatCurrency(Math.abs(currentShift.shortageOrExcess))} (Shortage)`
                    : `+ ${formatCurrency(currentShift.shortageOrExcess)} (Excess)`}
                </Text>
              </View>

            {/* <View style={styles.verificationBar}>
              <CheckCircle
                size={16}
                color={currentShift.shortageOrExcess === 0 ? '#16A34A' : '#D97706'}
              />
              <Text style={styles.verificationText}>
                {currentShift.shortageOrExcess === 0
                  ? 'All sales & collections tally with zero variance'
                  : currentShift.shortageOrExcess < 0
                  ? `Shift collection has a shortage of ${formatCurrency(Math.abs(currentShift.shortageOrExcess))}`
                  : `Shift collection has an excess of ${formatCurrency(currentShift.shortageOrExcess)}`}
              </Text>
            </View> */}
          </View>
        </>
      ) : null}

      {/* ── Open Shift Modal ─────────────────────────────────────────────── */}
      <Modal visible={showOpenModal} transparent animationType="slide" onRequestClose={() => setShowOpenModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Open New Shift</Text>
              <TouchableOpacity onPress={() => setShowOpenModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
                {/* Shift Date */}
                <DatePickerInput
                  label="Shift Date *"
                  value={shiftDate}
                  onChange={(d) => setShiftDate(d)}
                  maxDate={getTodayDateString()}
                />

                {/* Select Pump */}
                <DropdownPicker
                  label="Pump Dispenser *"
                  placeholder="Select Pump Dispenser..."
                  options={pumps.map((pump) => ({
                    label: `Pump ${pump.pumpNo}`,
                    value: pump.id,
                    subtitle: `${pump.nozzles.length} nozzle(s) configured`,
                    inactive: pump.status === 'INACTIVE' || pump.status === 'MAINTENANCE',
                  } as DropdownOption))}
                  value={selectedPumpId}
                  onChange={(v) => setSelectedPumpId(v)}
                />

                {/* Pump Nozzle Starting Meter Preview */}
                {selectedPumpForModal && (
                  <View style={styles.nozzlePreviewCard}>
                    <Text style={styles.nozzlePreviewTitle}>
                      Starting Nozzle Meters for Pump {selectedPumpForModal.pumpNo}:
                    </Text>
                    {selectedPumpForModal.nozzles.map((n) => {
                      const prod = products.find((p) => p.id === n.productId);
                      return (
                        <View key={n.id} style={styles.nozzlePreviewRow}>
                          <Text style={styles.nozzlePreviewName}>
                            Nozzle {n.nozzleNo} ({n.productName || prod?.name})
                          </Text>
                          <Text style={styles.nozzlePreviewMeter}>
                            Opening: {Math.round(Number(n.currentMeterReading || 0))} L
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Shift Type */}
                <DropdownPicker
                  label="Shift Type *"
                  placeholder="Select Shift Type..."
                  options={shiftTypeOptions.length > 0 ? shiftTypeOptions : [
                    { label: 'Morning Shift', value: 'Morning', subtitle: '06:00 AM - 02:00 PM' },
                    { label: 'Evening Shift', value: 'Evening', subtitle: '02:00 PM - 10:00 PM' },
                    { label: 'Night Shift', value: 'Night', subtitle: '10:00 PM - 06:00 AM' },
                    { label: 'Full Day Shift', value: 'Full Day', subtitle: '24 Hours / Extended' },
                  ]}
                  value={selectedShiftType}
                  onChange={(v) => setSelectedShiftType(v as ShiftType)}
                  allowOther
                  onSaveNew={(v) => setSelectedShiftType(v as ShiftType)}
                />

                {/* Select Shift Operator */}
                <DropdownPicker
                  label="Shift Operator *"
                  placeholder="Select Shift Operator..."
                  options={operators.map((op) => ({
                    label: op.name,
                    value: op.id,
                    inactive: !op.active,
                  } as DropdownOption))}
                  value={selectedOperatorId}
                  onChange={(v) => setSelectedOperatorId(v)}
                  allowOther
                  onSaveNew={(v) => setSelectedOperatorId(v)}
                />

                {/* Relief Operator (Optional) */}
                <DropdownPicker
                  label="Reliever Operator"
                  placeholder="Select Relief Operator..."
                  options={[
                    { label: 'None (No Relief)', value: '' },
                    ...operators.map((op) => ({
                      label: op.name,
                      value: op.id,
                      inactive: !op.active,
                    } as DropdownOption)),
                  ]}
                  value={reliefOperatorId}
                  onChange={(v) => setReliefOperatorId(v)}
                  allowOther
                  onSaveNew={(v) => setReliefOperatorId(v)}
                />

                {/* Opening Cash Float */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Opening Cash (₹)</Text>
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

                    {/* Dynamic Payment Channels from Master Table (Swiping Machine, Gpay, PhonePe, Paytm, Fleet Card, etc.) */}
                    {activeChannels.map((ch) => (
                      <View key={ch.code || String(ch.id)} style={styles.formCol}>
                        <Text style={styles.inputLabel}>{ch.name || ch.code} (₹)</Text>
                        <TextInput
                          style={[styles.moneyInput, isLocked && { backgroundColor: '#F1F5F9', color: '#64748B' }]}
                          keyboardType="numeric"
                          value={getChannel(ch.code)}
                          onChangeText={(text) => setChannel(ch.code, text)}
                          placeholder="0.00"
                          placeholderTextColor={colors.textMuted}
                          editable={!isLocked}
                        />
                      </View>
                    ))}

                    <View style={styles.formCol}>
                      <Text style={styles.inputLabel}>Credit Sales (₹)</Text>
                      <TextInput
                        style={[styles.moneyInput, isLocked && { backgroundColor: '#F1F5F9', color: '#64748B' }]}
                        keyboardType="numeric"
                        value={creditSales}
                        onChangeText={setCreditSales}
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                        editable={!isLocked}
                      />
                    </View>

                    <View style={styles.formCol}>
                      <Text style={styles.inputLabel}>Advance / Bata (₹)</Text>
                      <TextInput
                        style={[styles.moneyInput, isLocked && { backgroundColor: '#F1F5F9', color: '#64748B' }]}
                        keyboardType="numeric"
                        value={advancePayment}
                        onChangeText={setAdvancePayment}
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                        editable={!isLocked}
                      />
                    </View>
                  </View>
                );
              })()}

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
                  <Text style={styles.modalCancelBtnText}>
                    {editingAttr?.status === 'CLOSED' || editingAttr?.status === 'LOCKED' ? 'Close' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

                {!(editingAttr?.status === 'CLOSED' || editingAttr?.status === 'LOCKED') && (
                  <>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' }]}
                      onPress={() => handleSave(false)}
                      disabled={isSaving}
                    >
                      <Save size={15} color="#1F2937" />
                      <Text style={styles.primaryBtnText}>
                        {isSaving ? 'Saving…' : 'Save (Open Shift)'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: '#B45309' }]}
                      onPress={() => {
                        Alert.alert(
                          'Close & Lock Shift',
                          'Are you sure you want to finalize and lock this shift session? Details will become non-editable for reconciliation.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Close & Lock', style: 'destructive', onPress: () => handleSave(true) },
                          ]
                        );
                      }}
                      disabled={isSaving}
                    >
                      <Lock size={15} color="#FFFFFF" />
                      <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>
                        🔒 Close & Lock Shift
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: '#7F9FE0',
    ...(Platform.OS === 'web'
      ? { backgroundImage: 'linear-gradient(90deg, #7F9FE0 0%, #8FD3C9 100%)' }
      : {}),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  dateInput: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    width: 90,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  primaryBtnText: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: '700',
  },

  kpiStrip: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 6,
    backgroundColor: 'transparent',
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 105,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF1F5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  kpiSub: {
    fontSize: 9,
    color: '#9AA5B1',
    marginTop: 1,
  },
  viewToggleBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 14,
    marginBottom: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    gap: 6,
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
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
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
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  toggleBtnTextActive: {
    color: '#FFF',
  },
  contentScroll: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  autoFetchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  autoFetchTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  autoFetchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  autoFetchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  autoFetchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  autoFetchCol: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  autoFetchColLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 1,
  },
  autoFetchColVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  autoFetchColSub: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
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
  nozzleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  nozzleChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  nozzleChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  nozzleChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  nozzleChipTextSelected: {
    color: '#FFFFFF',
  },
  nozzleWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  nozzleWarningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  lockedSessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  lockedSessionBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  lockedSessionBannerSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  unlockQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  unlockQuickBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
});

const tallyStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 2,
    paddingBottom: 20,
  },
  grandTotalRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  grandTotalLabel: {
    color: '#6F7BF5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  grandTotal: {
    color: '#0D63B8',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
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


