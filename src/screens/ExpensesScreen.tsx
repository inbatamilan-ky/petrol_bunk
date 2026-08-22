import {
  CheckCircle2,
  FileSpreadsheet,
  PlusCircle,
  Sparkles,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { DropdownPicker } from '../components/DropdownPicker';
import { useBunk } from '../context/BunkContext';
import { colors, typography } from '../theme/colors';
import { exportToCSV } from '../utils/exportHelpers';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';

export const ExpensesScreen: React.FC = () => {
  const { expenses, expenseTypes, pumps, addExpense, role } = useBunk();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string>(expenseTypes[1]?.id || '');
  const [amount, setAmount] = useState('150.00');
  const [paidTo, setPaidTo] = useState('');
  const [paidBy, setPaidBy] = useState('Manager');
  const [selectedPumpId, setSelectedPumpId] = useState<string>('');
  const [isCreditNote, setIsCreditNote] = useState(false);
  const [remarks, setRemarks] = useState('');

  // Quick preset bata fill
  const handleSelectBataPreset = () => {
    setSelectedTypeId(expenseTypes.find((t) => t.name.includes('Bata'))?.id || expenseTypes[0]?.id || '');
    setAmount('1300.00');
    setPaidTo('Day Shift Operators (4 staff)');
    setRemarks('Daily shift operator bata @ ₹325 each');
  };

  const handleSelectTeaPreset = () => {
    setSelectedTypeId(expenseTypes.find((t) => t.name.includes('Tea'))?.id || expenseTypes[0]?.id || '');
    setAmount('100.00');
    setPaidTo('Sri Murugan Tea Stall');
    setRemarks('Staff tea & snacks');
  };

  const handleSelectDensityPreset = () => {
    setSelectedTypeId(expenseTypes.find((t) => t.name.includes('Density'))?.id || expenseTypes[0]?.id || '');
    setAmount('110.00');
    setPaidTo('Morning Density Calibration Test');
    setRemarks('5 Litres test jar sample');
  };

  const handleAddExpenseSubmit = () => {
    const rawTypeId = selectedTypeId.startsWith('__other__:') ? selectedTypeId.replace('__other__:', '') : selectedTypeId;
    const typeObj = expenseTypes.find((t) => t.id === rawTypeId || t.name.toLowerCase() === rawTypeId.toLowerCase());
    const typeName = typeObj?.name || rawTypeId;
    const typeId = typeObj?.id || 'et-custom-' + Date.now();
    const amountNum = parseFloat(amount) || 0;
    if (!typeName || amountNum <= 0) return;

    const cleanPaidTo = paidTo.startsWith('__other__:') ? paidTo.replace('__other__:', '') : paidTo;
    const cleanPaidBy = paidBy.startsWith('__other__:') ? paidBy.replace('__other__:', '') : paidBy;

    addExpense({
      expenseTypeId: typeId,
      expenseTypeName: typeName,
      amount: amountNum,
      paidTo: cleanPaidTo || 'Vendor',
      paidBy: cleanPaidBy || 'Manager',
      pumpId: selectedPumpId || undefined,
      isCreditNote,
      remarks,
    });

    setShowAddModal(false);
    setAmount('');
    setPaidTo('');
    setRemarks('');
    setIsCreditNote(false);
  };

  // Aggregates
  const totalRegularExpenses = expenses
    .filter((e) => !e.isCreditNote)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalCreditNotes = expenses
    .filter((e) => e.isCreditNote)
    .reduce((sum, e) => sum + e.amount, 0);

  const netExpenses = totalRegularExpenses - totalCreditNotes;

  // Category breakdown
  const categoryTotals: { [key: string]: number } = {};
  expenses.forEach((e) => {
    const typeObj = expenseTypes.find((t) => t.id === e.expenseTypeId);
    const cat = typeObj?.category || 'OPERATIONAL';
    const signedAmt = e.isCreditNote ? -e.amount : e.amount;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + signedAmt;
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Voucher No', 'Date', 'Expense Head', 'Paid To', 'Paid By', 'Amount (₹)', 'Type', 'Remarks'];
    const rows = expenses.map((e) => [
      e.voucherNo,
      e.date,
      e.expenseTypeName,
      e.paidTo,
      e.paidBy,
      e.amount,
      e.isCreditNote ? 'Credit Note (Return)' : 'Expense Debit',
      e.remarks || '',
    ]);
    exportToCSV(`Daily_Expenses_${getTodayDateString()}`, headers, rows);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Daily Expenses & Petty Cash</Text>
          <Text style={styles.screenSubtitle}>
            Staff bata, tea, density test loss, loan chits & credit notes
          </Text>
        </View>

        <View style={styles.btnGroup}>
          <TouchableOpacity
            style={styles.addExpenseBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <PlusCircle size={15} color="#000" />
            <Text style={styles.addExpenseBtnText}>Log Expense Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV} activeOpacity={0.8}>
            <FileSpreadsheet size={15} color="#000" />
            <Text style={styles.exportBtnText}>Export CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { borderLeftColor: colors.speed }]}>
          <Text style={styles.summaryLabel}>NET DAILY EXPENSES</Text>
          <Text style={styles.summaryValue}>{formatCurrency(netExpenses)}</Text>
          <Text style={styles.summarySub}>Total deducted from cash register</Text>
        </View>

        <View style={[styles.summaryCard, { borderLeftColor: colors.diesel }]}>
          <Text style={styles.summaryLabel}>STAFF & BATA EXPENSES</Text>
          <Text style={styles.summaryValue}>{formatCurrency(categoryTotals['STAFF'] || 0)}</Text>
          <Text style={styles.summarySub}>Operator shift bata & salaries</Text>
        </View>

        <View style={[styles.summaryCard, { borderLeftColor: colors.petrol }]}>
          <Text style={styles.summaryLabel}>CREDIT NOTE REVERSALS</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalCreditNotes)}</Text>
          <Text style={styles.summarySub}>Refunds & expense reversals</Text>
        </View>
      </View>

      {/* Quick Presets Bar */}
      <View style={styles.presetsCard}>
        <Text style={styles.presetsTitle}>Quick One-Tap Vouchers:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
          <TouchableOpacity
            style={styles.presetPill}
            onPress={() => {
              handleSelectBataPreset();
              setShowAddModal(true);
            }}
          >
            <Sparkles size={12} color={colors.accent} />
            <Text style={styles.presetPillText}>Operator Bata (₹1,300)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetPill}
            onPress={() => {
              handleSelectTeaPreset();
              setShowAddModal(true);
            }}
          >
            <Sparkles size={12} color={colors.accent} />
            <Text style={styles.presetPillText}>Staff Tea (₹100)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.presetPill}
            onPress={() => {
              handleSelectDensityPreset();
              setShowAddModal(true);
            }}
          >
            <Sparkles size={12} color={colors.accent} />
            <Text style={styles.presetPillText}>Density Sample (₹110)</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Expenses Table */}
      <View style={styles.tableCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.tableScroll}
          contentContainerStyle={{ minWidth: '100%' }}
        >
          <View style={{ width: '100%', minWidth: 640 }}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableColHeader, { width: 90 }]}>DATE</Text>
              <Text style={[styles.tableColHeader, { width: 110 }]}>VOUCHER #</Text>
              <Text style={[styles.tableColHeader, { flex: 1.5, minWidth: 140 }]}>EXPENSE HEAD</Text>
              <Text style={[styles.tableColHeader, { flex: 1.5, minWidth: 140 }]}>PAID TO / REMARKS</Text>
              <Text style={[styles.tableColHeader, { width: 110, textAlign: 'right' }]}>AMOUNT (₹)</Text>
            </View>
 {expenses.map((e) => (
  <View key={e.id} style={styles.tableDataRow}>
    {/* Date */}
    <Text style={[styles.tableCell, { width: 90 }]}>
      {formatDate(e.date)}
    </Text>

    {/* Voucher Number */}
    <Text style={[styles.tableCellMono, { width: 110 }]}>
      {e.voucherNo}
    </Text>

    {/* Expense Head */}
    <View
      style={{
        flex: 1.5,
        minWidth: 140,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Text style={styles.tableCellHead}>
        {e.expenseTypeName}
      </Text>

      {e.isCreditNote && (
        <View style={styles.creditNoteBadge}>
          <Text style={styles.creditNoteText}>
            REVERSAL
          </Text>
        </View>
      )}
    </View>

    {/* Paid To / Remarks */}
    <View
      style={{
        flex: 1.5,
        minWidth: 140,
      }}
    >
      <Text
        style={styles.tableCellPaidTo}
        numberOfLines={1}
      >
        {e.paidTo}
      </Text>

      {e.remarks ? (
        <Text
          style={styles.tableCellRemarks}
          numberOfLines={1}
        >
          {e.remarks}
        </Text>
      ) : null}
    </View>

    {/* Amount */}
    <Text
      style={[
        styles.tableCellAmount,
        {
          color: e.isCreditNote
            ? colors.cashGreen
            : colors.speed,
          width: 110,
          textAlign: 'right',
        },
      ]}
    >
      {e.isCreditNote ? '-' : ''}
      {formatCurrency(e.amount)}
    </Text>
  </View>
))}
          </View>
        </ScrollView>
      </View>

      {/* Add Expense Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Expense Voucher</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <View style={styles.modalBody}>
                {/* Expense Head / Category Dropdown */}
                <DropdownPicker
                  label="Expense Head / Category *"
                  placeholder="Select Expense Head..."
                  options={expenseTypes.map((t) => ({
                    label: t.name,
                    value: t.id,
                    subtitle: `Category: ${t.category}`,
                    inactive: t.active === false,
                  }))}
                  value={selectedTypeId}
                  onChange={(v, l) => {
                    setSelectedTypeId(v);
                  }}
                  allowOther
                  onSaveNew={(customName) => setSelectedTypeId(customName)}
                />

                {/* Amount & Credit Note Toggle */}
                <View style={styles.dualFormRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Amount (₹) *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Transaction Nature</Text>
                    <View style={styles.toggleRow}>
                      <TouchableOpacity
                        style={[styles.natureBtn, !isCreditNote && styles.natureBtnActive]}
                        onPress={() => setIsCreditNote(false)}
                      >
                        <Text style={[styles.natureBtnText, !isCreditNote && styles.natureBtnTextActive]}>
                          Expense Paid
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.natureBtn, isCreditNote && styles.natureBtnActive]}
                        onPress={() => setIsCreditNote(true)}
                      >
                        <Text style={[styles.natureBtnText, isCreditNote && styles.natureBtnTextActive]}>
                          Credit Note (Return)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Paid To & Paid By Dropdowns */}
                <View style={styles.dualFormRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <DropdownPicker
                      label="Paid To (Vendor / Person) *"
                      placeholder="Select or type recipient..."
                      options={[
                        { label: 'Day Shift Operators (4 staff)', value: 'Day Shift Operators (4 staff)', subtitle: 'Operator Daily Bata' },
                        { label: 'Night Shift Operators', value: 'Night Shift Operators', subtitle: 'Operator Daily Bata' },
                        { label: 'Sri Murugan Tea Stall', value: 'Sri Murugan Tea Stall', subtitle: 'Daily Tea & Snacks' },
                        { label: 'Morning Density Calibration Test', value: 'Morning Density Calibration Test', subtitle: 'Calibration & Density Sample' },
                        { label: 'Gokulam Chit Fund', value: 'Gokulam Chit Fund', subtitle: 'Monthly Chit Installment' },
                        { label: 'Lorry Bata Expense', value: 'Lorry Bata Expense', subtitle: 'Tanker Decantation Bata' },
                        { label: 'Stationery & Printing', value: 'Stationery & Printing', subtitle: 'Receipt Rolls & Registers' },
                        { label: 'Generator Diesel & Fuel', value: 'Generator Diesel & Fuel', subtitle: 'Station Backup' },
                        { label: 'Advance Payment to Staff', value: 'Advance Payment to Staff', subtitle: 'Staff Advance' },
                      ]}
                      value={paidTo}
                      onChange={(v, l) => setPaidTo(l || v)}
                      allowOther
                      onSaveNew={(customName) => setPaidTo(customName)}
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <DropdownPicker
                      label="Paid By *"
                      placeholder="Select or type paid by..."
                      options={[
                        { label: 'Manager', value: 'Manager' },
                        { label: 'Cashier', value: 'Cashier' },
                        { label: 'Owner', value: 'Owner' },
                        { label: 'Supervisor', value: 'Supervisor' },
                        { label: 'Shift In-charge', value: 'Shift In-charge' },
                      ]}
                      value={paidBy}
                      onChange={(v, l) => setPaidBy(l || v)}
                      allowOther
                      onSaveNew={(customName) => setPaidBy(customName)}
                    />
                  </View>
                </View>

                {/* Remarks */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Voucher Remarks / Notes</Text>
                  <TextInput
                    style={styles.textInput}
                    value={remarks}
                    onChangeText={setRemarks}
                    placeholder="Details of expense"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddExpenseSubmit} activeOpacity={0.8}>
                <CheckCircle2 size={16} color="#000" />
                <Text style={styles.modalSubmitBtnText}>Save Expense Voucher</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.speed,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addExpenseBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  exportBtn: {
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
  exportBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  summaryValue: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: typography.monoFont,
    marginVertical: 4,
  },
  summarySub: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  presetsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  presetsTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetPillText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  tableScroll: {
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    paddingHorizontal: 6,
  },
  tableColHeader: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  tableCell: {
    color: colors.textPrimary,
    fontSize: 11,
  },
  tableCellMono: {
    color: colors.accent,
    fontSize: 11,
    fontFamily: typography.monoFont,
    fontWeight: '600',
  },
  tableCellHead: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  creditNoteBadge: {
    backgroundColor: colors.cashGreen + '20',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  creditNoteText: {
    color: colors.cashGreen,
    fontSize: 8,
    fontWeight: '800',
  },
  tableCellPaidTo: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  tableCellRemarks: {
    color: colors.textMuted,
    fontSize: 10,
  },
  tableCellAmount: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
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
    fontSize: 11,
    fontWeight: '600',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pillOption: {
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillOptionActive: {
    backgroundColor: colors.speed,
    borderColor: colors.speed,
  },
  pillOptionText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  pillOptionTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  dualFormRow: {
    flexDirection: 'row',
    gap: 10,
  },
  textInput: {
    backgroundColor: '#070A12',
    color: '#000',
    fontSize: 13,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#070A12',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  natureBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  natureBtnActive: {
    backgroundColor: colors.primary,
  },
  natureBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  natureBtnTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  modalFooter: {
    marginTop: 4,
  },
  modalSubmitBtn: {
    backgroundColor: colors.speed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  modalSubmitBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
});
