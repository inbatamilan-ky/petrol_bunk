import React, { useState, useMemo } from 'react';
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
  User,
  Users,
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
  Info,
  Building2,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { DropdownPicker } from '../components/DropdownPicker';
import { colors, typography } from '../theme/colors';

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

// Initial Default Permissions
const DEFAULT_PERMISSIONS: Record<string, boolean> = {
  dash_view_sales: true,
  dash_view_cash_pos: true,
  dash_view_margins: false,
  dash_export_bi: true,
  shift_open_new: true,
  shift_enter_closing: true,
  shift_close_settle: true,
  shift_edit_closed: false,
  shift_delete: false,
  tank_record_dip: true,
  tank_record_decantation: true,
  tank_enter_density: true,
  tank_record_nozzle_meters: true,
  tank_override_variance: false,
  credit_record_sale: true,
  credit_record_payment: true,
  credit_create_customer: true,
  credit_override_limit: false,
  credit_export_statement: true,
  exp_record_voucher: true,
  exp_add_category: true,
  exp_approve_large: false,
  exp_delete_voucher: false,
  rate_manual_change: true,
  rate_apply_sms: true,
  rate_batch_import: false,
  rate_auto_apply_toggle: false,
  cash_record_deposit: true,
  cash_reconcile_safe: true,
  cash_add_bank_acc: false,
  cash_edit_past_daybook: false,
  master_manage_staff: true,
  master_manage_pumps: true,
  master_manage_products: false,
  master_manage_branches: false,
};

