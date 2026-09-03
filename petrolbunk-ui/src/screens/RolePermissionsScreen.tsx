import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import {
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Fuel,
  Gauge,
  LayoutDashboard,
  Lock,
  Receipt,
  RotateCcw,
  Save,
  Search,
  Building2,
  CheckSquare,
  Square,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { DropdownPicker } from '../components/DropdownPicker';
import { useBunk } from '../context/BunkContext';
import { PAGE_CONFIGS, PageId } from '../context/PermissionsContext';
import { colors } from '../theme/colors';

interface PermissionItem {
  key: string;
  title: string;
  description: string;
  // tag?: 'High Impact' | 'Operational' | 'Financial' | 'Sensitive';
  lockedForManager?: boolean;
}

interface PermissionModule {
  id: string;
  title: string;
  icon: any;
  description: string;
  color: string;
  items: PermissionItem[];
}

const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: 'dashboard',
    title: '1. Dashboard',
    icon: LayoutDashboard,
    color: '#3B82F6',
    description: 'Control visibility of revenue figures, gross profit, cash positions, and analytics exports.',
    items: [
      {
        key: 'dash_view_sales',
        title: 'View Total Gross Sales & Litres Sold',
        description: 'Allows viewing total station revenue and fuel quantity aggregates on the dashboard.',
       // tag: 'Operational',
      },
      {
        key: 'dash_view_cash_pos',
        title: 'View Live Cash Position & Safe Daybook',
        description: 'Allows viewing real-time expected cash in drawer and daily cash reconciliation.',
        // tag: 'Financial',
      },
      {
        key: 'dash_view_margins',
        title: 'View Profit Estimates & Product Margins',
        description: 'Displays gross margin estimates and revenue analysis.',
        // tag: 'Sensitive',
        lockedForManager: true,
      },
      {
        key: 'dash_export_bi',
        title: 'Export Dashboard Financial Reports',
        description: 'Permits downloading CSV/Excel extracts of dashboard analytics.',
        // tag: 'Financial',
      },
    ],
  },
  {
    id: 'shifts',
    title: '2. Shift Ops',
    icon: Fuel,
    color: '#D97706',
    description: 'Control opening shifts, entering closing meters, quality testing, and reconciliation.',
    items: [
      {
        key: 'shift_open_new',
        title: 'Open New Shift for Pump Dispensers',
        description: 'Allows selecting pump dispenser and operator to start a new shift.',
        // tag: 'Operational',
      },
      {
        key: 'shift_enter_closing',
        title: 'Enter Closing Meter Readings & Test Litres',
        description: 'Permits typing closing totalizers and 5-litre testing volumes for fuel sold calculation.',
        // tag: 'Operational',
      },
      {
        key: 'shift_close_settle',
        title: 'Close & Finalize Shift Reconciliation',
        description: 'Allows freezing shift records and printing thermal settlement vouchers.',
        // tag: 'Operational',
      },
      {
        key: 'shift_edit_closed',
        title: 'Edit Shift Details After Closure',
        description: 'Permits reopening or adjusting meter entries of already closed shifts.',
        // tag: 'High Impact',
        lockedForManager: true,
      },
      {
        key: 'shift_delete',
        title: 'Delete Shift Records Permanently',
        description: 'Irreversibly delete a shift and its associated transaction daybook entries.',
        //  tag: 'Sensitive',
        lockedForManager: true,
      },
    ],
  },
  {
    id: 'tanks',
    title: '3. Nozzle Meters',
    icon: Gauge,
    color: '#059669',
    description: 'Control recording of morning/evening physical dips, decantation, and density testing.',
    items: [
      {
        key: 'tank_record_dip',
        title: 'Record Morning & Evening Physical Dips',
        description: 'Allows recording physical dip rod cm measurements and checking stock volume.',
        //  tag: 'Operational',
      },
      {
        key: 'tank_record_decantation',
        title: 'Record TT Tanker Decantation Deliveries',
        description: 'Allows recording tanker invoice volume, pre-dip, post-dip, and transit loss.',
        // tag: 'Operational',
      },
      {
        key: 'tank_enter_density',
        title: 'Enter Observed Density & Temperature',
        description: 'Permits logging hydrometer density and 15°C conversion testing.',
        // tag: 'Operational',
      },
      {
        key: 'tank_record_nozzle_meters',
        title: 'Save Daily Nozzle Totalizer Meters',
        description: 'Allows batch saving full-day totalizer electronic meter readings.',
        // tag: 'Operational',
      },
      {
        key: 'tank_override_variance',
        title: 'Override Stock Variance & Book Stock Adjustments',
        description: 'Permits writing off evaporation losses and adjusting system stock ledger.',
        //  tag: 'Sensitive',
        lockedForManager: true,
      },
    ],
  },
  {
    id: 'credit',
    title: '4. Credit Ledger',
    icon: CreditCard,
    color: '#7C3AED',
    description: 'Control credit fuel dispensing, payment collection receipts, and customer credit limits.',
    items: [
      {
        key: 'credit_record_sale',
        title: 'Record Credit Sales Dispense Slips',
        description: 'Allows allocating fuel sales to registered credit customers and vehicle slips.',
        // tag: 'Operational',
      },
      {
        key: 'credit_record_payment',
        title: 'Record Customer Repayments & Cheques',
        description: 'Permits generating payment receipts for cash, cheque, and NEFT recoveries.',
        // tag: 'Financial',
      },
      {
        key: 'credit_create_customer',
        title: 'Add & Edit Credit Customer Profiles',
        description: 'Allows creating new customer parties, vehicle numbers, and billing addresses.',
        //  tag: 'Operational',
      },
      {
        key: 'credit_override_limit',
        title: 'Override Credit Limit on Outstanding Balances',
        description: 'Permits issuing credit fuel to parties exceeding their sanctioned limit.',
        // tag: 'High Impact',
        lockedForManager: true,
      },
      {
        key: 'credit_export_statement',
        title: 'Export Customer Statements to Excel/PDF',
        description: 'Allows downloading customer account ledgers and outstanding balances.',
        // tag: 'Financial',
      },
    ],
  },
  {
    id: 'expenses',
    title: '5. Expenses',
    icon: Receipt,
    color: '#EA580C',
    description: 'Control recording of station operational expenses, staff bata, and cash payouts.',
    items: [
      {
        key: 'exp_record_voucher',
        title: 'Record Daily Expense Vouchers',
        description: 'Allows filing petty cash payouts, electricity, generator diesel, and tea expenses.',
        // tag: 'Operational',
      },
      {
        key: 'exp_add_category',
        title: 'Create & Edit Expense Category Heads',
        description: 'Allows defining new expense ledger categories in Station Masters.',
        // tag: 'Operational',
      },
      {
        key: 'exp_approve_large',
        title: 'Approve High-Value Expenses (>₹5,000)',
        description: 'Permits authorizing capital expenditures and large vendor payments.',
        // tag: 'High Impact',
        lockedForManager: true,
      },
      {
        key: 'exp_delete_voucher',
        title: 'Delete or Void Recorded Vouchers',
        description: 'Permits removing existing expense vouchers from the daybook ledger.',
        // tag: 'Sensitive',
        lockedForManager: true,
      },
    ],
  },
  {
    id: 'rates',
    title: '6. Daily Rates',
    icon: TrendingUp,
    color: '#0284C7',
    description: 'Control daily petrol & diesel price changes, SMS parsing, and automated rate updates.',
    items: [
      {
        key: 'rate_manual_change',
        title: 'Manual Fuel Rate Change (MS / HSD)',
        description: 'Allows manually editing active per-litre fuel selling prices.',
        // tag: 'High Impact',
      },
      {
        key: 'rate_apply_sms',
        title: 'Apply Rates from Parsed OMC SMS',
        description: 'Allows approving price change messages received from BPCL, IOCL, or HPCL.',
        // tag: 'Operational',
      },
      {
        key: 'rate_batch_import',
        title: 'Batch Import Rate History via Excel',
        description: 'Allows bulk uploading historical price revision records.',
        // tag: 'Operational',
      },
      {
        key: 'rate_auto_apply_toggle',
        title: 'Toggle Automated 06:00 AM Rate Engine',
        description: 'Allows enabling or disabling automatic midnight/morning rate changes.',
        // tag: 'Sensitive',
        lockedForManager: true,
      },
    ],
  },
  {
    id: 'cashbank',
    title: '7. Cash & Bank',
    icon: Banknote,
    color: '#16A34A',
    description: 'Control bank deposits with currency notes breakdown and safe cash vault audits.',
    items: [
      {
        key: 'cash_record_deposit',
        title: 'Record Bank Deposits with Denominations',
        description: 'Allows filing bank drop slips with count of ₹500, ₹200, ₹100, and ₹50 notes.',
        // tag: 'Financial',
      },
      {
        key: 'cash_reconcile_safe',
        title: 'Perform Daily Physical Safe Cash Audits',
        description: 'Allows counting physical cash in drawer and recording shortage/excess.',
        // tag: 'Financial',
      },
      {
        key: 'cash_add_bank_acc',
        title: 'Add & Edit Station Bank Accounts',
        description: 'Allows configuring CC/OD, Current, and Savings accounts in Masters.',
        // tag: 'Sensitive',
        lockedForManager: true,
      },
      {
        key: 'cash_edit_past_daybook',
        title: 'Modify Previous Days Safe Cash Ledger',
        description: 'Permits altering historic cash balance records from earlier dates.',
        // tag: 'Sensitive',
        lockedForManager: true,
      },
    ],
  },
  {
    id: 'masters',
    title: '8. Masters',
    icon: Settings,
    color: '#475569',
    description: 'Configure products, dispensers, nozzles, staff bata rates, and multi-bunk branches.',
    items: [
      {
        key: 'master_manage_staff',
        title: 'Add & Manage Operators & Staff Bata',
        description: 'Allows registering pump attendants and setting daily bata amounts.',
        // tag: 'Operational',
      },
      {
        key: 'master_manage_pumps',
        title: 'Configure Pump Dispensers & Nozzles',
        description: 'Allows creating pump dispensers, assigning fuel colors, and nozzle mappings.',
        // tag: 'High Impact',
      },
      {
        key: 'master_manage_products',
        title: 'Manage Fuel Products & Density Limits',
        description: 'Allows adding lubricant lines, fuels, and setting density tolerances.',
        // tag: 'Sensitive',
        lockedForManager: true,
      },
      {
        key: 'master_manage_branches',
        title: 'Register Branches & Manage Manager Access',
        description: 'Allows creating new bunk outlets and assigning station managers.',
        // tag: 'Sensitive',
        lockedForManager: true,
      },
    ],
  },
];

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
      showsVerticalScrollIndicator={true}
    >
      {/* ── Top Header Card ─────────────────────────────────────────── */}
      <View style={styles.topHeaderCard}>
        <View style={styles.headerLeft}>
          <View style={styles.shieldIconBox}>
            <ShieldCheck size={26} color="#FFFFFF" />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.pageTitle}>Role Access & Permissions</Text>
              {/* <View style={styles.ownerOnlyBadge}>
                <Lock size={11} color="#047857" />
                <Text style={styles.ownerOnlyBadgeText}>OWNER ONLY</Text>
              </View> */}
            </View>
             
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
                     
                  </View>
                </View>

                {/* Switch / Lock */}
                <View style={styles.cardHeaderRight}>
                  {isOwnerOnly ? (
                    <View style={styles.lockedBadge}>
                       
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

              {/* Module Items Table */}
              <View style={styles.itemsList}>
                {matchingItems.map((item, idx) => {
                  const isEnabled = !!permissionsState[item.key];
                  const isLocked = item.lockedForManager && selectedTarget !== 'GLOBAL_OWNER';

                  return (
                    <View
                      key={item.key}
                      style={[
                        styles.itemRow,
                        idx < matchingItems.length - 1 && styles.itemRowBorder,
                        !isEnabled && styles.itemRowDisabled,
                      ]}
                    >
                      <View style={{ flex: 1, paddingRight: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text style={[styles.itemTitleText, !isEnabled && styles.itemTitleDisabled]}>
                            {item.title}
                          </Text>

                          {/* {item.tag && (
                            <View
                              style={[
                                styles.tagBadge,
                                item.tag === 'Sensitive' && { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
                                item.tag === 'High Impact' && { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
                                item.tag === 'Financial' && { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' },
                                item.tag === 'Operational' && { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.tagBadgeText,
                                  item.tag === 'Sensitive' && { color: '#DC2626' },
                                  item.tag === 'High Impact' && { color: '#D97706' },
                                  item.tag === 'Financial' && { color: '#0369A1' },
                                  item.tag === 'Operational' && { color: '#15803D' },
                                ]}
                              >
                                {item.tag}
                              </Text>
                            </View>
                          )}

                          {item.lockedForManager && (
                            <View style={styles.ownerLockBadge}>
                              <Lock size={10} color="#7C3AED" />
                              <Text style={styles.ownerLockBadgeText}>Owner Lock</Text>
                            </View>
                          )} */}
                        </View>
                      </View>

                      {/* Checkbox Toggle */}
                      <TouchableOpacity
                        style={styles.switchWrap}
                        onPress={() => handleTogglePermission(item.key, isEnabled)}
                        activeOpacity={0.7}
                      >
                        {isEnabled ? (
                          <CheckSquare size={24} color={colors.primary} />
                        ) : (
                          <Square size={24} color="#94A3B8" />
                        )}
                        <Text style={[styles.switchStatusLabel, isEnabled ? { color: '#16A34A' } : { color: '#94A3B8' }]}>
                          {isEnabled ? 'ALLOWED' : 'BLOCKED'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      {/* ── Save Action Bar ────────────────────────────────────────── */}
      <View style={styles.saveBar}>
        <View style={{ flex: 1 }}>
           
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
              <Text style={styles.saveBtnText}>Save</Text>

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

  // Modules List
  modulesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  moduleCard: {
    flexBasis: '49%',
    minWidth: 350,
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
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
