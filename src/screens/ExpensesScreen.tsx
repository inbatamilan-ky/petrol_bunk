import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
  PlusCircle,
  Search,
  X,
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
import { DatePickerInput } from '../components/DatePickerInput';
import { NoDataView } from '../components/NoDataView';
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

  // Search & Pagination & Date Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  // Filtered expenses based on search query & date filter
  const filteredExpenses = expenses.filter((e) => {
    if (selectedDateFilter && e.date !== selectedDateFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchVoucher = e.voucherNo.toLowerCase().includes(q);
      const matchHead = e.expenseTypeName.toLowerCase().includes(q);
      const matchPaidTo = e.paidTo.toLowerCase().includes(q);
      const matchRemarks = (e.remarks || '').toLowerCase().includes(q);
      const matchDate = e.date.toLowerCase().includes(q);
      const matchPaidBy = (e.paidBy || '').toLowerCase().includes(q);
      if (!matchVoucher && !matchHead && !matchPaidTo && !matchRemarks && !matchDate && !matchPaidBy) {
        return false;
      }
    }
    return true;
  });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredExpenses.length);
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Voucher No', 'Date', 'Expense Head', 'Paid To', 'Paid By', 'Amount (₹)', 'Type', 'Remarks'];
    const rows = filteredExpenses.map((e) => [
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
          <Text style={styles.screenTitle}>Daily Expenses & Cash Management </Text>
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
        </View>

        <View style={[styles.summaryCard, { borderLeftColor: colors.diesel }]}>
          <Text style={styles.summaryLabel}>STAFF EXPENSES</Text>
          <Text style={styles.summaryValue}>{formatCurrency(categoryTotals['STAFF'] || 0)}</Text>
        </View>

        <View style={[styles.summaryCard, { borderLeftColor: colors.petrol }]}>
          <Text style={styles.summaryLabel}>CREDIT NOTE REVERSALS</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalCreditNotes)}</Text>
        </View>
      </View>

      {/* Search & Page Size Controls */}
      <View style={styles.tableControlsCard}>
        {/* Search Bar & Date Filter & Page Size Row */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Search size={16} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search voucher #, head, paid to, remarks..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setCurrentPage(1);
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setCurrentPage(1); }}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Date Filter Picker */}
          <View style={{ minWidth: 170 }}>
            <DatePickerInput
              value={selectedDateFilter}
              onChange={(d) => {
                setSelectedDateFilter(d);
                setCurrentPage(1);
              }}
              placeholder="Filter by date..."
              maxDate={getTodayDateString()}
              allowClear
              onClear={() => {
                setSelectedDateFilter('');
                setCurrentPage(1);
              }}
            />
          </View>

          {/* Page Size Selector */}
          <View style={styles.pageSizeContainer}>
            <Text style={styles.pageSizeLabel}>Show:</Text>
            {[10, 25, 50, 100].map((size) => (
              <TouchableOpacity
                key={size}
                style={[styles.pageSizePill, pageSize === size && styles.pageSizePillActive]}
                onPress={() => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              >
                <Text style={[styles.pageSizePillText, pageSize === size && styles.pageSizePillTextActive]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Expenses Table with Vertical Scroll + Horizontal Scroll */}
      <View style={styles.tableCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.tableScrollHorizontal}
          contentContainerStyle={{ minWidth: '100%' }}
        >
          <View style={{ width: '100%', minWidth: 680 }}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableColHeader, { width: 90 }]}>DATE</Text>
              <Text style={[styles.tableColHeader, { width: 110 }]}>VOUCHER #</Text>
              <Text style={[styles.tableColHeader, { flex: 1.4, minWidth: 140 }]}>EXPENSE HEAD</Text>
              <Text style={[styles.tableColHeader, { flex: 1.6, minWidth: 160 }]}>PAID TO / REMARKS</Text>
              <Text style={[styles.tableColHeader, { width: 100 }]}>PAID BY</Text>
              <Text style={[styles.tableColHeader, { width: 110, textAlign: 'right' }]}>AMOUNT (₹)</Text>
            </View>

            {/* Scrollable Table Body */}
            <ScrollView
              style={styles.tableBodyScroll}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {paginatedExpenses.length === 0 ? (
                <NoDataView
                  title="No Expenses Found"
                  selectedDate={selectedDateFilter || undefined}
                  message={
                    selectedDateFilter
                      ? `No expense entries found for ${formatDate(selectedDateFilter)}.`
                      : 'No matching expense vouchers found for current filters.'
                  }
                  onResetDate={selectedDateFilter ? () => { setSelectedDateFilter(''); setCurrentPage(1); } : undefined}
                  actionLabel="Add Expense"
                  onAction={() => setShowAddModal(true)}
                />
              ) : (
                paginatedExpenses.map((e) => (
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
                        flex: 1.4,
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
                        flex: 1.6,
                        minWidth: 160,
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

                    {/* Paid By */}
                    <Text style={[styles.tableCell, { width: 100 }]}>
                      {e.paidBy}
                    </Text>

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
                ))
              )}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Pagination Footer Controls */}
        <View style={styles.paginationContainer}>
          <Text style={styles.paginationInfo}>
            Showing <Text style={styles.paginationInfoBold}>{filteredExpenses.length === 0 ? 0 : startIndex + 1}</Text> -{' '}
            <Text style={styles.paginationInfoBold}>{endIndex}</Text> of{' '}
            <Text style={styles.paginationInfoBold}>{filteredExpenses.length}</Text> entries
          </Text>

          <View style={styles.paginationControls}>
            {/* First Page */}
            <TouchableOpacity
              style={[styles.pageBtn, safeCurrentPage <= 1 && styles.pageBtnDisabled]}
              onPress={() => setCurrentPage(1)}
              disabled={safeCurrentPage <= 1}
            >
              <ChevronsLeft size={16} color={safeCurrentPage <= 1 ? colors.textMuted : colors.textPrimary} />
            </TouchableOpacity>

            {/* Prev Page */}
            <TouchableOpacity
              style={[styles.pageBtn, safeCurrentPage <= 1 && styles.pageBtnDisabled]}
              onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
            >
              <ChevronLeft size={16} color={safeCurrentPage <= 1 ? colors.textMuted : colors.textPrimary} />
            </TouchableOpacity>

            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                return page === 1 || page === totalPages || Math.abs(page - safeCurrentPage) <= 1;
              })
              .map((page, idx, arr) => {
                const prev = arr[idx - 1];
                const hasGap = prev && page - prev > 1;

                return (
                  <React.Fragment key={page}>
                    {hasGap && <Text style={styles.paginationEllipsis}>...</Text>}
                    <TouchableOpacity
                      style={[styles.pageNumberBtn, safeCurrentPage === page && styles.pageNumberBtnActive]}
                      onPress={() => setCurrentPage(page)}
                    >
                      <Text style={[styles.pageNumberText, safeCurrentPage === page && styles.pageNumberTextActive]}>
                        {page}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}

            {/* Next Page */}
            <TouchableOpacity
              style={[styles.pageBtn, safeCurrentPage >= totalPages && styles.pageBtnDisabled]}
              onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
            >
              <ChevronRight size={16} color={safeCurrentPage >= totalPages ? colors.textMuted : colors.textPrimary} />
            </TouchableOpacity>

            {/* Last Page */}
            <TouchableOpacity
              style={[styles.pageBtn, safeCurrentPage >= totalPages && styles.pageBtnDisabled]}
              onPress={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage >= totalPages}
            >
              <ChevronsRight size={16} color={safeCurrentPage >= totalPages ? colors.textMuted : colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
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
  tableControlsCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#000',
    fontSize: 12,
    padding: 0,
  },
  pageSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageSizeLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  pageSizePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pageSizePillActive: {
    backgroundColor: colors.speed,
    borderColor: colors.speed,
  },
  pageSizePillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  pageSizePillTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  tableScrollHorizontal: {
    width: '100%',
  },
  tableBodyScroll: {
    maxHeight: 420,
  },
  emptyTableState: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTableText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
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
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  paginationInfo: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  paginationInfoBold: {
    color: '#000',
    fontWeight: '700',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageNumberBtn: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumberBtnActive: {
    backgroundColor: colors.speed,
    borderColor: colors.speed,
  },
  pageNumberText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  pageNumberTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  paginationEllipsis: {
    color: colors.textMuted,
    paddingHorizontal: 2,
    fontSize: 11,
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
    backgroundColor: '#dbdde4',
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
    backgroundColor: '#dbdde4',
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
