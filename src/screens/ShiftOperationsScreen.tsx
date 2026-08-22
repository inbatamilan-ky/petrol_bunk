import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import {
  Fuel,
  PlusCircle,
  CheckCircle,
  Play,
  Calculator,
  Printer,
  Sparkles,
  AlertCircle,
  X,
  History,
  FileCheck,
  ChevronDown,
} from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { ThermalReceiptModal, ThermalReceiptData } from '../components/ThermalReceiptModal';
import { colors, typography } from '../theme/colors';
import { formatCurrency, formatLitres, formatMeter, formatDate, getTodayDateString } from '../utils/formatters';
import { Shift, ShiftType, MeterReadingEntry, PaymentCollectionBreakdown } from '../types';
import { DropdownPicker, DropdownOption } from '../components/DropdownPicker';

export const ShiftOperationsScreen: React.FC = () => {
  const {
    pumps,
    operators,
    shifts,
    activeShift,
    openNewShift,
    saveShiftDraft,
    closeShift,
    role,
  } = useBunk();

  // Open Shift Modal State
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [selectedPumpId, setSelectedPumpId] = useState<string>(pumps[0]?.id || '');
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(operators[0]?.id || '');
  const [selectedShiftType, setSelectedShiftType] = useState<ShiftType>('Morning');
  const [shiftDate, setShiftDate] = useState(getTodayDateString());
  const [reliefOperatorId, setReliefOperatorId] = useState<string>('');
  const [openingCashFloat, setOpeningCashFloat] = useState('0');


  // Currently Editing Shift State
  const [currentShift, setCurrentShift] = useState<Shift | null>(activeShift || shifts[0] || null);

  // Dispenser Simulation Modal
  const [simNozzleId, setSimNozzleId] = useState<string | null>(null);
  const [simLitresToAdd, setSimLitresToAdd] = useState<string>('20.00');

  // Thermal Receipt Modal
  const [receiptData, setReceiptData] = useState<ThermalReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (activeShift) {
      setCurrentShift(activeShift);
    } else if (shifts.length > 0) {
      setCurrentShift(shifts[0]);
    }
  }, [activeShift, shifts]);

  // Handle Opening Reading or Closing Reading Change
  const handleReadingChange = (
    nozzleId: string,
    field: 'closingReading' | 'testingLitres' | 'openingReading',
    val: string
  ) => {
    if (!currentShift) return;

    const numVal = parseFloat(val) || 0;
    const updatedReadings = currentShift.meterReadings.map((r) => {
      if (r.nozzleId === nozzleId) {
        const opening = field === 'openingReading' ? numVal : r.openingReading;
        const closing = field === 'closingReading' ? numVal : (r.closingReading ?? r.openingReading);
        const testing = field === 'testingLitres' ? numVal : r.testingLitres;
        const sold = Math.max(0, closing - opening - testing);
        const gross = sold * r.rate;

        return {
          ...r,
          [field]: numVal,
          litresSold: Math.round(sold * 100) / 100,
          grossAmount: Math.round(gross * 100) / 100,
        };
      }
      return r;
    });

    const totalLitres = updatedReadings.reduce((sum, r) => sum + (r.litresSold || 0), 0);
    const totalAmount = updatedReadings.reduce((sum, r) => sum + (r.grossAmount || 0), 0);

    const updatedShift: Shift = {
      ...currentShift,
      meterReadings: updatedReadings,
      totalLitresSold: Math.round(totalLitres * 100) / 100,
      totalSalesAmount: Math.round(totalAmount * 100) / 100,
    };

    setCurrentShift(updatedShift);
    if (currentShift.status === 'IN_PROGRESS') {
      saveShiftDraft(updatedShift);
    }
  };

  // Handle Payment Collections Change
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
    if (currentShift.status === 'IN_PROGRESS') {
      saveShiftDraft(updatedShift);
    }
  };

  // Handle Expenses Deducted Change
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
    if (currentShift.status === 'IN_PROGRESS') {
      saveShiftDraft(updatedShift);
    }
  };

  // Trigger Open Shift
  const handleConfirmOpenShift = async () => {
    const newShift = await openNewShift({
      pumpId: selectedPumpId,
      operatorId: selectedOperatorId,
      shiftType: selectedShiftType,
      shiftDate,
    });
    setCurrentShift(newShift);
    setShowOpenModal(false);
  };


  // Trigger Close Shift
  const handleFinalCloseShift = async () => {
    if (!currentShift) return;
    if (
      window.confirm(
        `Close Shift ${currentShift.shiftNo}?\nTotal Sales: ${formatCurrency(
          currentShift.totalSalesAmount
        )}\nDifference: ${formatCurrency(currentShift.shortageOrExcess)}`
      )
    ) {
      await closeShift(currentShift.id, currentShift, currentShift.notes);
      generateThermalReceipt(currentShift);
    }
  };

  // Dispenser simulator pulse
  const handleSimulateDispense = () => {
    if (!currentShift || !simNozzleId) return;
    const litres = parseFloat(simLitresToAdd) || 0;
    const reading = currentShift.meterReadings.find((r) => r.nozzleId === simNozzleId);
    if (!reading) return;

    const currentClosing = reading.closingReading ?? reading.openingReading;
    const newClosing = Math.round((currentClosing + litres) * 100) / 100;

    handleReadingChange(simNozzleId, 'closingReading', String(newClosing));
    setSimNozzleId(null);
  };

  // Thermal Receipt Generator
  const generateThermalReceipt = (shift: Shift) => {
    const data: ThermalReceiptData = {
      title: 'SHIFT SETTLEMENT VOUCHER',
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

  const isClosed = currentShift?.status === 'CLOSED';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Top Banner & Shift Selector */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.screenTitle}>Shift Operations & Meter Reconciliation</Text>
          <Text style={styles.screenSubtitle}>
            Live nozzle readings, fuel calculations & payment reconciliation
          </Text>
        </View>

        <View style={styles.headerButtons}>
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

      {/* Shifts History Pill Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shiftPillsScroll}>
        {shifts.map((s) => {
          const isSelected = currentShift?.id === s.id;
          const isInProgress = s.status === 'IN_PROGRESS';
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.shiftPill, isSelected && styles.shiftPillActive]}
              onPress={() => setCurrentShift(s)}
              activeOpacity={0.7}
            >
               
              <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                {s.shiftNo} ({s.shiftType})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {currentShift ? (
        <>
          {/* Shift Metadata Card */}
          <View style={styles.shiftMetaCard}>
            <View style={styles.metaCardTop}>
              <View style={styles.metaMain}>
                <View style={styles.metaBadgeRow}>
                  <Text style={styles.shiftIdText}>{currentShift.shiftNo}</Text>
                </View>
                <Text style={styles.metaSub}>
                  Pump #{currentShift.pumpNo} • {currentShift.operatorName} • {formatDate(currentShift.shiftDate)} ({currentShift.shiftType})
                </Text>
              </View>

              <View style={styles.metaActions}>
                <TouchableOpacity
                  style={styles.printBtn}
                  onPress={() => generateThermalReceipt(currentShift)}
                  activeOpacity={0.8}
                >
                  <Printer size={15} color="#000" />
                  <Text style={styles.printBtnText}>Thermal Slip</Text>
                </TouchableOpacity>

                {!isClosed && (
                  <TouchableOpacity
                    style={styles.closeShiftBtn}
                    onPress={handleFinalCloseShift}
                    activeOpacity={0.8}
                  >
                    <FileCheck size={15} color="#FFFFFF" />
                    <Text style={styles.closeShiftBtnText}>Close Shift</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Section 1: Meter Readings Matrix */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionTitleHeader}>
              <View style={styles.titleIconRow}>
                <Calculator size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>1. Nozzle Meter Readings</Text>
              </View>
              <Text style={styles.sectionSub}>Litres Sold = Closing Reading - Opening Reading - Testing</Text>
            </View>

            <View style={styles.readingsList}>
              {currentShift.meterReadings.map((reading) => {
                const sold = reading.litresSold || 0;
                const amount = reading.grossAmount || 0;

                return (
                  <View key={reading.nozzleId} style={styles.readingCard}>
                    {/* Header */}
                    <View style={styles.readingCardHeader}>
                      <View style={styles.readingTitleLeft}>
                         
                        <Text style={styles.readingProductName}>
                          Nozzle #{reading.nozzleNo} - {reading.productName}
                        </Text>
                      </View>
                      <View style={styles.rateBadge}>
                        <Text style={styles.rateBadgeText}>Rate: {formatCurrency(reading.rate)}/L</Text>
                      </View>
                    </View>

                    {/* Inputs Row */}
                    <View style={styles.inputsGrid}>
                      {/* Opening Reading */}
                      <View style={styles.inputCol}>
                        <Text style={styles.inputLabel}>Opening Meter</Text>
                        <TextInput
                          style={[styles.inputField, styles.disabledInput]}
                          value={String(reading.openingReading)}
                          editable={!isClosed && role === 'Owner'}
                          onChangeText={(val) => handleReadingChange(reading.nozzleId, 'openingReading', val)}
                          keyboardType="numeric"
                        />
                      </View>

                      {/* Closing Reading */}
                      <View style={styles.inputCol}>
                        <View style={styles.inputLabelRow}>
                          <Text style={styles.inputLabel}>Closing Meter</Text>
                          {!isClosed && (
                            <TouchableOpacity
                              style={styles.simTriggerBtn}
                              onPress={() => setSimNozzleId(reading.nozzleId)}
                            >
                              <Sparkles size={11} color={colors.accent} />
                              <Text style={styles.simTriggerText}>Simulate Fuel</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <TextInput
                          style={[styles.inputField, !isClosed && styles.activeInput]}
                          value={reading.closingReading !== undefined ? String(reading.closingReading) : ''}
                          editable={!isClosed}
                          onChangeText={(val) => handleReadingChange(reading.nozzleId, 'closingReading', val)}
                          placeholder="Enter closing meter"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                        />
                      </View>

                      {/* Testing / Calibration */}
                      <View style={[styles.inputCol, { maxWidth: 110 }]}>
                        <Text style={styles.inputLabel}>Testing (L)</Text>
                        <TextInput
                          style={[styles.inputField, !isClosed && styles.activeInput]}
                          value={String(reading.testingLitres || 0)}
                          editable={!isClosed}
                          onChangeText={(val) => handleReadingChange(reading.nozzleId, 'testingLitres', val)}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    {/* Calculated Output Box */}
                    <View style={styles.calcOutputBox}>
                      <View style={styles.calcOutputItem}>
                        <Text style={styles.calcLabel}>NET LITRES SOLD</Text>
                        <Text style={styles.calcLitresVal}>{formatLitres(sold)}</Text>
                      </View>
                      <View style={styles.calcOutputItem}>
                        <Text style={styles.calcLabel}>GROSS FUEL AMOUNT</Text>
                        <Text style={styles.calcAmountVal}>{formatCurrency(amount)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Section 2: Payment Collections & Settlement Split */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionTitleHeader}>
              <View style={styles.titleIconRow}>
                <Fuel size={18} color={colors.cashGreen} />
                <Text style={styles.sectionTitle}>2. Payment Collections & Mode Split</Text>
              </View>
              <Text style={styles.sectionSub}>
                Reconcile physical cash, digital UPI, fleet cards & credit vouchers
              </Text>
            </View>

            <View style={styles.collectionsGrid}>
              {/* Cash Collection */}
              <View style={styles.collectionCol}>
                <Text style={styles.collectionLabel}>Cash Collected (₹)</Text>
                <TextInput
                  style={[styles.collectionInput, { borderColor: colors.cashGreen }]}
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
                  style={[styles.collectionInput, { borderColor: colors.upiPurple }]}
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
                  style={[styles.collectionInput, { borderColor: colors.cardBlue }]}
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
                  style={[styles.collectionInput, { borderColor: colors.creditOrange }]}
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
                  style={[styles.collectionInput, { borderColor: colors.danger }]}
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

          {/* Section 3: Reconciliation Summary Box */}
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
                <Text style={[styles.settleVal, { color: colors.accent }]}>
                  {formatCurrency(currentShift.totalSalesAmount - (currentShift.expensesDeducted || 0))}
                </Text>
              </View>

              <View style={styles.settleRow}>
                <Text style={styles.settleLabel}>Total Collections Submitted (C):</Text>
                <Text style={styles.settleVal}>{formatCurrency(currentShift.totalCollected)}</Text>
              </View>

              <View style={styles.settleDivider} />

              <View style={styles.settleRow}>
                <Text style={styles.finalVarianceLabel}>
                  {currentShift.shortageOrExcess >= 0 ? 'EXCESS AMOUNT:' : 'SHORTAGE AMOUNT:'}
                </Text>
                <Text
                  style={[
                    styles.finalVarianceVal,
                    {
                      color:
                        currentShift.shortageOrExcess === 0
                          ? colors.success
                          : currentShift.shortageOrExcess > 0
                          ? colors.info
                          : colors.danger,
                    },
                  ]}
                >
                  {formatCurrency(currentShift.shortageOrExcess)}
                </Text>
              </View>
            </View>

            {/* Verification Status */}
            <View style={styles.verificationBar}>
              <CheckCircle
                size={16}
                color={currentShift.shortageOrExcess === 0 ? colors.success : colors.warning}
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

      {/* Open Shift Modal */}
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
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Shift Date</Text>
                  <TextInput
                    style={styles.simInput}
                    value={shiftDate}
                    onChangeText={setShiftDate}
                    placeholder="YYYY-MM-DD"
                    keyboardType="numeric"
                  />
                </View>

                {/* Select Pump */}
                <DropdownPicker
                  label="Select Pump Dispenser *"
                  placeholder="Select Pump Dispenser..."
                  options={pumps.map((pump) => ({
                    label: pump.name,
                    value: pump.id,
                    subtitle: `Pump #${pump.pumpNo} • ${pump.nozzles.length} nozzle(s)`,
                    inactive: pump.status === 'INACTIVE' || pump.status === 'MAINTENANCE',
                  } as DropdownOption))}
                  value={selectedPumpId}
                  onChange={(v) => setSelectedPumpId(v)}
                />

                {/* Shift Type */}
                <DropdownPicker
                  label="Shift Type *"
                  placeholder="Select Shift Type..."
                  options={[
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
                    subtitle: `Bata: ₹${op.dailyBata}/day`,
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
                      subtitle: `Bata: ₹${op.dailyBata}/day`,
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

      {/* Simulator Modal */}
      <Modal visible={!!simNozzleId} transparent animationType="fade" onRequestClose={() => setSimNozzleId(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 360 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={18} color={colors.accent} />
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
  headerRow: {
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openShiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  openShiftBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  shiftPillsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  shiftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  shiftPillActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.primary,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  shiftMetaCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  metaCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  metaSub: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  metaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
  closeShiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  closeShiftBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionContainer: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  sectionTitleHeader: {
    gap: 2,
    marginBottom: 4,
  },
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSub: {
    color: colors.textMuted,
    fontSize: 11,
  },
  readingsList: {
    gap: 12,
  },
  readingCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    gap: 8,
  },
  fuelTagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  readingProductName: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
  rateBadge: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rateBadgeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: typography.monoFont,
  },
  inputsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  inputCol: {
    flex: 1,
    minWidth: 130,
    gap: 4,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  simTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  simTriggerText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  inputField: {
    backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: typography.monoFont,
    fontWeight: '700',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabledInput: {
    color: colors.inactiveGrey,
    backgroundColor: colors.inactiveBg,
    borderColor: colors.inactiveBorder,
  },
  activeInput: {
    borderColor: colors.primary,
  },
  calcOutputBox: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: 10,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: colors.border,
  },
  calcOutputItem: {
    alignItems: 'center',
  },
  calcLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  calcLitresVal: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: typography.monoFont,
    marginTop: 2,
  },
  calcAmountVal: {
    color: colors.cashGreen,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: typography.monoFont,
    marginTop: 2,
  },
  collectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  collectionCol: {
    flex: 1,
    minWidth: 160,
    gap: 4,
  },
  collectionLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  collectionInput: {
    backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: typography.monoFont,
    fontWeight: '700',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settlementBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  settlementTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  settlementRows: {
    gap: 6,
  },
  settleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settleLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  settleVal: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.monoFont,
  },
  settleDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 4,
  },
  finalVarianceLabel: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
  finalVarianceVal: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  verificationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 8,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  verificationText: {
    color: colors.textSecondary,
    fontSize: 11,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  modalTitle: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  modalBody: {
    gap: 12,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  optionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionPill: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalFooter: {
    marginTop: 6,
  },
  confirmOpenBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
    gap: 8,
  },
  confirmOpenBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  simSub: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  quickLitresRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  quickLitreBtn: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickLitreBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  quickLitreText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.monoFont,
  },
  quickLitreTextActive: {
    color: '#FFFFFF',
  },
  simInput: {
    backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: typography.monoFont,
    fontWeight: '700',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dispenseTriggerBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  dispenseTriggerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
