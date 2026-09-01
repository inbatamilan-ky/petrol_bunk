import {
  Building,
  Calendar,
  CheckCircle2,
  PlusCircle,
  Save,
  Trash2,
  Wallet,
  X
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';

import { useCashBankContext } from '../context/CashBankContext';
import { colors } from '../theme/colors';
import { formatCurrency, formatDate } from '../utils/formatters';

export const CashBankScreen: React.FC = () => {
  const {
    bankDeposits,
    settlements,
    dailyReconciliation,
    masterBanks,
    masterChannels,
    selectedDate,
    setSelectedDate,
    recordBankDeposit,
    deleteBankDeposit,
    saveReconciliation,
    saveSettlementsBatch,
    syncCashBank,
    role,
  } = useCashBankContext();

  const [activeTab, setActiveTab] = useState<'CASH_BALANCE' | 'DEPOSITS'>('CASH_BALANCE');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(selectedDate);
  const [isSaving, setIsSaving] = useState(false);

  // Cash Reconciliation Form State
  const [openingBalance, setOpeningBalance] = useState('0');
  const [morningCollection, setMorningCollection] = useState('0');
  const [oilDw, setOilDw] = useState('0');
  const [cashForCardSwipe, setCashForCardSwipe] = useState('0');
  const [cashDepositInBank, setCashDepositInBank] = useState('0');
  const [inNote, setInNote] = useState('0');

  // Settlement Matrix State: bankCode_channelCode -> string amount
  const [matrixValues, setMatrixValues] = useState<{ [key: string]: string }>({});

  // Sync reconciliation data when dailyReconciliation changes
  useEffect(() => {
    if (dailyReconciliation) {
      setOpeningBalance(String(dailyReconciliation.openingBalance || '0'));
      setMorningCollection(String(dailyReconciliation.morningCollection || '0'));
      setOilDw(String(dailyReconciliation.oilDw || '0'));
      setCashForCardSwipe(String(dailyReconciliation.cashForCardSwipe || '0'));
      setCashDepositInBank(String(dailyReconciliation.cashDepositInBank || '0'));
      setInNote(String(dailyReconciliation.physicallyCountedNote || '0'));
    } else {
      setOpeningBalance('0');
      setMorningCollection('0');
      setOilDw('0');
      setCashForCardSwipe('0');
      setCashDepositInBank('0');
      setInNote('0');
    }
  }, [dailyReconciliation]);

  // Sync settlement matrix values
  useEffect(() => {
    const map: { [key: string]: string } = {};
    settlements.forEach(s => {
      map[`${s.bankCode}_${s.channelCode}`] = String(s.amount);
    });
    setMatrixValues(map);
  }, [settlements]);

  // Live Calculations
  const numOpening = parseFloat(openingBalance) || 0;
  const numMorning = parseFloat(morningCollection) || 0;
  const numOil = parseFloat(oilDw) || 0;
  const numSwipe = parseFloat(cashForCardSwipe) || 0;
  const numBankDep = parseFloat(cashDepositInBank) || 0;
  const numNote = parseFloat(inNote) || 0;

  const totalCash = numOpening + numMorning + numOil;
  const inSheet = totalCash - numSwipe - numBankDep;
  const difference = inSheet - numNote;
  const netCashForTheDay = inSheet; // Net Cash in safe

  // Default banks and channels if masters not yet loaded
  const banks = useMemo(() => {
    if (masterBanks && masterBanks.length > 0) return masterBanks;
    return [
      { id: 1, code: 'ICICI', name: 'ICICI Bank', sortOrder: 1, isActive: true },
      { id: 2, code: 'SBI', name: 'SBI', sortOrder: 2, isActive: true },
      { id: 3, code: 'HDFC', name: 'HDFC Bank', sortOrder: 3, isActive: true },
      { id: 4, code: 'Paytm', name: 'Paytm Bank', sortOrder: 4, isActive: true },
    ];
  }, [masterBanks]);

  const channels = useMemo(() => {
    if (masterChannels && masterChannels.length > 0) return masterChannels;
    return [
      { id: 1, code: 'Swiping Machine', name: 'Swiping Machine', sortOrder: 1, isActive: true },
      { id: 2, code: 'Gpay', name: 'Gpay (Google Pay)', sortOrder: 2, isActive: true },
      { id: 3, code: 'Phone Pay', name: 'Phone Pay (PhonePe)', sortOrder: 3, isActive: true },
      { id: 4, code: 'Paytm', name: 'Paytm QR/Soundbox', sortOrder: 4, isActive: true },
      { id: 5, code: 'Fleet Card', name: 'Fleet Card', sortOrder: 5, isActive: true },
    ];
  }, [masterChannels]);

  // Settlement Matrix Totals
  const getCellAmount = (bCode: string, cCode: string) => {
    return parseFloat(matrixValues[`${bCode}_${cCode}`] || '0') || 0;
  };

  const channelTotals = useMemo(() => {
    const totals: { [channelCode: string]: number } = {};
    channels.forEach(ch => {
      let sum = 0;
      banks.forEach(b => {
        sum += getCellAmount(b.code, ch.code);
      });
      totals[ch.code] = sum;
    });
    return totals;
  }, [channels, banks, matrixValues]);

  const bankTotals = useMemo(() => {
    const totals: { [bankCode: string]: number } = {};
    banks.forEach(b => {
      let sum = 0;
      channels.forEach(ch => {
        sum += getCellAmount(b.code, ch.code);
      });
      totals[b.code] = sum;
    });
    return totals;
  }, [banks, channels, matrixValues]);

  const grandSettlementTotal = useMemo(() => {
    return Object.values(bankTotals).reduce((sum, v) => sum + v, 0);
  }, [bankTotals]);

  // Handlers
  const handleSaveReconciliation = async () => {
    try {
      setIsSaving(true);
      await saveReconciliation({
        reconDate: selectedDate,
        openingBalance: numOpening,
        morningCollection: numMorning,
        oilDw: numOil,
        totalCash,
        cashForCardSwipe: numSwipe,
        cashDepositInBank: numBankDep,
        systemTotalInSheet: inSheet,
        physicallyCountedNote: numNote,
        netCashForTheDay,
      });
      Alert.alert('Success', `Cash Reconciliation for ${selectedDate} saved!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save reconciliation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettlements = async () => {
    try {
      setIsSaving(true);
      const items: { bankCode: string; channelCode: string; amount: number }[] = [];
      banks.forEach(b => {
        channels.forEach(ch => {
          const amt = getCellAmount(b.code, ch.code);
          if (amt > 0) {
            items.push({
              bankCode: b.code,
              channelCode: ch.code,
              amount: amt,
            });
          }
        });
      });
      await saveSettlementsBatch(selectedDate, items);
      Alert.alert('Success', `Settlements matrix for ${selectedDate} saved!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save settlements');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      const items: { bankCode: string; channelCode: string; amount: number }[] = [];
      banks.forEach(b => {
        channels.forEach(ch => {
          const amt = getCellAmount(b.code, ch.code);
          if (amt > 0) {
            items.push({
              bankCode: b.code,
              channelCode: ch.code,
              amount: amt,
            });
          }
        });
      });

      await Promise.all([
        saveSettlementsBatch(selectedDate, items),
        saveReconciliation({
          reconDate: selectedDate,
          openingBalance: numOpening,
          morningCollection: numMorning,
          oilDw: numOil,
          totalCash,
          cashForCardSwipe: numSwipe,
          cashDepositInBank: numBankDep,
          systemTotalInSheet: inSheet,
          physicallyCountedNote: numNote,
          netCashForTheDay,
        }),
      ]);

      Alert.alert('Success', `Cash & Balance statement for ${selectedDate} saved successfully!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save cash and balance data');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Please enter a valid deposit amount');
      return;
    }
    try {
      await recordBankDeposit(amt, depositDate || selectedDate);
      setShowDepositModal(false);
      setDepositAmount('');
      Alert.alert('Success', `Bank deposit of ₹${amt.toLocaleString()} recorded!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to record deposit');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Cash & Balance</Text>
          <Text style={styles.headerSubtitle}>
            Daily Bank Settlements & Safe Cash Reconciliation
          </Text>
        </View>

        <View style={styles.headerActionsRow}>
          {/* Date Selector */}
          <View style={styles.dateSelectorRow}>
            <Calendar size={16} color={colors.primary} />
            <TextInput
              style={styles.dateInput}
              value={selectedDate}
              onChangeText={t => {
                setSelectedDate(t);
                setDepositDate(t);
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleSaveAll}
            disabled={isSaving}
          >
            <Save size={16} color="#FFF" />
            <Text style={styles.primaryBtnText}>
              {isSaving ? 'Saving...' : ' Save Cash & Balance'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Unified KPI Top Strip */}
      <View style={styles.kpiStrip}>
        <View style={[styles.kpiCard, { borderColor: '#3B82F6' }]}>
          <Text style={styles.kpiLabel}>Total Cash Available</Text>
          <Text style={[styles.kpiValue, { color: '#3B82F6' }]}>{formatCurrency(totalCash)}</Text>
          <Text style={styles.kpiSub}>Opening + Morning + Oil</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#8B5CF6' }]}>
          <Text style={styles.kpiLabel}>Bank Settled Total</Text>
          <Text style={[styles.kpiValue, { color: '#8B5CF6' }]}>{formatCurrency(grandSettlementTotal)}</Text>
          <Text style={styles.kpiSub}>Cards, Gpay, PhonePe, Paytm</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#10B981' }]}>
          <Text style={styles.kpiLabel}>In Excel Sheet</Text>
          <Text style={[styles.kpiValue, { color: '#10B981' }]}>{formatCurrency(inSheet)}</Text>
          <Text style={styles.kpiSub}>Safe Target Balance</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#06B6D4' }]}>
          <Text style={styles.kpiLabel}>In Note (Physical)</Text>
          <Text style={[styles.kpiValue, { color: '#06B6D4' }]}>{formatCurrency(numNote)}</Text>
          <Text style={styles.kpiSub}>Counted in Drawer</Text>
        </View>
        <View
          style={[
            styles.kpiCard,
            { borderColor: Math.abs(difference) < 0.01 ? '#10B981' : '#EF4444' },
          ]}
        >
          <Text style={styles.kpiLabel}>Difference</Text>
          <Text
            style={[
              styles.kpiValue,
              { color: Math.abs(difference) < 0.01 ? '#10B981' : '#EF4444' },
            ]}
          >
            {difference >= 0 ? '+' : ''}
            {formatCurrency(difference)}
          </Text>
          <Text style={styles.kpiSub}>Sheet vs Physical Count</Text>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabNav}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'CASH_BALANCE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('CASH_BALANCE')}
        >
          <Wallet size={16} color={activeTab === 'CASH_BALANCE' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === 'CASH_BALANCE' && styles.tabBtnTextActive]}>
            Cash and Balance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'DEPOSITS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('DEPOSITS')}
        >
          <Building size={16} color={activeTab === 'DEPOSITS' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === 'DEPOSITS' && styles.tabBtnTextActive]}>
            Bank Deposits
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── TAB 1: CASH AND BALANCE UNIFIED VIEW ───────────────────────── */}
        {activeTab === 'CASH_BALANCE' && (
          <View style={{ gap: 20 }}>
            {/* Unified Statement Cross-Check Banner */}
            <View style={styles.crossCheckBanner}>
              <View style={styles.crossCheckHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Wallet size={16} color="#3B82F6" />
                  <Text style={styles.crossCheckTitle}>
                    Daily Cash & Balance Statement — {selectedDate}
                  </Text>
                </View>
                <View style={styles.crossCheckBadge}>
                  <CheckCircle2 size={12} color="#10B981" />
                  <Text style={styles.crossCheckBadgeText}>Daily Reconciliation</Text>
                </View>
              </View>

              <View style={styles.crossCheckGrid}>
                <View style={styles.crossCheckCol}>
                  <Text style={styles.crossCheckColLbl}>Total Available Cash</Text>
                  <Text style={styles.crossCheckColVal}>{formatCurrency(totalCash)}</Text>
                  <Text style={styles.crossCheckColSub}>Opening + Morning + Oil</Text>
                </View>
                <View style={styles.crossCheckCol}>
                  <Text style={styles.crossCheckColLbl}>Total Bank Settled</Text>
                  <Text style={styles.crossCheckColVal}>{formatCurrency(grandSettlementTotal)}</Text>
                  <Text style={styles.crossCheckColSub}>Cards, Gpay, PhonePe, Paytm</Text>
                </View>
                <View style={styles.crossCheckCol}>
                  <Text style={styles.crossCheckColLbl}>Cash in Safe (Sheet Target)</Text>
                  <Text style={styles.crossCheckColVal}>{formatCurrency(inSheet)}</Text>
                  <Text style={styles.crossCheckColSub}>After Swipe & Deposit</Text>
                </View>
                <View style={styles.crossCheckCol}>
                  <Text style={styles.crossCheckColLbl}>Reconciliation Variance</Text>
                  <Text
                    style={[
                      styles.crossCheckColVal,
                      { color: Math.abs(difference) < 0.01 ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {difference >= 0 ? '+' : ''}
                    {formatCurrency(difference)}
                  </Text>
                  <Text style={styles.crossCheckColSub}>
                    {Math.abs(difference) < 0.01 ? 'Balanced Exact' : 'Physical Mismatch'}
                  </Text>
                </View>
              </View>
            </View>


            {/* SECTION 1: BANK SETTLEMENT MATRIX */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>
                    1. Bank Settlement Matrix
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Multi-bank routing for Cards, Gpay, PhonePe, Paytm, and Fleet Cards
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleSaveSettlements}
                  disabled={isSaving}
                >
                  <Save size={14} color={colors.primary} />
                  <Text style={styles.secondaryBtnText}>Save Settlements</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal style={styles.matrixScroll}>
                <View>
                  {/* Header Row: Bank Names */}
                  <View style={styles.matrixHeaderRow}>
                    <View style={[styles.matrixCell, styles.matrixHeaderCol]}>
                      <Text style={styles.matrixHeaderColText}>Channel / Mode</Text>
                    </View>
                    {banks.map(b => (
                      <View key={b.code} style={[styles.matrixCell, styles.matrixBankHeader]}>
                        <Building size={14} color="#FFF" style={{ marginBottom: 4 }} />
                        <Text style={styles.matrixBankHeaderText}>{b.name}</Text>
                      </View>
                    ))}
                    <View style={[styles.matrixCell, styles.matrixTotalHeader]}>
                      <Text style={styles.matrixTotalHeaderText}>Total (₹)</Text>
                    </View>
                  </View>

                  {/* Data Rows: One per Channel */}
                  {channels.map(ch => (
                    <View key={ch.code} style={styles.matrixRow}>
                      <View style={[styles.matrixCell, styles.matrixChannelCol]}>
                        <Text style={styles.matrixChannelText}>{ch.name}</Text>
                      </View>
                      {banks.map(b => {
                        const key = `${b.code}_${ch.code}`;
                        return (
                          <View key={key} style={styles.matrixCell}>
                            <TextInput
                              style={styles.matrixInput}
                              keyboardType="numeric"
                              value={matrixValues[key] || ''}
                              onChangeText={val => {
                                setMatrixValues(prev => ({ ...prev, [key]: val }));
                              }}
                              placeholder="0"
                              placeholderTextColor={colors.textMuted}
                            />
                          </View>
                        );
                      })}
                      {/* Row Total */}
                      <View style={[styles.matrixCell, styles.matrixRowTotalCell]}>
                        <Text style={styles.matrixRowTotalText}>
                          {formatCurrency(channelTotals[ch.code] || 0)}
                        </Text>
                      </View>
                    </View>
                  ))}

                  {/* Footer Row: Bank Totals */}
                  <View style={[styles.matrixRow, styles.matrixFooterRow]}>
                    <View style={[styles.matrixCell, styles.matrixChannelCol]}>
                      <Text style={[styles.matrixChannelText, { fontWeight: '700', color: '#FFF' }]}>
                        Bank Total
                      </Text>
                    </View>
                    {banks.map(b => (
                      <View key={b.code} style={[styles.matrixCell, styles.matrixBankTotalCell]}>
                        <Text style={styles.matrixBankTotalText}>
                          {formatCurrency(bankTotals[b.code] || 0)}
                        </Text>
                      </View>
                    ))}
                    {/* Grand Total */}
                    <View style={[styles.matrixCell, styles.matrixGrandTotalCell]}>
                      <Text style={styles.matrixGrandTotalText}>
                        {formatCurrency(grandSettlementTotal)}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>

            {/* SECTION 2: DAILY CASH RECONCILIATION */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>
                    2. Daily Cash Reconciliation & Drawer Count
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Safe opening cash, morning collection, deductions & physical drawer count
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleSaveReconciliation}
                  disabled={isSaving}
                >
                  <Save size={14} color={colors.primary} />
                  <Text style={styles.secondaryBtnText}>Save Cash Recon</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGrid}>
                {/* Row 1 */}
                <View style={styles.formCard}>
                  <Text style={styles.inputLabel}>1. Opening Balance (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={openingBalance}
                    onChangeText={setOpeningBalance}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={styles.fieldHelper}>Safe opening cash at start of day</Text>
                </View>

                <View style={styles.formCard}>
                  <Text style={styles.inputLabel}>2. Morning Collection (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={morningCollection}
                    onChangeText={setMorningCollection}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={styles.fieldHelper}>Incl. oil, excl. operator bata</Text>
                </View>

                <View style={styles.formCard}>
                  <Text style={styles.inputLabel}>3. Oil / D.W (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={oilDw}
                    onChangeText={setOilDw}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={styles.fieldHelper}>Lubricant & distilled water cash</Text>
                </View>

                {/* Total Cash Computed */}
                <View style={[styles.formCard, styles.computedCard]}>
                  <Text style={styles.computedLabel}>4. Total Cash (₹)</Text>
                  <Text style={styles.computedValue}>{formatCurrency(totalCash)}</Text>
                  <Text style={styles.computedFormula}>= (1) + (2) + (3)</Text>
                </View>

                {/* Row 2 */}
                <View style={styles.formCard}>
                  <Text style={styles.inputLabel}>5. Cash for Card Swipe (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={cashForCardSwipe}
                    onChangeText={setCashForCardSwipe}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={styles.fieldHelper}>Cash given against customer card swipe</Text>
                </View>

                <View style={styles.formCard}>
                  <Text style={styles.inputLabel}>6. Cash Deposit in Bank (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={cashDepositInBank}
                    onChangeText={setCashDepositInBank}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={styles.fieldHelper}>Actual cash sent to bank</Text>
                </View>

                {/* In Sheet Computed */}
                <View style={[styles.formCard, styles.computedCard, { borderColor: '#10B981' }]}>
                  <Text style={[styles.computedLabel, { color: '#10B981' }]}>
                    7. In Excel Sheet (₹)
                  </Text>
                  <Text style={[styles.computedValue, { color: '#10B981' }]}>
                    {formatCurrency(inSheet)}
                  </Text>
                  <Text style={styles.computedFormula}>= Total Cash - Swipe - Deposit</Text>
                </View>

                {/* In Note Physical */}
                <View style={[styles.formCard, { borderColor: '#8B5CF6' }]}>
                  <Text style={[styles.inputLabel, { color: '#8B5CF6' }]}>
                    8. In Note (Physical Count) (₹)
                  </Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: '#8B5CF6', color: '#8B5CF6' }]}
                    keyboardType="numeric"
                    value={inNote}
                    onChangeText={setInNote}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={styles.fieldHelper}>Physically counted cash in drawer</Text>
                </View>

                {/* Difference */}
                <View
                  style={[
                    styles.formCard,
                    styles.computedCard,
                    { borderColor: Math.abs(difference) < 0.01 ? '#10B981' : '#EF4444' },
                  ]}
                >
                  <Text
                    style={[
                      styles.computedLabel,
                      { color: Math.abs(difference) < 0.01 ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    9. Difference (₹)
                  </Text>
                  <Text
                    style={[
                      styles.computedValue,
                      { color: Math.abs(difference) < 0.01 ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {difference >= 0 ? '+' : ''}
                    {formatCurrency(difference)}
                  </Text>
                  <Text style={styles.computedFormula}>= In Excel Sheet - In Note</Text>
                </View>

                {/* Net Cash for Day */}
                <View style={[styles.formCard, styles.computedCard, { borderColor: '#3B82F6' }]}>
                  <Text style={[styles.computedLabel, { color: '#3B82F6' }]}>
                    10. Net Cash for the Day (₹)
                  </Text>
                  <Text style={[styles.computedValue, { color: '#3B82F6' }]}>
                    {formatCurrency(netCashForTheDay)}
                  </Text>
                  <Text style={styles.computedFormula}>Final net safe cash</Text>
                </View>
              </View>
            </View>

            {/* Master Combined Save Banner */}
            <View style={styles.combinedSaveCard}>
              <View>
                <Text style={styles.combinedSaveTitle}>Save Cash & Balance Statement</Text>
                <Text style={styles.combinedSaveSub}>
                  Commit all bank settlement figures and cash drawer reconciliation for {selectedDate} in one action.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSaveAll}
                disabled={isSaving}
              >
                <Save size={16} color="#FFF" />
                <Text style={styles.primaryBtnText}>
                  {isSaving ? 'Saving...' : 'Save Cash & Balance'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── TAB 2: BANK DEPOSITS ───────────────────────────────────────── */}
        {activeTab === 'DEPOSITS' && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Bank Cash Deposits</Text>
                <Text style={styles.sectionSubtitle}>
                  Simple date + amount records matching daily bank drop line
                </Text>
              </View>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setShowDepositModal(true)}
              >
                <PlusCircle size={16} color="#FFF" />
                <Text style={styles.primaryBtnText}>Add Deposit</Text>
              </TouchableOpacity>
            </View>

            {bankDeposits.length === 0 ? (
              <View style={styles.emptyCard}>
                <Building size={40} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No Bank Deposits Recorded</Text>
                <Text style={styles.emptySub}>
                  Record daily cash dropped to the bank using the button above.
                </Text>
              </View>
            ) : (
              <View style={styles.depositList}>
                {bankDeposits.map(dep => (
                  <View key={dep.id} style={styles.depositCard}>
                    <View style={styles.depositLeft}>
                      <View style={styles.depositIconBox}>
                        <Building size={20} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={styles.depositDate}>{formatDate(dep.depositDate)}</Text>
                        <Text style={styles.depositSub}>Cash Bank Deposit</Text>
                      </View>
                    </View>

                    <View style={styles.depositRight}>
                      <Text style={styles.depositAmount}>{formatCurrency(dep.amount)}</Text>
                      <TouchableOpacity
                        style={styles.deleteDepositBtn}
                        onPress={() => {
                          Alert.alert('Confirm Delete', 'Delete this bank deposit record?', [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => deleteBankDeposit(dep.id),
                            },
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
          </View>
        )}
      </ScrollView>

      {/* Add Deposit Modal */}
      <Modal visible={showDepositModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Bank Deposit</Text>
              <TouchableOpacity onPress={() => setShowDepositModal(false)}>
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
                <Text style={styles.inputLabel}>Deposit Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={depositDate}
                  onChangeText={setDepositDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Amount (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={depositAmount}
                  onChangeText={setDepositAmount}
                  placeholder="Enter deposit amount"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
              </View>
            </ScrollView>


            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowDepositModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleAddDeposit}>
                <Save size={16} color="#FFF" />
                <Text style={styles.primaryBtnText}>Save Deposit</Text>
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
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  dateInput: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
    minWidth: 95,
    padding: 0,
  },
  kpiStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: 'transparent',
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF1F5',
    borderRadius: 12,
    padding: 12,
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
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 10,
    color: '#9AA5B1',
    marginTop: 2,
  },
  tabNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    gap: 8,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },
  tabBtnActive: {
    borderColor: '#6F7BF5',
    backgroundColor: '#6F7BF5',
    shadowColor: '#6F7BF5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  contentScroll: {
    flex: 1,
    padding: 20,
  },
  sectionContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  formCard: {
    width: '48%',
    minWidth: 260,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  fieldHelper: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  computedCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },
  computedLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 4,
  },
  computedValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3B82F6',
  },
  computedFormula: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  matrixScroll: {
    marginTop: 8,
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  matrixRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  matrixFooterRow: {
    backgroundColor: '#EFF6FF',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopWidth: 2,
    borderTopColor: '#BFDBFE',
  },
  matrixCell: {
    width: 140,
    paddingVertical: 10,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  matrixHeaderCol: {
    width: 160,
    backgroundColor: '#F8FAFC',
  },
  matrixHeaderColText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  matrixBankHeader: {
    alignItems: 'center',
  },
  matrixBankHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  matrixTotalHeader: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  matrixTotalHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  matrixChannelCol: {
    width: 160,
    backgroundColor: colors.background,
  },
  matrixChannelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  matrixInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
  },
  matrixInputFilled: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  matrixRowTotalCell: {
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceHighlight,
  },
  matrixRowTotalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  matrixBankTotalCell: {
    alignItems: 'flex-end',
  },
  matrixBankTotalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
  matrixGrandTotalCell: {
    alignItems: 'flex-end',
    backgroundColor: '#DBEAFE',
  },
  matrixGrandTotalText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  depositList: {
    gap: 10,
  },
  depositCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
  },
  depositLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  depositIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  depositDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  depositSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  depositRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  depositAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  deleteDepositBtn: {
    padding: 6,
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
    maxWidth: 440,
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
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  crossCheckBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  crossCheckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  crossCheckTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  crossCheckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  crossCheckBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  crossCheckGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  crossCheckCol: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  crossCheckColLbl: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  crossCheckColVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  crossCheckColSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },

  combinedSaveCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: 16,
    flexWrap: 'wrap',
    gap: 14,
  },
  combinedSaveTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  combinedSaveSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    maxWidth: 450,
  },
});
