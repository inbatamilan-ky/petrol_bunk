import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Fuel,
  PlusCircle,
  Receipt,
  Save,
  Search,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
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

import { DropdownOption, DropdownPicker } from '../components/DropdownPicker';
import { useExpensesContext } from '../context/ExpensesContext';
import { useMasters } from '../context/MastersContext';
import { EXCEL_EXPENSE_HEADS } from '../context/mappers';
import { colors } from '../theme/colors';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';

export const ExpensesScreen: React.FC = () => {
  const { expenses, expenseTypes, addExpense, deleteExpense } = useExpensesContext();
  const { operators = [], pumps = [] } = useMasters();

  const [selectedMonth, setSelectedMonth] = useState<string>(() => getTodayDateString().slice(0, 7)); // 'YYYY-MM'
  const [showAddModal, setShowAddModal] = useState(false);

  // Dropdown Filters State
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('ALL');
  const [selectedPumpFilter, setSelectedPumpFilter] = useState<string>('ALL');
  const [selectedHeadFilter, setSelectedHeadFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State for Log Expense
  const [expenseDate, setExpenseDate] = useState<string>(getTodayDateString());
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('');
  const [selectedPumpId, setSelectedPumpId] = useState<string>('');
  const [amount, setAmount] = useState('150.00');
  const [remarks, setRemarks] = useState('');

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

  // Helper to parse operator & pump info from expense item / remarks
  const parseExpenseMeta = (exp: any) => {
    const text = exp.remarks || '';
    let operatorName = '';
    let pumpLabel = '';
    let cleanRemarks = text;

    const combinedMatch = text.match(/\[Operator:\s*([^|]+)\|\s*Pump:\s*([^\]]+)\]/i);
    const opMatch = text.match(/\[Operator:\s*([^|\]]+)\]/i);
    const pumpMatch = text.match(/\[Pump:\s*([^|\]]+)\]/i);

    if (combinedMatch) {
      operatorName = combinedMatch[1].trim();
      pumpLabel = combinedMatch[2].trim();
      cleanRemarks = text.replace(combinedMatch[0], '').trim();
    } else {
      if (opMatch) {
        operatorName = opMatch[1].trim();
        cleanRemarks = cleanRemarks.replace(opMatch[0], '').trim();
      }
      if (pumpMatch) {
        pumpLabel = pumpMatch[1].trim();
        cleanRemarks = cleanRemarks.replace(pumpMatch[0], '').trim();
      }
    }

    return {
      operatorName: operatorName || 'General / Bunk',
      pumpLabel: pumpLabel || 'General',
      cleanRemarks,
    };
  };

  // Dropdown Options
  const operatorOptions: DropdownOption[] = useMemo(() => {
    const list: DropdownOption[] = [{ label: 'All Operators', value: 'ALL' }];
    operators.forEach(op => {
      list.push({
        label: op.name,
        value: op.id,
        subtitle: op.phone ? `Ph: ${op.phone}` : 'Operator',
      });
    });
    return list;
  }, [operators]);

  const pumpOptions: DropdownOption[] = useMemo(() => {
    const list: DropdownOption[] = [{ label: 'All Pumps', value: 'ALL' }];
    pumps.forEach(p => {
      list.push({
        label: `Pump ${p.pumpNo} (${p.name})`,
        value: p.id,
      });
    });
    return list;
  }, [pumps]);

  const expenseHeadOptions: DropdownOption[] = useMemo(() => {
    const list: DropdownOption[] = [{ label: 'All Expense Heads', value: 'ALL' }];
    if (expenseTypes && expenseTypes.length > 0) {
      expenseTypes.forEach(et => {
        list.push({ label: et.name, value: et.id });
      });
    } else {
      EXCEL_EXPENSE_HEADS.forEach((name, idx) => {
        list.push({ label: name, value: `head-${idx}` });
      });
    }
    return list;
  }, [expenseTypes]);

  // Form Dropdown Options
  const formOperatorOptions: DropdownOption[] = useMemo(() => {
    const list: DropdownOption[] = [{ label: 'General / Bunk (No Operator)', value: '' }];
    operators.forEach(op => {
      list.push({
        label: op.name,
        value: op.name,
        subtitle: op.phone ? `Ph: ${op.phone}` : undefined,
      });
    });
    return list;
  }, [operators]);

  const formPumpOptions: DropdownOption[] = useMemo(() => {
    const list: DropdownOption[] = [{ label: 'General (Not Pump Specific)', value: '' }];
    pumps.forEach(p => {
      list.push({
        label: `Pump ${p.pumpNo} (${p.name})`,
        value: `Pump ${p.pumpNo}`,
      });
    });
    return list;
  }, [pumps]);

  const formExpenseHeadOptions: DropdownOption[] = useMemo(() => {
    if (expenseTypes && expenseTypes.length > 0) {
      return expenseTypes.map(et => ({ label: et.name, value: et.id }));
    }
    return EXCEL_EXPENSE_HEADS.map((name, idx) => ({ label: name, value: `head-${idx}` }));
  }, [expenseTypes]);

  // Filtered expenses for selected month & dropdown filters
  const monthExpenses = useMemo(() => {
    return expenses.filter(e => e.date && e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  const monthTotal = useMemo(() => {
    return monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [monthExpenses]);

  const filteredExpenses = useMemo(() => {
    return monthExpenses.filter(e => {
      const meta = parseExpenseMeta(e);

      // Operator filter
      if (selectedOperatorFilter !== 'ALL') {
        const targetOp = operators.find(o => o.id === selectedOperatorFilter);
        if (targetOp && !meta.operatorName.toLowerCase().includes(targetOp.name.toLowerCase())) {
          return false;
        }
      }

      // Pump filter
      if (selectedPumpFilter !== 'ALL') {
        const targetPump = pumps.find(p => p.id === selectedPumpFilter);
        if (targetPump) {
          const pumpKey = `Pump ${targetPump.pumpNo}`;
          if (
            !meta.pumpLabel.toLowerCase().includes(pumpKey.toLowerCase()) &&
            !meta.pumpLabel.toLowerCase().includes(targetPump.name.toLowerCase())
          ) {
            return false;
          }
        }
      }

      // Head filter
      if (selectedHeadFilter !== 'ALL') {
        if (e.expenseTypeId !== selectedHeadFilter) {
          const matchedHead = expenseTypes.find(et => et.id === selectedHeadFilter);
          if (matchedHead && e.expenseTypeName !== matchedHead.name) {
            return false;
          }
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const headMatch = e.expenseTypeName?.toLowerCase().includes(q);
        const remarkMatch = e.remarks?.toLowerCase().includes(q);
        const opMatch = meta.operatorName.toLowerCase().includes(q);
        const pumpMatch = meta.pumpLabel.toLowerCase().includes(q);
        if (!headMatch && !remarkMatch && !opMatch && !pumpMatch) {
          return false;
        }
      }

      return true;
    });
  }, [monthExpenses, selectedOperatorFilter, selectedPumpFilter, selectedHeadFilter, searchQuery, operators, pumps, expenseTypes]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredExpenses]);

  // Group filtered expenses by Date for clean daily view
  const groupedByDate = useMemo(() => {
    const map: { [date: string]: typeof filteredExpenses } = {};
    filteredExpenses.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });

    // Sort dates descending
    return Object.keys(map)
      .sort((a, b) => b.localeCompare(a))
      .map(date => ({
        date,
        items: map[date],
        dayTotal: map[date].reduce((sum, item) => sum + (item.amount || 0), 0),
      }));
  }, [filteredExpenses]);

  const handleOpenAddModal = () => {
    setExpenseDate(getTodayDateString());
    setSelectedTypeId(expenseTypes[0]?.id || '');
    setSelectedOperatorId('');
    setSelectedPumpId('');
    setAmount('150.00');
    setRemarks('');
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

    // Build formatted remarks including Operator and Pump
    let metaTag = '';
    if (selectedOperatorId && selectedPumpId) {
      metaTag = `[Operator: ${selectedOperatorId} | Pump: ${selectedPumpId}]`;
    } else if (selectedOperatorId) {
      metaTag = `[Operator: ${selectedOperatorId}]`;
    } else if (selectedPumpId) {
      metaTag = `[Pump: ${selectedPumpId}]`;
    }

    const finalRemarks = metaTag ? `${metaTag} ${remarks.trim()}`.trim() : remarks.trim();

    try {
      await addExpense({
        date: expenseDate,
        expenseTypeId: typeId,
        amount: numAmt,
        remarks: finalRemarks,
      });
      setShowAddModal(false);
      setRemarks('');
      setAmount('150.00');
      Alert.alert('Success', 'Expense logged successfully!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to log expense');
    }
  };

  const resetFilters = () => {
    setSelectedOperatorFilter('ALL');
    setSelectedPumpFilter('ALL');
    setSelectedHeadFilter('ALL');
    setSearchQuery('');
  };

  const isFiltered =
    selectedOperatorFilter !== 'ALL' ||
    selectedPumpFilter !== 'ALL' ||
    selectedHeadFilter !== 'ALL' ||
    searchQuery.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Daily Expenses & Settlements</Text>
           
        </View>

        <View style={styles.headerActions}>
          {/* Month Switcher */}
          <View style={styles.monthSwitcher}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
              <ChevronLeft size={16} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.monthText}>{selectedMonth}</Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
              <ChevronRight size={16} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenAddModal}>
            <PlusCircle size={16} color="#1F2937" />
            <Text style={styles.primaryBtnText}>Log Expense</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Cards Strip */}
      <View style={styles.kpiStrip}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Month Expenses</Text>
          <Text style={[styles.kpiValue, { color: '#EF4444' }]}>{formatCurrency(monthTotal)}</Text>
          <Text style={styles.kpiSub}>{monthExpenses.length} entries for {selectedMonth}</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Filtered Amount</Text>
          <Text style={[styles.kpiValue, { color: '#4F46E5' }]}>{formatCurrency(filteredTotal)}</Text>
          <Text style={styles.kpiSub}>{filteredExpenses.length} matching entries</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Active Heads</Text>
          <Text style={[styles.kpiValue, { color: '#059669' }]}>
            {new Set(monthExpenses.map(e => e.expenseTypeName)).size}
          </Text>
           
        </View>
      </View>

      {/* Dropdown Filters Bar */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Filter size={15} color="#475569" />
            <Text style={styles.filterSectionTitle}>Filter by Operator, Pump & Head</Text>
          </View>
          {isFiltered && (
            <TouchableOpacity onPress={resetFilters} style={styles.resetFilterBtn}>
              <Text style={styles.resetFilterText}>Reset Filters</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.dropdownGrid}>
          {/* Operator Dropdown */}
          <View style={styles.dropdownItem}>
            <DropdownPicker
              label="Choose Operator"
              options={operatorOptions}
              value={selectedOperatorFilter}
              onChange={(val) => setSelectedOperatorFilter(val)}
              placeholder="All Operators"
              allowOther={false}
              accentColor="#4F46E5"
            />
          </View>

          {/* Pump Dropdown */}
          <View style={styles.dropdownItem}>
            <DropdownPicker
              label="Choose Pump"
              options={pumpOptions}
              value={selectedPumpFilter}
              onChange={(val) => setSelectedPumpFilter(val)}
              placeholder="All Pumps"
              allowOther={false}
              accentColor="#059669"
            />
          </View>

          {/* Expense Head Dropdown */}
          <View style={styles.dropdownItem}>
            <DropdownPicker
              label="Choose Expense Head"
              options={expenseHeadOptions}
              value={selectedHeadFilter}
              onChange={(val) => setSelectedHeadFilter(val)}
              placeholder="All 33 Heads"
              allowOther={false}
              accentColor="#DC2626"
            />
          </View>
        </View>

        {/* Search text input */}
        <View style={styles.searchBar}>
          <Search size={15} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by remark, operator, pump, or head..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={15} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Main Expense Ledger Area (Date-Grouped Cards) */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={true}>
        {groupedByDate.length === 0 ? (
          <View style={styles.emptyCard}>
            <Receipt size={40} color="#94A3B8" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No expense records found</Text>
            <Text style={styles.emptySubtitle}>
              {isFiltered
                ? 'Try adjusting or resetting your operator, pump, or head filters.'
                : `No expenses logged for ${selectedMonth}. Click "+ Log Expense" to add one.`}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleOpenAddModal}>
              <PlusCircle size={15} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>Log Expense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          groupedByDate.map(group => (
            <View key={group.date} style={styles.dateGroupCard}>
              {/* Date Header */}
              <View style={styles.dateGroupHeader}>
                <View style={styles.dateGroupLeft}>
                  <CalendarDays size={16} color="#4F46E5" />
                  <Text style={styles.dateGroupTitle}>{formatDate(group.date)}</Text>
                  <View style={styles.itemCountBadge}>
                    <Text style={styles.itemCountText}>
                      {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                    </Text>
                  </View>
                </View>
                <View style={styles.dateGroupRight}>
                  <Text style={styles.dayTotalLabel}>Day Total:</Text>
                  <Text style={styles.dayTotalValue}>{formatCurrency(group.dayTotal)}</Text>
                </View>
              </View>

              {/* Items List for this Date */}
              <View style={styles.itemsList}>
                {group.items.map(item => {
                  const meta = parseExpenseMeta(item);
                  return (
                    <View key={item.id} style={styles.expenseRow}>
                      <View style={styles.expenseLeft}>
                        {/* Expense Head Icon/Pill */}
                        <View style={styles.headIconBox}>
                          <Text style={styles.headIconText}>
                            {(item.expenseTypeName || 'EX').slice(0, 2).toUpperCase()}
                          </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={styles.rowTitleLine}>
                            <Text style={styles.headTitleText}>{item.expenseTypeName}</Text>

                            {/* Operator Badge */}
                            <View
                              style={[
                                styles.badge,
                                meta.operatorName !== 'General / Bunk'
                                  ? styles.operatorBadge
                                  : styles.generalBadge,
                              ]}
                            >
                              <UserCheck
                                size={11}
                                color={meta.operatorName !== 'General / Bunk' ? '#4F46E5' : '#64748B'}
                              />
                              <Text
                                style={[
                                  styles.badgeText,
                                  meta.operatorName !== 'General / Bunk'
                                    ? styles.operatorBadgeText
                                    : styles.generalBadgeText,
                                ]}
                              >
                                {meta.operatorName}
                              </Text>
                            </View>

                            {/* Pump Badge */}
                            <View
                              style={[
                                styles.badge,
                                meta.pumpLabel !== 'General'
                                  ? styles.pumpBadge
                                  : styles.generalBadge,
                              ]}
                            >
                              <Fuel
                                size={11}
                                color={meta.pumpLabel !== 'General' ? '#059669' : '#64748B'}
                              />
                              <Text
                                style={[
                                  styles.badgeText,
                                  meta.pumpLabel !== 'General'
                                    ? styles.pumpBadgeText
                                    : styles.generalBadgeText,
                                ]}
                              >
                                {meta.pumpLabel}
                              </Text>
                            </View>
                          </View>

                          {meta.cleanRemarks ? (
                            <Text style={styles.remarksText}>{meta.cleanRemarks}</Text>
                          ) : null}
                        </View>
                      </View>

                      {/* Right: Amount & Delete Action */}
                      <View style={styles.expenseRight}>
                        <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => {
                            Alert.alert(
                              'Confirm Delete',
                              `Delete ₹${item.amount} ${item.expenseTypeName} expense?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Delete',
                                  style: 'destructive',
                                  onPress: () => deleteExpense(item.id),
                                },
                              ]
                            );
                          }}
                        >
                          <Trash2 size={15} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Log Expense Modal with Dropdowns */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Receipt size={20} color="#4F46E5" />
                <Text style={styles.modalTitle}>Log Daily Expense & Settlement</Text>
              </View>
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
                {/* Date */}
                <Text style={styles.inputLabel}>Date (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={expenseDate}
                  onChangeText={setExpenseDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />

                {/* Operator Dropdown */}
                <View style={{ marginTop: 14 }}>
                  <DropdownPicker
                    label="Operator (Settlement)"
                    options={formOperatorOptions}
                    value={selectedOperatorId}
                    onChange={(val) => setSelectedOperatorId(val)}
                    placeholder="Select Operator or General"
                    allowOther={true}
                    accentColor="#4F46E5"
                  />
                </View>

                {/* Pump Dropdown */}
                <View style={{ marginTop: 14 }}>
                  <DropdownPicker
                    label="Pump (Settlement)"
                    options={formPumpOptions}
                    value={selectedPumpId}
                    onChange={(val) => setSelectedPumpId(val)}
                    placeholder="Select Pump or General"
                    allowOther={true}
                    accentColor="#059669"
                  />
                </View>

                {/* Expense Head Dropdown */}
                <View style={{ marginTop: 14 }}>
                  <DropdownPicker
                    label="Expense Head (33 Heads) *"
                    options={formExpenseHeadOptions}
                    value={selectedTypeId}
                    onChange={(val) => setSelectedTypeId(val)}
                    placeholder="Select Expense Head"
                    allowOther={false}
                    accentColor="#DC2626"
                  />
                </View>

                {/* Amount */}
                <Text style={[styles.inputLabel, { marginTop: 14 }]}>Amount (₹) *</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                />

                {/* Remarks */}
                <Text style={[styles.inputLabel, { marginTop: 14 }]}>Remarks / Description (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={remarks}
                  onChangeText={setRemarks}
                  placeholder="e.g. Afternoon tea and snacks, pump bata, etc."
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
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveExpense}>
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.modalSaveBtnText}>Save Expense</Text>
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
    backgroundColor: '#F8FAFC',
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
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '700',
  },

  // KPI Banner
  kpiStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },

  // Filter Section
  filterSection: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  resetFilterBtn: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  resetFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  dropdownGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  dropdownItem: {
    flex: 1,
    minWidth: 200,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
  },

  // Main scroll area
  scrollArea: {
    flex: 1,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 320,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Date Group Cards
  dateGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  dateGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dateGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemCountBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  itemCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  dateGroupRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayTotalLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  dayTotalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },

  // Items in group
  itemsList: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  expenseLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headIconText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  headTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  operatorBadge: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  operatorBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  pumpBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  pumpBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  generalBadge: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  generalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  badgeText: {
    fontSize: 11,
  },
  remarksText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  expenseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EF4444',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalBody: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

