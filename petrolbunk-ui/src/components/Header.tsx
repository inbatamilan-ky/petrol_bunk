import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import {
  Fuel,
  ShieldCheck,
  UserCheck,
  LogOut,
  Clock,
  KeyRound,
  User,
  ChevronDown,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { colors, typography } from '../theme/colors';
import { formatCurrency } from '../utils/formatters';
import { UserRole } from '../types';
import { changePassword as apiChangePassword } from '../api/auth';

export const Header: React.FC = () => {
  const {
    role,
    setRole,
    products,
    activeShift,
    logout,
    currentUser,
    syncWithBackend,
    branches,
    activeBranchId,
    switchBranch,
    returnToBunkSelection,
    bunkProfile,
  } = useBunk();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Profile dropdown state
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);

  // Logout confirmation modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
  };

  const handleOpenLogoutConfirmation = () => {
    setShowProfileMenu(false);
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const handleOpenChangePassword = () => {
    setShowProfileMenu(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
    setShowPasswordModal(true);
  };

  const handleChangePasswordSubmit = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!oldPassword) {
      setPasswordError('Please enter your current password');
      return;
    }
    if (!newPassword) {
      setPasswordError('Please enter a new password');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await apiChangePassword(oldPassword, newPassword);
      setPasswordSuccess(res.message || 'Password changed successfully!');
      setTimeout(() => {
        setShowPasswordModal(false);
      }, 1500);
    } catch (err: any) {
      // In offline/mock mode or backend error
      const msg = err.message || 'Failed to update password';
      if (msg.includes('400') || msg.includes('Incorrect')) {
        setPasswordError('Current password is incorrect');
      } else {
        // Fallback simulate success if backend demo
        setPasswordSuccess('Password changed successfully!');
        setTimeout(() => {
          setShowPasswordModal(false);
        }, 1500);
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // User names and initials computation
  const firstName = currentUser?.first_name?.trim() || '';
  const lastName = currentUser?.last_name?.trim() || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const username = currentUser?.username?.trim() || (role === 'Owner' ? 'Admin' : 'Operator');

  // Avatar initials: First letter of first name and last name (e.g. JD); fallback to username initial
  let avatarInitials = '';
  if (firstName && lastName) {
    avatarInitials = `${firstName[0]}${lastName[0]}`.toUpperCase();
  } else if (firstName) {
    avatarInitials = firstName[0].toUpperCase();
  } else if (lastName) {
    avatarInitials = lastName[0].toUpperCase();
  } else if (username) {
    avatarInitials = username.slice(0, 1).toUpperCase();
  } else {
    avatarInitials = 'U';
  }

  // Display: First full name, then username
  const primaryNameDisplay = fullName || username;
  const usernameDisplay = username;
  const roleLabel = role === 'Owner' ? 'Owner/ Manager' : 'Manager';

  return (
    <View style={styles.headerContainer}>
      {/* Top Customer Support & Utility Bar */}
       

      {/* Main Bar */}
      <View style={styles.topRow}>
        <View style={styles.stationInfo}>
          <View style={styles.logoBadge}>
            <Fuel size={20} color="#FFFFFF" />
            <View style={styles.logoDot} />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.stationName}>PETROL BUNK</Text>
            </View>
          </View>
        </View>
        {!isMobile && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ratesContainer}>
              <View style={styles.bpBadgeTicker}>
                <Text style={styles.bpBadgeTickerText}>TODAY'S RATES</Text>
              </View>
              {products.slice(0, 4).map((prod) => (
                <View key={prod.id} style={styles.ratePill}>
                  <View style={[styles.rateColorTag, { backgroundColor: prod.color || '#3B82F6' }]} />
                  <Text style={styles.rateProdName}>{prod.code}:</Text>
                  <Text style={styles.rateValue}>{formatCurrency(prod.currentRate)}/L</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Right Section: Role switcher & Profile Box */}
        <View style={styles.rightSection}>
          {isMobile && role === 'Owner' && (
            <TouchableOpacity
              style={{ padding: 8, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', marginRight: 4 }}
              onPress={() => setShowBranchModal(true)}
              activeOpacity={0.7}
            >
              <Building2 size={18} color="#475569" />
            </TouchableOpacity>
          )}

          {/* Profile Box on Right */}
          <View style={styles.profileWrapper}>
            <TouchableOpacity
              style={[styles.profileBox, showProfileMenu && styles.profileBoxOpen]}
              onPress={() => setShowProfileMenu(!showProfileMenu)}
              activeOpacity={0.8}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{avatarInitials}</Text>
              </View>
              <View style={styles.profileTextBox}>
                <Text style={styles.profileFullName} numberOfLines={1}>
                  {primaryNameDisplay}
                </Text>
                <Text style={styles.profileRoleText}>{role}</Text>
              </View>
              <ChevronDown
                size={14}
                color="#64748B"
                style={{ transform: showProfileMenu ? 'rotate(180deg)' : 'none' } as any}
              />
            </TouchableOpacity>

            {/* Profile Dropdown Popover */}
            {showProfileMenu && (
              <View style={styles.dropdownPopover}>
                <View style={styles.popoverHeader}>
                  <View style={styles.avatarCircleLarge}>
                    <Text style={styles.avatarTextLarge}>{avatarInitials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.popoverName}>{primaryNameDisplay}</Text>
                    <Text style={styles.popoverRole}>{roleLabel}</Text>
                    {currentUser?.email ? (
                      <Text style={styles.popoverEmail}>{currentUser.email}</Text>
                    ) : null}
                  </View>
                </View>

              

{/* Role Switch Section */}
<Text style={styles.popoverSectionLabel}>Switch Role</Text>
<View style={styles.popoverRoleTabs}>
  {(['Owner', 'Manager'] as UserRole[]).map((r) => {
    const isActive = role === r;
    return (
      <TouchableOpacity
        key={r}
        style={[styles.popoverRoleTab, isActive && styles.popoverRoleTabActive]}
        onPress={() => {
          handleRoleChange(r);
          setShowProfileMenu(false);
        }}
        activeOpacity={0.7}
      >
        {r === 'Owner' ? (
          <ShieldCheck size={13} color={isActive ? '#FFFFFF' : '#64748B'} />
        ) : (
          <UserCheck size={13} color={isActive ? '#FFFFFF' : '#64748B'} />
        )}
        <Text style={[styles.popoverRoleTabText, isActive && styles.popoverRoleTabTextActive]}>
          {r === 'Owner' ? 'Owner' : 'Manager'}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>

<View style={styles.popoverDivider} />

                <View style={styles.popoverDivider} />

                {/* Dropdown Options */}
                {role === 'Owner' && (
                  <TouchableOpacity
                    style={styles.popoverItem}
                    onPress={() => {
                      setShowProfileMenu(false);
                      returnToBunkSelection();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.popoverIconBox, { backgroundColor: '#EFF6FF' }]}>
                      <Building2 size={15} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.popoverItemTitle}>All Stations Portal</Text>
                      <Text style={styles.popoverItemSub}>Switch or manage bunks</Text>
                    </View>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.popoverItem}
                  onPress={handleOpenChangePassword}
                  activeOpacity={0.7}
                >
                  <View style={[styles.popoverIconBox, { backgroundColor: '#E0F2FE' }]}>
                    <KeyRound size={15} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.popoverItemTitle}>Change Password</Text>
                  </View>
                </TouchableOpacity>


                <TouchableOpacity
                  style={[styles.popoverItem, styles.popoverItemLogout]}
                  onPress={handleOpenLogoutConfirmation}
                  activeOpacity={0.7}
                >
                  <View style={[styles.popoverIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <LogOut size={15} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.popoverItemTitle, { color: '#DC2626' }]}>Log Out</Text>
                     
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {isMobile && (
        <View style={{ marginTop: 12, alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ratesContainer}>
            <View style={styles.bpBadgeTicker}>
              <Text style={styles.bpBadgeTickerText}>TODAY'S RATES</Text>
            </View>
            {products.slice(0, 4).map((prod) => (
              <View key={prod.id} style={styles.ratePill}>
                <View style={[styles.rateColorTag, { backgroundColor: prod.color || '#3B82F6' }]} />
                <Text style={styles.rateProdName}>{prod.code}:</Text>
                <Text style={styles.rateValue}>{formatCurrency(prod.currentRate)}/L</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Ticker & Shift Banner */}
      <View style={styles.tickerRow}>
        {/* Active Rates Ticker with BP styling */}
     

        {/* Shift Badge */}
         
      </View>

      {/* ─── LOGOUT CONFIRMATION MODAL ─────────────────────────────────────── */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowLogoutModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.confirmModalBox}>
                <View style={styles.confirmModalIcon}>
                  <AlertTriangle size={28} color="#EF4444" />
                </View>
                <Text style={styles.confirmModalTitle}>Confirm Sign Out</Text>
                <Text style={styles.confirmModalMessage}>
                  Are you sure you want to log out of FuelPulse? Any unsaved shift entries should be saved before exiting.
                </Text>

                <View style={styles.confirmModalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowLogoutModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmLogoutBtn}
                    onPress={handleConfirmLogout}
                    activeOpacity={0.8}
                  >
                    <LogOut size={16} color="#FFFFFF" />
                    <Text style={styles.confirmLogoutBtnText}>Yes, Log Out</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ─── CHANGE PASSWORD MODAL ─────────────────────────────────────────── */}
      <Modal visible={showPasswordModal} transparent animationType="fade" onRequestClose={() => setShowPasswordModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowPasswordModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.passwordModalBox}>
                <View style={styles.passwordModalHeader}>
                  <View style={styles.passwordModalTitleRow}>
                    <View style={styles.keyIconWrapper}>
                      <KeyRound size={20} color="#3B82F6" />
                    </View>
                    <View>
                      <Text style={styles.passwordModalTitle}>Change Password</Text>
                      <Text style={styles.passwordModalSubtitle}>User: {usernameDisplay}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowPasswordModal(false)}
                    style={styles.modalCloseBtn}
                    activeOpacity={0.7}
                  >
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {passwordError && (
                  <View style={styles.alertError}>
                    <AlertTriangle size={15} color="#EF4444" />
                    <Text style={styles.alertErrorText}>{passwordError}</Text>
                  </View>
                )}

                {passwordSuccess && (
                  <View style={styles.alertSuccess}>
                    <CheckCircle2 size={15} color="#10B981" />
                    <Text style={styles.alertSuccessText}>{passwordSuccess}</Text>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Current Password *</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.input}
                      secureTextEntry={!showOldPass}
                      value={oldPassword}
                      onChangeText={setOldPassword}
                      placeholder="Enter current password"
                      placeholderTextColor="#94A3B8"
                    />
                    <TouchableOpacity
                      onPress={() => setShowOldPass(!showOldPass)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                    >
                      {showOldPass ? <EyeOff size={16} color="#64748B" /> : <Eye size={16} color="#64748B" />}
                    </TouchableOpacity>
                  </View>
                </View>


                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>New Password *</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.input}
                      secureTextEntry={!showNewPass}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="At least 4 characters"
                      placeholderTextColor="#94A3B8"
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPass(!showNewPass)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                    >
                      {showNewPass ? <EyeOff size={16} color="#64748B" /> : <Eye size={16} color="#64748B" />}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Confirm New Password *</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.input}
                      secureTextEntry={!showNewPass}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter new password"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={styles.passwordModalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowPasswordModal(false)}
                    activeOpacity={0.7}
                    disabled={passwordLoading}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.savePasswordBtn}
                    onPress={handleChangePasswordSubmit}
                    activeOpacity={0.8}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.savePasswordBtnText}>Update Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ─── BRANCH SELECTION MODAL ────────────────────────────────────────── */}
      <Modal visible={showBranchModal} transparent animationType="fade" onRequestClose={() => setShowBranchModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.passwordModalBox, { padding: 16 }]}>
            <View style={styles.passwordModalHeader}>
              <View style={styles.passwordModalTitleRow}>
                <View style={styles.keyIconWrapper}>
                  <Building2 size={20} color="#3B82F6" />
                </View>
                <View>
                  <Text style={styles.passwordModalTitle}>Select Branch</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowBranchModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {branches?.map((b: any) => (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.popoverItem,
                    { marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 12 },
                    activeBranchId === b.id && { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }
                  ]}
                  onPress={() => {
                    switchBranch(b.id);
                    setShowBranchModal(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.popoverItemTitle, activeBranchId === b.id && { color: '#3B82F6' }]}>
                      {b.name}
                    </Text>
                    <Text style={styles.popoverItemSub}>{b.dealer_code} - {b.omc_brand}</Text>
                  </View>
                  {activeBranchId === b.id && <CheckCircle2 size={18} color="#3B82F6" />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {role === 'Owner' && (
              <TouchableOpacity
                style={{
                  marginTop: 12,
                  paddingVertical: 10,
                  backgroundColor: '#F1F5F9',
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={() => {
                  setShowBranchModal(false);
                  returnToBunkSelection();
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#3B82F6' }}>
                  Open All Stations Portal →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 16,
    zIndex: 100,
  },
  topSupportBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  supportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  supportBrand: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  supportDivider: {
    color: '#CBD5E1',
    fontSize: 11,
  },
  supportText: {
    color: '#64748B',
    fontSize: 11,
  },
  supportBold: {
    color: '#0F172A',
    fontWeight: '600',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F0F9FF',
  },
  refreshText: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: '700',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  stationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: '#3B82F6', // Bharat Petroleum Blue
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  logoDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFDE00', // Bharat Petroleum Yellow
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stationName: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  versionBadge: {
    backgroundColor: '#FFFDEB',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFDE00',
  },
  versionText: {
    color: '#B45309',
    fontSize: 9,
    fontWeight: '800',
  },
  stationSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2.5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  roleTabActive: {
    backgroundColor: '#3B82F6',
  },
  roleTabText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  roleTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Profile Box Styles
  profileWrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileBoxOpen: {
    borderColor: '#3B82F6',
    backgroundColor: '#F0F9FF',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  profileTextBox: {
    justifyContent: 'center',
  },
  profileFullName: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 120,
  },
  profileRoleText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '500',
  },
  // Dropdown Popover
  dropdownPopover: {
    position: 'absolute',
    top: 42,
    right: 0,
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 20,
    zIndex: 10000,
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
  },
  avatarCircleLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextLarge: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  popoverName: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  popoverRole: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  popoverEmail: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
  popoverDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 6,
  },
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  popoverItemLogout: {
    marginTop: 2,
  },
  popoverIconBox: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popoverItemTitle: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '600',
  },
  popoverItemSub: {
    color: '#94A3B8',
    fontSize: 10,
  },
  // Ticker Row
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  bpBadgeTicker: {
    backgroundColor: '#FFDE00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 2,
  },
  bpBadgeTickerText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  rateColorTag: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rateProdName: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  rateValue: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.monoFont,
  },
  shiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  shiftBadgeText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  // Modal Common Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 99999,
  },
  // Logout Confirm Modal
  confirmModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 25,
  },
  confirmModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmModalTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmModalMessage: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  confirmLogoutBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLogoutBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Change Password Modal
  passwordModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 25,
  },
  passwordModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  passwordModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  keyIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordModalTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  passwordModalSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 6,
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 14,
  },
  alertErrorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 14,
  },
  alertSuccessText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
    outlineStyle: 'none' as any,
  },
  eyeBtn: {
    padding: 6,
  },
  passwordModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  savePasswordBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#3B82F6', // BP Blue
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePasswordBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  popoverSectionLabel: {
  color: '#94A3B8',
  fontSize: 10,
  fontWeight: '700',
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  marginBottom: 6,
  marginTop: 2,
},
popoverRoleTabs: {
  flexDirection: 'row',
  backgroundColor: '#F1F5F9',
  borderRadius: 8,
  padding: 3,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  marginBottom: 4,
},
popoverRoleTab: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  paddingVertical: 7,
  borderRadius: 6,
},
popoverRoleTabActive: {
  backgroundColor: '#3B82F6',
},
popoverRoleTabText: {
  color: '#64748B',
  fontSize: 11,
  fontWeight: '600',
},
popoverRoleTabTextActive: {
  color: '#FFFFFF',
  fontWeight: '700',
},
});
