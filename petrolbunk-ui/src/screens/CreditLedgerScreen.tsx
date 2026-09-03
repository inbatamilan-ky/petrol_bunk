import {
  ArrowDownLeft,
  ArrowUpRight,
  Building,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Phone,
  PlusCircle,
  Receipt,
  Save,
  Search,
  Trash2,
  User,
  Users,
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
} from 'react-native';

import { DropdownOption, DropdownPicker } from '../components/DropdownPicker';
import { useCreditLedgerContext } from '../context/CreditLedgerContext';
import { colors } from '../theme/colors';
import { CreditPaymentMode } from '../types';
import { formatCurrency, formatDate, formatRate, getTodayDateString } from '../utils/formatters';

export const CreditLedgerScreen: React.FC = () => {
  const {
    customers = [],
    products = [],
    pumps = [],
    creditTransactions = [],
    creditPayments = [],
    addCreditSale,
    deleteCreditSale,
    recordCreditRepayment,
    deleteCreditRepayment,
    addCustomer,
  } = useCreditLedgerContext();

  const [activeTab, setActiveTab] = useState<'LEDGER' | 'SALES' | 'COLLECTIONS' | 'DIRECTORY'>('LEDGER');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getTodayDateString().slice(0, 7)); // 'YYYY-MM'

  // Primary Client Selector for Customer Khata
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => customers[0]?.id || 'ALL');

  // Filter State for Sales & Collections
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('ALL');
  const [selectedPumpFilter, setSelectedPumpFilter] = useState<string>('ALL');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
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

  // Top KPIs
  const totalOutstanding = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);
  }, [customers]);

  const monthSales = useMemo(() => {
    return creditTransactions.filter(t => t.date && t.date.startsWith(selectedMonth));
  }, [creditTransactions, selectedMonth]);

  const monthSalesTotal = useMemo(() => {
    return monthSales.reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [monthSales]);

  const monthPayments = useMemo(() => {
    return creditPayments.filter(p => p.date && p.date.startsWith(selectedMonth));
  }, [creditPayments, selectedMonth]);

  const monthPaymentsTotal = useMemo(() => {
    return monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [monthPayments]);

  // Client dropdown options for primary selector
  const clientSelectorOptions: DropdownOption[] = useMemo(() => {
    const list: DropdownOption[] = [
      { label: '📊 All Accounts (Directory Table)', value: 'ALL', subtitle: 'View full client table' }
    ];
    customers.forEach(c => {
      list.push({
        label: c.name,
        value: c.id,
        subtitle: `Due: ${formatCurrency(c.outstandingBalance || 0)}${c.phone ? ' • ' + c.phone : ''}`,
      });
    });
    return list;
  }, [customers]);

  // Dropdown Options for filters
  const customerFilterOptions: DropdownOption[] = useMemo(() => {
    const list: DropdownOption[] = [{ label: 'All Customers', value: 'ALL' }];
    customers.forEach(c => {
      list.push({
        label: c.name,
        value: c.id,
        subtitle: `Due: ${formatCurrency(c.outstandingBalance || 0)}${c.phone ? ' • ' + c.phone : ''}`,
      });
    });
    return list;
  }, [customers]);

  const pumpFilterOptions: DropdownOption[] = useMemo(() => {
    const list: DropdownOption[] = [{ label: 'All Pumps', value: 'ALL' }];
    pumps.forEach(p => {
      list.push({
        label: `Pump ${p.pumpNo} (${p.name})`,
        value: p.id,
      });
    });
    return list;
  }, [pumps]);

  const productFilterOptions: DropdownOption[] = useMemo(() => {
    const list: DropdownOption[] = [{ label: 'All Fuel Types', value: 'ALL' }];
    products.forEach(p => {
      list.push({
        label: `${p.name} (${formatRate(p.currentRate)})`,
        value: p.id,
      });
    });
    return list;
  }, [products]);

  // Form Dropdown Options
  const formCustomerOptions: DropdownOption[] = useMemo(() => {
    return customers.map(c => ({
      label: c.name,
      value: c.id,
      subtitle: `Outstanding: ${formatCurrency(c.outstandingBalance || 0)}`,
    }));
  }, [customers]);

  const formPumpOptions: DropdownOption[] = useMemo(() => {
    return pumps.map(p => ({
      label: `Pump ${p.pumpNo} (${p.name})`,
      value: p.id,
    }));
  }, [pumps]);

  const formProductOptions: DropdownOption[] = useMemo(() => {
    return products.map(p => ({
      label: `${p.name} (${formatRate(p.currentRate)})`,
      value: p.id,
      subtitle: `Rate: ₹${p.currentRate}/L`,
    }));
  }, [products]);

  const formPaymentModeOptions: DropdownOption[] = useMemo(() => [
    { label: 'Cash', value: 'Cash' },
    { label: 'Gpay / UPI', value: 'Gpay' },
    { label: 'Card (Swipe)', value: 'Card' },
    { label: 'Cheque', value: 'Cheque' },
    { label: 'Bank Transfer (NEFT/RTGS)', value: 'Bank Transfer' },
    { label: 'Paytm', value: 'Paytm' },
    { label: 'Fleet Card', value: 'FC' },
  ], []);

  // Active selected single customer object
  const activeCustomer = useMemo(() => {
    if (!selectedCustomerId || selectedCustomerId === 'ALL') {
      return customers[0] || null;
    }
    return customers.find(c => c.id === selectedCustomerId) || customers[0] || null;
  }, [selectedCustomerId, customers]);

  // Selected customer's transactions for the active month (Combined Ledger Statement)
  const customerLedgerEntries = useMemo(() => {
    if (!activeCustomer) return [];

    const custSales = creditTransactions
      .filter(t => t.customerId === activeCustomer.id && (!selectedMonth || (t.date && t.date.startsWith(selectedMonth))))
      .map(t => ({
        id: t.id,
        date: t.date,
        type: 'SALE' as const,
        description: `Credit Fuel Sale - ${t.productName || 'Fuel'}`,
        pumpInfo: t.pumpId ? `Pump: ${t.pumpId}` : '',
        details: `${t.litres} L @ ₹${t.rate}/L`,
        debit: t.amount,
        credit: 0,
        remarks: t.remarks || '',
        raw: t,
      }));

    const custPayments = creditPayments
      .filter(p => p.customerId === activeCustomer.id && (!selectedMonth || (p.date && p.date.startsWith(selectedMonth))))
      .map(p => ({
        id: p.id,
        date: p.date,
        type: 'PAYMENT' as const,
        description: `Collection Received (${p.paymentMode})`,
        pumpInfo: p.paymentMode,
        details: `Mode: ${p.paymentMode}`,
        debit: 0,
        credit: p.amount,
        remarks: '',
        raw: p,
      }));

    // Combine and sort chronologically
    const combined = [...custSales, ...custPayments].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return dateDiff !== 0 ? dateDiff : a.type === 'SALE' ? -1 : 1;
    });

    return combined;
  }, [activeCustomer, creditTransactions, creditPayments, selectedMonth]);

  // Selected customer's month summary
  const customerMonthTotals = useMemo(() => {
    if (!activeCustomer) return { sales: 0, payments: 0, salesCount: 0, paymentsCount: 0 };
    const sales = creditTransactions
      .filter(t => t.customerId === activeCustomer.id && t.date && t.date.startsWith(selectedMonth))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const salesCount = creditTransactions.filter(t => t.customerId === activeCustomer.id && t.date && t.date.startsWith(selectedMonth)).length;

    const payments = creditPayments
      .filter(p => p.customerId === activeCustomer.id && p.date && p.date.startsWith(selectedMonth))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const paymentsCount = creditPayments.filter(p => p.customerId === activeCustomer.id && p.date && p.date.startsWith(selectedMonth)).length;

    return { sales, payments, salesCount, paymentsCount };
  }, [activeCustomer, creditTransactions, creditPayments, selectedMonth]);

  // Filtered lists for Sales & Collections tabs
  const filteredSales = useMemo(() => {
    return monthSales.filter(tx => {
      if (selectedCustomerFilter !== 'ALL' && tx.customerId !== selectedCustomerFilter) return false;
      if (selectedPumpFilter !== 'ALL' && tx.pumpId !== selectedPumpFilter) return false;
      if (selectedProductFilter !== 'ALL' && tx.productId !== selectedProductFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const custMatch = tx.customerName?.toLowerCase().includes(q);
        const prodMatch = tx.productName?.toLowerCase().includes(q);
        const remarkMatch = tx.remarks?.toLowerCase().includes(q);
        if (!custMatch && !prodMatch && !remarkMatch) return false;
      }
      return true;
    });
  }, [monthSales, selectedCustomerFilter, selectedPumpFilter, selectedProductFilter, searchQuery]);

  const filteredPayments = useMemo(() => {
    return monthPayments.filter(p => {
      if (selectedCustomerFilter !== 'ALL' && p.customerId !== selectedCustomerFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const custMatch = p.customerName?.toLowerCase().includes(q);
        const modeMatch = p.paymentMode.toLowerCase().includes(q);
        if (!custMatch && !modeMatch) return false;
      }
      return true;
    });
  }, [monthPayments, selectedCustomerFilter, searchQuery]);

  // Filtered customer list for Directory tab
  const filteredDirectoryCustomers = useMemo(() => {
    return customers.filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = c.name.toLowerCase().includes(q);
        const phoneMatch = c.phone && c.phone.includes(q);
        if (!nameMatch && !phoneMatch) return false;
      }
      return true;
    });
  }, [customers, searchQuery]);

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
    const custId = saleCustId || activeCustomer?.id || customers[0]?.id;
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
    const custId = payCustId || activeCustomer?.id || customers[0]?.id;
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

  const resetFilters = () => {
    setSelectedCustomerFilter('ALL');
    setSelectedPumpFilter('ALL');
    setSelectedProductFilter('ALL');
    setSearchQuery('');
  };

  const isFiltered =
    selectedCustomerFilter !== 'ALL' ||
    selectedPumpFilter !== 'ALL' ||
    selectedProductFilter !== 'ALL' ||
    searchQuery.trim().length > 0;

  const selectedProductObj = products.find(p => p.id === (saleProductId || products[0]?.id));
  const estimatedSaleAmt = (parseFloat(saleLitres) || 0) * (selectedProductObj?.currentRate || 0);

  const openSaleModalForCustomer = (custId?: string) => {
    const targetId = custId || activeCustomer?.id || customers[0]?.id || '';
    setSaleCustId(targetId);
    setSalePumpId(pumps[0]?.id || '');
    setSaleProductId(products[0]?.id || '');
    setShowAddSaleModal(true);
  };

  const openCollectionModalForCustomer = (custId?: string) => {
    const targetId = custId || activeCustomer?.id || customers[0]?.id || '';
    setPayCustId(targetId);
    setShowRepaymentModal(true);
  };

  return (
    <View style={styles.container}>
      {/* Top Header Banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Credit Khata & Customer Ledger</Text>
           
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

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setShowNewCustModal(true)}
          >
             
            <Text style={styles.secondaryBtnText}>+ New Customer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => openSaleModalForCustomer()}
          >
            <PlusCircle size={15} color="#D97706" />
            <Text style={styles.primaryBtnText}>Credit Sale</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#10B981', borderColor: '#10B981' }]}
            onPress={() => openCollectionModalForCustomer()}
          >
            <ArrowDownLeft size={15} color="#FFFFFF" />
            <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>Collection</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Metrics Strip */}
      <View style={styles.kpiStrip}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Outstanding</Text>
          <Text style={[styles.kpiValue, { color: '#EF4444' }]}>{formatCurrency(totalOutstanding)}</Text>
          <Text style={styles.kpiSub}>{customers.length} registered credit clients</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Month Credit Sales</Text>
          <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>{formatCurrency(monthSalesTotal)}</Text>
          <Text style={styles.kpiSub}>{monthSales.length} sales in {selectedMonth}</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Month Collections</Text>
          <Text style={[styles.kpiValue, { color: '#10B981' }]}>{formatCurrency(monthPaymentsTotal)}</Text>
          <Text style={styles.kpiSub}>{monthPayments.length} receipts in {selectedMonth}</Text>
        </View>
      </View>

      {/* Primary Navigation Tabs */}
      <View style={styles.tabNav}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'LEDGER' && styles.tabBtnActive]}
          onPress={() => setActiveTab('LEDGER')}
        >
          <FileText size={15} color={activeTab === 'LEDGER' ? '#FFF' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'LEDGER' && styles.tabBtnTextActive]}>
            Customer Khata Statement
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'SALES' && styles.tabBtnActive]}
          onPress={() => setActiveTab('SALES')}
        >
          <ArrowUpRight size={15} color={activeTab === 'SALES' ? '#FFF' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'SALES' && styles.tabBtnTextActive]}>
            Credit Sales Log ({filteredSales.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'COLLECTIONS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('COLLECTIONS')}
        >
          <ArrowDownLeft size={15} color={activeTab === 'COLLECTIONS' ? '#FFF' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'COLLECTIONS' && styles.tabBtnTextActive]}>
            Collections Log ({filteredPayments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'DIRECTORY' && styles.tabBtnActive]}
          onPress={() => setActiveTab('DIRECTORY')}
        >
          <Users size={15} color={activeTab === 'DIRECTORY' ? '#FFF' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'DIRECTORY' && styles.tabBtnTextActive]}>
            All Customers Table ({customers.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={true}>
        {/* ========================================================================= */}
        {/* TAB 1: CUSTOMER KHATA STATEMENT (PRIMARY CLIENT DROPDOWN SELECTOR VIEW) */}
        {/* ========================================================================= */}
        {activeTab === 'LEDGER' && (
          <View style={{ gap: 16 }}>
            {/* Prominent Client Dropdown Picker Card */}
            <View style={styles.clientSelectorCard}>
              <View style={styles.clientSelectorHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Building size={18} color="#4F46E5" />
                  <Text style={styles.clientSelectorTitle}>Select Client Account</Text>
                </View>
                <TouchableOpacity
                  style={styles.newCustLink}
                  onPress={() => setShowNewCustModal(true)}
                >
                  <PlusCircle size={14} color="#4F46E5" />
                  <Text style={styles.newCustLinkText}>Add New Client</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 8 }}>
                <DropdownPicker
                  label="Search Client*"
                  options={clientSelectorOptions}
                  value={selectedCustomerId}
                  onChange={(val) => {
                    if (val === 'ALL') {
                      setActiveTab('DIRECTORY');
                    } else {
                      setSelectedCustomerId(val);
                    }
                  }}
                  placeholder="Type or select a customer name / phone..."
                  allowOther={false}
                  accentColor="#4F46E5"
                  maxListHeight={300}
                />
              </View>
            </View>

            {/* Selected Customer Dashboard Profile Card */}
            {activeCustomer ? (
              <View style={styles.customerProfileCard}>
                <View style={styles.profileHeaderRow}>
                  <View style={styles.profileInfoLeft}>
                    <View style={styles.profileAvatar}>
                      <Text style={styles.profileAvatarText}>
                        {activeCustomer.name ? activeCustomer.name.slice(0, 2).toUpperCase() : 'CU'}
                      </Text>
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.profileName}>{activeCustomer.name}</Text>
                        <View style={[
                          styles.dueBadge,
                          (activeCustomer.outstandingBalance || 0) > 0 ? styles.dueBadgeRed : styles.dueBadgeGreen
                        ]}>
                          <Text style={[
                            styles.dueBadgeText,
                            (activeCustomer.outstandingBalance || 0) > 0 ? { color: '#B91C1C' } : { color: '#047857' }
                          ]}>
                            {(activeCustomer.outstandingBalance || 0) > 0 ? 'Payment Due' : 'Fully Settled'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.profileMetaRow}>
                        {activeCustomer.phone ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Phone size={12} color="#64748B" />
                            <Text style={styles.profileMetaText}>{activeCustomer.phone}</Text>
                          </View>
                        ) : null}
                         
                      </View>
                    </View>
                  </View>

                  <View style={styles.profileActionsRight}>
                    <TouchableOpacity
                      style={styles.actionBtnSale}
                      onPress={() => openSaleModalForCustomer(activeCustomer.id)}
                    >
                      <PlusCircle size={14} color="#D97706" />
                      <Text style={styles.actionBtnSaleText}>Sale</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnCollect}
                      onPress={() => openCollectionModalForCustomer(activeCustomer.id)}
                    >
                      <ArrowDownLeft size={14} color="#059669" />
                      <Text style={styles.actionBtnCollectText}>Collect</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.profileStatsRow}>
                  <View style={styles.profileStatBox}>
                    <Text style={styles.profileStatLabel}>Current Outstanding Due</Text>
                    <Text style={[
                      styles.profileStatVal,
                      (activeCustomer.outstandingBalance || 0) > 0 ? { color: '#DC2626' } : { color: '#059669' }
                    ]}>
                      {formatCurrency(activeCustomer.outstandingBalance || 0)}
                    </Text>
                  </View>

                  <View style={styles.profileStatBox}>
                    <Text style={styles.profileStatLabel}>{selectedMonth} Fuel Purchases</Text>
                    <Text style={[styles.profileStatVal, { color: '#D97706' }]}>
                      {formatCurrency(customerMonthTotals.sales)}
                    </Text>
                    <Text style={styles.profileStatSub}>{customerMonthTotals.salesCount} credit bills</Text>
                  </View>

                  <View style={styles.profileStatBox}>
                    <Text style={styles.profileStatLabel}>{selectedMonth} Payments Collected</Text>
                    <Text style={[styles.profileStatVal, { color: '#059669' }]}>
                      {formatCurrency(customerMonthTotals.payments)}
                    </Text>
                    <Text style={styles.profileStatSub}>{customerMonthTotals.paymentsCount} payments</Text>
                  </View>
                </View>

                {/* Ledger Statement Table for this Selected Customer */}
                <View style={styles.ledgerSection}>
                  <View style={styles.ledgerHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <FileText size={16} color="#334155" />
                      <Text style={styles.ledgerSectionTitle}>
                        Transaction History ({selectedMonth})
                      </Text>
                    </View>
                    <Text style={styles.ledgerCountBadge}>
                      {customerLedgerEntries.length} Records
                    </Text>
                  </View>

                  {customerLedgerEntries.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Receipt size={36} color="#94A3B8" style={{ marginBottom: 8 }} />
                      <Text style={styles.emptyTitle}>No transactions recorded for {selectedMonth}</Text>
                       
                    </View>
                  ) : (
                    <View style={styles.statementTable}>
                      {/* Table Header */}
                      <View style={styles.statementTableHeader}>
                        <Text style={[styles.stmtColHead, { width: 100 }]}>DATE</Text>
                        <Text style={[styles.stmtColHead, { width: 90 }]}>TYPE</Text>
                        <Text style={[styles.stmtColHead, { flex: 2, minWidth: 160 }]}>DETAILS</Text>
                        <Text style={[styles.stmtColHead, { width: 110, textAlign: 'right' }]}>DEBIT (+ SALE)</Text>
                        <Text style={[styles.stmtColHead, { width: 110, textAlign: 'right' }]}>CREDIT (- PAID)</Text>
                        <Text style={[styles.stmtColHead, { width: 50, textAlign: 'center' }]}>ACTION</Text>
                      </View>

                      {/* Table Rows */}
                      {customerLedgerEntries.map((item, idx) => (
                        <View
                          key={`${item.type}-${item.id}`}
                          style={[
                            styles.statementTableRow,
                            idx % 2 === 1 && { backgroundColor: '#F8FAFC' },
                          ]}
                        >
                          <Text style={[styles.stmtCellText, { width: 100, fontWeight: '600' }]}>
                            {formatDate(item.date)}
                          </Text>

                          <View style={{ width: 90 }}>
                            {item.type === 'SALE' ? (
                              <View style={styles.typeBadgeSale}>
                                <Text style={styles.typeBadgeSaleText}>Sale</Text>
                              </View>
                            ) : (
                              <View style={styles.typeBadgePay}>
                                <Text style={styles.typeBadgePayText}>Payment</Text>
                              </View>
                            )}
                          </View>

                          <View style={{ flex: 2, minWidth: 160 }}>
                            <Text style={styles.stmtCellTitle}>{item.description}</Text>
                            <Text style={styles.stmtCellSub}>{item.details}</Text>
                            {item.remarks ? (
                              <Text style={styles.stmtRemarks}>Note: {item.remarks}</Text>
                            ) : null}
                          </View>

                          <Text style={[styles.stmtCellAmount, { width: 110, textAlign: 'right', color: item.debit > 0 ? '#D97706' : '#94A3B8' }]}>
                            {item.debit > 0 ? formatCurrency(item.debit) : '—'}
                          </Text>

                          <Text style={[styles.stmtCellAmount, { width: 110, textAlign: 'right', color: item.credit > 0 ? '#059669' : '#94A3B8' }]}>
                            {item.credit > 0 ? formatCurrency(item.credit) : '—'}
                          </Text>

                          <View style={{ width: 50, alignItems: 'center' }}>
                            <TouchableOpacity
                              style={styles.deleteBtnSmall}
                              onPress={() => {
                                if (item.type === 'SALE') {
                                  Alert.alert('Delete Sale', `Delete ₹${item.debit} credit sale?`, [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Delete', style: 'destructive', onPress: () => deleteCreditSale(item.id) },
                                  ]);
                                } else {
                                  Alert.alert('Delete Payment', `Delete ₹${item.credit} payment?`, [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Delete', style: 'destructive', onPress: () => deleteCreditRepayment(item.id) },
                                  ]);
                                }
                              }}
                            >
                              <Trash2 size={13} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Users size={36} color="#94A3B8" style={{ marginBottom: 8 }} />
                <Text style={styles.emptyTitle}>No client accounts registered yet</Text>
                <Text style={styles.emptySubtitle}>Click "+ New Customer" above to add your first client.</Text>
              </View>
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CREDIT SALES LOG */}
        {/* ========================================================================= */}
        {activeTab === 'SALES' && (
          <View style={{ gap: 12 }}>
            {/* Filter Bar */}
            <View style={styles.filterSection}>
              <View style={styles.filterHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Filter size={15} color="#475569" />
                  <Text style={styles.filterSectionTitle}>Filter Credit Sales</Text>
                </View>
                {isFiltered && (
                  <TouchableOpacity onPress={resetFilters} style={styles.resetFilterBtn}>
                    <Text style={styles.resetFilterText}>Reset Filters</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.dropdownGrid}>
                <View style={styles.dropdownItem}>
                  <DropdownPicker
                    label="Customer"
                    options={customerFilterOptions}
                    value={selectedCustomerFilter}
                    onChange={(val) => setSelectedCustomerFilter(val)}
                    placeholder="All Customers"
                    allowOther={false}
                    accentColor="#4F46E5"
                  />
                </View>
                <View style={styles.dropdownItem}>
                  <DropdownPicker
                    label="Pump"
                    options={pumpFilterOptions}
                    value={selectedPumpFilter}
                    onChange={(val) => setSelectedPumpFilter(val)}
                    placeholder="All Pumps"
                    allowOther={false}
                    accentColor="#059669"
                  />
                </View>
                <View style={styles.dropdownItem}>
                  <DropdownPicker
                    label="Fuel Product"
                    options={productFilterOptions}
                    value={selectedProductFilter}
                    onChange={(val) => setSelectedProductFilter(val)}
                    placeholder="All Fuel Types"
                    allowOther={false}
                    accentColor="#F59E0B"
                  />
                </View>
              </View>

              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Search size={15} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by customer, remark, product..."
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

            {/* Sales List */}
            <View style={styles.listContainer}>
              {filteredSales.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Receipt size={36} color="#94A3B8" style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyTitle}>No credit sales found for {selectedMonth}</Text>
                  <Text style={styles.emptySubtitle}>Click "+ Credit Sale" to record a new sale.</Text>
                </View>
              ) : (
                filteredSales.map(tx => (
                  <View key={tx.id} style={styles.txCard}>
                    <View style={styles.txLeft}>
                      <View style={[styles.txIconBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                        <ArrowUpRight size={18} color="#D97706" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text style={styles.txCustomer}>{tx.customerName || 'Customer'}</Text>
                          <View style={styles.fuelBadge}>
                            <Text style={styles.fuelBadgeText}>{tx.productName || 'Fuel'}</Text>
                          </View>
                        </View>
                        <Text style={styles.txSub}>
                          {formatDate(tx.date)} • {tx.litres} Litres @ ₹{tx.rate}/L
                        </Text>
                        {tx.remarks ? <Text style={styles.txRemarks}>{tx.remarks}</Text> : null}
                      </View>
                    </View>

                    <View style={styles.txRight}>
                      <Text style={styles.txAmount}>{formatCurrency(tx.amount)}</Text>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => {
                          Alert.alert('Confirm Delete', `Delete ₹${tx.amount} credit sale for ${tx.customerName}?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteCreditSale(tx.id) },
                          ]);
                        }}
                      >
                        <Trash2 size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: COLLECTIONS LOG */}
        {/* ========================================================================= */}
        {activeTab === 'COLLECTIONS' && (
          <View style={{ gap: 12 }}>
            {/* Filter Bar */}
            <View style={styles.filterSection}>
              <View style={styles.filterHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Filter size={15} color="#475569" />
                  <Text style={styles.filterSectionTitle}>Filter Customer Payments</Text>
                </View>
                {isFiltered && (
                  <TouchableOpacity onPress={resetFilters} style={styles.resetFilterBtn}>
                    <Text style={styles.resetFilterText}>Reset Filters</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.dropdownGrid}>
                <View style={styles.dropdownItem}>
                  <DropdownPicker
                    label="Customer"
                    options={customerFilterOptions}
                    value={selectedCustomerFilter}
                    onChange={(val) => setSelectedCustomerFilter(val)}
                    placeholder="All Customers"
                    allowOther={false}
                    accentColor="#4F46E5"
                  />
                </View>
              </View>

              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Search size={15} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by customer, payment mode..."
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

            {/* Payments List */}
            <View style={styles.listContainer}>
              {filteredPayments.length === 0 ? (
                <View style={styles.emptyCard}>
                  <ArrowDownLeft size={36} color="#94A3B8" style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyTitle}>No repayments found for {selectedMonth}</Text>
                  <Text style={styles.emptySubtitle}>Click "+ Collection" to log a customer payment.</Text>
                </View>
              ) : (
                filteredPayments.map(p => (
                  <View key={p.id} style={styles.txCard}>
                    <View style={styles.txLeft}>
                      <View style={[styles.txIconBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                        <ArrowDownLeft size={18} color="#059669" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text style={styles.txCustomer}>{p.customerName || 'Customer'}</Text>
                          <View style={styles.payModeBadge}>
                            <Text style={styles.payModeBadgeText}>{p.paymentMode}</Text>
                          </View>
                        </View>
                        <Text style={styles.txSub}>Received on {formatDate(p.date)}</Text>
                      </View>
                    </View>

                    <View style={styles.txRight}>
                      <Text style={[styles.txAmount, { color: '#10B981' }]}>{formatCurrency(p.amount)}</Text>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => {
                          Alert.alert('Confirm Delete', `Delete repayment of ₹${p.amount} from ${p.customerName}?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteCreditRepayment(p.id) },
                          ]);
                        }}
                      >
                        <Trash2 size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: ALL CUSTOMERS TABLE DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === 'DIRECTORY' && (
          <View style={styles.sectionCard}>
            <View style={styles.directoryHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>All Customer Accounts Directory</Text>
                <Text style={styles.sectionSubtitle}>
                  Compact ledger summary of all credit parties ({filteredDirectoryCustomers.length})
                </Text>
              </View>

              {/* Search in Directory */}
              <View style={[styles.searchBar, { width: 280 }]}>
                <Search size={14} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search customer name or phone..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: '100%' }}>
              <View style={styles.directoryTable}>
                {/* Table Header */}
                <View style={styles.directoryTableHeader}>
                  <Text style={[styles.dirColHead, { width: 220 }]}>PARTY / CLIENT NAME</Text>
                  <Text style={[styles.dirColHead, { width: 140 }]}>CONTACT PHONE</Text>
                  <Text style={[styles.dirColHead, { width: 140, textAlign: 'right' }]}>OUTSTANDING DUE</Text>
                  <Text style={[styles.dirColHead, { width: 110, textAlign: 'center' }]}>STATUS</Text>
                  <Text style={[styles.dirColHead, { width: 220, textAlign: 'right' }]}>QUICK ACTIONS</Text>
                </View>

                {/* Table Rows */}
                {filteredDirectoryCustomers.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No customer accounts found</Text>
                  </View>
                ) : (
                  filteredDirectoryCustomers.map((cust, idx) => (
                    <View
                      key={cust.id}
                      style={[
                        styles.directoryTableRow,
                        idx % 2 === 1 && { backgroundColor: '#F8FAFC' },
                      ]}
                    >
                      {/* Name */}
                      <View style={{ width: 220, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={styles.customerAvatarSmall}>
                          <Text style={styles.avatarTextSmall}>
                            {cust.name ? cust.name.slice(0, 2).toUpperCase() : 'CU'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cellBoldText} numberOfLines={1}>{cust.name}</Text>
                          <Text style={styles.cellSubText}>ID: {cust.id}</Text>
                        </View>
                      </View>

                      {/* Phone */}
                      <Text style={[styles.dirCellText, { width: 140 }]}>
                        {cust.phone || '—'}
                      </Text>

                      {/* Outstanding */}
                      <Text style={[
                        styles.dirCellAmount,
                        { width: 140, textAlign: 'right', color: (cust.outstandingBalance || 0) > 0 ? '#DC2626' : '#059669' }
                      ]}>
                        {formatCurrency(cust.outstandingBalance || 0)}
                      </Text>

                      {/* Status */}
                      <View style={{ width: 110, alignItems: 'center' }}>
                        <View style={[
                          styles.statusPill,
                          (cust.outstandingBalance || 0) > 0 ? styles.statusPillDue : styles.statusPillSettled
                        ]}>
                          <Text style={[
                            styles.statusPillText,
                            (cust.outstandingBalance || 0) > 0 ? { color: '#B91C1C' } : { color: '#047857' }
                          ]}>
                            {(cust.outstandingBalance || 0) > 0 ? 'Due' : 'Settled'}
                          </Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={{ width: 220, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.dirActionBtnStatement}
                          onPress={() => {
                            setSelectedCustomerId(cust.id);
                            setActiveTab('LEDGER');
                          }}
                        >
                          <FileText size={12} color="#4F46E5" />
                          <Text style={styles.dirActionBtnStatementText}>Statement</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.dirActionBtnSale}
                          onPress={() => openSaleModalForCustomer(cust.id)}
                        >
                          <PlusCircle size={12} color="#D97706" />
                          <Text style={styles.dirActionBtnSaleText}>+ Sale</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.dirActionBtnPay}
                          onPress={() => openCollectionModalForCustomer(cust.id)}
                        >
                          <ArrowDownLeft size={12} color="#059669" />
                          <Text style={styles.dirActionBtnPayText}>+ Pay</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Record Credit Sale Modal */}
      <Modal visible={showAddSaleModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <PlusCircle size={20} color="#D97706" />
                <Text style={styles.modalTitle}>Record Credit Sale</Text>
              </View>
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
                <Text style={styles.inputLabel}>Date (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={saleDate}
                  onChangeText={setSaleDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />

                <View style={{ marginTop: 14 }}>
                  <DropdownPicker
                    label="Customer (Khata Account) *"
                    options={formCustomerOptions}
                    value={saleCustId}
                    onChange={(val) => setSaleCustId(val)}
                    placeholder="Choose Customer"
                    allowOther={false}
                    accentColor="#4F46E5"
                  />
                </View>

                <View style={{ marginTop: 14 }}>
                  <DropdownPicker
                    label="Dispensing Pump *"
                    options={formPumpOptions}
                    value={salePumpId}
                    onChange={(val) => setSalePumpId(val)}
                    placeholder="Choose Pump"
                    allowOther={false}
                    accentColor="#059669"
                  />
                </View>

                <View style={{ marginTop: 14 }}>
                  <DropdownPicker
                    label="Fuel Product *"
                    options={formProductOptions}
                    value={saleProductId}
                    onChange={(val) => setSaleProductId(val)}
                    placeholder="Choose Product"
                    allowOther={false}
                    accentColor="#F59E0B"
                  />
                </View>

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>Litres Sold *</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={saleLitres}
                  onChangeText={setSaleLitres}
                  placeholder="100.00"
                  placeholderTextColor={colors.textMuted}
                />

                <View style={styles.calcPreviewBox}>
                  <Text style={styles.calcPreviewLabel}>Total Calculated Amount:</Text>
                  <Text style={styles.calcPreviewVal}>{formatCurrency(estimatedSaleAmt)}</Text>
                </View>

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>Remarks (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={saleRemarks}
                  onChangeText={setSaleRemarks}
                  placeholder="e.g. TN-01-AB-1234, Driver: Raja"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddSaleModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: '#D97706' }]} onPress={handleCreateSale}>
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.modalSaveBtnText}>Save Sale</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Record Repayment Modal */}
      <Modal visible={showRepaymentModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ArrowDownLeft size={20} color="#10B981" />
                <Text style={styles.modalTitle}>Record Customer Collection</Text>
              </View>
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
                <Text style={styles.inputLabel}>Date (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={payDate}
                  onChangeText={setPayDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />

                <View style={{ marginTop: 14 }}>
                  <DropdownPicker
                    label="Customer (Khata Account) *"
                    options={formCustomerOptions}
                    value={payCustId}
                    onChange={(val) => setPayCustId(val)}
                    placeholder="Choose Customer"
                    allowOther={false}
                    accentColor="#4F46E5"
                  />
                </View>

                <View style={{ marginTop: 14 }}>
                  <DropdownPicker
                    label="Payment Mode *"
                    options={formPaymentModeOptions}
                    value={payMode}
                    onChange={(val) => setPayMode(val as CreditPaymentMode)}
                    placeholder="Select Payment Mode"
                    allowOther={false}
                    accentColor="#10B981"
                  />
                </View>

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>Amount Collected (₹) *</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={payAmount}
                  onChangeText={setPayAmount}
                  placeholder="10000.00"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowRepaymentModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: '#10B981' }]} onPress={handleRecordRepayment}>
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.modalSaveBtnText}>Save Collection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Customer Modal */}
      <Modal visible={showNewCustModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <User size={20} color="#4F46E5" />
                <Text style={styles.modalTitle}>Add Customer Account</Text>
              </View>
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
                  placeholder="e.g. KPJ Transports, Sathish"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />

                <Text style={[styles.inputLabel, { marginTop: 14 }]}>Phone Number (Optional)</Text>
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
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleCreateCustomer}>
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.modalSaveBtnText}>Save Customer</Text>
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 8,
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  primaryBtnText: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 24,
  },
  secondaryBtnText: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: '700',
  },
  kpiStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
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
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },

  // Tabs
  tabNav: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginVertical: 6,
    flexWrap: 'wrap',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  scrollArea: {
    flex: 1,
  },

  // Client Selector Card
  clientSelectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  clientSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientSelectorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  newCustLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newCustLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },

  // Customer Profile Card
  customerProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 16,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  profileInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },
  profileAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4F46E5',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  profileMetaText: {
    fontSize: 12,
    color: '#64748B',
  },
  dueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  dueBadgeRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  dueBadgeGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  dueBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  profileActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnSale: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnSaleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  actionBtnCollect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnCollectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  // Profile Stats
  profileStatsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  profileStatBox: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  profileStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  profileStatVal: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  profileStatSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },

  // Statement Section
  ledgerSection: {
    marginTop: 4,
    gap: 10,
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ledgerSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  ledgerCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },

  statementTable: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  statementTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stmtColHead: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  statementTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  stmtCellText: {
    fontSize: 12,
    color: '#334155',
  },
  stmtCellTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  stmtCellSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  stmtRemarks: {
    fontSize: 10,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 1,
  },
  stmtCellAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  typeBadgeSale: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignSelf: 'flex-start',
  },
  typeBadgeSaleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  typeBadgePay: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignSelf: 'flex-start',
  },
  typeBadgePayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  deleteBtnSmall: {
    padding: 5,
    borderRadius: 4,
    backgroundColor: '#FEF2F2',
  },

  // Directory View
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  directoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  directoryTable: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginTop: 6,
  },
  directoryTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dirColHead: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  directoryTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  customerAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  avatarTextSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  cellBoldText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cellSubText: {
    fontSize: 11,
    color: '#64748B',
  },
  dirCellText: {
    fontSize: 12,
    color: '#334155',
  },
  dirCellAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillDue: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusPillSettled: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dirActionBtnStatement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  dirActionBtnStatementText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  dirActionBtnSale: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  dirActionBtnSaleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  dirActionBtnPay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  dirActionBtnPayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },

  // Filter Section
  filterSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
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

  // Sales & Collections Cards List
  listContainer: {
    gap: 10,
  },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 12,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  txLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txCustomer: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  fuelBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  fuelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  payModeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  payModeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  txSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  txRemarks: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontStyle: 'italic',
  },
  txRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#D97706',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },

  emptyCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },

  // Modals
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
  calcPreviewBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  calcPreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  calcPreviewVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#B45309',
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
