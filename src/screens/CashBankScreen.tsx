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
} from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { ThermalReceiptModal, ThermalReceiptData } from '../components/ThermalReceiptModal';
import { colors, typography } from '../theme/colors';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';
import { CashDenomination, BankDeposit } from '../types';

export const CashBankScreen: React.FC = () => {
  const { shifts, expenses, bankDeposits, recordBankDeposit, role } = useBunk();

  const [showDepositModal, setShowDepositModal] = useState(false);

  // Bank Deposit Form
  const [bankName, setBankName] = useState('State Bank of India (Main Branch)');
  const [accountNo, setAccountNo] = useState('30982245109 (Current A/c)');
  const [depositedBy, setDepositedBy] = useState('Manager');
  const [refNo, setRefNo] = useState('SBI-CHQ-');
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

  // Aggregates
  const totalCashCollected = shifts.reduce((sum, s) => sum + s.collections.cash, 0);
  const totalExpenses = expenses.reduce((sum, e) => (e.isCreditNote ? sum - e.amount : sum + e.amount), 0);
  const totalDeposited = bankDeposits.reduce((sum, d) => sum + d.amount, 0);

  const netCashInHand = Math.max(0, totalCashCollected - totalExpenses - totalDeposited);

  // Handle Denomination count change
  const handleDenomChange = (key: keyof CashDenomination, val: string) => {
    const numVal = parseInt(val, 10) || 0;
    setDenoms((prev) => ({ ...prev, [key]: numVal }));
  };

  // Submit Bank Deposit
  const handleSaveDeposit = () => {
    if (totalDenominationAmount <= 0) return;

    recordBankDeposit({
      bankName,
      accountNo,
      amount: totalDenominationAmount,
      denominations: denoms,
      depositedBy,
      referenceNo: refNo || `REF-${Date.now()}`,
      notes,
    });

    setShowDepositModal(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Cash Register & Bank Deposits</Text>
          <Text style={styles.screenSubtitle}>
            Physical cash on hand, denomination counter & bank settlement slips
          </Text>
        </View>

        <TouchableOpacity
          style={styles.depositBtn}
          onPress={() => setShowDepositModal(true)}
          activeOpacity={0.8}
        >
          <PlusCircle size={15} color="#000" />
          <Text style={styles.depositBtnText}>New Bank Cash Deposit</Text>
        </TouchableOpacity>
      </View>

      {/* Cash Position Matrix */}
      <View style={styles.matrixGrid}>
        <View style={[styles.matrixCard, { borderLeftColor: colors.cashGreen }]}>
          <Text style={styles.matrixLabel}>NET CASH ON HAND (SAFE)</Text>
          <Text style={[styles.matrixValue, { color: colors.cashGreen }]}>
            {formatCurrency(netCashInHand)}
          </Text>
          <Text style={styles.matrixSub}>Physical cash available for banking</Text>
        </View>

        <View style={[styles.matrixCard, { borderLeftColor: colors.primary }]}>
          <Text style={styles.matrixLabel}>TOTAL SHIFT CASH COLLECTED</Text>
          <Text style={styles.matrixValue}>{formatCurrency(totalCashCollected)}</Text>
          <Text style={styles.matrixSub}>From all daily shifts</Text>
        </View>

        <View style={[styles.matrixCard, { borderLeftColor: colors.info }]}>
          <Text style={styles.matrixLabel}>TOTAL DEPOSITED IN BANK</Text>
          <Text style={styles.matrixValue}>{formatCurrency(totalDeposited)}</Text>
          <Text style={styles.matrixSub}>{bankDeposits.length} bank deposit slips</Text>
        </View>
      </View>

      {/* Interactive Denomination Counter Widget */}
      <View style={styles.denomSection}>
        <View style={styles.denomHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Calculator size={18} color={colors.primary} />
            <Text style={styles.denomTitle}>Real-time Cash Denomination Calculator</Text>
          </View>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeLabel}>COUNTED CASH:</Text>
            <Text style={styles.totalBadgeVal}>{formatCurrency(totalDenominationAmount)}</Text>
          </View>
        </View>

        <View style={styles.denomGrid}>
          {[
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
      </View>

      {/* Bank Deposits History */}
      <View style={styles.depositsCard}>
        <View style={styles.depositsHeader}>
          <Building size={18} color={colors.primary} />
          <Text style={styles.depositsTitle}>Bank Settlement Challans & Proofs</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ marginTop: 4 }}>
          <View style={{ minWidth: 520 }}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCol, { width: 90 }]}>DATE</Text>
              <Text style={[styles.tableCol, { width: 200 }]}>BANK & ACCOUNT</Text>
              <Text style={[styles.tableCol, { width: 130 }]}>REFERENCE #</Text>
              <Text style={[styles.tableCol, { width: 100, textAlign: 'right' }]}>AMOUNT (₹)</Text>
            </View>

            {bankDeposits.map((dep) => (
              <View key={dep.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: 90 }]}>{formatDate(dep.depositDate)}</Text>
                <View style={{ width: 200 }}>
                  <Text style={styles.bankName}>{dep.bankName}</Text>
                  <Text style={styles.bankAcc}>{dep.accountNo}</Text>
                </View>
                <Text style={[styles.tableCellMono, { width: 130 }]}>{dep.referenceNo}</Text>
                <Text style={[styles.depositAmount, { width: 100, textAlign: 'right' }]}>
                  {formatCurrency(dep.amount)}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* New Deposit Modal */}
      <Modal visible={showDepositModal} transparent animationType="slide" onRequestClose={() => setShowDepositModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Bank Deposit Entry</Text>
              <TouchableOpacity onPress={() => setShowDepositModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Bank Account</Text>
                <TextInput
                  style={styles.textInput}
                  value={bankName}
                  onChangeText={setBankName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Account Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={accountNo}
                  onChangeText={setAccountNo}
                />
              </View>

              <View style={styles.dualFormRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Deposit Slip Ref No</Text>
                  <TextInput
                    style={styles.textInput}
                    value={refNo}
                    onChangeText={setRefNo}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Deposited By</Text>
                  <TextInput
                    style={styles.textInput}
                    value={depositedBy}
                    onChangeText={setDepositedBy}
                  />
                </View>
              </View>

              <View style={styles.depositAmountBox}>
                <Text style={styles.depositAmountLabel}>TOTAL DEPOSIT AMOUNT FROM COUNTER:</Text>
                <Text style={styles.depositAmountVal}>
                  {formatCurrency(totalDenominationAmount)}
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveDeposit} activeOpacity={0.8}>
                <CheckCircle2 size={16} color="#000" />
                <Text style={styles.modalSubmitBtnText}>Confirm Bank Deposit</Text>
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
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  depositBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  matrixCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  matrixLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  matrixValue: {
    color: '#000',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: typography.monoFont,
    marginVertical: 4,
  },
  matrixSub: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  denomSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  denomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  denomTitle: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  totalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  totalBadgeLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  totalBadgeVal: {
    color: colors.cashGreen,
    fontSize: 15,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  denomGrid: {
    gap: 8,
  },
  denomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  denomLabelCol: {
    width: 100,
  },
  denomLabel: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  denomTimes: {
    color: colors.textMuted,
    fontSize: 14,
  },
  denomInput: {
    width: 70,
    backgroundColor: '#F8FAFC',
    color: '#000',
    fontSize: 14,
    fontFamily: typography.monoFont,
    fontWeight: '700',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  denomEquals: {
    color: colors.textMuted,
    fontSize: 14,
  },
  denomRowTotal: {
    flex: 1,
    textAlign: 'right',
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  depositsCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  depositsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  depositsTitle: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    paddingHorizontal: 6,
  },
  tableCol: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableRow: {
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
  bankName: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  bankAcc: {
    color: colors.textMuted,
    fontSize: 10,
  },
  tableCellMono: {
    color: colors.accent,
    fontSize: 11,
    fontFamily: typography.monoFont,
  },
  depositAmount: {
    color: colors.cashGreen,
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
    fontSize: 11,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    color: '#000',
    fontSize: 13,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dualFormRow: {
    flexDirection: 'row',
    gap: 10,
  },
  depositAmountBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  depositAmountLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  depositAmountVal: {
    color: colors.cashGreen,
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
});


