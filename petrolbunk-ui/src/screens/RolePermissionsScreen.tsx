import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  RotateCcw,
  Save,
  Fuel,
  Gauge,
  CreditCard,
  Receipt,
  TrendingUp,
  Banknote,
  Settings,
  LayoutDashboard,
  Search,
  Building2,
  FileText,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { DropdownPicker } from '../components/DropdownPicker';
import { PAGE_CONFIGS, PageId } from '../context/PermissionsContext';
import { colors, typography } from '../theme/colors';

const PAGE_ICONS: Record<PageId, any> = {
  dashboard: LayoutDashboard,
  shifts: Fuel,
  tanks: Gauge,
  credit: CreditCard,
  expenses: Receipt,
  rates: TrendingUp,
  cashbank: Banknote,
  reports: FileText,
  masters: Settings,
  permissions: ShieldCheck,
};

const CATEGORY_COLORS: Record<string, string> = {
  Operations: '#2563EB',
  'Finance & Sales': '#059669',
  Inventory: '#D97706',
  Administration: '#7C3AED',
};

export const RolePermissionsScreen: React.FC = () => {
  const {
    branches,
    role,
    getPagePermissionsForTarget,
    savePagePermissions,
    resetPagePermissions,
  } = useBunk();

  const [selectedTarget, setSelectedTarget] = useState<string>('GLOBAL_MANAGER');
  const [permissionsState, setPermissionsState] = useState<Record<PageId, boolean>>(() =>
    getPagePermissionsForTarget('GLOBAL_MANAGER')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sync state when selected target changes
  useEffect(() => {
    setPermissionsState(getPagePermissionsForTarget(selectedTarget));
  }, [selectedTarget, getPagePermissionsForTarget]);

  // Target label
  const targetLabel = useMemo(() => {
    if (selectedTarget === 'GLOBAL_MANAGER') {
      return 'Global Manager Policy (Applies to all Station Managers)';
    }
    const b = branches.find((br) => br.id === selectedTarget);
    return b ? `${b.name} (${b.omc_brand})` : 'Selected Station Manager';
  }, [selectedTarget, branches]);

  // Branch dropdown options
  const branchDropdownOptions = useMemo(() => {
    return [
      {
        label: 'Global Manager Policy (Default across all outlets)',
        value: 'GLOBAL_MANAGER',
        subtitle: 'Applies to all Station Managers unless overridden',
      },
      ...branches.map((b) => ({
        label: `${b.name} (${b.dealer_code ? `RO: ${b.dealer_code}` : b.omc_brand})`,
        value: b.id,
        subtitle: `Location: ${b.location || 'Branch'} • Brand: ${b.omc_brand}`,
      })),
    ];
  }, [branches]);

  const handleTogglePage = (pageId: PageId, currentValue: boolean) => {
    if (pageId === 'permissions') return; // Strict lock
    setPermissionsState((prev) => ({
      ...prev,
      [pageId]: !currentValue,
    }));
  };

  const handleAllowAll = () => {
    const updated: Record<PageId, boolean> = { ...permissionsState };
    PAGE_CONFIGS.forEach((p) => {
      if (!p.ownerOnly) {
        updated[p.id] = true;
      }
    });
    setPermissionsState(updated);
  };

  const handleRestrictOptional = () => {
    const updated: Record<PageId, boolean> = { ...permissionsState };
    PAGE_CONFIGS.forEach((p) => {
      if (!p.defaultManagerAccess) {
        updated[p.id] = false;
      }
    });
    setPermissionsState(updated);
  };

  const handleResetDefaults = () => {
    resetPagePermissions(selectedTarget);
    setPermissionsState(getPagePermissionsForTarget(selectedTarget));
    setSaveSuccessMsg(`Permissions reset to default configuration for ${targetLabel}`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await savePagePermissions(selectedTarget, permissionsState);
      setSaveSuccessMsg(`Page access policy successfully updated for ${targetLabel}!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      console.warn('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const categories = useMemo(() => {
    return ['ALL', 'Operations', 'Finance & Sales', 'Inventory', 'Administration'];
  }, []);

  const filteredPages = useMemo(() => {
    return PAGE_CONFIGS.filter((page) => {
      const matchSearch =
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'ALL' || page.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [searchQuery, selectedCategory]);

  const allowedCount = useMemo(() => {
    return PAGE_CONFIGS.filter((p) => permissionsState[p.id]).length;
  }, [permissionsState]);

  const restrictedCount = useMemo(() => {
    return PAGE_CONFIGS.filter((p) => !permissionsState[p.id]).length;
  }, [permissionsState]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Top Header Card ─────────────────────────────────────────── */}
      <View style={styles.topHeaderCard}>
        <View style={styles.headerLeft}>
          <View style={styles.shieldIconBox}>
            <ShieldCheck size={26} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={styles.pageTitle}>Page-Wise Role Access Control</Text>
              <View style={styles.ownerOnlyBadge}>
                <Lock size={11} color="#047857" />
                <Text style={styles.ownerOnlyBadgeText}>OWNER ONLY</Text>
              </View>
            </View>
            <Text style={styles.pageSubtitle}>
              Configure full page visibility for Station Managers. Toggling a page OFF completely hides it from navigation and blocks direct access.
            </Text>
          </View>
        </View>

        {/* Quick Stats Chips */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statVal}>{PAGE_CONFIGS.length}</Text>
            <Text style={styles.statLbl}>Total Pages</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={[styles.statVal, { color: '#16A34A' }]}>{allowedCount}</Text>
            <Text style={styles.statLbl}>Visible to Manager</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={[styles.statVal, { color: '#DC2626' }]}>{restrictedCount}</Text>
            <Text style={styles.statLbl}>Hidden from Manager</Text>
          </View>
        </View>
      </View>

      {/* Save Success Alert Banner */}
      {saveSuccessMsg && (
        <View style={styles.successBanner}>
          <CheckCircle2 size={18} color="#15803D" />
          <Text style={styles.successBannerText}>{saveSuccessMsg}</Text>
        </View>
      )}

      {/* ── Target Selector & Quick Actions ───────────────────────── */}
      <View style={styles.targetCard}>
        <View style={styles.targetHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Building2 size={18} color={colors.primary} />
            <Text style={styles.targetSectionTitle}>Select Target Scope (Global or Per-Outlet)</Text>
          </View>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleAllowAll}>
              <Text style={styles.secondaryBtnText}>Allow All Pages</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleRestrictOptional}>
              <Text style={styles.secondaryBtnText}>Restrict Optional</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleResetDefaults}>
              <RotateCcw size={12} color={colors.textSecondary} />
              <Text style={styles.secondaryBtnText}>Reset Defaults</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginTop: 12, maxWidth: 520 }}>
          <DropdownPicker
            placeholder="Select Station Branch or Global Manager Policy..."
            options={branchDropdownOptions}
            value={selectedTarget}
            onChange={(val) => setSelectedTarget(val)}
          />
        </View>
      </View>

      {/* ── Filter Bar & Search ────────────────────────────────────── */}
      <View style={styles.filterRow}>
        <View style={styles.searchPill}>
          <Search size={14} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search pages by name or description..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChipsContainer}
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Page Permission Cards Grid ────────────────────────────── */}
      <View style={styles.pagesGrid}>
        {filteredPages.map((page) => {
          const Icon = PAGE_ICONS[page.id] || LayoutDashboard;
          const isAllowed = permissionsState[page.id] ?? false;
          const isOwnerOnly = !!page.ownerOnly;
          const catColor = CATEGORY_COLORS[page.category] || '#2563EB';

          return (
            <View
              key={page.id}
              style={[
                styles.pageCard,
                isOwnerOnly && styles.pageCardOwnerOnly,
                !isAllowed && !isOwnerOnly && styles.pageCardRestricted,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.pageIconBox, { backgroundColor: catColor + '15' }]}>
                    <Icon size={20} color={catColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.pageCardTitle}>{page.title}</Text>
                      <View style={[styles.catBadge, { backgroundColor: catColor + '15' }]}>
                        <Text style={[styles.catBadgeText, { color: catColor }]}>{page.category}</Text>
                      </View>
                    </View>
                    <Text style={styles.pageCardRoute}>Screen ID: {page.id}</Text>
                  </View>
                </View>

                {/* Switch / Lock */}
                <View style={styles.cardHeaderRight}>
                  {isOwnerOnly ? (
                    <View style={styles.lockedBadge}>
                      <Lock size={12} color="#475569" />
                      <Text style={styles.lockedBadgeText}>Owner Only</Text>
                    </View>
                  ) : (
                    <View style={styles.switchWrapper}>
                      <Switch
                        value={isAllowed}
                        onValueChange={(val) => handleTogglePage(page.id, isAllowed)}
                        trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                        thumbColor={isAllowed ? '#2563EB' : '#F1F5F9'}
                      />
                    </View>
                  )}
                </View>
              </View>

              {/* Description */}
              <Text style={styles.pageCardDesc}>{page.description}</Text>

              {/* Footer Status Pill */}
              <View style={styles.cardFooter}>
                {isOwnerOnly ? (
                  <View style={[styles.statusPill, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
                    <Lock size={12} color="#475569" />
                    <Text style={[styles.statusPillText, { color: '#475569' }]}>
                      Protected: Always visible to Owner only
                    </Text>
                  </View>
                ) : isAllowed ? (
                  <View style={[styles.statusPill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                    <Eye size={12} color="#059669" />
                    <Text style={[styles.statusPillText, { color: '#059669' }]}>
                      Visible to Manager (Allowed)
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.statusPill, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                    <EyeOff size={12} color="#DC2626" />
                    <Text style={[styles.statusPillText, { color: '#DC2626' }]}>
                      Hidden from Manager (Restricted)
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* ── Save Action Bar ────────────────────────────────────────── */}
      <View style={styles.saveBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.saveBarTitle}>Ready to apply policy?</Text>
          <Text style={styles.saveBarSubtitle}>
            Changes take effect immediately across all active manager navigation menus and screens.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Save size={16} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save Page Access Policy</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 60,
    gap: 18,
  },
  topHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    minWidth: 280,
  },
  shieldIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0D63B8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    maxWidth: 600,
    lineHeight: 18,
  },
  ownerOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E4E7EE',
    borderWidth: 1,
    borderColor: '#D6DCE6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  ownerOnlyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#22C55E',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 14,
  },
  statChip: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLbl: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E4E7EE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6DCE6',
    padding: 14,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#22C55E',
    flex: 1,
  },
  targetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    padding: 16,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  targetSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D6DCE6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6F7BF5',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  searchPill: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6DCE6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    height: 36,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  categoryChipsContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6DCE6',
  },
  categoryChipActive: {
    backgroundColor: '#6F7BF5',
    borderColor: '#6F7BF5',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  pageCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF1F5',
    padding: 16,
    gap: 12,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  pageCardOwnerOnly: {
    borderColor: '#D6DCE6',
    backgroundColor: '#F8FAFC',
  },
  pageCardRestricted: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pageIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 3,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pageCardRoute: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  switchWrapper: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  lockedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  cardBody: {
    gap: 10,
  },
  pageCardDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  pageCardDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  saveBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0D63B8',
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 10,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  saveBarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  saveBarSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D63B8',
    borderRadius: 40,
    paddingHorizontal: 20,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
