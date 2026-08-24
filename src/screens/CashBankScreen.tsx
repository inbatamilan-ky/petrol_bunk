import React, { useState, useMemo } from 'react';
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
  Banknote,
  PlusCircle,
  Building,
  CheckCircle2,
  Calculator,
  ArrowUpRight,
  Printer,
  FileSpreadsheet,
  X,
  Lock,
  QrCode,
  CreditCard,
  Truck,
  ArrowDownRight,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  FileText,
  Building2,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { ThermalReceiptModal, ThermalReceiptData } from '../components/ThermalReceiptModal';
import { DropdownPicker, DropdownOption } from '../components/DropdownPicker';
import { DatePickerInput } from '../components/DatePickerInput';
import { NoDataView } from '../components/NoDataView';
import { colors, typography } from '../theme/colors';
import { formatCurrency, formatDate, getTodayDateString, formatDateTime } from '../utils/formatters';
import { CashDenomination, BankDeposit } from '../types';

export const CashBankScreen: React.FC = () => {
  const { shifts, expenses, bankDeposits, bankAccounts, creditPayments, recordBankDeposit, role, bunkProfile } = useBunk();

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [receiptData, setReceiptData] = useState<ThermalReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'MONTH'>('ALL');
  const [selectedDepositDate, setSelectedDepositDate] = useState<string>('');

  // Bank Deposit Form State
  const [bankName, setBankName] = useState('State Bank of India (Main Branch)');
  const [accountNo, setAccountNo] = useState('30982245109 (Current A/c)');
  const [depositedBy, setDepositedBy] = useState('Manager');
  const [refNo, setRefNo] = useState('SBI-DEP-');
  const [notes, setNotes] = useState('Daily cash deposit');

  // Denomination State
  const [denoms, setDenoms] = useState<CashDenomination>({
    note2000: 0,
    note500: 300,
    note200: 100,
    note100: 100,
    note50: 0,
    note20: 0,
    note10: 0,
    coins: 0,
  });

  const totalDenominationAmount =
    (denoms.note2000 || 0) * 2000 +
    (denoms.note500 || 0) * 500 +
    (denoms.note200 || 0) * 200 +
    (denoms.note100 || 0) * 100 +
    (denoms.note50 || 0) * 50 +
    (denoms.note20 || 0) * 20 +
    (denoms.note10 || 0) * 10 +
    (denoms.coins || 0);

  // Filter shifts, credit payments, expenses, deposits based on date filter
  const todayStr = getTodayDateString();
  const currentMonthStr = todayStr.substring(0, 7);

  const filteredShifts = useMemo(() => {
    if (dateFilter === 'TODAY') return shifts.filter((s) => s.shiftDate === todayStr);
    if (dateFilter === 'MONTH') return shifts.filter((s) => s.shiftDate.startsWith(currentMonthStr));
    return shifts;
  }, [shifts, dateFilter, todayStr, currentMonthStr]);

  const filteredExpenses = useMemo(() => {
    if (dateFilter === 'TODAY') return expenses.filter((e) => e.date === todayStr);
    if (dateFilter === 'MONTH') return expenses.filter((e) => e.date.startsWith(currentMonthStr));
    return expenses;
  }, [expenses, dateFilter, todayStr, currentMonthStr]);

  const filteredDeposits = useMemo(() => {
    if (selectedDepositDate) return bankDeposits.filter((d) => d.depositDate === selectedDepositDate);
    if (dateFilter === 'TODAY') return bankDeposits.filter((d) => d.depositDate === todayStr);
    if (dateFilter === 'MONTH') return bankDeposits.filter((d) => d.depositDate.startsWith(currentMonthStr));
    return bankDeposits;
  }, [bankDeposits, selectedDepositDate, dateFilter, todayStr, currentMonthStr]);

  const filteredCreditPayments = useMemo(() => {
    if (dateFilter === 'TODAY') return creditPayments.filter((p) => p.date === todayStr);
    if (dateFilter === 'MONTH') return creditPayments.filter((p) => p.date.startsWith(currentMonthStr));
    return creditPayments;
  }, [creditPayments, dateFilter, todayStr, currentMonthStr]);

  // Financial Aggregates
  const totalShiftCash = filteredShifts.reduce((sum, s) => sum + s.collections.cash, 0);
  const totalUpiCollected = filteredShifts.reduce((sum, s) => sum + s.collections.upiGpay, 0);
  const totalCardCollected = filteredShifts.reduce((sum, s) => sum + s.collections.card, 0);
  const totalFleetCardCollected = filteredShifts.reduce((sum, s) => sum + s.collections.fleetCard, 0);
  const totalCreditSales = filteredShifts.reduce((sum, s) => sum + s.collections.creditSales, 0);
  const totalChequeCollected = filteredShifts.reduce((sum, s) => sum + s.collections.cheque, 0);

  // Credit Customer Cash Repayments
  const totalCreditCashRecovered = filteredCreditPayments
    .filter((p) => p.paymentMode === 'Cash')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalCreditOnlineRecovered = filteredCreditPayments
    .filter((p) => p.paymentMode !== 'Cash')
    .reduce((sum, p) => sum + p.amount, 0);


  // Expenses & Bank Deposits
  const totalExpenses = filteredExpenses.reduce((sum, e) => (e.isCreditNote ? sum - e.amount : sum + e.amount), 0);
  const totalDeposited = filteredDeposits.reduce((sum, d) => sum + d.amount, 0);

  // Net Physical Cash In Safe (Vault)
  const expectedCashInHand = Math.max(0, totalShiftCash + totalCreditCashRecovered - totalExpenses - totalDeposited);

  // Digital Online Grand Total
  const totalDigitalOnline = totalUpiCollected + totalCardCollected + totalFleetCardCollected + totalCreditOnlineRecovered;

  // Vault Cash Discrepancy (Physical Count vs Expected System Safe Balance)
  const vaultVariance = totalDenominationAmount - expectedCashInHand;

  // Handle Denomination count change
  const handleDenomChange = (key: keyof CashDenomination, val: string) => {
    const numVal = parseInt(val, 10) || 0;
    setDenoms((prev) => ({ ...prev, [key]: numVal }));
  };

  // Auto-Match Denominations to Expected Cash in Safe
  const handleAutoFillDenominations = () => {
    let remaining = Math.round(expectedCashInHand);
    const n500 = Math.floor(remaining / 500);
    remaining %= 500;
    const n200 = Math.floor(remaining / 200);
    remaining %= 200;
    const n100 = Math.floor(remaining / 100);
    remaining %= 100;
    const n50 = Math.floor(remaining / 50);
    remaining %= 50;
    const n20 = Math.floor(remaining / 20);
    remaining %= 20;
    const n10 = Math.floor(remaining / 10);
    remaining %= 10;
    const coins = remaining;

    setDenoms({
      note2000: 0,
      note500: n500,
      note200: n200,
      note100: n100,
      note50: n50,
      note20: n20,
      note10: n10,
      coins: coins,
    });
  };

  // Submit Bank Deposit
  const handleSaveDeposit = () => {
    if (totalDenominationAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter denominations for the deposit.');
      return;
    }

    recordBankDeposit({
      bankName,
      accountNo,
      amount: totalDenominationAmount,
      denominations: denoms,
      depositedBy,
      referenceNo: refNo || `SBI-DEP-${Date.now()}`,
      notes,
    });

    setShowDepositModal(false);
  };

  // Print Bank Deposit Slip
  const handlePrintDepositSlip = (dep: BankDeposit) => {
    const d = dep.denominations;
    setReceiptData({
      title: 'BANK CASH DEPOSIT CHALLAN',
      receiptNo: dep.referenceNo,
      dateStr: formatDate(dep.depositDate),
      operatorName: dep.depositedBy,
      remarks: `${dep.bankName} (${dep.accountNo})\nNotes: ${dep.notes || 'Counter Cash Drop'}`,
      items: [
        { name: '₹500 Notes', qty: String(d.note500 || 0), rate: '500', amount: (d.note500 || 0) * 500 },
        { name: '₹200 Notes', qty: String(d.note200 || 0), rate: '200', amount: (d.note200 || 0) * 200 },
        { name: '₹100 Notes', qty: String(d.note100 || 0), rate: '100', amount: (d.note100 || 0) * 100 },
        { name: '₹50 Notes', qty: String(d.note50 || 0), rate: '50', amount: (d.note50 || 0) * 50 },
        { name: '₹20 Notes', qty: String(d.note20 || 0), rate: '20', amount: (d.note20 || 0) * 20 },
        { name: '₹10 Notes', qty: String(d.note10 || 0), rate: '10', amount: (d.note10 || 0) * 10 },
        { name: 'Coins', qty: '—', rate: '1', amount: d.coins || 0 },
      ].filter((x) => x.amount > 0),
      subtotal: dep.amount,
      netPayable: dep.amount,
      paymentMode: 'PHYSICAL CASH DEPOSIT',
      footerNote: 'Bank Counter Stamped Copy • Verified by KY FuelPulse',
    });
    setShowReceiptModal(true);
  };

  // Print Cash Day Book Summary
  const handlePrintDayBook = () => {
    setReceiptData({
      title: 'DAILY CASH & SETTLEMENT RECONCILIATION',
      receiptNo: `DAYBOOK-${todayStr.replace(/-/g, '')}`,
      dateStr: todayStr,
      operatorName: role,
      items: [
        { name: '(+) Shift Cash Collections', amount: totalShiftCash },
        { name: '(+) Credit Customer Cash Inflow', amount: totalCreditCashRecovered },
        { name: '(-) Pump Station Cash Expenses Deducted', amount: -totalExpenses },
        { name: '(-) Total Deposited in Bank Accounts', amount: -totalDeposited },
        { name: '=== EXPECTED SAFE CASH ===', amount: expectedCashInHand },
        { name: '(*) Total UPI / QR Collections', amount: totalUpiCollected },
        { name: '(*) Total POS Card Swipes', amount: totalCardCollected },
        { name: '(*) Fleet Card Digital Settled', amount: totalFleetCardCollected },
      ],
      subtotal: expectedCashInHand + totalDigitalOnline,
      netPayable: expectedCashInHand,
      paymentMode: 'VAULT AUDIT REPORT',
      remarks: `Vault Physical Count: ${formatCurrency(totalDenominationAmount)}\nVariance: ${formatCurrency(vaultVariance)}`,
      footerNote: 'KY Technologies • Petrol Bunk Management System',
    });
    setShowReceiptModal(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.screenTitle}>Cash & Digital Settlements</Text>
            <View style={styles.vaultPill}>
              <ShieldCheck size={13} color={colors.success} />
              <Text style={styles.vaultPillText}>Safe Vault Active</Text>
            </View>
          </View>
           
        </View>

        {/* Top Actions */}
        <View style={styles.topActionsRow}>
          {/* Date Filter Tabs */}
          <View style={styles.dateFilterContainer}>
            {(['ALL', 'TODAY', 'MONTH'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.dateFilterTab, dateFilter === filter && styles.dateFilterTabActive]}
                onPress={() => setDateFilter(filter)}
              >
                <Text style={[styles.dateFilterTabText, dateFilter === filter && styles.dateFilterTabTextActive]}>
                  {filter === 'ALL' ? 'All Time' : filter === 'TODAY' ? 'Today' : 'This Month'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.dayBookBtn}
            onPress={handlePrintDayBook}
            activeOpacity={0.8}
          >
            <Printer size={15} color={colors.textPrimary} />
            <Text style={styles.dayBookBtnText}>Print Cash Day Book</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.depositBtn}
            onPress={() => setShowDepositModal(true)}
            activeOpacity={0.8}
          >
            <PlusCircle size={15} color="#000" />
            <Text style={styles.depositBtnText}>New Bank Cash Deposit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Cash & Settlement Matrix (4 Key Cards) ────────────────────────── */}
      <View style={styles.matrixGrid}>
        {/* Net Physical Cash In Safe */}
        <View style={[styles.matrixCard, { borderLeftColor: colors.cashGreen }]}>
          <View style={styles.matrixCardHeader}>
            <Text style={styles.matrixLabel}>NET PHYSICAL CASH IN SAFE (VAULT)</Text>
            <Banknote size={18} color={colors.cashGreen} />
          </View>
          <Text style={[styles.matrixValue, { color: colors.cashGreen }]}>
            {formatCurrency(expectedCashInHand)}
          </Text>
        </View>

        {/* Digital Online Collections (UPI + POS + Fleet) */}
        <View style={[styles.matrixCard, { borderLeftColor: colors.upiPurple }]}>
          <View style={styles.matrixCardHeader}>
            <Text style={styles.matrixLabel}>DIGITAL & ONLINE SETTLEMENTS</Text>
            <QrCode size={18} color={colors.upiPurple} />
          </View>
          <Text style={[styles.matrixValue, { color: colors.upiPurple }]}>
            {formatCurrency(totalDigitalOnline)}
          </Text>
        </View>

        {/* Total Bank Deposits */}
        <View style={[styles.matrixCard, { borderLeftColor: colors.primary }]}>
          <View style={styles.matrixCardHeader}>
            <Text style={styles.matrixLabel}>TOTAL DEPOSITED IN BANK</Text>
            <Building size={18} color={colors.primary} />
          </View>
          <Text style={styles.matrixValue}>{formatCurrency(totalDeposited)}</Text>
        </View>

        {/* Denomination Counter Tally & Discrepancy */}
        <View style={[styles.matrixCard, { borderLeftColor: vaultVariance === 0 ? colors.success : colors.danger }]}>
          <View style={styles.matrixCardHeader}>
            <Text style={styles.matrixLabel}>PHYSICAL COUNT VS EXPECTED</Text>
            <Calculator size={18} color={vaultVariance === 0 ? colors.success : colors.danger} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={[styles.matrixValue, { color: vaultVariance === 0 ? colors.success : colors.danger }]}>
              {formatCurrency(totalDenominationAmount)}
            </Text>
            {vaultVariance === 0 ? (
              <View style={styles.matchedPill}>
                <CheckCircle2 size={12} color={colors.success} />
                <Text style={styles.matchedPillText}>BALANCED</Text>
              </View>
            ) : vaultVariance > 0 ? (
              <View style={styles.excessPill}>
                <Text style={styles.excessPillText}>+{formatCurrency(vaultVariance)} (Excess)</Text>
              </View>
            ) : (
              <View style={styles.shortagePill}>
                <Text style={styles.shortagePillText}>{formatCurrency(vaultVariance)} (Shortage)</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Multi-Channel Digital Online Breakdown ─────────────────────────── */}
      <View style={styles.digitalSectionCard}>
        <View style={styles.digitalHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Smartphone size={18} color={colors.primary} />
            <Text style={styles.digitalTitle}>Digital, Online UPI & POS Settlement Channels</Text>
          </View>
          <Text style={styles.digitalTotalTag}>
            Total Online: <Text style={{ fontWeight: '900', color: '#000' }}>{formatCurrency(totalDigitalOnline)}</Text>
          </Text>
        </View>

        <View style={styles.digitalChannelsGrid}>
          {/* UPI / QR Channel */}
          <View style={styles.channelCard}>
            <View style={styles.channelTop}>
              <View style={[styles.channelIconCircle, { backgroundColor: colors.upiPurple + '15' }]}>
                <QrCode size={18} color={colors.upiPurple} />
              </View>
              <View style={styles.settledBadge}>
                <Text style={styles.settledBadgeText}>Auto-Settled to Bank</Text>
              </View>
            </View>
            <Text style={styles.channelName}>UPI / Dynamic QR</Text>
            <Text style={styles.channelSub}>PhonePe, GPay, Paytm, BharatPe</Text>
            <Text style={[styles.channelVal, { color: colors.upiPurple }]}>
              {formatCurrency(totalUpiCollected)}
            </Text>
          </View>

          {/* POS Card Machine Channel */}
          <View style={styles.channelCard}>
            <View style={styles.channelTop}>
              <View style={[styles.channelIconCircle, { backgroundColor: colors.cardBlue + '15' }]}>
                <CreditCard size={18} color={colors.cardBlue} />
              </View>
              <View style={styles.settledBadge}>
                <Text style={styles.settledBadgeText}>T+1 Bank Batch</Text>
              </View>
            </View>
            <Text style={styles.channelName}>POS Card Swipes</Text>
            <Text style={styles.channelSub}>Visa, RuPay, Mastercard POS</Text>
            <Text style={[styles.channelVal, { color: colors.cardBlue }]}>
              {formatCurrency(totalCardCollected)}
            </Text>
          </View>

          {/* OMC Fleet Card Channel */}
          <View style={styles.channelCard}>
            <View style={styles.channelTop}>
              <View style={[styles.channelIconCircle, { backgroundColor: colors.diesel + '15' }]}>
                <Truck size={18} color={colors.diesel} />
              </View>
              <View style={styles.omcWalletBadge}>
                <Text style={styles.omcWalletBadgeText}>OMC Dealer Credit</Text>
              </View>
            </View>
            <Text style={styles.channelName}>OMC Fleet Cards</Text>
            <Text style={styles.channelSub}>XtraPower / SmartFleet / DriveTrack</Text>
            <Text style={[styles.channelVal, { color: colors.diesel }]}>
              {formatCurrency(totalFleetCardCollected)}
            </Text>
          </View>

          {/* Credit Repayments Online Channel */}
          <View style={styles.channelCard}>
            <View style={styles.channelTop}>
              <View style={[styles.channelIconCircle, { backgroundColor: colors.accent + '15' }]}>
                <Building2 size={18} color={colors.accent} />
              </View>
              <View style={styles.settledBadge}>
                <Text style={styles.settledBadgeText}>NEFT / RTGS</Text>
              </View>
            </View>
            <Text style={styles.channelName}>Customer Online Repayments</Text>
            <Text style={styles.channelSub}>Direct Bank Transfer & Cheques</Text>
            <Text style={[styles.channelVal, { color: colors.accent }]}>
              {formatCurrency(totalCreditOnlineRecovered + totalChequeCollected)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Cash Flow Waterfall Ledger (Day Book Summary) ──────────────────── */}
      <View style={styles.waterfallCard}>
        <View style={styles.waterfallHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color={colors.primary} />
            <Text style={styles.waterfallTitle}>Cash Balance Verification</Text>
          </View>
          <Text style={styles.waterfallMeta}>{dateFilter === 'TODAY' ? "Today's Ledger" : 'Aggregated View'}</Text>
        </View>

        <View style={styles.waterfallList}>
          {/* Row 1: Shift Cash Collections */}
          <View style={styles.waterfallRow}>
            <View style={styles.waterfallLabelRow}>
              <View style={[styles.stepDot, { backgroundColor: colors.success }]} />
              <View>
                <Text style={styles.waterfallRowTitle}>(+) Total Shift Cash Collected</Text>
                <Text style={styles.waterfallRowSub}>Physical cash received from all pump shift operators</Text>
              </View>
            </View>
            <Text style={[styles.waterfallAmount, { color: colors.success }]}>
              +{formatCurrency(totalShiftCash)}
            </Text>
          </View>

          {/* Row 2: Customer Cash Repayments */}
          <View style={styles.waterfallRow}>
            <View style={styles.waterfallLabelRow}>
              <View style={[styles.stepDot, { backgroundColor: colors.success }]} />
              <View>
                <Text style={styles.waterfallRowTitle}>(+) Credit Customer Cash Inflow</Text>
                <Text style={styles.waterfallRowSub}>Cash payments recovered on outstanding credit ledger</Text>
              </View>
            </View>
            <Text style={[styles.waterfallAmount, { color: colors.success }]}>
              +{formatCurrency(totalCreditCashRecovered)}
            </Text>
          </View>

          {/* Row 3: Cash Expenses Deducted */}
          <View style={styles.waterfallRow}>
            <View style={styles.waterfallLabelRow}>
              <View style={[styles.stepDot, { backgroundColor: colors.danger }]} />
              <View>
                <Text style={styles.waterfallRowTitle}>(-)Cash Expenses Paid</Text>
                <Text style={styles.waterfallRowSub}>Daily operating expenses paid from drawer cash</Text>
              </View>
            </View>
            <Text style={[styles.waterfallAmount, { color: colors.danger }]}>
              -{formatCurrency(totalExpenses)}
            </Text>
          </View>

          {/* Row 4: Bank Deposits Handed Over */}
          <View style={styles.waterfallRow}>
            <View style={styles.waterfallLabelRow}>
              <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
              <View>
                <Text style={styles.waterfallRowTitle}>(-) Total Bank Deposits & Cash Drops</Text>
                <Text style={styles.waterfallRowSub}>Physical cash deposited to bank accounts</Text>
              </View>
            </View>
            <Text style={[styles.waterfallAmount, { color: colors.primary }]}>
              -{formatCurrency(totalDeposited)}
            </Text>
          </View>

          {/* Total Closing Safe Cash */}
          <View style={styles.waterfallTotalRow}>
            <View>
              <Text style={styles.waterfallTotalTitle}>= NET EXPECTED CASH IN SAFE (VAULT)</Text>
              <Text style={styles.waterfallTotalSub}>Cash that must be present in bunk counter/safe</Text>
            </View>
            <Text style={styles.waterfallTotalAmount}>
              {formatCurrency(expectedCashInHand)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Interactive Denomination Counter Widget ──────────────────────── */}
      <View style={styles.denomSection}>
        <View style={styles.denomHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Calculator size={18} color={colors.primary} />
            <Text style={styles.denomTitle}>Cash Denomination & Counting Verification</Text>
          </View>

          <View style={styles.denomActionsRow}>
            <TouchableOpacity
              style={styles.autoFillBtn}
              onPress={handleAutoFillDenominations}
              activeOpacity={0.7}
            >
              <Sparkles size={13} color={colors.accent} />
              <Text style={styles.autoFillBtnText}>Auto-Match Safe Cash</Text>
            </TouchableOpacity>

            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeLabel}>COUNTED CASH:</Text>
              <Text style={styles.totalBadgeVal}>{formatCurrency(totalDenominationAmount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.denomGrid}>
          {[
            { key: 'note2000', label: '₹2000 Notes', mult: 2000, val: denoms.note2000 },
            { key: 'note500', label: '₹500 Notes', mult: 500, val: denoms.note500 },
            { key: 'note200', label: '₹200 Notes', mult: 200, val: denoms.note200 },
            { key: 'note100', label: '₹100 Notes', mult: 100, val: denoms.note100 },
            { key: 'note50', label: '₹50 Notes', mult: 50, val: denoms.note50 },
            { key: 'note20', label: '₹20 Notes', mult: 20, val: denoms.note20 },
            { key: 'note10', label: '₹10 Notes', mult: 10, val: denoms.note10 },
            { key: 'coins', label: 'Coins (₹)', mult: 1, val: denoms.coins },
          ].map((item) => (
            <View key={item.key} style={styles.denomRow}>
              <View style={styles.denomLabelCol}>
                <Text style={styles.denomLabel}>{item.label}</Text>
              </View>
              <Text style={styles.denomTimes}>×</Text>
              <TextInput
                style={styles.denomInput}
                value={String(item.val || '')}
                onChangeText={(val) => handleDenomChange(item.key as keyof CashDenomination, val)}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
              <Text style={styles.denomEquals}>=</Text>
              <Text style={styles.denomRowTotal}>
                {formatCurrency((item.val || 0) * item.mult)}
              </Text>
            </View>
          ))}
        </View>

        {/* Quick Deposit Trigger from Denomination */}
        <View style={styles.denomFooter}>
          <Text style={styles.denomFooterSub}>
            Physical notes counted in cash drawer. Click below to deposit this exact amount to bank.
          </Text>
          <TouchableOpacity
            style={styles.depositCountedBtn}
            onPress={() => setShowDepositModal(true)}
            activeOpacity={0.8}
          >
            <ArrowUpRight size={15} color="#000" />
            <Text style={styles.depositCountedBtnText}>Deposit Counted Cash ({formatCurrency(totalDenominationAmount)})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Bank Settlement Challans & Proofs ─────────────────────────────── */}
      <View style={styles.depositsCard}>
        <View style={styles.depositsHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' }}>
            <Building size={18} color={colors.primary} />
            <Text style={styles.depositsTitle}>Bank Settlement Challans & Receipts ({filteredDeposits.length})</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ minWidth: 160 }}>
              <DatePickerInput
                value={selectedDepositDate}
                onChange={(d) => setSelectedDepositDate(d)}
                placeholder="Filter by date..."
                maxDate={getTodayDateString()}
                allowClear
                onClear={() => setSelectedDepositDate('')}
              />
            </View>
            <TouchableOpacity
              style={styles.newDepositMiniBtn}
              onPress={() => setShowDepositModal(true)}
            >
              <PlusCircle size={13} color={colors.primary} />
              <Text style={styles.newDepositMiniBtnText}>Record Deposit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {filteredDeposits.length === 0 ? (
          <NoDataView
            title="No Deposits Recorded"
            selectedDate={selectedDepositDate || undefined}
            message={
              selectedDepositDate
                ? `No bank deposit entries found for ${formatDate(selectedDepositDate)}.`
                : 'No bank deposit records found.'
            }
            onResetDate={selectedDepositDate ? () => setSelectedDepositDate('') : undefined}
            actionLabel="Record Deposit"
            onAction={() => setShowDepositModal(true)}
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={{ marginTop: 4 }}
            contentContainerStyle={{ minWidth: '100%' }}
          >
            <View style={{ width: '100%', minWidth: 620 }}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCol, { width: 90 }]}>DATE</Text>
                <Text style={[styles.tableCol, { width: 220 }]}>BANK & ACCOUNT</Text>
                <Text style={[styles.tableCol, { width: 130 }]}>REFERENCE #</Text>
                <Text style={[styles.tableCol, { width: 100 }]}>DEPOSITED BY</Text>
                <Text style={[styles.tableCol, { width: 110, textAlign: 'right' }]}>AMOUNT (₹)</Text>
                <Text style={[styles.tableCol, { width: 70, textAlign: 'center' }]}>ACTION</Text>
              </View>

              {filteredDeposits.map((dep) => (
                <View key={dep.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: 90 }]}>{formatDate(dep.depositDate)}</Text>
                  <View style={{ width: 220 }}>
                    <Text style={styles.bankName}>{dep.bankName}</Text>
                    <Text style={styles.bankAcc}>{dep.accountNo}</Text>
                  </View>
                  <Text style={[styles.tableCellMono, { width: 130 }]}>{dep.referenceNo}</Text>
                  <Text style={[styles.tableCell, { width: 100 }]}>{dep.depositedBy}</Text>
                  <Text style={[styles.depositAmount, { width: 110, textAlign: 'right' }]}>
                    {formatCurrency(dep.amount)}
                  </Text>
                  <View style={{ width: 70, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={styles.printSlipBtn}
                      onPress={() => handlePrintDepositSlip(dep)}
                    >
                      <Printer size={13} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* ── New Bank Deposit Modal ────────────────────────────────────────── */}
      <Modal visible={showDepositModal} transparent animationType="slide" onRequestClose={() => setShowDepositModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Building size={18} color={colors.primary} />
                <Text style={styles.modalTitle}>Record Bank Cash Deposit Entry</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDepositModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <View style={styles.modalBody}>
                {/* Bank Account Dropdown */}
                <DropdownPicker
                  label="Bank Account *"
                  placeholder="Select Bank Account..."
                  options={
                    bankAccounts.length > 0
                      ? bankAccounts.map((acc) => ({
                          label: acc.bankName,
                          value: acc.bankName,
                          subtitle: `${acc.accountType} A/c: ${acc.accountNumber}${acc.branchName ? ' (' + acc.branchName + ')' : ''}`,
                        }))
                      : [
                          { label: 'State Bank of India (Main Branch)', value: 'State Bank of India (Main Branch)', subtitle: 'Current A/c: 30982245109' },
                          { label: 'HDFC Bank (Commercial Branch)', value: 'HDFC Bank (Commercial Branch)', subtitle: 'Current A/c: 50200088194' },
                          { label: 'ICICI Bank (Town Branch)', value: 'ICICI Bank (Town Branch)', subtitle: 'Current A/c: 01420500339' },
                        ]
                  }
                  value={bankName}
                  onChange={(v, l) => {
                    const matched = bankAccounts.find((a) => a.bankName === (l || v));
                    setBankName(l || v);
                    if (matched) {
                      setAccountNo(`${matched.accountNumber} (${matched.accountType} A/c)`);
                    } else if (v.includes('30982245109') || l.includes('State Bank')) {
                      setAccountNo('30982245109 (Current A/c)');
                    }
                  }}
                  allowOther
                  onSaveNew={(customName) => setBankName(customName)}
                />

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Account Number</Text>
                  <TextInput
                    style={styles.textInput}
                    value={accountNo}
                    onChangeText={setAccountNo}
                    placeholder="Account Number"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.dualFormRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Deposit Slip Ref No</Text>
                    <TextInput
                      style={styles.textInput}
                      value={refNo}
                      onChangeText={setRefNo}
                      placeholder="e.g. SBI-DEP-1049"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <DropdownPicker
                      label="Deposited By *"
                      placeholder="Select staff..."
                      options={[
                        { label: 'Manager', value: 'Manager' },
                        { label: 'Cashier', value: 'Cashier' },
                        { label: 'Owner', value: 'Owner' },
                        { label: 'Supervisor', value: 'Supervisor' },
                      ]}
                      value={depositedBy}
                      onChange={(v, l) => setDepositedBy(l || v)}
                      allowOther
                      onSaveNew={(customName) => setDepositedBy(customName)}
                    />
                  </View>
                </View>

                <View style={styles.depositAmountBox}>
                  <Text style={styles.depositAmountLabel}>TOTAL DEPOSIT AMOUNT FROM COUNTER:</Text>
                  <Text style={styles.depositAmountVal}>
                    {formatCurrency(totalDenominationAmount)}
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Notes / Reason</Text>
                  <TextInput
                    style={[styles.textInput, { height: 60 }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="e.g. Morning shift cash drop"
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowDepositModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveDepositBtn}
                onPress={handleSaveDeposit}
              >
                <CheckCircle2 size={16} color="#000" />
                <Text style={styles.saveDepositText}>Confirm & Print Slip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Thermal Receipt Modal Preview ─────────────────────────────────── */}
      <ThermalReceiptModal
        visible={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
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
    paddingBottom: 50,
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  screenTitle: {
    color: '#000',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  vaultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '18',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  vaultPillText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  dateFilterContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateFilterTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dateFilterTabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  dateFilterTabText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  dateFilterTabTextActive: {
    color: '#000',
    fontWeight: '800',
  },
  dayBookBtn: {
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
  dayBookBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  depositBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Matrix Grid Styles ─────────────────────────────────────────────────────
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  matrixCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: 16,
    gap: 6,
  },
  matrixCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matrixLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  matrixValue: {
    color: '#000',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  matrixSub: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  matchedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '18',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  matchedPillText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
  },
  excessPill: {
    backgroundColor: colors.danger + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  excessPillText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  shortagePill: {
    backgroundColor: '#D9770620',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shortagePillText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },

  // ── Digital Channels Section ───────────────────────────────────────────────
  digitalSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  digitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  digitalTitle: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  digitalTotalTag: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  digitalChannelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  channelCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 4,
  },
  channelTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  channelIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settledBadge: {
    backgroundColor: colors.success + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  settledBadgeText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '800',
  },
  omcWalletBadge: {
    backgroundColor: colors.diesel + '18',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  omcWalletBadgeText: {
    color: colors.dieselDark,
    fontSize: 9,
    fontWeight: '800',
  },
  channelName: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  channelSub: {
    color: colors.textMuted,
    fontSize: 10,
  },
  channelVal: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: typography.monoFont,
    marginTop: 4,
  },

  // ── Waterfall Ledger Section ───────────────────────────────────────────────
  waterfallCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  waterfallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  waterfallTitle: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  waterfallMeta: {
    color: colors.textMuted,
    fontSize: 11,
  },
  waterfallList: {
    gap: 10,
  },
  waterfallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  waterfallLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  waterfallRowTitle: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  waterfallRowSub: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  waterfallAmount: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  waterfallTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    padding: 12,
    borderRadius: 8,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  waterfallTotalTitle: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  waterfallTotalSub: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  waterfallTotalAmount: {
    color: colors.cashGreen,
    fontSize: 17,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },

  // ── Denomination Section ───────────────────────────────────────────────────
  denomSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  denomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  denomTitle: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  denomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  autoFillBtnText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  totalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  totalBadgeLabel: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
  },
  totalBadgeVal: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  denomGrid: {
    gap: 8,
  },
  denomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  denomLabelCol: {
    width: 110,
  },
  denomLabel: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  denomTimes: {
    color: colors.textMuted,
    fontSize: 14,
    marginHorizontal: 8,
  },
  denomInput: {
    backgroundColor: '#e3e6ef',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: typography.monoFont,
    width: 70,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  denomEquals: {
    color: colors.textMuted,
    fontSize: 14,
    marginHorizontal: 8,
  },
  denomRowTotal: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: typography.monoFont,
    marginLeft: 'auto',
  },
  denomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  denomFooterSub: {
    color: colors.textSecondary,
    fontSize: 11,
    flex: 1,
    minWidth: 200,
  },
  depositCountedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  depositCountedBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Deposits History Table ─────────────────────────────────────────────────
  depositsCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  depositsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  depositsTitle: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  newDepositMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newDepositMiniBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  tableCol: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  tableCell: {
    color: colors.textPrimary,
    fontSize: 12,
  },
  tableCellMono: {
    color: colors.textPrimary,
    fontSize: 11,
    fontFamily: typography.monoFont,
    fontWeight: '600',
  },
  bankName: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  bankAcc: {
    color: colors.textMuted,
    fontSize: 10,
  },
  depositAmount: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  printSlipBtn: {
    backgroundColor: colors.surfaceElevated,
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // ── Deposit Modal ──────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  modalTitle: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
  modalBody: {
    gap: 12,
  },
  formGroup: {
    gap: 4,
  },
  formLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#000',
    fontSize: 12,
  },
  dualFormRow: {
    flexDirection: 'row',
    gap: 10,
  },
  depositAmountBox: {
    backgroundColor: colors.primary + '15',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    alignItems: 'center',
    gap: 4,
  },
  depositAmountLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  depositAmountVal: {
    color: '#000',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  saveDepositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  saveDepositText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
});
