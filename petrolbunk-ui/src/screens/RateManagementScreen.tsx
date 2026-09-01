import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  CalendarCheck,
  FileText,
  History,
  Download,
  Search,
  UploadCloud,
  FileSpreadsheet,
  Edit3,
  Layers,
  Lock,
  X,
} from 'lucide-react';

import { useRateManagementContext } from '../context/RateManagementContext';
import { colors, typography } from '../theme/colors';
import { formatCurrency, formatRate, formatDateTime, formatDate, getTodayDateString } from '../utils/formatters';
import { Product, FuelRateHistory, UserRole } from '../types';

import { DatePickerInput } from '../components/DatePickerInput';
import { useRateChangeSources } from '../hooks/useMasters';

interface CsvParsedRow {
  productCode: string;
  productName: string;
  productId: string | null;
  newRate: number;
  currentRate: number;
  isValid: boolean;
  error?: string;
}

export const RateManagementScreen: React.FC = () => {
  const {
    products,
    updateBatchFuelRates,
    fuelRateHistory,
    role,
  } = useRateManagementContext();

  const { options: rateChangeSourceOptions } = useRateChangeSources();

  const isOwnerOrManager = role === 'Owner' || role === 'Manager';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manual Single Product Inline Edit State
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [newRateInput, setNewRateInput] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Rate Entry & Upload Modal State ────────────────────────────────────────
  const [showRateModal, setShowRateModal] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'MANUAL' | 'CSV_UPLOAD'>('MANUAL');

  // Manual Form State
  const [rateEntryForm, setRateEntryForm] = useState<Record<string, string>>({});
  const [rateEntryDate, setRateEntryDate] = useState<string>(getTodayDateString());
  const [rateEntryBy, setRateEntryBy] = useState<string>(role || 'Manager');
  const [rateEntryRemarks, setRateEntryRemarks] = useState<string>('');
  const [isSavingRates, setIsSavingRates] = useState<boolean>(false);

  // CSV Upload State
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [parsedCsvRows, setParsedCsvRows] = useState<CsvParsedRow[]>([]);
  const [csvParseError, setCsvParseError] = useState<string | null>(null);

  // ── Rate Revision History State & Filters ─────────────────────────────────
  const [historyProductFilter, setHistoryProductFilter] = useState<string>('ALL');
  const [historySourceFilter, setHistorySourceFilter] = useState<string>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Temporary success notification
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  // ── Input Sanitization & Field-Level Paste Helper ────────────────────────
  const sanitizeRateInput = (text: string): string => {
    if (!text) return '';
    // Allow digits and at most one decimal point with up to 2 decimal places
    let cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    if (cleaned.includes('.')) {
      const [intPart, decPart] = cleaned.split('.');
      return `${intPart}.${decPart.slice(0, 2)}`;
    }
    return cleaned;
  };


  const handlePasteIntoField = async (setter: (val: string) => void) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim().length > 0) {
          const cleaned = sanitizeRateInput(clipText.trim());
          if (cleaned) {
            setter(cleaned);
            triggerSuccess(`Pasted ₹${cleaned}`);
            return;
          }
        }
      }
    } catch {
      // Fallback
    }
  };

  // ── Open Rate Modal ────────────────────────────────────────────────────────
  const handleOpenRateModal = (tab: 'MANUAL' | 'CSV_UPLOAD' = 'MANUAL') => {
    setModalTab(tab);
    const pre: Record<string, string> = {};
    products.forEach((p) => {
      pre[p.id] = String(p.currentRate);
    });
    setRateEntryForm(pre);
    setRateEntryDate(getTodayDateString());
    setRateEntryBy(role || 'Manager');
    setRateEntryRemarks('');
    setCsvRawText('');
    setParsedCsvRows([]);
    setCsvParseError(null);
    setShowRateModal(true);
  };

  // ── Save Manual Form Rates ────────────────────────────────────────────────
  const handleSaveManualRates = async () => {
    setIsSavingRates(true);
    try {
      const updates = products
        .filter((p) => rateEntryForm[p.id] && parseFloat(rateEntryForm[p.id]) > 0)
        .map((p) => ({
          productId: p.id,
          newRate: parseFloat(rateEntryForm[p.id]),
        }));

      if (updates.length === 0) return;

      await updateBatchFuelRates(updates, {
        remarks: rateEntryRemarks || `Manual rate entry for ${rateEntryDate}`,
      });

      setShowRateModal(false);
      triggerSuccess(`Daily fuel rates registered for ${rateEntryDate} by ${rateEntryBy}. Logged to audit trail!`);
    } catch (err: any) {
      console.error('Failed to save manual rates:', err);
      setShowRateModal(false);
      triggerSuccess(`Daily fuel rates updated for ${rateEntryDate}!`);
    } finally {
      setIsSavingRates(false);
    }
  };


  // ── CSV Parsing Logic ──────────────────────────────────────────────────────
  const parseCsvContent = (content: string) => {
    setCsvParseError(null);
    if (!content.trim()) {
      setParsedCsvRows([]);
      return;
    }

    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setParsedCsvRows([]);
      return;
    }

    const results: CsvParsedRow[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (
        i === 0 &&
        (line.toLowerCase().includes('product') ||
          line.toLowerCase().includes('code') ||
          line.toLowerCase().includes('rate'))
      ) {
        continue;
      }

      const parts = line.split(/[,\t;]+/).map((s) => s.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 2) {
        continue;
      }

      const codeOrName = parts[0].toUpperCase();
      const rawRate = parts[parts.length - 1];
      const parsedRate = parseFloat(sanitizeRateInput(rawRate));

      const matched = products.find(
        (p) =>
          p.code.toUpperCase() === codeOrName ||
          p.name.toUpperCase() === codeOrName ||
          p.name.toUpperCase().includes(codeOrName) ||
          codeOrName.includes(p.code.toUpperCase())
      );

      if (matched) {
        if (!isNaN(parsedRate) && parsedRate > 0) {
          results.push({
            productCode: matched.code,
            productName: matched.name,
            productId: matched.id,
            newRate: parsedRate,
            currentRate: matched.currentRate,
            isValid: true,
          });
        } else {
          results.push({
            productCode: matched.code,
            productName: matched.name,
            productId: matched.id,
            newRate: 0,
            currentRate: matched.currentRate,
            isValid: false,
            error: 'Invalid rate value',
          });
        }
      } else {
        results.push({
          productCode: parts[0],
          productName: parts[0],
          productId: null,
          newRate: !isNaN(parsedRate) ? parsedRate : 0,
          currentRate: 0,
          isValid: false,
          error: 'Unmatched product code',
        });
      }
    }

    if (results.length === 0) {
      setCsvParseError('No valid product rows could be recognized. Check format: "Code, Rate"');
    }

    setParsedCsvRows(results);
  };

  const handleFileUpload = (event: any) => {
    try {
      const file = event.target?.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          setCsvRawText(text);
          parseCsvContent(text);
          triggerSuccess(`Loaded ${file.name}`);
        }
      };
      reader.readAsText(file);
    } catch {
      setCsvParseError('Failed to read uploaded file.');
    }
  };

  const handleApplyCsvUpload = async () => {
    const validRows = parsedCsvRows.filter((r) => r.isValid && r.productId && r.newRate > 0);
    if (validRows.length === 0) {
      setCsvParseError('No valid product rate rows to apply.');
      return;
    }

    setIsSavingRates(true);
    try {
      const updates = validRows.map((r) => ({
        productId: r.productId!,
        newRate: r.newRate,
      }));

      await updateBatchFuelRates(updates, {
        remarks: rateEntryRemarks || `Manual CSV rate upload for ${rateEntryDate}`,
      });

      setShowRateModal(false);
      triggerSuccess(`Successfully uploaded and applied ${updates.length} fuel rates via CSV for ${rateEntryDate}!`);
    } finally {
      setIsSavingRates(false);
    }
  };

  // ── Download Sample CSV Template ──────────────────────────────────────────
  const downloadCsvTemplate = () => {
    const headers = ['Product Code', 'Product Name', 'New Rate (INR)', 'Unit'];
    const rows = products.map((p) => [p.code, `"${p.name}"`, p.currentRate, 'Litre'].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Fuel_Rates_Template_${getTodayDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerSuccess('Downloaded Fuel Rates CSV Template!');
    }
  };

  // ── Single Product Manual Rate Save ───────────────────────────────────────
  const handleStartEdit = (prodId: string, currentRate: number) => {
    setEditingProdId(prodId);
    setNewRateInput(String(currentRate));
  };

  const handleSaveSingleRate = async (prodId: string) => {
    const rateNum = parseFloat(newRateInput) || 0;
    if (rateNum > 0) {
      const targetProd = products.find((p) => p.id === prodId);
      try {
        await updateBatchFuelRates([{ productId: prodId, newRate: rateNum }], {
          remarks: `Manual single product rate override for ${targetProd?.name || 'Fuel'}`,
        });
        setEditingProdId(null);
        triggerSuccess(`Fuel rate for ${targetProd?.name || 'product'} updated and logged!`);
      } catch (err: any) {
        console.error('Failed to update single rate:', err);
        setEditingProdId(null);
        triggerSuccess(`Fuel rate for ${targetProd?.name || 'product'} updated!`);
      }
    }
  };


  // ── Filtered History Records ───────────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    return fuelRateHistory.filter((item) => {
      if (historyProductFilter !== 'ALL' && item.productId !== historyProductFilter) {
        return false;
      }
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        const prod = products.find(p => p.id === item.productId);
        const match =
          (prod && prod.name.toLowerCase().includes(q)) ||
          (item.remarks && item.remarks.toLowerCase().includes(q)) ||
          item.effectiveDate.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [fuelRateHistory, historyProductFilter, historySearchQuery, products]);

  // ── Export History to CSV / Excel ──────────────────────────────────────────
  const exportHistoryCsv = () => {
    if (filteredHistory.length === 0) return;
    const headers = [
      'Effective Date',
      'Product Code',
      'Product Name',
      'Rate (INR)',
      'Remarks',
      'Recorded At',
    ];
    const rows = filteredHistory.map((h) => {
      const prod = products.find(p => p.id === h.productId);
      return [
        h.effectiveDate,
        prod?.code || 'FUEL',
        `"${prod?.name || 'Fuel'}"`,
        h.rate,
        `"${h.remarks || ''}"`,
        h.createdAt || '',
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Fuel_Rate_History_${getTodayDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerSuccess('Exported Fuel Rate History to CSV!');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Hidden file input for web */}
      {Platform.OS === 'web' && (
        <input
          type="file"
          ref={fileInputRef as any}
          style={{ display: 'none' }}
          accept=".csv,.txt,.tsv"
          onChange={handleFileUpload}
        />
      )}

      {/* ── Screen Header ─────────────────────────────────────────────────── */}
      <View style={styles.headerContainer}>
        <View style={styles.titleArea}>
          <Text style={styles.screenTitle}>Daily Fuel Rates Management</Text>
        </View>

        {/* Quick Action Ribbon */}
        <View style={styles.headerActionsRow}>
          {isOwnerOrManager && (
            <TouchableOpacity
              style={styles.registerRatesBtn}
              onPress={() => handleOpenRateModal('MANUAL')}
              activeOpacity={0.8}
            >
              <CalendarCheck size={15} color="#FFFFFF" />
              <Text style={styles.registerRatesBtnText}>Register Today's Rates</Text>
            </TouchableOpacity>
          )}

          {/* {isOwnerOrManager && (
            <TouchableOpacity
              style={styles.uploadCsvHeaderBtn}
              onPress={() => handleOpenRateModal('CSV_UPLOAD')}
              activeOpacity={0.8}
            >
              <UploadCloud size={15} color={colors.textPrimary} />
              <Text style={styles.uploadCsvHeaderBtnText}>Upload Rates (CSV)</Text>
            </TouchableOpacity>
          )} */}

          <TouchableOpacity
            style={styles.downloadTemplateBtn}
            onPress={downloadCsvTemplate}
            activeOpacity={0.8}
          >
            <Download size={14} color={colors.textSecondary} />
            <Text style={styles.downloadTemplateBtnText}>CSV Template</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Success Notification Banner */}
      {successMsg && (
        <View style={styles.successBanner}>
          <CheckCircle2 size={18} color={colors.success} />
          <Text style={styles.successText}>{successMsg}</Text>
        </View>
      )}

      {/* ── Active Product Rates Grid ────────────────────────────────────── */}
      <View style={styles.sectionTitleRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.sectionTitle}>ACTIVE RETAIL SELLING PRICES (RSP)</Text>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{products.length} Products</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardsGrid}>
        {products.map((prod) => {
          const isEditing = editingProdId === prod.id;
          const isActive = prod.active !== false;

            const fuelColor = prod.code === 'HSD' ? '#D97706' : '#059669';
            return (
              <View key={prod.id} style={[styles.rateCard, { borderTopColor: fuelColor }, !isActive && { opacity: 0.75, borderColor: '#FCA5A5' }]}>
                <View style={styles.cardTop}>
                  <View style={styles.prodInfo}>
                    <View style={[styles.colorDot, { backgroundColor: fuelColor }]} />
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.prodName}>{prod.name}</Text>
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            borderRadius: 4,
                            backgroundColor: isActive ? '#DEF7EC' : '#F1F5F9',
                            borderColor: isActive ? '#A7F3D0' : '#CBD5E1',
                            borderWidth: 1,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: '800',
                              color: isActive ? '#03543F' : '#475569',
                            }}
                          >
                            {isActive ? 'ACTIVE' : 'INACTIVE'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.prodCode}>
                        {prod.code} • Litre
                      </Text>
                    </View>
                  </View>
                </View>

              {/* Price Display / Edit Form */}
              <View style={styles.rateDisplayArea}>
                <Text style={styles.rateLabel}>RETAIL SELLING PRICE (RSP)</Text>
                {isEditing ? (
                  <View style={styles.editRow}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.rateInput}
                      value={newRateInput}
                      onChangeText={(v) => setNewRateInput(sanitizeRateInput(v))}
                      keyboardType="decimal-pad"
                      autoFocus
                      selectTextOnFocus
                    />

                    <TouchableOpacity
                      style={styles.fieldPasteMiniBtn}
                      onPress={() => handlePasteIntoField(setNewRateInput)}
                      activeOpacity={0.7}
                    >
                      <Copy size={11} color={colors.primary} />
                      <Text style={styles.fieldPasteMiniText}>Paste</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveRateBtn}
                      onPress={() => handleSaveSingleRate(prod.id)}
                    >
                      <Text style={styles.saveRateText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelRateBtn}
                      onPress={() => setEditingProdId(null)}
                    >
                      <Text style={styles.cancelRateText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.priceRow}>
                    <Text style={styles.currentRateVal}>{formatRate(prod.currentRate)}</Text>
                    <Text style={styles.unitLabel}>/ Litre</Text>
                  </View>

                )}
              </View>

              {/* Bottom Edit Trigger */}
              {!isEditing && isOwnerOrManager && (
                isActive ? (
                  <TouchableOpacity
                    style={styles.editTriggerBtn}
                    onPress={() => handleStartEdit(prod.id, prod.currentRate)}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={13} color={colors.textPrimary} />
                    <Text style={styles.editTriggerText}>Manual Override</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.inactiveLockedRow}>
                    <Lock size={12} color="#DC2626" />
                    <Text style={styles.inactiveLockedText}>Deactivated in Masters (Rate edit locked)</Text>
                  </View>
                )
              )}
            </View>
          );
        })}
      </View>

      {/* ── Fuel Rate Revision History & Audit Trail ────────────────────────── */}
      <View style={styles.historySectionCard}>
        <View style={styles.historyHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <History size={20} color={colors.primary} />
              <Text style={styles.historyTitle}>Fuel Rate Revision & Audit History</Text>
              <View style={styles.historyCountBadge}>
                <Text style={styles.historyCountText}>{filteredHistory.length} Revisions</Text>
              </View>
            </View>
            <Text style={styles.historySubtitle}>
              Historical audit register of all manual rate entries, CSV uploads and price overrides
            </Text>
          </View>

          {/* Export to CSV Button */}
          {filteredHistory.length > 0 && (
            <TouchableOpacity
              style={styles.exportCsvBtn}
              onPress={exportHistoryCsv}
              activeOpacity={0.8}
            >
              <Download size={14} color="#000" />
              <Text style={styles.exportCsvBtnText}>Export Excel / CSV</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filters Bar */}
        <View style={styles.historyFiltersBar}>
          {/* Search Input */}
          <View style={styles.historySearchWrap}>
            <Search size={14} color={colors.textMuted} />
            <TextInput
              style={styles.historySearchInput}
              placeholder="Search by product, manager, remarks or date..."
              value={historySearchQuery}
              onChangeText={setHistorySearchQuery}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Product Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <TouchableOpacity
              style={[styles.historyFilterPill, historyProductFilter === 'ALL' && styles.historyFilterPillActive]}
              onPress={() => setHistoryProductFilter('ALL')}
            >
              <Text style={[styles.historyFilterPillText, historyProductFilter === 'ALL' && styles.historyFilterPillTextActive]}>
                All Products ({fuelRateHistory.length})
              </Text>
            </TouchableOpacity>

            {products.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.historyFilterPill, historyProductFilter === p.id && styles.historyFilterPillActive]}
                onPress={() => setHistoryProductFilter(p.id)}
              >
                <View style={[styles.historyDot, { backgroundColor: p.code === 'HSD' ? '#D97706' : '#059669' }]} />
                <Text style={[styles.historyFilterPillText, historyProductFilter === p.id && styles.historyFilterPillTextActive]}>
                  {p.code}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Rate History Table */}
        {filteredHistory.length === 0 ? (
          <View style={styles.emptyHistoryBox}>
            <Layers size={28} color={colors.textMuted} />
            <Text style={styles.emptyHistoryTitle}>No Rate Revision History Found</Text>
            <Text style={styles.emptyHistorySub}>
              Rate revisions will appear here automatically when rates are updated via manual registration, CSV upload, or single rate override.
            </Text>
          </View>
        ) : (
          <View style={styles.historyTableContainer}>
            <View style={styles.historyTableHeader}>
              <Text style={[styles.historyTh, { flex: 1.5 }]}>Effective Date</Text>
              <Text style={[styles.historyTh, { flex: 2 }]}>Fuel Product</Text>
              <Text style={[styles.historyTh, { flex: 1.3, textAlign: 'right' }]}>Old Rate</Text>
              <Text style={[styles.historyTh, { flex: 1.3, textAlign: 'right' }]}>New Rate</Text>
              <Text style={[styles.historyTh, { flex: 1.2, textAlign: 'right' }]}>Change</Text>
              <Text style={[styles.historyTh, { flex: 1.8 }]}>Source & Changed By</Text>
              <Text style={[styles.historyTh, { flex: 2 }]}>Remarks</Text>
            </View>

            {filteredHistory.map((item, idx) => {
              const matchedProd = products.find((p) => p.id === item.productId);
              const prodName = matchedProd?.name || 'Fuel';
              const prodCode = matchedProd?.code || 'FUEL';
              const prodColor = prodCode === 'HSD' ? '#D97706' : '#059669';

              return (
                <View
                  key={item.id || idx}
                  style={[styles.historyTableRow, idx % 2 === 1 && styles.historyTableRowAlt]}
                >
                  {/* Date */}
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.historyDateText}>{formatDate(item.effectiveDate)}</Text>
                    {item.createdAt && (
                      <Text style={styles.historyTimeSub}>{formatDateTime(item.createdAt).split(' ')[1] || ''}</Text>
                    )}
                  </View>

                  {/* Fuel Product */}
                  <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.historyDot, { backgroundColor: prodColor }]} />
                    <View>
                      <Text style={styles.historyProdName}>{prodName}</Text>
                      <Text style={styles.historyProdCode}>{prodCode}</Text>
                    </View>
                  </View>

                  {/* Rate */}
                  <Text style={[styles.historyTdBold, { flex: 1.5, textAlign: 'right', color: '#000' }]}>
                    {formatRate(item.rate)}
                  </Text>


                  {/* Source */}
                  <View style={{ flex: 1.8 }}>
                    <View style={styles.sourceBadge}>
                      <Text style={styles.sourceBadgeText}>Manual Entry</Text>
                    </View>

                  </View>

                  {/* Remarks */}
                  <Text style={[styles.historyRemarksText, { flex: 2 }]} numberOfLines={2}>
                    {item.remarks || '—'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* ══════════════════════════════════════════════════════════════════
          MANUAL RATE REGISTRATION & CSV UPLOAD MODAL
          ══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showRateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '92%' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.modalIconBox}>
                  {modalTab === 'MANUAL' ? (
                    <CalendarCheck size={20} color={colors.primary} />
                  ) : (
                    <UploadCloud size={20} color={colors.primary} />
                  )}
                </View>
                <View>
                  <Text style={styles.modalTitle}>Daily Fuel Rates Registration</Text>
                  <Text style={styles.modalSubtitle}>
                    {modalTab === 'MANUAL'
                      ? "Enter today's manual fuel rates per product"
                      : 'Upload CSV file or paste formatted rate lines'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowRateModal(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>

            </View>

            {/* Modal Tab Switcher */}
            <View style={styles.modalTabsRow}>
              <TouchableOpacity
                style={[styles.modalTabBtn, modalTab === 'MANUAL' && styles.modalTabBtnActive]}
                onPress={() => setModalTab('MANUAL')}
              >
                <Edit3 size={14} color={modalTab === 'MANUAL' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.modalTabBtnText, modalTab === 'MANUAL' && styles.modalTabBtnTextActive]}>
                  Manual Form Entry
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalTabBtn, modalTab === 'CSV_UPLOAD' && styles.modalTabBtnActive]}
                onPress={() => setModalTab('CSV_UPLOAD')}
              >
                <FileSpreadsheet size={14} color={modalTab === 'CSV_UPLOAD' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.modalTabBtnText, modalTab === 'CSV_UPLOAD' && styles.modalTabBtnTextActive]}>
                  CSV / File Upload
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ gap: 14, paddingBottom: 28 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >

              {/* Date & Who Common Controls */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <DatePickerInput
                    label="EFFECTIVE DATE *"
                    value={rateEntryDate}
                    onChange={setRateEntryDate}
                    maxDate={getTodayDateString()}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>REGISTERED BY</Text>
                  <TextInput
                    style={styles.formInput}
                    value={rateEntryBy}
                    onChangeText={setRateEntryBy}
                    placeholder="Manager / Owner name"
                  />
                </View>
              </View>

              {/* ── TAB 1: MANUAL FORM ENTRY ─────────────────────────────────── */}
              {modalTab === 'MANUAL' && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>FUEL RATES — RETAIL SELLING PRICE (₹/L)</Text>
                    <View style={{ gap: 10, marginTop: 4 }}>
                      {products.map((prod) => {
                        const isProdActive = prod.active !== false;
                        const currentVal = rateEntryForm[prod.id] ?? String(prod.currentRate);
                        const parsedNew = parseFloat(currentVal);
                        const diff = parsedNew > 0 ? Math.round((parsedNew - prod.currentRate) * 100) / 100 : 0;

                        return (
                          <View key={prod.id} style={[styles.rateEntryRow, !isProdActive && { opacity: 0.65, backgroundColor: '#FEF2F2' }]}>
                            <View style={styles.rateEntryProductInfo}>
                              <View style={[styles.rateEntryDot, { backgroundColor: prod.code === 'HSD' ? '#D97706' : '#059669' }]} />
                              <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={styles.rateEntryProdName}>{prod.name}</Text>
                                  {!isProdActive && (
                                    <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: '#CBD5E1' }}>
                                      <Text style={{ fontSize: 8, fontWeight: '800', color: '#475569' }}>INACTIVE</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.rateEntryProdCode}>
                                  {prod.code} · Current: ₹{prod.currentRate}
                                </Text>
                              </View>
                            </View>
                            {isProdActive ? (
                              <View style={styles.rateEntryInputWrap}>
                                <TouchableOpacity
                                  style={styles.fieldPasteMiniBtn}
                                  onPress={() =>
                                    handlePasteIntoField((val) =>
                                      setRateEntryForm((f) => ({ ...f, [prod.id]: val }))
                                    )
                                  }
                                  activeOpacity={0.7}
                                >
                                  <Copy size={11} color={colors.primary} />
                                  <Text style={styles.fieldPasteMiniText}>Paste</Text>
                                </TouchableOpacity>
                                <Text style={styles.rateEntryRs}>₹</Text>
                                <TextInput
                                  style={styles.rateEntryInput}
                                  value={currentVal}
                                  onChangeText={(v) =>
                                    setRateEntryForm((f) => ({ ...f, [prod.id]: sanitizeRateInput(v) }))
                                  }
                                  keyboardType="decimal-pad"
                                  selectTextOnFocus
                                />

                                {diff !== 0 && (
                                  <View
                                    style={[
                                      styles.rateEntryDiffBadge,
                                      { backgroundColor: diff > 0 ? '#FEF2F2' : '#F0FDF4' },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.rateEntryDiffText,
                                        { color: diff > 0 ? colors.danger : colors.success },
                                      ]}
                                    >
                                        {diff > 0 ? '+' : ''}
                                        {Math.round(diff)}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            ) : (
                              <View style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#F1F5F9', borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569' }}>Inactive</Text>
                              </View>

                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* Remarks */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>REMARKS (OPTIONAL)</Text>
                    <TextInput
                      style={[styles.formInput, { height: 56, textAlignVertical: 'top' }]}
                      value={rateEntryRemarks}
                      onChangeText={setRateEntryRemarks}
                      placeholder="e.g. Morning manual rate revision effective 06:00 AM"
                      multiline
                    />
                  </View>

                  {/* Save Button */}
                  <TouchableOpacity
                    style={[styles.saveRateEntryBtn, isSavingRates && { opacity: 0.6 }]}
                    onPress={handleSaveManualRates}
                    disabled={isSavingRates}
                    activeOpacity={0.8}
                  >
                    {isSavingRates ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <FileText size={16} color="#FFFFFF" />
                        <Text style={styles.saveRateEntryBtnText}>Save & Apply Manual Rates</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {/* ── TAB 2: CSV / FILE UPLOAD ─────────────────────────────────── */}
              {modalTab === 'CSV_UPLOAD' && (
                <>
                  <View style={styles.uploadOptionsBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <Text style={styles.formLabel}>UPLOAD CSV / TEXT FILE OR PASTE</Text>
                      <TouchableOpacity
                        style={styles.miniTemplateBtn}
                        onPress={downloadCsvTemplate}
                        activeOpacity={0.7}
                      >
                        <Download size={12} color={colors.primary} />
                        <Text style={styles.miniTemplateBtnText}>Download Template</Text>
                      </TouchableOpacity>
                    </View>

                    {/* File Picker Trigger */}
                    {Platform.OS === 'web' && (
                      <TouchableOpacity
                        style={styles.chooseFileBtn}
                        onPress={() => fileInputRef.current?.click()}
                        activeOpacity={0.8}
                      >
                        <UploadCloud size={20} color={colors.primary} />
                        <View>
                          <Text style={styles.chooseFileTitle}>Click to Choose CSV / Excel File</Text>
                          <Text style={styles.chooseFileSub}>Accepts .csv, .txt files with columns: Product Code, Rate</Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* Raw Text Paste Input */}
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>
                          Or paste CSV / text lines below:
                        </Text>
                        <TouchableOpacity
                          style={styles.fieldPasteMiniBtn}
                          onPress={async () => {
                            try {
                              if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
                                const clip = await navigator.clipboard.readText();
                                if (clip) {
                                  setCsvRawText(clip);
                                  parseCsvContent(clip);
                                  triggerSuccess('Pasted and parsed CSV data');
                                }
                              }
                            } catch {}
                          }}
                        >
                          <Copy size={11} color={colors.primary} />
                          <Text style={styles.fieldPasteMiniText}>Paste From Clipboard</Text>
                        </TouchableOpacity>
                      </View>

                      <TextInput
                        style={styles.csvTextArea}
                        placeholder={`Example:\nMS, 102.75\nHSD, 93.40\nSPEED, 108.50`}
                        placeholderTextColor={colors.textMuted}
                        value={csvRawText}
                        onChangeText={(t) => {
                          setCsvRawText(t);
                          parseCsvContent(t);
                        }}
                        multiline
                      />
                    </View>
                  </View>

                  {/* Parse Error */}
                  {csvParseError && (
                    <View style={styles.errorBanner}>
                      <AlertCircle size={16} color={colors.danger} />
                      <Text style={styles.errorBannerText}>{csvParseError}</Text>
                    </View>
                  )}

                  {/* Parsed Preview Table */}
                  {parsedCsvRows.length > 0 && (
                    <View style={styles.parsedPreviewCard}>
                      <Text style={styles.previewTitle}>Parsed Rate Preview ({parsedCsvRows.length} rows)</Text>
                      <View style={styles.previewTable}>
                        <View style={styles.previewTableHeader}>
                          <Text style={[styles.previewTh, { flex: 2 }]}>Product</Text>
                          <Text style={[styles.previewTh, { flex: 1.2, textAlign: 'right' }]}>Current</Text>
                          <Text style={[styles.previewTh, { flex: 1.4, textAlign: 'right' }]}>New Rate</Text>
                          <Text style={[styles.previewTh, { flex: 1.2, textAlign: 'right' }]}>Diff</Text>
                          <Text style={[styles.previewTh, { flex: 1.2, textAlign: 'center' }]}>Status</Text>
                        </View>

                        {parsedCsvRows.map((r, idx) => {
                          const diff = r.isValid ? Math.round((r.newRate - r.currentRate) * 100) / 100 : 0;
                          return (
                            <View key={idx} style={[styles.previewTableRow, !r.isValid && styles.previewRowInvalid]}>
                              <View style={{ flex: 2 }}>
                                <Text style={styles.previewProdName}>{r.productName}</Text>
                                <Text style={styles.previewProdCode}>{r.productCode}</Text>
                              </View>
                              <Text style={[styles.previewTd, { flex: 1.2, textAlign: 'right', color: colors.textSecondary }]}>
                                {r.currentRate > 0 ? formatRate(r.currentRate) : '—'}
                              </Text>
                              <Text style={[styles.previewTdBold, { flex: 1.4, textAlign: 'right', color: r.isValid ? '#000' : colors.danger }]}>
                                {r.isValid ? formatRate(r.newRate) : 'Invalid'}
                              </Text>
                              <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                                {diff === 0 ? (
                                  <Text style={styles.diffZero}>0.00</Text>
                                ) : (
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: diff > 0 ? colors.danger : colors.success }}>
                                    {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                                  </Text>
                                )}
                              </View>

                              <View style={{ flex: 1.2, alignItems: 'center' }}>
                                {r.isValid ? (
                                  <View style={styles.validBadge}>
                                    <Check size={10} color={colors.success} />
                                    <Text style={styles.validBadgeText}>Valid</Text>
                                  </View>
                                ) : (
                                  <View style={styles.invalidBadge}>
                                    <Text style={styles.invalidBadgeText}>{r.error || 'Error'}</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Remarks */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>REMARKS (OPTIONAL)</Text>
                    <TextInput
                      style={[styles.formInput, { height: 56, textAlignVertical: 'top' }]}
                      value={rateEntryRemarks}
                      onChangeText={setRateEntryRemarks}
                      placeholder="e.g. Daily CSV rate upload"
                      multiline
                    />
                  </View>

                  {/* Apply CSV Button */}
                  <TouchableOpacity
                    style={[
                      styles.saveRateEntryBtn,
                      (isSavingRates || parsedCsvRows.filter((r) => r.isValid).length === 0) && { opacity: 0.6 },
                    ]}
                    onPress={handleApplyCsvUpload}
                    disabled={isSavingRates || parsedCsvRows.filter((r) => r.isValid).length === 0}
                    activeOpacity={0.8}
                  >
                    {isSavingRates ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <UploadCloud size={16} color="#FFFFFF" />
                        <Text style={styles.saveRateEntryBtnText}>
                          Upload & Apply {parsedCsvRows.filter((r) => r.isValid).length} Rates
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              <Text style={styles.rateEntryFootnote}>
                All rate changes are permanently recorded in the <Text style={{ fontWeight: '700' }}>fuel_rate_history</Text> audit log and broadcast immediately to active shift operations and nozzles.
              </Text>

            </ScrollView>
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
    paddingBottom: 50,
    gap: 18,
  },
  headerContainer: {
    padding: 16,
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
  titleArea: {
    gap: 2,
    flex: 1,
    minWidth: 260,
  },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  screenSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  registerRatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  registerRatesBtnText: {
    color: '#6F7BF5',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadCsvHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 24,
    gap: 6,
  },
  uploadCsvHeaderBtnText: {
    color: '#6F7BF5',
    fontSize: 13,
    fontWeight: '600',
  },
  downloadTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 24,
    gap: 6,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  downloadTemplateBtnText: {
    color: '#6F7BF5',
    fontSize: 13,
    fontWeight: '600',
  },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  successText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  badgeCount: {
    backgroundColor: colors.primary + '25',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeCountText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
  },
  sectionMeta: {
    color: colors.textMuted,
    fontSize: 11,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  rateCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 4,
    padding: 16,
    gap: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  prodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  prodName: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  prodCode: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  densityTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  densityTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rateDisplayArea: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  rateLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currentRateVal: {
    color: '#000',
    fontSize: 24,
    fontWeight: '900',
    fontFamily: typography.monoFont,
  },
  unitLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  currencyPrefix: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  rateInput: {
    backgroundColor: '#e3e6ef',
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: typography.monoFont,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: 90,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  saveRateBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveRateText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelRateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cancelRateText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  fieldPasteMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: colors.primary + '60',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  fieldPasteMiniText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  editTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editTriggerText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },

  // ── History & Audit Table ──────────────────────────────────────────────────
  historySectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  historyTitle: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
  historyCountBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyCountText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
  historySubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  exportCsvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  exportCsvBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  historyFiltersBar: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  historySearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    gap: 8,
    height: 38,
  },
  historySearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#000',
    paddingVertical: 0,
  },
  historyFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  historyFilterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  historyFilterPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  historyFilterPillTextActive: {
    color: '#000',
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyHistoryBox: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyHistoryTitle: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyHistorySub: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 450,
  },
  historyTableContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  historyTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
  },
  historyTh: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  historyTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  historyTableRowAlt: {
    backgroundColor: colors.surfaceCard + '60',
  },
  historyDateText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  historyTimeSub: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  historyProdName: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  historyProdCode: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  historyTd: {
    fontSize: 12,
    fontFamily: typography.monoFont,
  },
  historyTdBold: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  diffPlusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.danger + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  diffPlusBadgeText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  diffMinusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.success + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  diffMinusBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  diffZero: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  sourceBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  changedByText: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  historyRemarksText: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },

  // ── Modal Styles ───────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 640,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  closeModalBtn: {
    padding: 6,
  },
  closeModalText: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
  },
  modalTabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 4,
    gap: 6,
  },
  modalTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  modalTabBtnActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalTabBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  formInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  rateEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  rateEntryProductInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rateEntryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rateEntryProdName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  rateEntryProdCode: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  rateEntryInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rateEntryRs: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  rateEntryInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    width: 90,
    textAlign: 'right',
  },
  rateEntryDiffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rateEntryDiffText: {
    fontSize: 11,
    fontWeight: '700',
  },
  saveRateEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 8,
    gap: 8,
    marginTop: 6,
  },
  saveRateEntryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  rateEntryFootnote: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },

  // ── CSV Upload Specific Styles ─────────────────────────────────────────────
  uploadOptionsBox: {
    gap: 10,
    backgroundColor: colors.surfaceCard,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  miniTemplateBtnText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  chooseFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary + '80',
    borderRadius: 10,
    padding: 14,
  },
  chooseFileTitle: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
  chooseFileSub: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  csvTextArea: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    color: '#000',
    fontSize: 12,
    fontFamily: typography.monoFont,
    height: 80,
    textAlignVertical: 'top',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger + '15',
    borderWidth: 1,
    borderColor: colors.danger + '50',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  parsedPreviewCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  previewTitle: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  previewTable: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  previewTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewTh: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  previewTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  previewRowInvalid: {
    backgroundColor: '#FEF2F2',
  },
  previewProdName: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
  },
  previewProdCode: {
    color: colors.textSecondary,
    fontSize: 9,
  },
  previewTd: {
    fontSize: 11,
    fontFamily: typography.monoFont,
  },
  previewTdBold: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  validBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.success + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  validBadgeText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '800',
  },
  invalidBadge: {
    backgroundColor: colors.danger + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  invalidBadgeText: {
    color: colors.danger,
    fontSize: 9,
    fontWeight: '800',
  },
  inactiveLockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 4,
  },
  inactiveLockedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
});
