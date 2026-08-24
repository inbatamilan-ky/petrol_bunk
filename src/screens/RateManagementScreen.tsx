import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Smartphone,
  Clock,
  ArrowRight,
  ShieldCheck,
  Layers,
  Info,
  ChevronDown,
  ChevronUp,
  Building2,
  Settings,
  CalendarCheck,
  FileText,
  History,
  Download,
  Search,
} from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { colors, typography } from '../theme/colors';
import { formatCurrency, formatDateTime, formatDate, getTodayDateString } from '../utils/formatters';
import { fetchDailyOmcRates, CITY_BASE_RATES, OmcRateFeed } from '../utils/omcRateFetcher';
import { FuelRateHistory, BunkProfile } from '../types';
import { DatePickerInput } from '../components/DatePickerInput';

export const RateManagementScreen: React.FC = () => {
  const {
    bunkProfile,
    updateBunkProfile,
    triggerDailyCronSync,
    products,
    updateFuelRate,
    updateBatchFuelRates,
    fuelRateHistory,
    role,
  } = useBunk();

  const isOwnerOrManager = role === 'Owner' || role === 'Manager';

  // Manual Single Product Edit State
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [newRateInput, setNewRateInput] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-Fetch Modal State
  const [showAutoFetchModal, setShowAutoFetchModal] = useState<boolean>(false);
  const [fetchingRates, setFetchingRates] = useState<boolean>(false);
  const [selectedCity, setSelectedCity] = useState<string>('Chennai (Tamil Nadu)');
  const [selectedOmc, setSelectedOmc] = useState<'BPCL'>('BPCL');
  const [fetchedFeed, setFetchedFeed] = useState<OmcRateFeed | null>(null);
  const [selectedFeedProducts, setSelectedFeedProducts] = useState<Record<string, boolean>>({});

  // Bunk OMC Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [profileForm, setProfileForm] = useState<{
    bunkName: string;
    omcBrand: 'BPCL';
    dealerCode: string;
    state: string;
    city: string;
    registeredPhone: string;
    autoFetchEnabled: boolean;
    autoApplyEnabled: boolean;
  }>({
    bunkName: bunkProfile?.bunkName || 'BPCL Chennai Auto Fuel',
    omcBrand: 'BPCL',
    dealerCode: bunkProfile?.dealerCode || '184920',
    state: 'Tamil Nadu',
    city: 'Chennai (Tamil Nadu)',
    registeredPhone: bunkProfile?.registeredPhone || '+919876543210',
    autoFetchEnabled: bunkProfile?.autoFetchEnabled !== false,
    autoApplyEnabled: bunkProfile?.autoApplyEnabled !== false,
  });

  const [triggeringCron, setTriggeringCron] = useState<boolean>(false);

  // Inbound SMS Log Filter State
  const [showWebhookInfo, setShowWebhookInfo] = useState<boolean>(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'ALL' | 'APPLIED' | 'PENDING'>('ALL');

  // ── Daily Rate Registration Form State ─────────────────────────────────────
  const [showRateEntryModal, setShowRateEntryModal] = useState<boolean>(false);
  const [rateEntryForm, setRateEntryForm] = useState<Record<string, string>>({});
  const [rateEntryDate, setRateEntryDate] = useState<string>(getTodayDateString());
  const [rateEntryBy, setRateEntryBy] = useState<string>('Manager');
  const [rateEntryRemarks, setRateEntryRemarks] = useState<string>('');
  const [rateEntrySource, setRateEntrySource] = useState<'MANUAL_ENTRY' | 'SMS_MANUAL_APPLY'>('MANUAL_ENTRY');
  const [isSavingRates, setIsSavingRates] = useState<boolean>(false);

  // ── Rate Revision History State & Filters ─────────────────────────────────
  const [historyProductFilter, setHistoryProductFilter] = useState<string>('ALL');
  const [historySourceFilter, setHistorySourceFilter] = useState<string>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // Trigger temporary success notification
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  // ── Input Sanitization & Field-Level Paste Helper ────────────────────────
  const sanitizeRateInput = (text: string): string => {
    if (!text) return '';
    // Strip extraneous currency symbols, extract decimal number e.g. "Rs. 100.75/L" -> "100.75"
    const match = text.match(/([0-9]+(?:\.[0-9]{1,2})?)/);
    return match ? match[1] : text.replace(/[^0-9.]/g, '');
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
      // If browser clipboard permission fails, user can use regular OS long-press paste
    }
  };

  // ── Daily Rate Registration Handlers ────────────────────────────────────────
  const handleOpenRateEntry = () => {
    // Pre-fill form with current rates for every product
    const pre: Record<string, string> = {};
    products.forEach((p) => {
      pre[p.id] = String(p.currentRate);
    });
    setRateEntryForm(pre);
    setRateEntryDate(getTodayDateString());
    setRateEntryBy('Manager');
    setRateEntryRemarks('');
    setRateEntrySource('MANUAL_ENTRY');
    setShowRateEntryModal(true);
  };

  const handleSaveRateEntry = async () => {
    setIsSavingRates(true);
    try {
      const updates = products
        .filter((p) => rateEntryForm[p.id] && parseFloat(rateEntryForm[p.id]) > 0)
        .map((p) => ({
          productId: p.id,
          newRate: parseFloat(rateEntryForm[p.id]),
        }));

      if (updates.length === 0) return;

      // Pass changed_by, remarks, change_source to batch-rates endpoint
      await updateBatchFuelRates(updates, {
        changed_by: rateEntryBy,
        remarks: rateEntryRemarks || `Daily rate registration for ${rateEntryDate}`,
        change_source: rateEntrySource,
      });

      setShowRateEntryModal(false);
      triggerSuccess(`Daily rates registered for ${rateEntryDate} by ${rateEntryBy}. Saved to fuel_rate_history audit log!`);
    } finally {
      setIsSavingRates(false);
    }
  };

  const isProfileComplete = Boolean(
    bunkProfile?.dealerCode &&
    bunkProfile?.omcBrand &&
    bunkProfile?.dealerCode.trim().length > 2
  );

  // ── Manual Rate Save ───────────────────────────────────────────────────────
  const handleStartEdit = (prodId: string, currentRate: number) => {
    setEditingProdId(prodId);
    setNewRateInput(String(currentRate));
  };

  const handleSaveSingleRate = async (prodId: string) => {
    const rateNum = parseFloat(newRateInput) || 0;
    if (rateNum > 0) {
      const targetProd = products.find((p) => p.id === prodId);
      await updateBatchFuelRates([{ productId: prodId, newRate: rateNum }], {
        changed_by: 'Manager (Manual Override)',
        remarks: `Single product rate override for ${targetProd?.name || 'Fuel'}`,
        change_source: 'MANUAL_ENTRY',
      });
      setEditingProdId(null);
      triggerSuccess('Fuel rate updated, logged to history and broadcasted!');
    }
  };

  // ── Profile Save Handler ───────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    await updateBunkProfile(profileForm);
    setSelectedOmc('BPCL');
    setSelectedCity(profileForm.city);
    setShowProfileModal(false);
    triggerSuccess(`Bunk OMC Profile saved (BPCL - RO: ${profileForm.dealerCode}). Automated 06:00 AM Cron active!`);
  };

  // ── Trigger 06:00 AM Cron Test ─────────────────────────────────────────────
  const handleTriggerCronNow = async () => {
    setTriggeringCron(true);
    try {
      const res = await triggerDailyCronSync();
      triggerSuccess(res?.message || "06:00 AM Python Cron executed! Today's rates synced & applied.");
    } catch {
      triggerSuccess("06:00 AM Cron triggered.");
    } finally {
      setTriggeringCron(false);
    }
  };

  // ── Auto-Fetch Flow ────────────────────────────────────────────────────────
  const handleOpenAutoFetch = async () => {
    setShowAutoFetchModal(true);
    await handleQueryLiveFeed(selectedCity, selectedOmc);
  };

  const handleQueryLiveFeed = async (
    city: string = 'Chennai (Tamil Nadu)',
    omc: 'BPCL' = 'BPCL'
  ) => {
    setFetchingRates(true);
    try {
      const feed = await fetchDailyOmcRates(city, omc);
      setFetchedFeed(feed);
      const initialSel: Record<string, boolean> = {};
      feed.rates.forEach((r) => {
        initialSel[r.code] = true;
      });
      setSelectedFeedProducts(initialSel);
    } catch {
      // Fallback
    } finally {
      setFetchingRates(false);
    }
  };

  const handleApplyFetchedRates = async () => {
    if (!fetchedFeed) return;
    const updates: { productId: string; newRate: number }[] = [];

    fetchedFeed.rates.forEach((feedItem) => {
      if (!selectedFeedProducts[feedItem.code]) return;
      const matched = products.find(
        (p) =>
          p.code.toUpperCase() === feedItem.code.toUpperCase() ||
          p.name.toUpperCase().includes(feedItem.code.toUpperCase()) ||
          (feedItem.code === 'SPEED' && (p.code === 'MS2' || p.code === 'SPEED' || p.name.toUpperCase().includes('POWER') || p.name.toUpperCase().includes('SPEED'))) ||
          (feedItem.code === 'MS' && (p.code === 'MS' || p.code === 'PETROL') && !p.code.includes('2') && !p.name.toUpperCase().includes('POWER'))
      );
      if (matched) {
        updates.push({ productId: matched.id, newRate: feedItem.rate });
      }
    });

    if (updates.length > 0) {
      await updateBatchFuelRates(updates, {
        changed_by: 'BPCL 06:00 AM Auto-Fetch',
        remarks: `Live feed sync from ${fetchedFeed.source}`,
        change_source: 'BATCH_IMPORT',
      });
      setShowAutoFetchModal(false);
      triggerSuccess(`Successfully applied ${updates.length} fuel rates from BPCL daily feed!`);
    }
  };

  // ── Filtered Rate History Computation ──────────────────────────────────────
  const filteredHistory = useMemo(() => {
    return fuelRateHistory.filter((item) => {
      if (historyProductFilter !== 'ALL' && item.productId !== historyProductFilter && item.productCode !== historyProductFilter) {
        return false;
      }
      if (historySourceFilter !== 'ALL' && item.changeSource !== historySourceFilter) {
        return false;
      }
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        const match =
          item.productName.toLowerCase().includes(q) ||
          item.productCode.toLowerCase().includes(q) ||
          item.changedBy.toLowerCase().includes(q) ||
          (item.remarks && item.remarks.toLowerCase().includes(q)) ||
          item.effectiveDate.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [fuelRateHistory, historyProductFilter, historySourceFilter, historySearchQuery]);

  // ── Export History to CSV / Excel ──────────────────────────────────────────
  const exportHistoryCsv = () => {
    if (filteredHistory.length === 0) return;
    const headers = ['Effective Date', 'Product Code', 'Product Name', 'Old Rate (INR)', 'New Rate (INR)', 'Diff (INR)', 'Source', 'Changed By', 'Remarks', 'Recorded At'];
    const rows = filteredHistory.map((h) => {
      const diff = Math.round((h.newRate - h.oldRate) * 100) / 100;
      return [
        h.effectiveDate,
        h.productCode,
        `"${h.productName}"`,
        h.oldRate,
        h.newRate,
        diff,
        h.changeSource,
        `"${h.changedBy}"`,
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
      link.setAttribute('download', `BPCL_Chennai_Rate_History_${getTodayDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerSuccess('Exported Fuel Rate History to CSV!');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* ── Screen Header ─────────────────────────────────────────────────── */}
      <View style={styles.headerContainer}>
        <View style={styles.titleArea}>
          <Text style={styles.screenTitle}>Daily Fuel Rates & Pricing Updates</Text>
           
        </View>

        {/* Quick Action Ribbon */}
        <View style={styles.headerActionsRow}>
          {/* PRIMARY: Register Daily Rates */}
          {isOwnerOrManager && (
            <TouchableOpacity
              style={styles.registerRatesBtn}
              onPress={handleOpenRateEntry}
              activeOpacity={0.8}
            >
              <CalendarCheck size={15} color="#000" />
              <Text style={styles.registerRatesBtnText}>Register Today's Rates</Text>
            </TouchableOpacity>
          )}

          {isOwnerOrManager && (
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => {
                setProfileForm({
                  bunkName: bunkProfile?.bunkName || 'BPCL Chennai Auto Fuel',
                  omcBrand: 'BPCL',
                  dealerCode: bunkProfile?.dealerCode || '184920',
                  state: 'Tamil Nadu',
                  city: 'Chennai (Tamil Nadu)',
                  registeredPhone: bunkProfile?.registeredPhone || '+919876543210',
                  autoFetchEnabled: bunkProfile?.autoFetchEnabled !== false,
                  autoApplyEnabled: bunkProfile?.autoApplyEnabled !== false,
                });
                setShowProfileModal(true);
              }}
              activeOpacity={0.8}
            >
              <Settings size={15} color={colors.textPrimary} />
              <Text style={styles.profileBtnText}>OMC Profile Settings</Text>
            </TouchableOpacity>
          )}

          {isOwnerOrManager && (
            <TouchableOpacity
              style={styles.autoFetchBtn}
              onPress={handleOpenAutoFetch}
              activeOpacity={0.8}
            >
              <Sparkles size={16} color="#000" />
              <Text style={styles.autoFetchBtnText}>Auto-Fetch Today's Rates</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Bunk / Manager OMC Profile Status Banner ────────────────────────── */}
      {isProfileComplete ? (
        <View style={styles.registeredProfileBanner}>
          <View style={styles.profileBannerLeft}>
            <View style={styles.omcBrandBadge}>
              <Text style={styles.omcBrandBadgeText}>{bunkProfile?.omcBrand}</Text>
            </View>
            <View>
              <Text style={styles.profileBunkName}>{bunkProfile?.bunkName}</Text>
              <Text style={styles.profileDealerDetails}>
                RO / Dealer Code: <Text style={{ fontWeight: '800', color: '#000' }}>{bunkProfile?.dealerCode}</Text> • {bunkProfile?.city}
              </Text>
            </View>
          </View>

          <View style={styles.profileBannerRight}>
            <View style={styles.cronStatusBadge}>
              <Clock size={12} color={colors.success} />
              <Text style={styles.cronStatusText}>Daily 06:00 AM Cron Active</Text>
            </View>

            {isOwnerOrManager && (
              <TouchableOpacity
                style={styles.triggerCronBtn}
                onPress={handleTriggerCronNow}
                disabled={triggeringCron}
              >
                {triggeringCron ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <RefreshCw size={12} color="#000" />
                    <Text style={styles.triggerCronBtnText}>Trigger 06:00 AM Cron (Test)</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.unregisteredProfileBanner}>
          <AlertCircle size={20} color="#D97706" />
          <View style={{ flex: 1 }}>
            <Text style={styles.unregisteredTitle}>OMC Dealer Profile Incomplete</Text>
            <Text style={styles.unregisteredBody}>
              Register your Dealer RO Code and OMC Brand to enable automated 06:00 AM Python Cron syncing, or paste your morning rate SMS in the Quick Import box below.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.registerNowBtn}
            onPress={() => setShowProfileModal(true)}
          >
            <Text style={styles.registerNowBtnText}>Register Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Success Banner */}
      {successMsg && (
        <View style={styles.successBanner}>
          <CheckCircle2 size={18} color={colors.success} />
          <Text style={styles.successText}>{successMsg}</Text>
        </View>
      )}

      {/* ── Active Product Rates Grid ────────────────────────────────────── */}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>ACTIVE RETAIL SELLING PRICES (RSP)</Text>
        <Text style={styles.sectionMeta}>{products.length} Products Configured</Text>
      </View>

      <View style={styles.cardsGrid}>
        {products.map((prod) => {
          const isEditing = editingProdId === prod.id;

          return (
            <View key={prod.id} style={[styles.rateCard, { borderTopColor: prod.color }]}>
              <View style={styles.cardTop}>
                <View style={styles.prodInfo}>
                  <View style={[styles.colorDot, { backgroundColor: prod.color }]} />
                  <View>
                    <Text style={styles.prodName}>{prod.name}</Text>
                    <Text style={styles.prodCode}>
                      {prod.code} • {prod.unit}
                    </Text>
                  </View>
                </View>
                {prod.standardDensityRange && (
                  <View style={[styles.densityTag, { backgroundColor: prod.color + '18' }]}>
                    <Text style={[styles.densityTagText, { color: prod.color }]}>
                      {prod.standardDensityRange.min}-{prod.standardDensityRange.max} kg/m³
                    </Text>
                  </View>
                )}
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
                      keyboardType="numeric"
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
                    <Text style={styles.currentRateVal}>{formatCurrency(prod.currentRate)}</Text>
                    <Text style={styles.unitLabel}>/ {prod.unit}</Text>
                  </View>
                )}
              </View>

              {/* Bottom Edit Trigger */}
              {!isEditing && isOwnerOrManager && (
                <TouchableOpacity
                  style={styles.editTriggerBtn}
                  onPress={() => handleStartEdit(prod.id, prod.currentRate)}
                  activeOpacity={0.7}
                >
                  <TrendingUp size={14} color={colors.accent} />
                  <Text style={styles.editTriggerText}>Manual Override</Text>
                </TouchableOpacity>
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
              Permanent tamper-proof register of daily rate changes, 06:00 AM Cron syncs & manual adjustments
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
                <View style={[styles.historyDot, { backgroundColor: p.color }]} />
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
              Rate revisions will appear here automatically when rates are updated via 06:00 AM Cron, manual override, or daily registration.
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
              const diff = Math.round((item.newRate - item.oldRate) * 100) / 100;
              const matchedProd = products.find((p) => p.id === item.productId || p.code.toUpperCase() === item.productCode.toUpperCase());
              const prodColor = matchedProd?.color || colors.primary;

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
                      <Text style={styles.historyProdName}>{item.productName}</Text>
                      <Text style={styles.historyProdCode}>{item.productCode}</Text>
                    </View>
                  </View>

                  {/* Old Rate */}
                  <Text style={[styles.historyTd, { flex: 1.3, textAlign: 'right', color: colors.textSecondary }]}>
                    {item.oldRate > 0 ? formatCurrency(item.oldRate) : '—'}
                  </Text>

                  {/* New Rate */}
                  <Text style={[styles.historyTdBold, { flex: 1.3, textAlign: 'right', color: '#000' }]}>
                    {formatCurrency(item.newRate)}
                  </Text>

                  {/* Difference Badge */}
                  <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                    {diff === 0 ? (
                      <Text style={styles.diffZero}>0.00</Text>
                    ) : diff > 0 ? (
                      <View style={styles.diffPlusBadge}>
                        <TrendingUp size={10} color={colors.danger} />
                        <Text style={styles.diffPlusBadgeText}>+{diff.toFixed(2)}</Text>
                      </View>
                    ) : (
                      <View style={styles.diffMinusBadge}>
                        <TrendingDown size={10} color={colors.success} />
                        <Text style={styles.diffMinusBadgeText}>{diff.toFixed(2)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Source & Changed By */}
                  <View style={{ flex: 1.8 }}>
                    <View style={styles.sourceBadge}>
                      <Text style={styles.sourceBadgeText}>
                        {item.changeSource === 'SMS_AUTO'
                          ? '🤖 06 AM Cron'
                          : item.changeSource === 'SMS_MANUAL_APPLY'
                          ? '📱 SMS Apply'
                          : item.changeSource === 'BATCH_IMPORT'
                          ? '⚡ Batch Sync'
                          : '✏️ Manual'}
                      </Text>
                    </View>
                    <Text style={styles.changedByText} numberOfLines={1}>
                      {item.changedBy}
                    </Text>
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

      {/* ── Statutory & GST Guidelines Card ──────────────────────────────── */}
       

      {/* ══════════════════════════════════════════════════════════════════
          DAILY RATE REGISTRATION MODAL
          ══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showRateEntryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRateEntryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarCheck size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Daily Rate Registration</Text>
                  <Text style={styles.modalSubtitle}>Enter today's OMC rates — saved to audit history</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowRateEntryModal(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>

              {/* Date & Who */}
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

              {/* Source Type Toggle */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>CHANGE SOURCE</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['MANUAL_ENTRY', 'SMS_MANUAL_APPLY'] as const).map((src) => (
                    <TouchableOpacity
                      key={src}
                      style={[
                        styles.sourceTypeBtn,
                        rateEntrySource === src && styles.sourceTypeBtnActive,
                      ]}
                      onPress={() => setRateEntrySource(src)}
                    >
                      <Text style={[
                        styles.sourceTypeBtnText,
                        rateEntrySource === src && { color: '#000', fontWeight: '700' },
                      ]}>
                        {src === 'MANUAL_ENTRY' ? '✏️ Manual Entry' : '📱 SMS (Manual Apply)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Rate Entry Grid — one row per product */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>FUEL RATES — RETAIL SELLING PRICE (₹/L)</Text>
                <View style={{ gap: 10, marginTop: 4 }}>
                  {products.map((prod) => {
                    const currentVal = rateEntryForm[prod.id] ?? String(prod.currentRate);
                    const parsedNew = parseFloat(currentVal);
                    const diff = parsedNew > 0 ? Math.round((parsedNew - prod.currentRate) * 100) / 100 : 0;
                    return (
                      <View key={prod.id} style={styles.rateEntryRow}>
                        <View style={styles.rateEntryProductInfo}>
                          <View style={[styles.rateEntryDot, { backgroundColor: prod.color }]} />
                          <View>
                            <Text style={styles.rateEntryProdName}>{prod.name}</Text>
                            <Text style={styles.rateEntryProdCode}>{prod.code} · Current: ₹{prod.currentRate}</Text>
                          </View>
                        </View>
                        <View style={styles.rateEntryInputWrap}>
                          <TouchableOpacity
                            style={styles.fieldPasteMiniBtn}
                            onPress={() => handlePasteIntoField((val) => setRateEntryForm((f) => ({ ...f, [prod.id]: val })))}
                            activeOpacity={0.7}
                          >
                            <Copy size={11} color={colors.primary} />
                            <Text style={styles.fieldPasteMiniText}>Paste</Text>
                          </TouchableOpacity>
                          <Text style={styles.rateEntryRs}>₹</Text>
                          <TextInput
                            style={styles.rateEntryInput}
                            value={currentVal}
                            onChangeText={(v) => setRateEntryForm((f) => ({ ...f, [prod.id]: sanitizeRateInput(v) }))}
                            keyboardType="numeric"
                            selectTextOnFocus
                          />
                          {diff !== 0 && (
                            <View style={[
                              styles.rateEntryDiffBadge,
                              { backgroundColor: diff > 0 ? '#FEF2F2' : '#F0FDF4' },
                            ]}>
                              <Text style={[
                                styles.rateEntryDiffText,
                                { color: diff > 0 ? colors.danger : colors.success },
                              ]}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Remarks */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>REMARKS (OPTIONAL)</Text>
                <TextInput
                  style={[styles.formInput, { height: 64, textAlignVertical: 'top' }]}
                  value={rateEntryRemarks}
                  onChangeText={setRateEntryRemarks}
                  placeholder="e.g. BPCL morning revision effective 06:00 AM"
                  multiline
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveRateEntryBtn, isSavingRates && { opacity: 0.6 }]}
                onPress={handleSaveRateEntry}
                disabled={isSavingRates}
                activeOpacity={0.8}
              >
                {isSavingRates ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <FileText size={16} color="#000" />
                    <Text style={styles.saveRateEntryBtnText}>Save & Register Daily Rates</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.rateEntryFootnote}>
                ⚡ Rates will be saved to <Text style={{ fontWeight: '700' }}>fuel_rate_history</Text> audit log with old rate, new rate, date, changed by and source. All active nozzles update immediately.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── OMC Profile Settings Modal ────────────────────────────────────── */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Building2 size={20} color={colors.primary} />
                <View>
                  <Text style={styles.modalTitle}>Bunk OMC & Dealer Profile</Text>
                  <Text style={styles.modalSubtitle}>Configure RO Dealer Code for 06:00 AM Cron automation</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setShowProfileModal(false)}
              >
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12 }}>
              {/* Bunk Name */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Bunk Legal / Outlet Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={profileForm.bunkName}
                  onChangeText={(val) => setProfileForm({ ...profileForm, bunkName: val })}
                  placeholder="e.g. Sri Balaji Fuel Station"
                />
              </View>

              {/* OMC Brand Selection - Locked to BPCL */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>OMC Oil Marketing Company</Text>
                <View style={[styles.omcFilterPill, styles.omcFilterPillActive, { alignSelf: 'flex-start', paddingHorizontal: 14 }]}>
                  <Text style={[styles.omcFilterPillText, styles.omcFilterPillTextActive]}>
                    BPCL — Bharat Petroleum Corporation Ltd.
                  </Text>
                </View>
              </View>

              {/* Dealer Code & Phone */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Dealer / RO Code *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={profileForm.dealerCode}
                    onChangeText={(val) => setProfileForm({ ...profileForm, dealerCode: val })}
                    placeholder="e.g. 184920"
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Registered Mobile (SMS)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={profileForm.registeredPhone}
                    onChangeText={(val) => setProfileForm({ ...profileForm, registeredPhone: val })}
                    placeholder="+919876543210"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Region / Benchmark City - Locked to Chennai */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>State & District Benchmark Location</Text>
                <View style={[styles.cityPill, styles.cityPillActive, { alignSelf: 'flex-start', paddingHorizontal: 14 }]}>
                  <Text style={[styles.cityPillText, styles.cityPillTextActive]}>
                    Chennai District (Tamil Nadu)
                  </Text>
                </View>
              </View>

              {/* Automation Switches */}
              <View style={styles.profileTogglesBox}>
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setProfileForm({ ...profileForm, autoFetchEnabled: !profileForm.autoFetchEnabled })}
                >
                  <View style={[styles.checkbox, profileForm.autoFetchEnabled && styles.checkboxChecked]}>
                    {profileForm.autoFetchEnabled && <Check size={12} color="#000" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>Enable Daily 06:00 AM Python Background Cron</Text>
                    <Text style={styles.toggleSub}>Server automatically queries BPCL Chennai rates every morning at 06:00 AM IST</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setProfileForm({ ...profileForm, autoApplyEnabled: !profileForm.autoApplyEnabled })}
                >
                  <View style={[styles.checkbox, profileForm.autoApplyEnabled && styles.checkboxChecked]}>
                    {profileForm.autoApplyEnabled && <Check size={12} color="#000" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>Auto-Broadcast to Active Shifts & Nozzles</Text>
                    <Text style={styles.toggleSub}>Applies new prices automatically without requiring manager intervention</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalBottomActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowProfileModal(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveProfileBtn}
                onPress={handleSaveProfile}
              >
                <Check size={16} color="#000" />
                <Text style={styles.saveProfileBtnText}>Save & Activate Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Auto-Fetch Today's Rates Modal ───────────────────────────────── */}
      <Modal
        visible={showAutoFetchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAutoFetchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sparkles size={20} color={colors.primary} />
                <View>
                  <Text style={styles.modalTitle}>Auto-Fetch Today's Rates</Text>
                  <Text style={styles.modalSubtitle}>Query BPCL Chennai market pricing feed & 1-tap broadcast</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setShowAutoFetchModal(false)}
              >
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Locked BPCL Chennai Badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceCard, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
              <View style={[styles.omcBrandBadge, { backgroundColor: '#FFD700' }]}>
                <Text style={[styles.omcBrandBadgeText, { color: '#000' }]}>BPCL</Text>
              </View>
              <View>
                <Text style={{ color: '#000', fontSize: 13, fontWeight: '800' }}>Bharat Petroleum Corporation Ltd.</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Location: Chennai District (Tamil Nadu) • RO: {bunkProfile?.dealerCode || '184920'}</Text>
              </View>
            </View>


            {/* Feed Rates Comparison Table */}
            {fetchingRates ? (
              <View style={styles.loadingFeedBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingFeedText}>Fetching today's RSP feed for {selectedOmc} ({selectedCity})...</Text>
              </View>
            ) : fetchedFeed ? (
              <View style={styles.feedResultsArea}>
                <View style={styles.feedMetaInfo}>
                  <Text style={styles.feedSourceText}>Source: {fetchedFeed.source}</Text>
                  <Text style={styles.feedEffectiveText}>Effective: {fetchedFeed.effectiveTime} • {fetchedFeed.date}</Text>
                </View>

                <View style={styles.feedTable}>
                  <View style={styles.feedTableHeader}>
                    <Text style={[styles.feedTh, { flex: 2.2 }]}>Product</Text>
                    <Text style={[styles.feedTh, { flex: 1.3, textAlign: 'right' }]}>Current</Text>
                    <Text style={[styles.feedTh, { flex: 1.3, textAlign: 'right' }]}>Today's RSP</Text>
                    <Text style={[styles.feedTh, { flex: 1.2, textAlign: 'right' }]}>Diff</Text>
                  </View>

                  {fetchedFeed.rates.map((item) => {
                    const matched = products.find(
                      (p) =>
                        p.code.toUpperCase() === item.code.toUpperCase() ||
                        p.name.toUpperCase().includes(item.code.toUpperCase()) ||
                        (item.code === 'SPEED' && (p.code === 'MS2' || p.code === 'SPEED' || p.name.toUpperCase().includes('POWER') || p.name.toUpperCase().includes('SPEED'))) ||
                        (item.code === 'MS' && (p.code === 'MS' || p.code === 'PETROL') && !p.code.includes('2') && !p.name.toUpperCase().includes('POWER'))
                    );
                    const currentRate = matched ? matched.currentRate : 0;
                    const diff = currentRate > 0 ? Math.round((item.rate - currentRate) * 100) / 100 : 0;
                    const isChecked = !!selectedFeedProducts[item.code];

                    return (
                      <TouchableOpacity
                        key={item.code}
                        style={[styles.feedTableRow, isChecked && styles.feedTableRowSelected]}
                        onPress={() =>
                          setSelectedFeedProducts((prev) => ({
                            ...prev,
                            [item.code]: !prev[item.code],
                          }))
                        }
                      >
                        <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                            {isChecked && <Check size={12} color="#000" />}
                          </View>
                          <View>
                            <Text style={styles.feedProdName}>{item.name}</Text>
                            <Text style={styles.feedProdCode}>{item.code} • / {item.unit}</Text>
                          </View>
                        </View>

                        <Text style={[styles.feedTd, { flex: 1.3, textAlign: 'right', color: colors.textSecondary }]}>
                          {currentRate > 0 ? formatCurrency(currentRate) : '—'}
                        </Text>

                        <Text style={[styles.feedTdBold, { flex: 1.3, textAlign: 'right', color: '#000' }]}>
                          {formatCurrency(item.rate)}
                        </Text>

                        <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                          {diff === 0 ? (
                            <Text style={styles.diffZero}>0.00</Text>
                          ) : diff > 0 ? (
                            <Text style={styles.diffPlusText}>+{formatCurrency(diff)}</Text>
                          ) : (
                            <Text style={styles.diffMinusText}>{formatCurrency(diff)}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Modal Bottom Actions */}
            <View style={styles.modalBottomActions}>
              <TouchableOpacity
                style={styles.refreshFeedBtn}
                onPress={() => handleQueryLiveFeed(selectedCity, selectedOmc)}
              >
                <RefreshCw size={14} color={colors.textPrimary} />
                <Text style={styles.refreshFeedBtnText}>Re-Query</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyFeedBtn}
                onPress={handleApplyFetchedRates}
                disabled={fetchingRates}
              >
                <Check size={16} color="#000" />
                <Text style={styles.applyFeedBtnText}>1-Tap Sync & Broadcast Selected Rates</Text>
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
    paddingBottom: 50,
    gap: 18,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  titleArea: {
    gap: 2,
    flex: 1,
    minWidth: 260,
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
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  autoFetchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  autoFetchBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },

  // ── Register Today's Rates primary button ──────────────────────────────────
  registerRatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  registerRatesBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },

  // ── Clipboard SMS Strip ────────────────────────────────────────────────────
  clipboardStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    padding: 12,
    gap: 12,
    marginBottom: 4,
  },
  clipboardStripLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  clipboardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipboardStripTitle: {
    color: '#1E40AF',
    fontSize: 12,
    fontWeight: '800',
  },
  clipboardStripSub: {
    color: '#3B82F6',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },
  clipboardReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flexShrink: 0,
  },
  clipboardReadBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },

  // ── Daily Rate Entry Modal Styles ──────────────────────────────────────────
  sourceTypeBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
  },
  sourceTypeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
  },
  sourceTypeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rateEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
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
    color: '#000',
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
  rateEntryRs: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
  rateEntryInput: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: colors.primary + '60',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
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
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  saveRateEntryBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  rateEntryFootnote: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  formLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  autoListenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  autoListenChipActive: {
    backgroundColor: colors.success + '15',
    borderColor: colors.success,
  },
  autoListenChipInactive: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border,
  },
  autoListenChipText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  pulseDotActive: {
    backgroundColor: colors.success,
  },

  // ── Profile Banner Styles ──────────────────────────────────────────────────
  registeredProfileBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
  },
  profileBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 260,
  },
  omcBrandBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  omcBrandBadgeText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  profileBunkName: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  profileDealerDetails: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  profileBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  cronStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '18',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  cronStatusText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  triggerCronBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    gap: 6,
  },
  triggerCronBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
  unregisteredProfileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  unregisteredTitle: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '800',
  },
  unregisteredBody: {
    color: '#B45309',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  registerNowBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  registerNowBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
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
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
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

  // ── Fuel Rate Revision History & Audit Table Styles ────────────────────────
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
  diffPlusText: {
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
  diffMinusText: {
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


  // ── Guideline Card ─────────────────────────────────────────────────────────
  guidelineCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  guidelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guidelineTitle: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
  guidelineBody: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 18,
  },

  // ── Profile Modal Styles ───────────────────────────────────────────────────
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  formInput: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#000',
    fontSize: 13,
    fontWeight: '600',
  },
  profileTogglesBox: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  toggleTitle: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  toggleSub: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  cancelModalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  cancelModalBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  saveProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  saveProfileBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },

  // ── Auto-Fetch Modal Styles ────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
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
  fetchFiltersRow: {
    gap: 12,
    backgroundColor: colors.surfaceCard,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  omcFilterContainer: {
    gap: 6,
  },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  omcPillsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  omcFilterPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  omcFilterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  omcFilterPillText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  omcFilterPillTextActive: {
    color: '#000',
  },
  cityFilterContainer: {
    gap: 6,
  },
  cityPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  cityPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  cityPillTextActive: {
    color: '#000',
    fontWeight: '800',
  },
  loadingFeedBox: {
    padding: 30,
    alignItems: 'center',
    gap: 10,
  },
  loadingFeedText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  feedResultsArea: {
    gap: 10,
  },
  feedMetaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  feedSourceText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  feedEffectiveText: {
    color: '#007DC6',
    fontSize: 10,
    fontWeight: '700',
  },
  feedTable: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  feedTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  feedTh: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  feedTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
    backgroundColor: colors.surface,
  },
  feedTableRowSelected: {
    backgroundColor: colors.primary + '10',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  feedProdName: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  feedProdCode: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  feedTd: {
    fontSize: 12,
    fontFamily: typography.monoFont,
  },
  feedTdBold: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: typography.monoFont,
  },
  modalBottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  refreshFeedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  refreshFeedBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  applyFeedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  applyFeedBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
});
