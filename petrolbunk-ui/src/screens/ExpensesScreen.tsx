import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  PlusCircle,
  Search,
  Table,
  List,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Platform,
} from 'react-native';

import { useExpensesContext } from '../context/ExpensesContext';
import { EXCEL_EXPENSE_HEADS } from '../context/mappers';
import { colors } from '../theme/colors';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';

export const ExpensesScreen: React.FC = () => {
  const { expenses, expenseTypes, addExpense, deleteExpense, role } = useExpensesContext();

  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getTodayDateString().slice(0, 7)); // 'YYYY-MM'
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [expenseDate, setExpenseDate] = useState<string>(getTodayDateString());
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [amount, setAmount] = useState('150.00');
  const [remarks, setRemarks] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  // Heads list from master or static 33
  const activeHeads = useMemo(() => {
    if (expenseTypes && expenseTypes.length > 0) {
      return expenseTypes.map(e => e.name);
    }
    return EXCEL_EXPENSE_HEADS;
  }, [expenseTypes]);

  // Compute 33-Head Monthly Grid Matrix Data (Dates x 33 Heads)
  const { dates, matrixData, colTotals, grandTotal } = useMemo(() => {
    const data: { [date: string]: { [head: string]: number } } = {};
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const month = parseInt(monthStr, 10) || new Date().getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    const dList: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${yearStr}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dList.push(dStr);
      data[dStr] = {};
    }

    expenses.forEach(e => {
      if (e.date && e.date.startsWith(selectedMonth)) {
        if (!data[e.date]) data[e.date] = {};
        const headName = e.expenseTypeName || 'Others';
        data[e.date][headName] = (data[e.date][headName] || 0) + e.amount;
      }
    });

    const cTotals: { [head: string]: number } = {};
    activeHeads.forEach(h => {
      let sum = 0;
      dList.forEach(d => {
        sum += data[d]?.[h] || 0;
      });
      cTotals[h] = sum;
    });

    const gTotal = Object.values(cTotals).reduce((sum, v) => sum + v, 0);

    return { dates: dList, matrixData: data, colTotals: cTotals, grandTotal: gTotal };
  }, [selectedMonth, expenses, activeHeads]);

  // List view filtered items
  const filteredList = useMemo(() => {
    return expenses.filter(e => {
      if (!e.date.startsWith(selectedMonth)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.expenseTypeName.toLowerCase().includes(q) ||
          (e.remarks && e.remarks.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [expenses, selectedMonth, searchQuery]);

  const handleOpenAddForCell = (dateStr: string, headName?: string) => {
    setExpenseDate(dateStr);
    if (headName) {
      const et = expenseTypes.find(t => t.name === headName);
      if (et) setSelectedTypeId(et.id);
    } else if (expenseTypes[0]) {
      setSelectedTypeId(expenseTypes[0].id);
    }
    setShowAddModal(true);
  };

  const handleSaveExpense = async () => {
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      Alert.alert('Error', 'Please enter a valid amount greater than zero');
      return;
    }
    const typeId = selectedTypeId || expenseTypes[0]?.id;
    if (!typeId) {
      Alert.alert('Error', 'Please select an expense head');
      return;
    }

    try {
      await addExpense({
        date: expenseDate,
        expenseTypeId: typeId,
        amount: numAmt,
        remarks,
      });
      setShowAddModal(false);
      setRemarks('');
      setAmount('150.00');
      Alert.alert('Success', 'Expense logged successfully!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to log expense');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Daily Expenses Ledger</Text>
          <Text style={styles.headerSubtitle}>
            Monthly 33-Head Expense Matrix ({selectedMonth})
          </Text>
        </View>

        <View style={styles.headerActions}>
          {/* Month Switcher */}
          <View style={styles.monthSwitcher}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
              <ChevronLeft size={16} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthText}>{selectedMonth}</Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
              <ChevronRight size={16} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => handleOpenAddForCell(getTodayDateString())}
          >
            <PlusCircle size={16} color="#FFF" />
            <Text style={styles.primaryBtnText}>Log Expense</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Banner */}
      <View style={styles.kpiBanner}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Month Expenses</Text>
          <Text style={[styles.kpiValue, { color: '#EF4444' }]}>{formatCurrency(grandTotal)}</Text>
          <Text style={styles.kpiSub}>All 33 Heads for {selectedMonth}</Text>
        </View>

        {/* View Mode Toggle */}
        <View style={styles.viewToggleGroup}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'matrix' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('matrix')}
          >
            <Table size={16} color={viewMode === 'matrix' ? '#FFF' : colors.textMuted} />
            <Text
              style={[
                styles.viewToggleBtnText,
                viewMode === 'matrix' && styles.viewToggleBtnTextActive,
              ]}
            >
              Excel Matrix (33 Heads)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <List size={16} color={viewMode === 'list' ? '#FFF' : colors.textMuted} />
            <Text
              style={[
                styles.viewToggleBtnText,
                viewMode === 'list' && styles.viewToggleBtnTextActive,
              ]}
            >
              Chronological List
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      {viewMode === 'matrix' ? (
        <ScrollView style={styles.scrollArea}>
          <ScrollView horizontal style={styles.matrixScroll}>
            <View>
              {/* Matrix Header */}
              <View style={styles.matrixHeaderRow}>
                <View style={[styles.matrixHeaderCell, { width: 110 }]}>
                  <Text style={styles.matrixHeaderText}>Date</Text>
                </View>
                {activeHeads.map(head => (
                  <View key={head} style={[styles.matrixHeaderCell, { width: 120 }]}>
                    <Text style={styles.matrixHeaderText} numberOfLines={1}>
                      {head}
                    </Text>
                  </View>
                ))}
                <View style={[styles.matrixHeaderCell, { width: 130, backgroundColor: '#F1F5F9' }]}>
                  <Text style={[styles.matrixHeaderText, { color: '#DC2626', fontWeight: '800' }]}>Day Total (₹)</Text>
                </View>
              </View>

              {/* Matrix Day Rows */}
              {dates.map(dStr => {
                const dayTotal = activeHeads.reduce((sum, h) => sum + (matrixData[dStr]?.[h] || 0), 0);
                return (
                  <View key={dStr} style={styles.matrixRow}>
                    <View style={[styles.matrixCell, { width: 110, backgroundColor: colors.surface }]}>
                      <Text style={styles.dateColText}>{dStr.slice(8)} ({formatDate(dStr).slice(0, 3)})</Text>
                    </View>

                    {activeHeads.map(head => {
                      const val = matrixData[dStr]?.[head] || 0;
                      return (
                        <TouchableOpacity
                          key={head}
                          style={[styles.matrixCell, { width: 120 }]}
                          onPress={() => handleOpenAddForCell(dStr, head)}
                        >
                          <Text style={[styles.cellValText, val > 0 && { color: '#EF4444', fontWeight: '700' }]}>
                            {val > 0 ? val.toLocaleString() : '-'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    {/* Day Total */}
                    <View style={[styles.matrixCell, { width: 130, backgroundColor: colors.surface }]}>
                      <Text style={[styles.cellValText, { fontWeight: '800', color: dayTotal > 0 ? '#EF4444' : colors.textMuted }]}>
                        {dayTotal > 0 ? formatCurrency(dayTotal) : '-'}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Footer Total Row */}
              <View style={[styles.matrixHeaderRow, { backgroundColor: '#FEF2F2', borderTopWidth: 2, borderTopColor: '#FECACA' }]}>
                <View style={[styles.matrixHeaderCell, { width: 110 }]}>
                  <Text style={[styles.matrixHeaderText, { color: '#991B1B', fontWeight: '800' }]}>Total (₹)</Text>
                </View>
                {activeHeads.map(head => (
                  <View key={head} style={[styles.matrixHeaderCell, { width: 120 }]}>
                    <Text style={[styles.matrixHeaderText, { color: '#DC2626', fontWeight: '700' }]}>
                      {(colTotals[head] || 0).toLocaleString()}
                    </Text>
                  </View>
                ))}
                <View style={[styles.matrixHeaderCell, { width: 130, backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.matrixHeaderText, { color: '#991B1B', fontSize: 13, fontWeight: '900' }]}>
                    {formatCurrency(grandTotal)}
                  </Text>
                </View>
              </View>
            </View>

          </ScrollView>
        </ScrollView>
      ) : (
        /* List View */
        <ScrollView style={styles.scrollArea} contentContainerStyle={{ padding: 20 }}>
          {/* Search bar */}
          <View style={styles.searchBar}>
            <Search size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search expenses by head or remark..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {filteredList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No expenses found for {selectedMonth}</Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {filteredList.map(e => (
                <View key={e.id} style={styles.listItem}>
                  <View style={styles.listLeft}>
                    <View style={styles.headIconBox}>
                      <Text style={styles.headIconText}>{e.expenseTypeName.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={styles.listHeadName}>{e.expenseTypeName}</Text>
                      <Text style={styles.listDate}>{formatDate(e.date)}</Text>
                      {e.remarks ? <Text style={styles.listRemarks}>{e.remarks}</Text> : null}
                    </View>
                  </View>

                  <View style={styles.listRight}>
                    <Text style={styles.listAmount}>{formatCurrency(e.amount)}</Text>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => {
                        Alert.alert('Confirm Delete', 'Delete this expense entry?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(e.id) },
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
      )}

      {/* Log Expense Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Daily Expense</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
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
                  value={expenseDate}
                  onChangeText={setExpenseDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Expense Head (33 Heads)</Text>
                <ScrollView horizontal style={styles.headsScroll} showsHorizontalScrollIndicator={true}>
                  <View style={styles.headsRow}>
                    {expenseTypes.map(et => (
                      <TouchableOpacity
                        key={et.id}
                        style={[styles.headPill, (selectedTypeId === et.id || (!selectedTypeId && et.name === 'Tea')) && styles.headPillActive]}
                        onPress={() => setSelectedTypeId(et.id)}
                      >
                        <Text
                          style={[
                            styles.headPillText,
                            (selectedTypeId === et.id || (!selectedTypeId && et.name === 'Tea')) && styles.headPillTextActive,
                          ]}
                        >
                          {et.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Amount (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Remarks (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={remarks}
                  onChangeText={setRemarks}
                  placeholder="e.g. Afternoon tea and snacks"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </ScrollView>


            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveExpense}>
                <Save size={16} color="#FFF" />
                <Text style={styles.primaryBtnText}>Save Expense</Text>
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
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  monthNavBtn: {
    padding: 4,
  },
  monthText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
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
  kpiBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF1F5',
    borderRadius: 12,
    padding: 12,
    minWidth: 180,
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
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 10,
    color: '#9AA5B1',
    marginTop: 2,
  },
  viewToggleGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  viewToggleBtnActive: {
    backgroundColor: '#6F7BF5',
    borderColor: '#6F7BF5',
    shadowColor: '#6F7BF5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  viewToggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  viewToggleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  scrollArea: {
    flex: 1,
  },
  matrixScroll: {
    padding: 20,
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  matrixHeaderCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matrixHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },

  matrixRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  matrixCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateColText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  cellValText: {
    fontSize: 12,
    color: colors.textMuted,
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
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  listContainer: {
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  listHeadName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  listDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  listRemarks: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  listRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  listAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  deleteBtn: {
    padding: 4,
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
  headsScroll: {
    maxHeight: 50,
  },
  headsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  headPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  headPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  headPillTextActive: {
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
