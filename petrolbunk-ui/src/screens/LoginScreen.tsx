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
import { Fuel, Lock, User, ShieldCheck, Eye, EyeOff, KeyRound, X, CheckCircle2 } from 'lucide-react';
import { colors } from '../theme/colors';
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
      setError('Please enter username and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await login(username.trim(), password);
      // Persist or clear remembered username
      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_ME_KEY, username.trim());
        } else {
          localStorage.removeItem(REMEMBER_ME_KEY);
        }
      } catch {}
      onLoginSuccess(user);
    } catch (e: any) {
      setError(e.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot: Step 1 — request token ───────────────────────────────────
  const handleForgotRequest = async () => {
    if (!forgotUsername.trim()) {
      setForgotError('Enter your username first.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await forgotPassword(forgotUsername.trim());
      if (res.token) {
        setResetToken(res.token);  // Auto-fill token (dev mode — no email)
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
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Brand Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Fuel size={28} color="#FFFFFF" />
              <View style={styles.logoDot} />
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>PETROL BUNK</Text>
            </View>
            <Text style={styles.subtitle}>Petrol Bunk accounts Management System</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.inputWrapper}>
              <User size={16} color="#0e2d59" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={username}
                 onChangeText={(text) => setUsername(text.replace(/[^0-9]/g, ''))}
                      placeholder="Enter your mobile number"
                      keyboardType="phone-pad"
                      maxLength={10}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
        
                     


            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={16} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword((p) => !p)} activeOpacity={0.7}>
                {showPassword
                  ? <EyeOff size={16} color="#64748B" />
                  : <Eye size={16} color="#64748B" />
                }
              </TouchableOpacity>
            </View>

            {/* Remember Me + Forgot Password row */}
            <View style={styles.rememberRow}>
              <TouchableOpacity
                style={styles.rememberMeBtn}
                onPress={() => setRememberMe((v) => !v)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
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

          {/* <View style={styles.roleHintBox}>
            <ShieldCheck size={13} color="#64748B" />
            <Text style={styles.roleHintText}>Supported Roles: 1 = Owner • 2 = Manager</Text>
          </View> */}

          <Text style={styles.footer}>KY Technologies © {new Date().getFullYear()}</Text>
        </View>
      </ScrollView>

      {/* ── Forgot Password Modal ─────────────────────────────────────── */}
      <Modal visible={showForgot} transparent animationType="fade" onRequestClose={closeForgotModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconCircle}>
                <KeyRound size={20} color="#007DC6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {forgotStep === 'done' ? 'Password Reset!' : 'Forgot Password'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {forgotStep === 'request' && 'Enter your username to receive a reset token.'}
                  {forgotStep === 'reset' && 'Enter the token and your new password.'}
                  {forgotStep === 'done' && 'Your password has been reset successfully.'}
                </Text>
              </View>
              <TouchableOpacity onPress={closeForgotModal} activeOpacity={0.7}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Step 1 — Request Token */}
            {forgotStep === 'request' && (
              <View style={styles.modalBody}>
                <Text style={styles.label}>Username</Text>
                <View style={styles.inputWrapper}>
                  <User size={16} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={forgotUsername}
                    onChangeText={setForgotUsername}
                    placeholder="Enter your username"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
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
                  {forgotLoading
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={styles.loginBtnText}>Get Reset Token</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2 — Enter Token + New Password */}
            {forgotStep === 'reset' && (
              <View style={styles.modalBody}>
                {forgotSuccess && (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>{forgotSuccess}</Text>
                  </View>
                )}

                <Text style={styles.label}>Reset Token</Text>
                <View style={styles.inputWrapper}>
                  <KeyRound size={16} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { fontSize: 12, fontFamily: 'monospace' } as any]}
                    value={resetToken}
                    onChangeText={setResetToken}
                    placeholder="Paste token here"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={16} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Min. 4 characters"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showNewPwd}
                  />
                  <TouchableOpacity onPress={() => setShowNewPwd((p) => !p)} activeOpacity={0.7}>
                    {showNewPwd ? <EyeOff size={16} color="#64748B" /> : <Eye size={16} color="#64748B" />}
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={16} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Repeat new password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showNewPwd}
                    onSubmitEditing={handleResetPassword}
                  />
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
                  {forgotLoading
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={styles.loginBtnText}>Reset Password</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* Step 3 — Done */}
            {forgotStep === 'done' && (
              <View style={[styles.modalBody, { alignItems: 'center', gap: 14 }]}>
                <CheckCircle2 size={48} color="#16A34A" />
                <Text style={styles.doneText}>
                  Password reset successfully! You can now log in with your new password.
                </Text>
                <TouchableOpacity style={styles.loginBtn} onPress={closeForgotModal} activeOpacity={0.85}>
                  <Text style={styles.loginBtnText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    width: '100%',
    height: '100%' as any,
  },
  container: {
    flexGrow: 1,
    minHeight: '100%' as any,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 36,
    width: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 36,
    width: '100%',
    maxWidth: 450,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 26,
  },
  logoCircle: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#007DC6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#007DC6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#FFDE00', // Bharat Petroleum Yellow
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  proTag: {
    backgroundColor: '#FFFDEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFDE00',
  },
  proTagText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  form: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 8,
    marginBottom: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    outlineStyle: 'none',
  } as any,
  // ── Remember Me row ──────────────────────────────────────────────────
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
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
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  checkboxChecked: {
    backgroundColor: '#007DC6',
    borderColor: '#007DC6',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  rememberMeText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  forgotLink: {
    fontSize: 12,
    color: '#007DC6',
    fontWeight: '600',
  },
  // ── Alerts ───────────────────────────────────────────────────────────
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 10,
  },
  infoText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '500',
  },
  // ── Login Button ─────────────────────────────────────────────────────
  loginBtn: {
    backgroundColor: '#007DC6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
    shadowColor: '#007DC6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  roleHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  roleHintText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 14,
  },
  // ── Modal ────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 460,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  modalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalBody: {
    padding: 20,
    gap: 4,
  },
  doneText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
});
