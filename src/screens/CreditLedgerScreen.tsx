import React, { useState } from 'react';
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
  CreditCard,
  PlusCircle,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  Phone,
  Truck,
  Building,
  User,
  Share2,
} from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { ThermalReceiptModal, ThermalReceiptData } from '../components/ThermalReceiptModal';
import { DropdownPicker, DropdownOption } from '../components/DropdownPicker';
import { DatePickerInput } from '../components/DatePickerInput';
import { NoDataView } from '../components/NoDataView';
import { usePaymentModes } from '../hooks/useMasters';
import { colors, typography } from '../theme/colors';
import { formatCurrency, formatLitres, formatDate, getTodayDateString } from '../utils/formatters';
import { exportToCSV } from '../utils/exportHelpers';
import { CreditCustomer, CreditTransaction, CreditPayment } from '../types';

export const CreditLedgerScreen: React.FC = () => {
  const {
    customers,
    products,
    pumps,
    creditTransactions,
    creditPayments,
    addCreditSale,
    recordCreditRepayment,
    addCustomer,
  } = useBunk();

  const { options: paymentModeOptions } = usePaymentModes();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');

  // Modals
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [showNewCustModal, setShowNewCustModal] = useState(false);

  // New Credit Sale Form
  const [saleCustId, setSaleCustId] = useState(customers[0]?.id || '');
  const [salePumpId, setSalePumpId] = useState(pumps[0]?.id || '');
  const [saleProductId, setSaleProductId] = useState(products[0]?.id || '');
  const [saleVehicleNo, setSaleVehicleNo] = useState('');
  const [saleLitres, setSaleLitres] = useState('100.00');
  const [saleDriverName, setSaleDriverName] = useState('');
  const [saleRemarks, setSaleRemarks] = useState('');

  const [saleAmount, setSaleAmount] = useState('');
const [amountManuallyEdited, setAmountManuallyEdited] = useState(false);

React.useEffect(() => {
  if (!amountManuallyEdited) {
    const rate = products.find((p) => p.id === saleProductId)?.currentRate || 92.71;
    const litresNum = parseFloat(saleLitres) || 0;
    const computed = Math.round(litresNum * rate * 100) / 100;
    setSaleAmount(computed ? computed.toFixed(2) : '');
  }
}, [saleLitres, saleProductId, amountManuallyEdited, products]);

  // Repayment Form
  const [payCustId, setPayCustId] = useState(customers[0]?.id || '');
  const [payAmount, setPayAmount] = useState('50000');
  const [payMode, setPayMode] = useState<CreditPayment['paymentMode']>('Bank Transfer');
  const [payRefNo, setPayRefNo] = useState('NEFT-');
  const [payNotes, setPayNotes] = useState('');

  // New Customer Form
  const [newCustCode, setNewCustCode] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPerson, setNewCustPerson] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustLimit, setNewCustLimit] = useState('500000');
  const [newCustOpening, setNewCustOpening] = useState('0');
  const [newCustVehicles, setNewCustVehicles] = useState('');

  // Thermal Receipt Preview
  const [receiptData, setReceiptData] = useState<ThermalReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  // Filtered customer list
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.vehicleNumbers.some((v) => v.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Ledger transactions for selected customer
  const customerSales = creditTransactions.filter((t) => t.customerId === selectedCustomer?.id);
  const customerPays = creditPayments.filter((p) => p.customerId === selectedCustomer?.id);

  // Build combined ledger history sorted by date
  interface LedgerEntry {
    id: string;
    date: string;
    type: 'DEBIT_SALE' | 'CREDIT_PAYMENT';
    refNo: string;
    particulars: string;
    debitAmount: number;
    creditAmount: number;
  }

  const allEntries: LedgerEntry[] = [
    ...customerSales.map((s) => ({
      id: s.id,
      date: s.date,
      type: 'DEBIT_SALE' as const,
      refNo: s.slipNo,
      particulars: `Fuel Sale: ${s.productName} (${formatLitres(s.litres)} @ ₹${s.rate}) - Veh: ${s.vehicleNo}`,
      debitAmount: s.amount,
      creditAmount: 0,
    })),
    ...customerPays.map((p) => ({
      id: p.id,
      date: p.date,
      type: 'CREDIT_PAYMENT' as const,
      refNo: p.receiptNo,
      particulars: `Payment Received (${p.paymentMode}) - Ref: ${p.referenceNo || 'Direct'}`,
      debitAmount: 0,
      creditAmount: p.amount,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const ledgerEntries = selectedDateFilter
    ? allEntries.filter((e) => e.date === selectedDateFilter)
    : allEntries;

  // Handle Add Credit Sale Submit
  const handleAddSaleSubmit = async () => {
    const cust = customers.find((c) => c.id === saleCustId);
    const prod = products.find((p) => p.id === saleProductId);
    const pump = pumps.find((p) => p.id === salePumpId);
    const litresNum = parseFloat(saleLitres) || 0;
    const rate = prod?.currentRate || 95.0;
    const totalAmount = parseFloat(saleAmount) || Math.round(litresNum * rate * 100) / 100;

    if (!cust || litresNum <= 0 || totalAmount <= 0) return;

    const newSale = await addCreditSale({
      customerId: cust.id,
      customerName: cust.name,
      customerCode: cust.code,
      pumpId: pump?.id || 'pump-1',
      pumpNo: pump?.pumpNo || 1,
      productId: prod?.id || 'prod-1',
      productName: prod?.name || 'HSD (Diesel)',
      vehicleNo: saleVehicleNo || cust.vehicleNumbers[0] || 'TN 49 AB 1000',
      litres: litresNum,
      rate,
      amount: totalAmount,
      driverName: saleDriverName,
      remarks: saleRemarks,
    });

    setShowAddSaleModal(false);

    // Show thermal slip
    const slip: ThermalReceiptData = {
      title: 'CREDIT FUEL CHIT',
      receiptNo: newSale.slipNo,
      dateStr: newSale.date,
      customerName: cust.name,
      vehicleNo: newSale.vehicleNo,
      driverName: newSale.driverName,
      pumpNo: newSale.pumpNo,
      items: [
        {
          name: newSale.productName,
          qty: formatLitres(newSale.litres),
          rate: `₹${newSale.rate}`,
          amount: newSale.amount,
        },
      ],
      subtotal: newSale.amount,
      netPayable: newSale.amount,
      paymentMode: 'CREDIT BILL (LEDGER DEBIT)',
      remarks: newSale.remarks || 'Authorized Credit Fuelling Slip',
      footerNote: `Running Balance: ${formatCurrency(cust.outstandingBalance + newSale.amount)}`,
    };
    setReceiptData(slip);
    setShowReceipt(true);
  };

  // Handle Repayment Submit
  const handleRepaymentSubmit = async () => {
    const cust = customers.find((c) => c.id === payCustId);
    const amountNum = parseFloat(payAmount) || 0;
    if (!cust || amountNum <= 0) return;

    const payment = await recordCreditRepayment({
      customerId: cust.id,
      customerName: cust.name,
      customerCode: cust.code,
      amount: amountNum,
      paymentMode: payMode,
      referenceNo: payRefNo,
      notes: payNotes,
      receivedBy: 'Manager',
    });

    setShowRepaymentModal(false);

    const slip: ThermalReceiptData = {
      title: 'PAYMENT RECEIPT VOUCHER',
      receiptNo: payment.receiptNo,
      dateStr: payment.date,
      customerName: cust.name,
      items: [
        {
          name: `Outstanding Repayment via ${payment.paymentMode}`,
          rate: payment.referenceNo,
          amount: payment.amount,
        },
      ],
      subtotal: payment.amount,
      netPayable: payment.amount,
      paymentMode: payment.paymentMode,
      remarks: payment.notes || 'Repayment adjusted against ledger balance',
      footerNote: `Updated Outstanding: ${formatCurrency(Math.max(0, cust.outstandingBalance - payment.amount))}`,
    };
    setReceiptData(slip);
    setShowReceipt(true);
  };

  // Handle New Customer Creation
  const handleCreateCustomerSubmit = () => {
    if (!newCustCode || !newCustName) return;
    addCustomer({
      code: newCustCode.toUpperCase(),
      name: newCustName,
      contactPerson: newCustPerson,
      phone: newCustPhone,
      vehicleNumbers: newCustVehicles ? newCustVehicles.split(',').map((v) => v.trim()) : [],
      creditLimit: parseFloat(newCustLimit) || 500000,
      openingBalance: parseFloat(newCustOpening) || 0,
      status: 'ACTIVE',
    });
    setShowNewCustModal(false);
  };

  // Export Customer Statement CSV
  const handleExportStatement = () => {
    if (!selectedCustomer) return;
    const headers = ['Date', 'Type', 'Voucher / Slip No', 'Particulars', 'Debit (₹)', 'Credit (₹)'];
    const rows = ledgerEntries.map((e) => [
      e.date,
      e.type,
      e.refNo,
      e.particulars,
      e.debitAmount > 0 ? e.debitAmount : '',
      e.creditAmount > 0 ? e.creditAmount : '',
    ]);
    exportToCSV(`Customer_Statement_${selectedCustomer.code}_${getTodayDateString()}`, headers, rows);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Top Action Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Digital Credit Customer Ledger</Text>
           
        </View>

        <View style={styles.topBtnGroup}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: colors.creditOrange }]}
            onPress={() => {
  setAmountManuallyEdited(false);
  setShowAddSaleModal(true);
}}
            activeOpacity={0.8}
          >
            <PlusCircle size={15} color="#000" />
            <Text style={styles.primaryActionBtnText}>+ Credit Sale Chit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: colors.cashGreen }]}
            onPress={() => setShowRepaymentModal(true)}
            activeOpacity={0.8}
          >
            <ArrowDownLeft size={15} color="#000" />
            <Text style={styles.primaryActionBtnText}>Record Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => setShowNewCustModal(true)}
            activeOpacity={0.8}
          >
            <Building size={15} color={colors.textSecondary} />
            <Text style={styles.primaryActionBtnText}>Add Customer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Dual Layout: Customer List Left, Customer Statement Right */}
      <View style={styles.mainLayout}>
        {/* Customer Directory */}
        <View style={styles.customerListSection}>
          <View style={styles.searchBox}>
            <Search size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search customer, code, or vehicle..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView style={styles.custScrollContainer} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
            {filteredCustomers.map((cust) => {
              const isSelected = selectedCustomer?.id === cust.id;
              const limitPct = Math.min(100, Math.round((cust.outstandingBalance / cust.creditLimit) * 100));
              const isWarning = limitPct > 80;
              const isInactive = cust.status === 'INACTIVE' || cust.status === 'BLOCKED';

              return (
                <TouchableOpacity
                  key={cust.id}
                  style={[
                    styles.custCard,
                    isSelected && styles.custCardActive,
                    isInactive && { backgroundColor: colors.inactiveBg, borderColor: colors.inactiveBorder, opacity: 0.8 },
                  ]}
                  onPress={() => setSelectedCustomerId(cust.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.custCardTop}>
                    <View style={styles.custNameGroup}>
                      <View style={[styles.custCodeBadge, isInactive && { backgroundColor: colors.inactiveMuted }]}>
                        <Text style={[styles.custCodeText, isInactive && { color: '#FFFFFF' }]}>{cust.code}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.custName, isInactive && { color: colors.inactiveGrey }]} numberOfLines={1}>{cust.name}</Text>
                        <Text style={[styles.custVehicles, isInactive && { color: colors.inactiveMuted }]} numberOfLines={1}>
                          {cust.vehicleNumbers.join(' • ') || 'No vehicles assigned'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.custBalanceRow}>
                    <Text style={[styles.custBalLabel, isInactive && { color: colors.inactiveMuted }]}>Outstanding:</Text>
                    <Text style={[styles.custBalValue, isInactive && { color: colors.inactiveGrey }]}>{formatCurrency(cust.outstandingBalance)}</Text>
                  </View>

                  {/* Credit Utilization Bar */}
                  <View style={styles.limitBarTrack}>
                    <View
                      style={[
                        styles.limitBarFill,
                        {
                          width: `${limitPct}%` as any,
                          backgroundColor: isInactive ? colors.inactiveBorder : isWarning ? colors.danger : colors.primary,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.custCardFooter}>
                    <Text style={[styles.limitText, isInactive && { color: colors.inactiveMuted }]}>Limit: {formatCurrency(cust.creditLimit)}</Text>
                    <Text style={[styles.pctText, isWarning && !isInactive && { color: colors.danger, fontWeight: '700' }, isInactive && { color: colors.inactiveMuted }]}>
                      {limitPct}% Used
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected Customer Statement & History */}
        {selectedCustomer ? (
          <View style={styles.statementSection}>
            {/* Customer Summary Banner */}
            <View style={styles.statementHeaderCard}>
              <View style={styles.custBannerLeft}>
                <View style={styles.bannerCodeBadge}>
                  <Text style={styles.bannerCodeText}>{selectedCustomer.code}</Text>
                </View>
                <View>
                  <Text style={styles.bannerCustName}>{selectedCustomer.name}</Text>
                  <Text style={styles.bannerContact}>
                    Contact: {selectedCustomer.contactPerson} • Phone: {selectedCustomer.phone}
                  </Text>
                  <Text style={styles.bannerVehicles}>
                    Fleet Vehicles: {selectedCustomer.vehicleNumbers.join(', ')}
                  </Text>
                </View>
              </View>

              <View style={styles.bannerRight}>
                <View style={styles.balDisplayBox}>
                  <Text style={styles.balDisplayLabel}>CURRENT OUTSTANDING</Text>
                  <Text style={styles.balDisplayAmount}>
                    {formatCurrency(selectedCustomer.outstandingBalance)}
                  </Text>
                </View>

                <View style={[styles.statementActions, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <View style={{ minWidth: 160 }}>
                    <DatePickerInput
                      value={selectedDateFilter}
                      onChange={(d) => setSelectedDateFilter(d)}
                      placeholder="Filter by date..."
                      maxDate={getTodayDateString()}
                      allowClear
                      onClear={() => setSelectedDateFilter('')}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.statementBtn}
                    onPress={handleExportStatement}
                    activeOpacity={0.8}
                  >
                    <FileSpreadsheet size={14} color="#000" />
                    <Text style={styles.statementBtnText}>Export CSV</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Detailed Ledger Transactions Table */}
            <View style={styles.tableCard}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                style={styles.tableScroll}
                contentContainerStyle={{ minWidth: '100%' }}
              >
                <View style={{ width: '100%', minWidth: 620 }}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableColHeader, { width: 90 }]}>DATE</Text>
                    <Text style={[styles.tableColHeader, { width: 110 }]}>VOUCHER #</Text>
                    <Text style={[styles.tableColHeader, { flex: 2, minWidth: 160 }]}>PARTICULARS</Text>
                    <Text style={[styles.tableColHeader, { width: 110, textAlign: 'right' }]}>DEBIT (+₹)</Text>
                    <Text style={[styles.tableColHeader, { width: 110, textAlign: 'right' }]}>CREDIT (-₹)</Text>
                  </View>

                  {ledgerEntries.length === 0 ? (
                    <NoDataView
                      title="No Transactions Found"
                      selectedDate={selectedDateFilter || undefined}
                      message={
                        selectedDateFilter
                          ? `No ledger transactions recorded on ${formatDate(selectedDateFilter)} for ${selectedCustomer.name}.`
                          : 'No transactions recorded for this customer yet.'
                      }
                      onResetDate={selectedDateFilter ? () => setSelectedDateFilter('') : undefined}
                      actionLabel="Issue Credit Chit"
                      onAction={() => setShowAddSaleModal(true)}
                    />
                  ) : (
                    ledgerEntries.map((entry) => (
                      <View key={entry.id} style={styles.tableDataRow}>
                        <Text style={[styles.tableCell, { width: 90 }]}>{formatDate(entry.date)}</Text>
                        <Text style={[styles.tableCellMono, { width: 110 }]}>{entry.refNo}</Text>
                        <Text style={[styles.tableCell, { flex: 2, minWidth: 160 }]} numberOfLines={2}>
                          {entry.particulars}
                        </Text>
                        <Text style={[styles.tableCellDebit, { width: 110, textAlign: 'right' }]}>
                          {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : '-'}
                        </Text>
                        <Text style={[styles.tableCellCredit, { width: 110, textAlign: 'right' }]}>
                          {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : '-'}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        ) : null}
      </View>

      {/* Modal 1: Add Credit Fuel Sale Chit */}
      <Modal visible={showAddSaleModal} transparent animationType="slide" onRequestClose={() => setShowAddSaleModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Issue New Credit Fuel Chit</Text>
              <TouchableOpacity onPress={() => setShowAddSaleModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <View style={styles.modalBody}>
                {/* Customer Selector */}
                <DropdownPicker
                  label="Select Customer *"
                  placeholder="Select Customer..."
                  options={customers.map((c) => ({
                    label: `${c.code} - ${c.name}`,
                    value: c.id,
                    subtitle: `Outstanding: ${formatCurrency(c.outstandingBalance)} • Limit: ${formatCurrency(c.creditLimit)}`,
                    inactive: c.status === 'INACTIVE' || c.status === 'BLOCKED',
                  }))}
                  value={saleCustId}
                  onChange={(v, l) => {
                    setSaleCustId(v);
                    const cust = customers.find((c) => c.id === v);
                    if (cust && cust.vehicleNumbers.length > 0) setSaleVehicleNo(cust.vehicleNumbers[0]);
                  }}
                  allowOther
                  onSaveNew={(v) => setSaleCustId(v)}
                />

                {/* Product Selector */}
                <DropdownPicker
                  label="Fuel Product *"
                  placeholder="Select Fuel Product..."
                  options={products.map((p) => ({
                    label: `${p.name} (₹${p.currentRate}/L)`,
                    value: p.id,
                    subtitle: `Current Rate: ₹${p.currentRate}/L`,
                    color: p.color,
                    inactive: p.active === false,
                  }))}
                  value={saleProductId}
                  onChange={(v) => setSaleProductId(v)}
                />

              {/* Litres & Vehicle No */}
              <View style={styles.dualFormRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Quantity (Litres)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={saleLitres}
                    onChangeText={setSaleLitres}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1.2 }]}>
                  <Text style={styles.formLabel}>Vehicle Number</Text>
                  <TextInput
                    style={styles.textInput}
                    value={saleVehicleNo}
                    onChangeText={setSaleVehicleNo}
                    placeholder="e.g. TN 49 AB 1234"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* Driver Name & Remarks */}
              <View style={styles.dualFormRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Driver Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={saleDriverName}
                    onChangeText={setSaleDriverName}
                    placeholder="Driver name"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Trip / Remarks</Text>
                  <TextInput
                    style={styles.textInput}
                    value={saleRemarks}
                    onChangeText={setSaleRemarks}
                    placeholder="e.g. Chennai Load"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* Amount Preview */}
               {/* Amount Preview / Manual Override */}
<View style={styles.formGroup}>
  <Text style={styles.formLabel}>Total Credit Bill Amount (₹) — editable</Text>
  <View style={styles.totalPreviewBox}>
    <Text style={styles.previewLabel}>TOTAL CREDIT BILL AMOUNT</Text>
    <TextInput
      style={styles.previewAmount}
      value={saleAmount}
      onChangeText={(v) => {
        setSaleAmount(v);
        setAmountManuallyEdited(true);
      }}
      keyboardType="numeric"
      placeholder="0.00"
      placeholderTextColor={colors.textMuted}
    />
  </View>
</View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddSaleSubmit} activeOpacity={0.8}>
              <CheckCircle2 size={16} color="#000" />
              <Text style={styles.modalSubmitBtnText}>Issue Credit Chit & Print Thermal Slip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

      {/* Modal 2: Record Repayment */}
      <Modal visible={showRepaymentModal} transparent animationType="slide" onRequestClose={() => setShowRepaymentModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Customer Repayment</Text>
              <TouchableOpacity onPress={() => setShowRepaymentModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <View style={styles.modalBody}>
                {/* Customer Selector */}
                <DropdownPicker
                  label="Select Customer *"
                  placeholder="Select Customer..."
                  options={customers.map((c) => ({
                    label: `${c.code} - ${c.name}`,
                    value: c.id,
                    subtitle: `Outstanding: ${formatCurrency(c.outstandingBalance)}`,
                  }))}
                  value={payCustId}
                  onChange={(v) => setPayCustId(v)}
                  allowOther
                  onSaveNew={(v) => setPayCustId(v)}
                />

                {/* Amount & Payment Mode */}
                <View style={styles.dualFormRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Amount Received (₹) *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={payAmount}
                      onChangeText={setPayAmount}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <DropdownPicker
                      label="Payment Mode *"
                      placeholder="Select Payment Mode..."
                      options={paymentModeOptions.length > 0 ? paymentModeOptions : [
                        { label: 'Cash', value: 'Cash' },
                        { label: 'UPI / GPay / PhonePe', value: 'UPI' },
                        { label: 'Cheque', value: 'Cheque' },
                        { label: 'Bank Transfer / NEFT', value: 'NEFT' },
                        { label: 'Bank Transfer / RTGS', value: 'Bank Transfer' },
                      ]}
                      value={payMode}
                      onChange={(v) => setPayMode(v as CreditPayment['paymentMode'])}
                      allowOther
                      onSaveNew={(v) => setPayMode(v as CreditPayment['paymentMode'])}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Reference / Cheque No / Bank Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={payRefNo}
                    onChangeText={setPayRefNo}
                    placeholder="e.g. SBI-NEFT-991204 / Chq #409121"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Notes</Text>
                  <TextInput
                    style={styles.textInput}
                    value={payNotes}
                    onChangeText={setPayNotes}
                    placeholder="e.g. Monthly bill settlement"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleRepaymentSubmit} activeOpacity={0.8}>
                <ArrowDownLeft size={16} color="#000" />
                <Text style={styles.modalSubmitBtnText}>Record Payment & Adjust Ledger</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 3: Add Customer */}
      <Modal visible={showNewCustModal} transparent animationType="slide" onRequestClose={() => setShowNewCustModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Credit Customer</Text>
              <TouchableOpacity onPress={() => setShowNewCustModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <View style={styles.modalBody}>
                <View style={styles.dualFormRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Short Code (e.g. KPJ)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={newCustCode}
                      onChangeText={setNewCustCode}
                      placeholder="CODE"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 2 }]}>
                    <Text style={styles.formLabel}>Full Company / Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={newCustName}
                      onChangeText={setNewCustName}
                      placeholder="Customer Name"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.dualFormRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Contact Person</Text>
                    <TextInput
                      style={styles.textInput}
                      value={newCustPerson}
                      onChangeText={setNewCustPerson}
                      placeholder="Person"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Phone</Text>
                    <TextInput
                      style={styles.textInput}
                      value={newCustPhone}
                      onChangeText={setNewCustPhone}
                      placeholder="+91 94432 ..."
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.dualFormRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Credit Limit (₹)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={newCustLimit}
                      onChangeText={setNewCustLimit}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Opening Balance (₹)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={newCustOpening}
                      onChangeText={setNewCustOpening}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Authorized Vehicle Numbers (Comma separated)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newCustVehicles}
                    onChangeText={setNewCustVehicles}
                    placeholder="TN 49 AB 1234, TN 49 C 5678"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleCreateCustomerSubmit} activeOpacity={0.8}>
                <Building size={16} color="#000" />
                <Text style={styles.modalSubmitBtnText}>Create Customer Account</Text>
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
  topBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  primaryActionBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  mainLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  customerListSection: {
    width: 320,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: '#000',
    fontSize: 12,
  },
  custScrollContainer: {
    gap: 8,
    maxHeight: 650,
  },
  custCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  custCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  custCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  custNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  custCodeBadge: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  custCodeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  custName: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
  custVehicles: {
    color: colors.textMuted,
    fontSize: 10,
  },
  custBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  custBalLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  custBalValue: {
    color: colors.creditOrange,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  limitBarTrack: {
    height: 4,
    backgroundColor: '#0B0F19',
    borderRadius: 2,
    overflow: 'hidden',
  },
  limitBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  custCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitText: {
    color: colors.textMuted,
    fontSize: 10,
  },
  pctText: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  statementSection: {
    flex: 1,
    minWidth: 360,
    gap: 14,
  },
  statementHeaderCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
  },
  custBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 260,
  },
  bannerCodeBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.creditOrange + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.creditOrange,
  },
  bannerCodeText: {
    color: colors.creditOrange,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  bannerCustName: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
  bannerContact: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  bannerVehicles: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  bannerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  balDisplayBox: {
    alignItems: 'flex-end',
  },
  balDisplayLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  balDisplayAmount: {
    color: colors.creditOrange,
    fontSize: 22,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  statementActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statementBtnText: {
    color: '#000',
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
  tableCellDebit: {
    color: colors.creditOrange,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.monoFont,
  },
  tableCellCredit: {
    color: colors.cashGreen,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.monoFont,
  },
  emptyTable: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTableText: {
    color: colors.textMuted,
    fontSize: 12,
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
  totalPreviewBox: {
    backgroundColor: '#dbdde4',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  previewLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  previewAmount: {
    color: colors.creditOrange,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: typography.monoFont,
    marginTop: 2,
  },
  modalFooter: {
    marginTop: 4,
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
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
   
// ADD THIS NEW STYLE:
previewAmountInput: {
  color: colors.creditOrange,
  fontSize: 18,
  fontWeight: '900',
  fontFamily: typography.monoFont,
  marginTop: 2,
  textAlign: 'center',
  minWidth: 140,
  paddingVertical: 2,
},
});
