import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { Fuel, Lock, User, Eye, EyeOff, KeyRound, X, CheckCircle2, Shield, Check } from 'lucide-react';

import { colors, typography } from '../theme/colors';
import { login, forgotPassword, resetPassword, AuthUser } from '../api/auth';

const REMEMBER_ME_KEY = 'fuelPulse_rememberMe_username';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Forgot Password modal state ──────────────────────────────────────
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'reset' | 'done'>('request');
  const [forgotUsername, setForgotUsername] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // ── Load remembered username on mount ───────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_ME_KEY);
      if (saved) {
        setUsername(saved);
        setRememberMe(true);
      }
    } catch {}
  }, []);

  // ── Login handler ────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter your mobile number and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await login(username.trim(), password);
      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_ME_KEY, username.trim());
        } else {
          localStorage.removeItem(REMEMBER_ME_KEY);
        }
      } catch {}
      onLoginSuccess(user);
    } catch (e: any) {
      setError(e.message || 'Invalid credentials. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot: Step 1 — request token ───────────────────────────────────
  const handleForgotRequest = async () => {
    if (!forgotUsername.trim()) {
      setForgotError('Please enter your mobile number / username.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await forgotPassword(forgotUsername.trim());
      if (res.token) {
        setResetToken(res.token);
      }
      setForgotSuccess(res.message);
      setForgotStep('reset');
    } catch (e: any) {
      setForgotError(e.message || 'Request failed.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Forgot: Step 2 — reset password ──────────────────────────────────
  const handleResetPassword = async () => {
    if (!resetToken.trim()) { setForgotError('Token is required.'); return; }
    if (newPassword.length < 4) { setForgotError('Password must be at least 4 characters.'); return; }
    if (newPassword !== confirmPassword) { setForgotError('Passwords do not match.'); return; }
    setForgotLoading(true);
    setForgotError(null);
    try {
      await resetPassword(resetToken.trim(), newPassword);
      setForgotStep('done');
    } catch (e: any) {
      setForgotError(e.message || 'Reset failed.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgot(false);
    setForgotStep('request');
    setForgotUsername('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError(null);
    setForgotSuccess(null);
  };

  return (
    <>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
             <View style={styles.logoBadge}>
                      <Fuel size={20} color="#FFFFFF" />
                      <View style={styles.logoDot} />
                    </View>
                    <View>

            <Text style={styles.title}>Petrol Bunk Accounting System</Text>
            <Text style={styles.subtitle}>Sign in to manage station shifts and accounts</Text>
          </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.inputWrapper}>
                <User size={16} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={(text) => setUsername(text.replace(/[^0-9]/g, ''))}
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={16} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword((p) => !p)} activeOpacity={0.7} style={styles.eyeBtn}>
                  {showPassword ? <EyeOff size={16} color={colors.textSecondary} /> : <Eye size={16} color={colors.textSecondary} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me & Forgot Password */}
            <View style={styles.rememberRow}>
              <TouchableOpacity
                style={styles.rememberMeBtn}
                onPress={() => setRememberMe((v) => !v)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                </View>

                <Text style={styles.rememberMeText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setForgotUsername(username); setShowForgot(true); }} activeOpacity={0.7}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerWrap}>
            <Shield size={12} color={colors.textMuted} />
            <Text style={styles.footerText}>Multi-Bunk Secure Portal</Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Forgot Password Modal ─────────────────────────────────────── */}
      <Modal visible={showForgot} transparent animationType="fade" onRequestClose={closeForgotModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <KeyRound size={18} color={colors.primary} />
                <Text style={styles.modalTitle}>
                  {forgotStep === 'done' ? 'Password Reset' : 'Reset Password'}
                </Text>
              </View>
              <TouchableOpacity onPress={closeForgotModal} activeOpacity={0.7}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1, maxHeight: 480 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              {forgotStep === 'request' && (
                <View style={styles.modalBody}>
                  <Text style={styles.modalSubtitle}>Enter your registered mobile number to request a reset token.</Text>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Mobile Number</Text>
                    <View style={styles.inputWrapper}>
                      <User size={16} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={forgotUsername}
                        onChangeText={setForgotUsername}
                        placeholder="Enter mobile number"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="phone-pad"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  {forgotError && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{forgotError}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.loginBtn, forgotLoading && styles.loginBtnDisabled]}
                    onPress={handleForgotRequest}
                    disabled={forgotLoading}
                    activeOpacity={0.85}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.loginBtnText}>Generate Reset Token</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {forgotStep === 'reset' && (
                <View style={styles.modalBody}>
                  {forgotSuccess && (
                    <View style={styles.infoBox}>
                      <Text style={styles.infoText}>{forgotSuccess}</Text>
                    </View>
                  )}

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Reset Token</Text>
                    <View style={styles.inputWrapper}>
                      <KeyRound size={16} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { fontFamily: typography.monoFont }]}
                        value={resetToken}
                        onChangeText={setResetToken}
                        placeholder="Token"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>New Password</Text>
                    <View style={styles.inputWrapper}>
                      <Lock size={16} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Minimum 4 characters"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry={!showNewPwd}
                      />
                      <TouchableOpacity onPress={() => setShowNewPwd((p) => !p)} activeOpacity={0.7} style={styles.eyeBtn}>
                        {showNewPwd ? <EyeOff size={16} color={colors.textSecondary} /> : <Eye size={16} color={colors.textSecondary} />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Confirm New Password</Text>
                    <View style={styles.inputWrapper}>
                      <Lock size={16} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Re-enter new password"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry={!showNewPwd}
                      />
                    </View>
                  </View>

                  {forgotError && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{forgotError}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.loginBtn, forgotLoading && styles.loginBtnDisabled]}
                    onPress={handleResetPassword}
                    disabled={forgotLoading}
                    activeOpacity={0.85}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.loginBtnText}>Set New Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {forgotStep === 'done' && (
                <View style={[styles.modalBody, { alignItems: 'center', gap: 12, paddingVertical: 20 }]}>
                  <CheckCircle2 size={40} color={colors.success} />
                  <Text style={styles.doneText}>Password updated successfully. You can now sign in.</Text>
                  <TouchableOpacity style={styles.loginBtn} onPress={closeForgotModal} activeOpacity={0.85}>
                    <Text style={styles.loginBtnText}>Return to Sign In</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 48,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 32,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  }, logoDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFDE00', // Bharat Petroleum Yellow
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  form: {
    gap: 14,
  },
  fieldGroup: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
    outlineStyle: 'none',
  } as any,
  eyeBtn: {
    padding: 4,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  rememberMeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 12,
  },
  rememberMeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  forgotLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 6,
    padding: 10,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  infoText: {
    color: colors.primary,
    fontSize: 12,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  footerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
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
    maxWidth: 420,
    maxHeight: '90%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
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
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  modalBody: {
    padding: 16,
    gap: 10,
  },
  doneText: {
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
