import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import {
  Fuel,
  PlusCircle,
  CheckCircle,
  CheckCircle2,
  Play,
  Calculator,
  Printer,
  Sparkles,
  AlertCircle,
  X,
  FileCheck,
  Pencil,
  Trash2,
  Save,
  Gauge,
  Layers,
  ArrowRight,
  ShieldAlert,
  Droplets,
  DollarSign,
} from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { ThermalReceiptModal, ThermalReceiptData } from '../components/ThermalReceiptModal';
import { colors } from '../theme/colors';
import { formatCurrency, formatLitres, formatDate, getTodayDateString } from '../utils/formatters';
import { Shift, ShiftType, MeterReadingEntry, PaymentCollectionBreakdown } from '../types';
import { DropdownPicker, DropdownOption } from '../components/DropdownPicker';
import { DatePickerInput } from '../components/DatePickerInput';
import { NoDataView } from '../components/NoDataView';
import { useShiftTypes } from '../hooks/useMasters';

export const ShiftOperationsScreen: React.FC = () => {
  const {
    pumps,
    operators,
    shifts,
    products,
    openNewShift,
    saveShiftDraft,
    closeShift,
    updateShift,
    deleteShift,
    role,
  } = useBunk();

  // ── Master table lookups ──────────────────────────────────────────
  const { options: shiftTypeOptions } = useShiftTypes();

  // ── Date & Pump Filter State ───────────────────────────────────────
  const [selectedPumpTab, setSelectedPumpTab] = useState<string>('ALL');
  const [selectedShiftDate, setSelectedShiftDate] = useState<string>(() => {
    const inProg = shifts.find((s) => s.status === 'IN_PROGRESS');
    if (inProg) return inProg.shiftDate;
    if (shifts.length > 0) return shifts[0].shiftDate;
    return getTodayDateString();
  });

  // Shifts matching selected date and selected pump
  const shiftsOnDate = useMemo(() => {
    return shifts.filter((s) => {
      if (selectedPumpTab !== 'ALL' && s.pumpId !== selectedPumpTab) {
        return false;
      }
      return s.shiftDate === selectedShiftDate;
    });
  }, [shifts, selectedPumpTab, selectedShiftDate]);

  // Currently Active Selected Shift
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);

  // Keep currentShift pointing to the active shift or first shift of the selected date
  useEffect(() => {
    if (shiftsOnDate.length > 0) {
      if (!currentShift || !shiftsOnDate.some((s) => s.id === currentShift.id)) {
        const inProg = shiftsOnDate.find((s) => s.status === 'IN_PROGRESS');
        setCurrentShift(inProg || shiftsOnDate[0]);
      }
    } else {
      setCurrentShift(null);
    }
  }, [shiftsOnDate, selectedShiftDate]);

  // ── Open Shift Modal State ──────────────────────────────────────────
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [selectedPumpId, setSelectedPumpId] = useState<string>(pumps[0]?.id || '');
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(operators[0]?.id || '');
  const [selectedShiftType, setSelectedShiftType] = useState<ShiftType>('Morning');
  const [shiftDate, setShiftDate] = useState(getTodayDateString());
  const [reliefOperatorId, setReliefOperatorId] = useState<string>('');
  const [openingCashFloat, setOpeningCashFloat] = useState('0');

  // Pre-select pump when opening modal if a specific pump tab is selected
  useEffect(() => {
    if (selectedPumpTab !== 'ALL' && pumps.some((p) => p.id === selectedPumpTab)) {
      setSelectedPumpId(selectedPumpTab);
    } else if ((!selectedPumpId || !pumps.some((p) => p.id === selectedPumpId)) && pumps.length > 0) {
      setSelectedPumpId(pumps[0].id);
    }
  }, [selectedPumpTab, pumps]);

  useEffect(() => {
    if ((!selectedOperatorId || !operators.some((o) => o.id === selectedOperatorId)) && operators.length > 0) {
      setSelectedOperatorId(operators[0].id);
    }
  }, [operators]);

  // ── Edit Metadata Modal State ───────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOperatorId, setEditOperatorId] = useState('');
  const [editShiftType, setEditShiftType] = useState<ShiftType>('Morning');
  const [editShiftDate, setEditShiftDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // ── Raw String Buffers for Smooth Typing ────────────────────────────
  // Keeps typed text (e.g. "120.", "", "0") stable while typing
  const [readingBuffers, setReadingBuffers] = useState<
    Record<string, { closing: string; opening: string; testing: string }>
  >({});

  // Sync buffers when a different shift is loaded
  useEffect(() => {
    if (!currentShift) {
      setReadingBuffers({});
      return;
    }
    const newBuffers: Record<string, { closing: string; opening: string; testing: string }> = {};
    currentShift.meterReadings.forEach((r) => {
      newBuffers[r.nozzleId] = {
        opening: String(r.openingReading ?? 0),
        closing: String(r.closingReading ?? r.openingReading ?? 0),
        testing: String(r.testingLitres ?? 0),
      };
    });
    setReadingBuffers(newBuffers);
  }, [currentShift?.id]);

  // Saving / Draft status indicator
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSavedToast, setDraftSavedToast] = useState(false);

  // ── Dispenser Simulation Modal ──────────────────────────────────────
  const [simNozzleId, setSimNozzleId] = useState<string | null>(null);
  const [simLitresToAdd, setSimLitresToAdd] = useState<string>('20.00');

  // ── Thermal Receipt Modal ───────────────────────────────────────────
  const [receiptData, setReceiptData] = useState<ThermalReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const isClosed = currentShift?.status === 'CLOSED';

  // ── Handle Typing in Meter Readings ──────────────────────────────────
  const handleReadingTextChange = (
    nozzleId: string,
    field: 'closing' | 'testing' | 'opening',
    rawVal: string
  ) => {
    if (!currentShift) return;

    // 1. Update text buffer immediately for responsive UI
    setReadingBuffers((prev) => ({
      ...prev,
      [nozzleId]: {
        ...prev[nozzleId],
        [field]: rawVal,
      },
    }));

    // 2. Parse numeric value and update currentShift calculations live
    const numVal = parseFloat(rawVal) || 0;
    const shiftPump = pumps.find((p) => p.id === currentShift.pumpId);
    const baseReadings: MeterReadingEntry[] =
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

    const updatedReadings = baseReadings.map((r) => {
      if (r.nozzleId === nozzleId) {
        const opening = field === 'opening' ? numVal : r.openingReading;
        const closing = field === 'closing' ? numVal : (r.closingReading ?? r.openingReading);
        const testing = field === 'testing' ? numVal : r.testingLitres;
        const sold = Math.max(0, closing - opening - testing);
        const gross = sold * r.rate;

        return {
          ...r,
          [field === 'closing' ? 'closingReading' : field === 'testing' ? 'testingLitres' : 'openingReading']: numVal,
          litresSold: Math.round(sold * 100) / 100,
          grossAmount: Math.round(gross * 100) / 100,
        };
      }
      return r;
    });

    const totalLitres = updatedReadings.reduce((sum, r) => sum + (r.litresSold || 0), 0);
    const totalAmount = updatedReadings.reduce((sum, r) => sum + (r.grossAmount || 0), 0);
    const netExpected = totalAmount - (currentShift.expensesDeducted || 0);
    const shortageOrExcess = (currentShift.totalCollected || 0) - netExpected;

    const updatedShift: Shift = {
      ...currentShift,
      meterReadings: updatedReadings,
      totalLitresSold: Math.round(totalLitres * 100) / 100,
      totalSalesAmount: Math.round(totalAmount * 100) / 100,
      shortageOrExcess: Math.round(shortageOrExcess * 100) / 100,
    };

    setCurrentShift(updatedShift);
  };

  // ── Explicit Save Draft ──────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!currentShift || isClosed) return;
    try {
      setIsSavingDraft(true);
      const saved = await saveShiftDraft(currentShift);
      if (saved) {
        setCurrentShift(saved);
      }
      setDraftSavedToast(true);
      setTimeout(() => setDraftSavedToast(false), 2500);
    } catch (e: any) {
      alert(`Failed to save draft: ${e.message}`);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // ── Handle Payment Collections Change ────────────────────────────────
  const handleCollectionChange = (mode: keyof PaymentCollectionBreakdown, val: string) => {
    if (!currentShift) return;
    const numVal = parseFloat(val) || 0;

    const updatedCollections = {
      ...currentShift.collections,
      [mode]: numVal,
    };

    const totalCollected =
      (updatedCollections.cash || 0) +
      (updatedCollections.card || 0) +
      (updatedCollections.upiGpay || 0) +
      (updatedCollections.fleetCard || 0) +
      (updatedCollections.creditSales || 0) +
      (updatedCollections.cheque || 0);

    const netExpected = currentShift.totalSalesAmount - (currentShift.expensesDeducted || 0);
    const shortageOrExcess = totalCollected - netExpected;

    const updatedShift: Shift = {
      ...currentShift,
      collections: updatedCollections,
      totalCollected: Math.round(totalCollected * 100) / 100,
      shortageOrExcess: Math.round(shortageOrExcess * 100) / 100,
    };

    setCurrentShift(updatedShift);
  };

  // ── Handle Expenses Deducted Change ──────────────────────────────────
  const handleExpenseDeductionChange = (val: string) => {
    if (!currentShift) return;
    const numVal = parseFloat(val) || 0;
    const netExpected = currentShift.totalSalesAmount - numVal;
    const shortageOrExcess = currentShift.totalCollected - netExpected;

    const updatedShift: Shift = {
      ...currentShift,
      expensesDeducted: numVal,
      shortageOrExcess: Math.round(shortageOrExcess * 100) / 100,
    };

    setCurrentShift(updatedShift);
  };

  // ── Open Shift ───────────────────────────────────────────────────────
  const handleConfirmOpenShift = async () => {
    const pumpIdToUse = selectedPumpId || pumps[0]?.id;
    const operatorIdToUse = selectedOperatorId || operators[0]?.id;

    if (!pumpIdToUse) {
      alert('Please configure at least one pump dispenser before opening a shift.');
      return;
    }
    if (!operatorIdToUse) {
      alert('Please configure at least one shift operator before opening a shift.');
      return;
    }

    try {
      const newShift = await openNewShift({
        pumpId: pumpIdToUse,
        operatorId: operatorIdToUse,
        shiftType: selectedShiftType || 'Morning',
        shiftDate: shiftDate || getTodayDateString(),
      });
      setSelectedPumpTab(pumpIdToUse);
      setCurrentShift(newShift);
      setShowOpenModal(false);
    } catch (e: any) {
      alert(e.message || 'Failed to open shift. Please check dispenser and operator configuration.');
    }
  };

  // ── Edit Shift Metadata ──────────────────────────────────────────────
  const handleOpenEditModal = () => {
    if (!currentShift) return;
    setEditOperatorId(currentShift.operatorId);
    setEditShiftType(currentShift.shiftType);
    setEditShiftDate(currentShift.shiftDate);
    setEditNotes(currentShift.notes || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!currentShift) return;
    await updateShift(currentShift.id, {
      operatorId: editOperatorId,
      shiftType: editShiftType,
      shiftDate: editShiftDate,
      notes: editNotes,
    });
    setShowEditModal(false);
  };

  // ── Delete Shift ─────────────────────────────────────────────────────
  const handleDeleteShift = async () => {
    if (!currentShift) return;
    if (window.confirm(`Delete shift ${currentShift.shiftNo}? This will permanently remove its records.`)) {
      await deleteShift(currentShift.id);
      setCurrentShift(null);
    }
  };

  // ── Close Shift ──────────────────────────────────────────────────────
  const handleFinalCloseShift = async () => {
    if (!currentShift) return;

    // Validate closing >= opening
    for (const r of currentShift.meterReadings) {
      const closing = r.closingReading ?? r.openingReading;
      if (closing < r.openingReading) {
        alert(
          `Closing reading (${closing}) for Nozzle #${r.nozzleNo} (${r.productName}) cannot be less than opening reading (${r.openingReading}).`
        );
        return;
      }
    }

    if (
      window.confirm(
        `Confirm Closing Shift ${currentShift.shiftNo}?\n\n` +
          `• Pump Dispenser: Pump #${currentShift.pumpNo}\n` +
          `• Total Litres Sold: ${formatLitres(currentShift.totalLitresSold)}\n` +
          `• Gross Fuel Turnover: ${formatCurrency(currentShift.totalSalesAmount)}\n` +
          `• Net Cash Handover / Variance: ${formatCurrency(currentShift.shortageOrExcess)}\n\n` +
          `This will synchronize live nozzle meters and freeze shift reconciliation.`
      )
    ) {
      try {
        const closed = await closeShift(currentShift.id, currentShift, currentShift.notes);
        if (closed) setCurrentShift(closed);
        generateThermalReceipt(currentShift);
      } catch (e: any) {
        alert(`Error closing shift: ${e.message}`);
      }
    }
  };

  // ── Dispenser simulator pulse ────────────────────────────────────────
  const handleSimulateDispense = () => {
    if (!currentShift || !simNozzleId) return;
    const litres = parseFloat(simLitresToAdd) || 0;
    const reading = currentShift.meterReadings.find((r) => r.nozzleId === simNozzleId);
    if (!reading) return;

    const currentClosing = reading.closingReading ?? reading.openingReading;
    const newClosing = Math.round((currentClosing + litres) * 100) / 100;

    handleReadingTextChange(simNozzleId, 'closing', String(newClosing));
    setSimNozzleId(null);
  };

  // ── Thermal Receipt Generator ────────────────────────────────────────
  const generateThermalReceipt = (shift: Shift) => {
    const data: ThermalReceiptData = {
      title: 'SHIFT SETTLEMENT VOUCHER',
      receiptNo: shift.shiftNo,
      dateStr: shift.shiftDate,
      operatorName: shift.operatorName,
      pumpNo: shift.pumpNo,
      items: shift.meterReadings.map((r) => ({
        name: `${r.productName} (Noz #${r.nozzleNo})`,
        qty: `${formatLitres(r.litresSold)}`,
        rate: `₹${r.rate}`,
        amount: r.grossAmount || 0,
      })),
      subtotal: shift.totalSalesAmount,
      expensesDeducted: shift.expensesDeducted,
      netPayable: shift.totalCollected,
      paymentMode: `Cash: ${formatCurrency(shift.collections.cash)} | UPI: ${formatCurrency(shift.collections.upiGpay)} | Card: ${formatCurrency(shift.collections.card)} | Credit: ${formatCurrency(shift.collections.creditSales)}`,
      remarks:
        shift.shortageOrExcess === 0
          ? 'Reconciled Perfectly (Zero Variance)'
          : shift.shortageOrExcess < 0
          ? `Shortage of ${formatCurrency(Math.abs(shift.shortageOrExcess))} by Operator`
          : `Excess of ${formatCurrency(shift.shortageOrExcess)} in collection`,
      footerNote: 'OFFICIAL SHIFT CLOSING DOCUMENT • AUDITED',
    };
    setReceiptData(data);
    setShowReceipt(true);
  };

  const selectedPumpForModal = pumps.find((p) => p.id === selectedPumpId);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Top Header Bar ───────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.screenTitle}>Shift Operations & Nozzle Reconciliation</Text>
            <View style={styles.statusBadgeLive}>
              <Text style={styles.statusBadgeLiveText}>Live Dispatch</Text>
            </View>
          </View>
          <Text style={styles.screenSub}>
            Individual shift sessions, nozzle meter totalizers, and payment settlement per pump island
          </Text>
        </View>

        <View style={styles.headerButtons}>
          {currentShift && !isClosed && (
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
          )}

          <TouchableOpacity
            style={styles.openShiftBtn}
            onPress={() => setShowOpenModal(true)}
            activeOpacity={0.8}
          >
            <PlusCircle size={15} color="#FFFFFF" />
            <Text style={styles.openShiftBtnText}>Open New Shift</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Pump Island Filter Tabs ───────────────────────────────────────── */}
      <View style={styles.pumpFilterCard}>
        <View style={styles.pumpFilterHeader}>
          <Gauge size={15} color="#007DC6" />
          <Text style={styles.pumpFilterTitle}>SELECT PUMP DISPENSER ISLAND:</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pumpTabsScroll}>
          <TouchableOpacity
            style={[styles.pumpTabPill, selectedPumpTab === 'ALL' && styles.pumpTabPillActive]}
            onPress={() => setSelectedPumpTab('ALL')}
            activeOpacity={0.7}
          >
            <Text style={[styles.pumpTabText, selectedPumpTab === 'ALL' && styles.pumpTabTextActive]}>
              All Islands ({shifts.length})
            </Text>
          </TouchableOpacity>

          {pumps.map((pump) => {
            const pumpShiftCount = shifts.filter((s) => s.pumpId === pump.id).length;
            const hasActiveShift = shifts.some((s) => s.pumpId === pump.id && s.status === 'IN_PROGRESS');

            return (
              <TouchableOpacity
                key={pump.id}
                style={[
                  styles.pumpTabPill,
                  selectedPumpTab === pump.id && styles.pumpTabPillActive,
                  hasActiveShift && styles.pumpTabHasActive,
                ]}
                onPress={() => setSelectedPumpTab(pump.id)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {hasActiveShift && <View style={styles.activeDot} />}
                  <Text
                    style={[
                      styles.pumpTabText,
                      selectedPumpTab === pump.id && styles.pumpTabTextActive,
                    ]}
                  >
                    Pump #{pump.pumpNo} ({pump.name}) • {pumpShiftCount}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Direct Shift Date & Day-Shift Selector ─────────────────────── */}
      <View style={styles.shiftListBar}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={styles.shiftBarLabel}>
              DATE FOR {selectedPumpTab === 'ALL' ? 'ALL PUMPS' : `PUMP #${pumps.find((p) => p.id === selectedPumpTab)?.pumpNo || ''}`}:
            </Text>

            <View style={{ minWidth: 200 }}>
              <DatePickerInput
                value={selectedShiftDate}
                onChange={(d) => setSelectedShiftDate(d)}
                maxDate={getTodayDateString()}
              />
            </View>
          </View>

          {/* Multiple Shifts on this date selector */}
          {shiftsOnDate.length > 1 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>SHIFTS ON THIS DATE:</Text>
              {shiftsOnDate.map((s) => {
                const isSelected = currentShift?.id === s.id;
                const isInProgress = s.status === 'IN_PROGRESS';
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.shiftPill,
                      isSelected && styles.shiftPillActive,
                      isInProgress && styles.shiftPillInProgress,
                    ]}
                    onPress={() => setCurrentShift(s)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.statusDot, { backgroundColor: isInProgress ? '#F59E0B' : '#10B981' }]} />
                    <View>
                      <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                        Pump #{s.pumpNo} • {s.shiftType}
                      </Text>
                      <Text style={styles.pillSubText}>{s.shiftNo}</Text>
                    </View>
                    <View
                      style={[
                        styles.pillStatusTag,
                        { backgroundColor: isInProgress ? '#FEF3C7' : '#D1FAE5' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillStatusTagText,
                          { color: isInProgress ? '#B45309' : '#047857' },
                        ]}
                      >
                        {isInProgress ? 'ACTIVE' : 'CLOSED'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {shiftsOnDate.length === 0 && (
          <NoDataView
            title="No Shifts Found"
            selectedDate={selectedShiftDate}
            message={`No shift records found for ${formatDate(selectedShiftDate)} on the selected pump island.`}
            onResetDate={() => setSelectedShiftDate(getTodayDateString())}
            actionLabel="Open New Shift"
            onAction={() => {
              setShiftDate(selectedShiftDate);
              setShowOpenModal(true);
            }}
          />
        )}
      </View>

      {currentShift ? (
        <>
          {/* ── Shift Metadata Card ────────────────────────────────────────── */}
          <View style={styles.shiftMetaCard}>
            <View style={styles.metaCardTop}>
              <View style={styles.metaMain}>
                <View style={styles.metaBadgeRow}>
                  <Text style={styles.shiftIdText}>{currentShift.shiftNo}</Text>
                  <View
                    style={[
                      styles.badgeStatus,
                      { backgroundColor: isClosed ? '#DEF7EC' : '#FEF08A' },
                    ]}
                  >
                    <Text style={[styles.badgeStatusText, { color: isClosed ? '#03543F' : '#854D0E' }]}>
                      {isClosed ? 'CLOSED / AUDITED' : 'IN PROGRESS (OPEN)'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.metaSub}>
                  Pump #{currentShift.pumpNo} Dispenser • Operator: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{currentShift.operatorName}</Text> • Date: {formatDate(currentShift.shiftDate)} ({currentShift.shiftType} Shift)
                </Text>
              </View>

              <View style={styles.metaActions}>
                <TouchableOpacity
                  style={styles.printBtn}
                  onPress={() => generateThermalReceipt(currentShift)}
                  activeOpacity={0.8}
                >
                  <Printer size={14} color="#0F172A" />
                  <Text style={styles.printBtnText}>Print Slip</Text>
                </TouchableOpacity>

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
            </View>

            {/* Interconnection Info Ribbon */}
            
          </View>

          {/* ── Section 1: Nozzle Meter Readings Matrix ────────────────────── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionTitleHeader}>
              <View style={styles.titleIconRow}>
                <Calculator size={18} color="#007DC6" />
                <Text style={styles.sectionTitle}>1. Nozzle Meter Readings & Sales Calculation</Text>
              </View>
              {!isClosed && (
                <Text style={styles.hintTypableText}>
                  ✏️ Type closing meter & testing litres freely below
                </Text>
              )}
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
                        No nozzles configured for Pump #{currentShift.pumpNo}. Please configure nozzles in Masters.
                      </Text>
                    </View>
                  );
                }

                return readingsToDisplay.map((reading) => {
                  const prod = products.find((p) => p.name === reading.productName || p.code === reading.fuelCode);
                  const prodColor = prod?.color || '#007DC6';
                  const sold = reading.litresSold || 0;
                  const amount = reading.grossAmount || 0;

                  const currentBuffer = readingBuffers[reading.nozzleId] || {
                    opening: String(reading.openingReading ?? 0),
                    closing: String(reading.closingReading ?? reading.openingReading ?? 0),
                    testing: String(reading.testingLitres ?? 0),
                  };

                  return (
                    <View key={reading.nozzleId} style={[styles.readingCard, { borderLeftColor: prodColor, borderLeftWidth: 4 }]}>
                      {/* Header */}
                      <View style={styles.readingCardHeader}>
                        <View style={styles.readingTitleLeft}>
                          <View style={[styles.prodDot, { backgroundColor: prodColor }]} />
                          <Text style={styles.readingProductName}>
                            Nozzle #{reading.nozzleNo} — {reading.productName} ({reading.fuelCode})
                          </Text>
                        </View>
                        <View style={[styles.rateBadge, { borderColor: prodColor + '40' }]}>
                          <Text style={[styles.rateBadgeText, { color: '#0F172A' }]}>
                            Rate: <Text style={{ fontWeight: '800', color: prodColor }}>{formatCurrency(reading.rate)}/L</Text>
                          </Text>
                        </View>
                      </View>

                      {/* Inputs Row */}
                      <View style={styles.inputsGrid}>
                        {/* Opening Reading */}
                        <View style={styles.inputCol}>
                          <Text style={styles.inputLabel}>Opening Meter (L)</Text>
                          <TextInput
                            style={[styles.inputField, styles.disabledInput]}
                            value={currentBuffer.opening}
                            editable={!isClosed && role === 'Owner'}
                            onChangeText={(val) => handleReadingTextChange(reading.nozzleId, 'opening', val)}
                            keyboardType="numeric"
                          />
                          <Text style={styles.inputSubHint}>From master totalizer</Text>
                        </View>

                        {/* Closing Reading */}
                        <View style={[styles.inputCol, { flex: 1.2 }]}>
                          <View style={styles.inputLabelRow}>
                            <Text style={[styles.inputLabel, { color: '#007DC6', fontWeight: '700' }]}>
                              Closing Meter (L) *
                            </Text>
                            {!isClosed && (
                              <TouchableOpacity
                                style={styles.simTriggerBtn}
                                onPress={() => setSimNozzleId(reading.nozzleId)}
                                activeOpacity={0.7}
                              >
                                <Sparkles size={11} color="#007DC6" />
                                <Text style={styles.simTriggerText}>Simulate</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          <TextInput
                            style={[
                              styles.inputField,
                              !isClosed && styles.activeInput,
                              { borderColor: !isClosed ? '#007DC6' : '#CBD5E1' },
                            ]}
                            value={currentBuffer.closing}
                            editable={!isClosed}
                            onChangeText={(val) => handleReadingTextChange(reading.nozzleId, 'closing', val)}
                            placeholder="Enter closing meter"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                          />
                          <Text style={styles.inputSubHint}>Physical dispenser reading</Text>
                        </View>

                        {/* Testing / Calibration */}
                        <View style={[styles.inputCol, { maxWidth: 110 }]}>
                          <Text style={styles.inputLabel}>Testing (L)</Text>
                          <TextInput
                            style={[styles.inputField, !isClosed && styles.activeInput]}
                            value={currentBuffer.testing}
                            editable={!isClosed}
                            onChangeText={(val) => handleReadingTextChange(reading.nozzleId, 'testing', val)}
                            keyboardType="numeric"
                          />
                          <Text style={styles.inputSubHint}>Returned to tank</Text>
                        </View>

                        {/* Calculated Output Box */}
                        <View style={styles.calcOutputCol}>
                          <View style={styles.calcRowItem}>
                            <Text style={styles.calcLabelMini}>NET SOLD:</Text>
                            <Text style={[styles.calcValLitres, { color: prodColor }]}>
                              {formatLitres(sold)}
                            </Text>
                          </View>
                          <View style={styles.calcRowItem}>
                            <Text style={styles.calcLabelMini}>TURNOVER:</Text>
                            <Text style={styles.calcValAmount}>
                              {formatCurrency(amount)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                });
              })()}
            </View>
          </View>

          {/* ── Section 2: Payment Collections & Settlement Split ─────────── */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionTitleHeader}>
              <View style={styles.titleIconRow}>
                <Fuel size={18} color="#16A34A" />
                <Text style={styles.sectionTitle}>2. Payment Collections & Mode Split</Text>
              </View>
            </View>

            <View style={styles.collectionsGrid}>
              {/* Cash Collection */}
              <View style={styles.collectionCol}>
                <Text style={styles.collectionLabel}>Cash Collected (₹)</Text>
                <TextInput
                  style={[styles.collectionInput, { borderColor: '#16A34A' }]}
                  value={String(currentShift.collections.cash || '')}
                  editable={!isClosed}
                  onChangeText={(val) => handleCollectionChange('cash', val)}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              {/* UPI / GPay / PhonePe */}
              <View style={styles.collectionCol}>
                <Text style={styles.collectionLabel}>UPI (GPay / PhonePe) (₹)</Text>
                <TextInput
                  style={[styles.collectionInput, { borderColor: '#8B5CF6' }]}
                  value={String(currentShift.collections.upiGpay || '')}
                  editable={!isClosed}
                  onChangeText={(val) => handleCollectionChange('upiGpay', val)}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              {/* POS Card Swipes */}
              <View style={styles.collectionCol}>
                <Text style={styles.collectionLabel}>Card / POS Swipe (₹)</Text>
                <TextInput
                  style={[styles.collectionInput, { borderColor: '#0284C7' }]}
                  value={String(currentShift.collections.card || '')}
                  editable={!isClosed}
                  onChangeText={(val) => handleCollectionChange('card', val)}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              {/* Credit Fuel Chits Issued */}
              <View style={styles.collectionCol}>
                <Text style={styles.collectionLabel}>Credit Chits Issued (₹)</Text>
                <TextInput
                  style={[styles.collectionInput, { borderColor: '#EA580C' }]}
                  value={String(currentShift.collections.creditSales || '')}
                  editable={!isClosed}
                  onChangeText={(val) => handleCollectionChange('creditSales', val)}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              {/* Fleet Card / Cheque */}
              <View style={styles.collectionCol}>
                <Text style={styles.collectionLabel}>Fleet Card / Cheques (₹)</Text>
                <TextInput
                  style={styles.collectionInput}
                  value={String(currentShift.collections.fleetCard || '')}
                  editable={!isClosed}
                  onChangeText={(val) => handleCollectionChange('fleetCard', val)}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              {/* Expenses Deducted from Shift Cash */}
              <View style={styles.collectionCol}>
                <Text style={styles.collectionLabel}>Shift Expenses Deducted (₹)</Text>
                <TextInput
                  style={[styles.collectionInput, { borderColor: '#DC2626' }]}
                  value={String(currentShift.expensesDeducted || '')}
                  editable={!isClosed}
                  onChangeText={handleExpenseDeductionChange}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* ── Section 3: Reconciliation Summary Box ──────────────────────── */}
          <View style={styles.settlementBox}>
            <Text style={styles.settlementTitle}>SHIFT RECONCILIATION SUMMARY</Text>

            <View style={styles.settlementRows}>
              <View style={styles.settleRow}>
                <Text style={styles.settleLabel}>Total Fuel Sales (A):</Text>
                <Text style={styles.settleVal}>{formatCurrency(currentShift.totalSalesAmount)}</Text>
              </View>

              <View style={styles.settleRow}>
                <Text style={styles.settleLabel}>Less Expenses Paid (B):</Text>
                <Text style={styles.settleVal}>- {formatCurrency(currentShift.expensesDeducted)}</Text>
              </View>

              <View style={styles.settleRow}>
                <Text style={styles.settleLabel}>Net Expected Settlement (A - B):</Text>
                <Text style={[styles.settleVal, { color: '#007DC6' }]}>
                  {formatCurrency(currentShift.totalSalesAmount - (currentShift.expensesDeducted || 0))}
                </Text>
              </View>

              <View style={styles.settleRow}>
                <Text style={styles.settleLabel}>Total Collections Counted (C):</Text>
                <Text style={styles.settleVal}>{formatCurrency(currentShift.totalCollected)}</Text>
              </View>

              <View style={[styles.settleRow, styles.settleRowHighlight]}>
                <Text style={styles.settleLabelBold}>VARIANCE / HANDOVER BALANCE (C - (A - B)):</Text>
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
            </View>

            <View style={styles.verificationBar}>
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
            </View>
          </View>
        </>
      ) : null}

      {/* ── Open Shift Modal ─────────────────────────────────────────────── */}
      <Modal visible={showOpenModal} transparent animationType="slide" onRequestClose={() => setShowOpenModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Open New Shift Handover</Text>
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
                  label="Select Pump Dispenser Island *"
                  placeholder="Select Pump Dispenser..."
                  options={pumps.map((pump) => ({
                    label: `Pump #${pump.pumpNo} — ${pump.name}`,
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
                      Starting Nozzle Meters for Pump #{selectedPumpForModal.pumpNo}:
                    </Text>
                    {selectedPumpForModal.nozzles.map((n) => {
                      const prod = products.find((p) => p.id === n.productId);
                      return (
                        <View key={n.id} style={styles.nozzlePreviewRow}>
                          <Text style={styles.nozzlePreviewName}>
                            Nozzle #{n.nozzleNo} ({n.productName || prod?.name})
                          </Text>
                          <Text style={styles.nozzlePreviewMeter}>
                            Opening: {Number(n.currentMeterReading || 0).toFixed(2)} L
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
                  label="Select Shift Operator *"
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
                  label="Relief Operator (Optional)"
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
                  <Text style={styles.formLabel}>Opening Cash Float (₹)</Text>
                  <TextInput
                    style={styles.simInput}
                    value={openingCashFloat}
                    onChangeText={setOpeningCashFloat}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              </ScrollView>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.confirmOpenBtn} onPress={handleConfirmOpenShift} activeOpacity={0.8}>
                <Play size={16} color="#FFFFFF" />
                <Text style={styles.confirmOpenBtnText}>Start Shift & Lock Opening Meters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Simulator Modal ──────────────────────────────────────────────── */}
      <Modal visible={!!simNozzleId} transparent animationType="fade" onRequestClose={() => setSimNozzleId(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 360 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={18} color="#007DC6" />
                <Text style={styles.modalTitle}>Dispenser Simulator</Text>
              </View>
              <TouchableOpacity onPress={() => setSimNozzleId(null)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <View style={styles.modalBody}>
                <Text style={styles.simSub}>
                  Simulate customer fueling to advance the digital totalizer meter in real time:
                </Text>
                <View style={styles.quickLitresRow}>
                  {['10.00', '20.00', '50.00', '100.00'].map((l) => (
                    <TouchableOpacity
                      key={l}
                      style={[styles.quickLitreBtn, simLitresToAdd === l && styles.quickLitreBtnActive]}
                      onPress={() => setSimLitresToAdd(l)}
                    >
                      <Text style={[styles.quickLitreText, simLitresToAdd === l && styles.quickLitreTextActive]}>
                        +{l} L
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.formLabel, { marginTop: 12 }]}>Custom Litres to Dispense</Text>
                <TextInput
                  style={styles.simInput}
                  value={simLitresToAdd}
                  onChangeText={setSimLitresToAdd}
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.dispenseTriggerBtn} onPress={handleSimulateDispense} activeOpacity={0.8}>
                <Fuel size={16} color="#FFFFFF" />
                <Text style={styles.dispenseTriggerText}>Dispense & Update Closing Reading</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Shift Modal ─────────────────────────────────────────────── */}
      <Modal visible={showEditModal} transparent animationType="fade" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Pencil size={18} color="#007DC6" />
                <Text style={styles.modalTitle}>Edit Shift Details</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <View style={styles.modalBody}>
                <DatePickerInput
                  label="Shift Date *"
                  value={editShiftDate}
                  onChange={(d) => setEditShiftDate(d)}
                  maxDate={getTodayDateString()}
                />

                <DropdownPicker
                  label="Shift Type *"
                  placeholder="Select Shift Type..."
                  options={shiftTypeOptions.length > 0 ? shiftTypeOptions : [
                    { label: 'Morning Shift', value: 'Morning' },
                    { label: 'Evening Shift', value: 'Evening' },
                    { label: 'Night Shift', value: 'Night' },
                    { label: 'Full Day Shift', value: 'Full Day' },
                  ]}
                  value={editShiftType}
                  onChange={(v) => setEditShiftType(v as ShiftType)}
                />

                <DropdownPicker
                  label="Operator *"
                  placeholder="Select Operator..."
                  options={operators.map((op) => ({
                    label: op.name,
                    value: op.id,
                  }))}
                  value={editOperatorId}
                  onChange={(v) => setEditOperatorId(v)}
                />

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Notes & Remarks</Text>
                  <TextInput
                    style={[styles.simInput, { height: 60 }]}
                    value={editNotes}
                    onChangeText={setEditNotes}
                    multiline
                    placeholder="Special remarks or shift notes"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.confirmOpenBtn} onPress={handleSaveEdit} activeOpacity={0.8}>
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.confirmOpenBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Thermal Receipt Modal ────────────────────────────────────────── */}
      {receiptData && (
        <ThermalReceiptModal
          visible={showReceipt}
          data={receiptData}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 20,
    gap: 16,
    paddingBottom: 60,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  screenSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadgeLive: {
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeLiveText: {
    color: '#03543F',
    fontSize: 10,
    fontWeight: '800',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveDraftBtnSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  saveDraftBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007DC6',
  },
  openShiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#007DC6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#007DC6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  openShiftBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // ── Pump Filter Card ──────────────────────────────────────────────────
  pumpFilterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  pumpFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pumpFilterTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  pumpTabsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  pumpTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pumpTabPillActive: {
    backgroundColor: '#007DC6',
    borderColor: '#007DC6',
  },
  pumpTabHasActive: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  pumpTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  pumpTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  // ── Shifts List Bar ───────────────────────────────────────────────────
  shiftListBar: {
    gap: 6,
  },
  shiftBarLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  shiftPillsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  shiftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shiftPillActive: {
    borderColor: '#007DC6',
    borderWidth: 2,
    backgroundColor: '#EFF6FF',
  },
  shiftPillInProgress: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  pillTextActive: {
    color: '#007DC6',
  },
  pillSubText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  pillStatusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillStatusTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  noShiftsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    borderRadius: 10,
  },
  noShiftsText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  // ── Shift Metadata Card ───────────────────────────────────────────────
  shiftMetaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  metaCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaMain: {
    gap: 4,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shiftIdText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  badgeStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  metaSub: {
    fontSize: 12,
    color: '#64748B',
  },
  metaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  printBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  editShiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  editShiftBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  deleteShiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  deleteShiftBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeShiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#16A34A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  closeShiftBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  syncRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  syncRibbonText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
    flex: 1,
  },
  // ── Section Container ─────────────────────────────────────────────────
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  sectionTitleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  hintTypableText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007DC6',
  },
  readingsList: {
    gap: 12,
  },
  readingCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  readingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readingTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  readingProductName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  rateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  rateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputsGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  inputCol: {
    flex: 1,
    minWidth: 120,
    gap: 3,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputSubHint: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
  },
  inputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  disabledInput: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  activeInput: {
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
  },
  simTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  simTriggerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#007DC6',
  },
  calcOutputCol: {
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
    gap: 4,
    justifyContent: 'center',
  },
  calcRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  calcLabelMini: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  calcValLitres: {
    fontSize: 12,
    fontWeight: '800',
  },
  calcValAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16A34A',
  },
  emptyNozzleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 8,
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  emptyNozzleText: {
    fontSize: 12,
    color: '#92400E',
  },
  // ── Collections Grid ──────────────────────────────────────────────────
  collectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  collectionCol: {
    flex: 1,
    minWidth: 140,
    gap: 4,
  },
  collectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  collectionInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  // ── Reconciliation Summary ────────────────────────────────────────────
  settlementBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  settlementTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  settlementRows: {
    gap: 8,
  },
  settleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settleRowHighlight: {
    borderBottomWidth: 0,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  settleLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  settleVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  settleLabelBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  settleValBold: {
    fontSize: 14,
    fontWeight: '800',
  },
  verificationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
  },
  verificationText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  // ── Modal Styles ──────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalBody: {
    padding: 20,
    gap: 12,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  formGroup: {
    gap: 4,
    marginBottom: 8,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  simInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  confirmOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007DC6',
    paddingVertical: 12,
    borderRadius: 10,
  },
  confirmOpenBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  nozzlePreviewCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 10,
    gap: 4,
    marginBottom: 8,
  },
  nozzlePreviewTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 2,
  },
  nozzlePreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nozzlePreviewName: {
    fontSize: 11,
    color: '#334155',
  },
  nozzlePreviewMeter: {
    fontSize: 11,
    fontWeight: '700',
    color: '#007DC6',
  },
  simSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  quickLitresRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickLitreBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  quickLitreBtnActive: {
    backgroundColor: '#007DC6',
    borderColor: '#007DC6',
  },
  quickLitreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  quickLitreTextActive: {
    color: '#FFFFFF',
  },
  dispenseTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#007DC6',
    paddingVertical: 12,
    borderRadius: 10,
  },
  dispenseTriggerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