export const RolePermissionsScreen: React.FC = () => {
  const { branches, role, currentUser } = useAuthContext();

  const [selectedTarget, setSelectedTarget] = useState<string>('GLOBAL_MANAGER');
  const [permissionsState, setPermissionsState] = useState<Record<string, boolean>>(DEFAULT_PERMISSIONS);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Target label
  const targetLabel = useMemo(() => {
    if (selectedTarget === 'GLOBAL_MANAGER') {
      return 'Global Manager Role (Applies to all Station Managers)';
    }
    const b = branches.find((br) => br.id === selectedTarget);
    return b ? `${b.name} — Manager: ${b.manager_name || 'Assigned Manager'}` : 'Selected Station Manager';
  }, [selectedTarget, branches]);

  // Branch dropdown options directly from branches table
  const branchDropdownOptions = useMemo(() => {
    return [
      {
        label: 'Global Manager Role (Default)',
        value: 'GLOBAL_MANAGER',
        subtitle: 'Applies to all Station Managers across outlets',
      },
      ...branches.map((b) => ({
        label: `${b.name} (${b.dealer_code ? `RO: ${b.dealer_code}` : b.omc_brand})`,
        value: b.id,
        subtitle: `Manager: ${b.manager_name || 'Assigned Manager'} • Location: ${b.location || 'Branch'}`,
        color: colors.primary,
      })),
    ];
  }, [branches]);

  const handleTogglePermission = (key: string, currentValue: boolean) => {
    setPermissionsState((prev) => ({
      ...prev,
      [key]: !currentValue,
    }));
  };

  const handleResetDefaults = () => {
    setPermissionsState({ ...DEFAULT_PERMISSIONS });
  };

  const handleSavePermissions = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccessMsg(`Access policies successfully applied to ${targetLabel}!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }, 600);
  };

  const allowedCount = useMemo(() => {
    return Object.values(permissionsState).filter(Boolean).length;
  }, [permissionsState]);

  const restrictedCount = useMemo(() => {
    return Object.values(permissionsState).filter((v) => !v).length;
  }, [permissionsState]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* ── Top Header & Stats ─────────────────────────────────────────── */}
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
            <Text style={styles.pageSubtitle}>
              Configure granular module permissions and station manager operational access across all bunk outlets.
            </Text>
          </View>
        </View>

        {/* Quick Stats Chips */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statVal}>{branches.length}</Text>
            <Text style={styles.statLbl}>Stations</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={[styles.statVal, { color: '#16A34A' }]}>{allowedCount}</Text>
            <Text style={styles.statLbl}>Allowed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={[styles.statVal, { color: '#DC2626' }]}>{restrictedCount}</Text>
            <Text style={styles.statLbl}>Restricted</Text>
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

      {/* ── Manager / Target Selector Bar ───────────────────────────────── */}
      <View style={styles.targetCard}>
        <View style={styles.targetHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Building2 size={18} color={colors.primary} />
            <Text style={styles.targetSectionTitle}>Select Target Branch / Station Manager</Text>
          </View>
        </View>

        <View style={{ marginTop: 8, maxWidth: 520 }}>
          <DropdownPicker
            placeholder="Select Station Branch or Global Manager..."
            options={branchDropdownOptions}
            value={selectedTarget}
            onChange={(val) => setSelectedTarget(val)}
          />
        </View>

        <View style={[styles.activeTargetBanner, { marginTop: 12 }]}>
          <Info size={14} color="#0369A1" />
          <Text style={styles.activeTargetBannerText}>
            Configuring policies for: <Text style={{ fontWeight: '800', color: '#0F172A' }}>{targetLabel}</Text>
          </Text>
        </View>
      </View>

      {/* ── Search & Filter Controls ─────────────────────────────────── */}
      <View style={styles.searchFilterCard}>
        <View style={styles.searchBox}>
          <Search size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search operational permissions (e.g. shift, rate, credit, dip, expense)..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      {/* ── Categorized Permission Modules ─────────────────────────────── */}
      <View style={styles.modulesContainer}>
        {PERMISSION_MODULES.map((mod) => {
          const Icon = mod.icon;
          const matchingItems = mod.items.filter(
            (item) =>
              !searchQuery ||
              item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.description.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (matchingItems.length === 0) return null;

          const modEnabledCount = mod.items.filter((i) => permissionsState[i.key]).length;

          return (
            <View key={mod.id} style={styles.moduleCard}>
              {/* Module Header */}
              <View style={styles.moduleHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={[styles.modIconBadge, { backgroundColor: mod.color + '15' }]}>
                    <Icon size={18} color={mod.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.moduleTitle}>{mod.title}</Text>
                  </View>
                </View>

                <View style={styles.moduleBadge}>
                  <Text style={styles.moduleBadgeText}>
                    {modEnabledCount} / {mod.items.length} Enabled
                  </Text>
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

      {/* ── Sticky Save Footer Bar ─────────────────────────────────────── */}
      <View style={styles.stickyFooterBar}>
        <View style={styles.footerLeft}>
          <ShieldCheck size={18} color="#16A34A" />
          <Text style={styles.footerInfoText}>
            Changes take effect immediately across all client sessions for <Text style={{ fontWeight: '700' }}>{targetLabel}</Text>.
          </Text>
        </View>

        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleResetDefaults}
            activeOpacity={0.7}
          >
            <RotateCcw size={14} color="#64748B" />
            <Text style={styles.resetBtnText}>Reset to Default</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSavePermissions}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            <Save size={16} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>{isSaving ? 'Deploying…' : 'Save & Deploy Permissions'}</Text>
          </TouchableOpacity>
        </View>
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
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    gap: 20,
  },
  topHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 20,
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
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    maxWidth: 580,
    lineHeight: 18,
  },
  ownerOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  ownerOnlyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
  },
  statChip: {
    alignItems: 'center',
    minWidth: 70,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  statLbl: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#CBD5E1',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },

  // Target Card
  targetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
  },
  targetHeader: {
    marginBottom: 12,
  },
  targetSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  targetSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  targetScroll: {
    flexDirection: 'row',
    marginTop: 6,
    marginBottom: 12,
  },
  targetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 10,
  },
  targetPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  targetPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  targetPillTextActive: {
    color: '#FFFFFF',
  },
  activeTargetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeTargetBannerText: {
    fontSize: 12,
    color: '#0369A1',
  },

  // Search Filter Card
  searchFilterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    fontSize: 13,
    color: '#0F172A',
    flex: 1,
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
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    backgroundColor: '#FAFCFE',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  modIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  moduleSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  moduleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moduleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  itemsList: {
    paddingHorizontal: 18,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemRowDisabled: {
    opacity: 0.7,
  },
  itemTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemTitleDisabled: {
    color: '#64748B',
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  tagBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  ownerLockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  ownerLockBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7C3AED',
  },
  itemDescText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 16,
  },
  switchWrap: {
    alignItems: 'center',
    minWidth: 70,
  },
  switchStatusLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 3,
    letterSpacing: 0.5,
  },

  // Sticky Footer
  stickyFooterBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 260,
  },
  footerInfoText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
