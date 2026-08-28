import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Fuel,
  LogOut,
  MapPin,
  Plus,
  Search,
  User,
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
import { useAuthContext } from '../context/AuthContext';
import { colors, typography } from '../theme/colors';

const OMC_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  BPCL: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  IOCL: { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  HPCL: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
  NAYARA: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  RELIANCE: { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' },
};

interface BunkSelectionScreenProps {
  onSelectBunk: (branchId: string) => Promise<void>;
  onLogout: () => void;
}

export const BunkSelectionScreen: React.FC<BunkSelectionScreenProps> = ({
  onSelectBunk,
  onLogout,
}) => {
  const { branches, addBranch, currentUser, activeBranchId } = useAuthContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loadingBranchId, setLoadingBranchId] = useState<string | null>(null);

  // Add Branch Form State
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDealerCode, setFormDealerCode] = useState('');
  const [formBrand, setFormBrand] = useState<'IOCL' | 'BPCL' | 'HPCL' | 'NAYARA' | 'RELIANCE'>('BPCL');
  const [formManagerName, setFormManagerName] = useState('');
  const [formManagerPhone, setFormManagerPhone] = useState('');
  const [formManagerEmail, setFormManagerEmail] = useState('');
  const [formManagerAccess, setFormManagerAccess] = useState('Full Operational Access');

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        b.name.toLowerCase().includes(q) ||
        (b.bunk_name && b.bunk_name.toLowerCase().includes(q)) ||
        b.location.toLowerCase().includes(q) ||
        (b.city && b.city.toLowerCase().includes(q)) ||
        (b.dealer_code && b.dealer_code.toLowerCase().includes(q)) ||
        (b.manager_name && b.manager_name.toLowerCase().includes(q));

      const matchBrand = selectedBrand === 'ALL' || b.omc_brand === selectedBrand;
      return matchQuery && matchBrand;
    });
  }, [branches, searchQuery, selectedBrand]);

  const handleSelectStation = async (branchId: string) => {
    try {
      setLoadingBranchId(branchId);
      await onSelectBunk(branchId);
    } catch {
      Alert.alert('Error', 'Could not activate station.');
    } finally {
      setLoadingBranchId(null);
    }
  };

  const handleSaveNewBranch = async () => {
    if (!formName.trim()) {
      Alert.alert('Validation Error', 'Please enter a station/bunk name.');
      return;
    }
    try {
      await addBranch({
        name: formName.trim(),
        bunk_name: formName.trim(),
        location: formLocation.trim() || 'Tamil Nadu',
        city: formLocation.trim() || 'Tamil Nadu',
        dealer_code: formDealerCode.trim(),
        omc_brand: formBrand,
        is_active: true,
        manager_name: formManagerName.trim() || 'Station Manager',
        manager_phone: formManagerPhone.trim(),
        manager_email: formManagerEmail.trim(),
        manager_access: formManagerAccess,
      });

      setShowAddModal(false);
      setFormName('');
      setFormLocation('');
      setFormDealerCode('');
      setFormManagerName('');
      setFormManagerPhone('');
      setFormManagerEmail('');
    } catch {
      Alert.alert('Error', 'Failed to create new branch.');
    }
  };

  const activeCount = branches.filter((b) => b.is_active).length;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Fuel size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.brandTitle}>Petrol Bunk Manager</Text>
            <Text style={styles.brandSubtitle}>Station Workspace Switcher</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.userProfileChip}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {currentUser?.first_name ? currentUser.first_name[0].toUpperCase() : 'O'}
              </Text>
            </View>
            <Text style={styles.userName}>
              {currentUser?.first_name
                ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
                : currentUser?.username || 'Owner'}
            </Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
            <LogOut size={15} color={colors.danger} />
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentCard}>
          <View style={styles.headingRow}>
            <View>
              <Text style={styles.screenHeading}>Select Station Outlet</Text>
              <Text style={styles.screenSubtitle}>Choose a petrol bunk outlet to manage daily operations</Text>
            </View>

            <TouchableOpacity style={styles.addStationBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
              <Plus size={15} color="#FFFFFF" />
              <Text style={styles.addStationBtnText}>Register Station</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Bar */}
          <View style={styles.filterBar}>
            <View style={styles.searchBox}>
              <Search size={15} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, location, RO code, or manager..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={15} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandFilterRow}>
              {['ALL', 'BPCL', 'IOCL', 'HPCL', 'NAYARA', 'RELIANCE'].map((brand) => (
                <TouchableOpacity
                  key={brand}
                  style={[styles.brandPill, selectedBrand === brand && styles.brandPillActive]}
                  onPress={() => setSelectedBrand(brand)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.brandPillText, selectedBrand === brand && styles.brandPillTextActive]}>
                    {brand}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Stations Grid */}
          <View style={styles.stationsGrid}>
            {filteredBranches.map((branch) => {
              const brandTheme = OMC_COLORS[branch.omc_brand] || OMC_COLORS.BPCL;
              const isCurrentlyActive = activeBranchId === branch.id;
              const isLoading = loadingBranchId === branch.id;

              return (
                <View key={branch.id} style={[styles.stationCard, isCurrentlyActive && styles.stationCardCurrent]}>
                  <View style={styles.stationCardTop}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <View style={[styles.omcBadge, { backgroundColor: brandTheme.bg, borderColor: brandTheme.border }]}>
                          <Text style={[styles.omcBadgeText, { color: brandTheme.text }]}>{branch.omc_brand}</Text>
                        </View>
                        {branch.dealer_code ? (
                          <Text style={styles.dealerCodeText}>RO #{branch.dealer_code}</Text>
                        ) : null}
                      </View>

                      <Text style={styles.stationName} numberOfLines={1}>{branch.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <MapPin size={12} color={colors.textMuted} />
                        <Text style={styles.locationText} numberOfLines={1}>{branch.location || 'Tamil Nadu'}</Text>
                      </View>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: branch.is_active ? '#DCFCE7' : '#F1F5F9', borderColor: branch.is_active ? '#BBF7D0' : '#E2E8F0' }]}>
                      <Text style={[styles.statusBadgeText, { color: branch.is_active ? '#15803D' : '#64748B' }]}>
                        {branch.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>

                  {/* Manager Meta */}
                  <View style={styles.managerMetaBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <User size={13} color={colors.primary} />
                      <Text style={styles.managerName} numberOfLines={1}>
                        {branch.manager_name || 'Station Manager'}
                        {branch.manager_phone ? ` · ${branch.manager_phone}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.managerAccessText}>
                      {branch.manager_access || 'Full Access'}
                    </Text>
                  </View>

                  {/* Action Button */}
                  <TouchableOpacity
                    style={[styles.enterBtn, isCurrentlyActive && styles.enterBtnActive]}
                    onPress={() => handleSelectStation(branch.id)}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.enterBtnText, isCurrentlyActive && styles.enterBtnTextActive]}>
                      {isLoading ? 'Opening…' : isCurrentlyActive ? 'Current Station' : 'Open Station'}
                    </Text>
                    <ArrowRight size={14} color={isCurrentlyActive ? colors.primary : '#FFFFFF'} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {filteredBranches.length === 0 && (
            <View style={styles.emptyContainer}>
              <AlertCircle size={32} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Stations Found</Text>
              <Text style={styles.emptySub}>No petrol bunks match your filter criteria.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Add Station Modal ─────────────────────────────────────────── */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Building2 size={18} color={colors.primary} />
                <Text style={styles.modalTitle}>Register Station Outlet</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Station / Bunk Name *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="e.g. BPCL Guindy Express"
                  />
                </View>

                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>OMC Brand *</Text>
                    <View style={styles.brandOptionsGrid}>
                      {(['IOCL', 'BPCL', 'HPCL', 'NAYARA', 'RELIANCE'] as const).map((b) => (
                        <TouchableOpacity
                          key={b}
                          style={[styles.brandOptionPill, formBrand === b && styles.brandOptionPillActive]}
                          onPress={() => setFormBrand(b)}
                        >
                          <Text style={[styles.brandOptionPillText, formBrand === b && styles.brandOptionPillTextActive]}>{b}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Dealer / RO Code</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={formDealerCode}
                      onChangeText={setFormDealerCode}
                      placeholder="e.g. 192840"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>City / Location *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={formLocation}
                    onChangeText={setFormLocation}
                    placeholder="e.g. Chennai, Tamil Nadu"
                  />
                </View>

                <View style={styles.formGrid2}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Assigned Manager Name</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={formManagerName}
                      onChangeText={setFormManagerName}
                      placeholder="e.g. Ramesh Kumar"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Manager Phone</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={formManagerPhone}
                      onChangeText={setFormManagerPhone}
                      placeholder="e.g. +91 98401 23456"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Manager Access Permission Policy</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={formManagerAccess}
                    onChangeText={setFormManagerAccess}
                    placeholder="Full Operational Access"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNewBranch}>
                <CheckCircle2 size={15} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save Station</Text>
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
  topHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userProfileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  contentCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  screenHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addStationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addStationBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  searchBox: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    padding: 0,
  },
  brandFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
  },
  brandPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  brandPillTextActive: {
    color: colors.primary,
  },
  stationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  stationCard: {
    width: '48.8%',
    minWidth: 280,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 16,
    gap: 12,
  },
  stationCardCurrent: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  stationCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  omcBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  omcBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dealerCodeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: typography.monoFont,
  },
  stationName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  managerMetaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  managerName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  managerAccessText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  enterBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 6,
  },
  enterBtnActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  enterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  enterBtnTextActive: {
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 500,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalBody: {
    padding: 16,
    gap: 10,
  },
  formGrid2: {
    flexDirection: 'row',
    gap: 10,
  },
  formGroup: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  brandOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  brandOptionPill: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  brandOptionPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  brandOptionPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  brandOptionPillTextActive: {
    color: colors.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
    backgroundColor: colors.surfaceElevated,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
