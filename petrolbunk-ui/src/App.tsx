import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Dimensions, ActivityIndicator, Text, TouchableOpacity } from 'react-native';

import { BunkProvider, useBunk } from './context/BunkContext';
import { Header } from './components/Header';
import { NavigationBar, ScreenId } from './components/NavigationBar';
import { LoginScreen } from './screens/LoginScreen';


import { DashboardScreen } from './screens/DashboardScreen';
import { ShiftOperationsScreen } from './screens/ShiftOperationsScreen';
import { TankDipScreen } from './screens/TankDipScreen';
import { CreditLedgerScreen } from './screens/CreditLedgerScreen';
import { ExpensesScreen } from './screens/ExpensesScreen';
import { RateManagementScreen } from './screens/RateManagementScreen';
import { CashBankScreen } from './screens/CashBankScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { MastersScreen } from './screens/MastersScreen';
import { RolePermissionsScreen } from './screens/RolePermissionsScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { colors } from './theme/colors';

const SIDEBAR_BREAKPOINT = 900;

const MainAppContent: React.FC = () => {
  const {
    isLoggedIn,
    login,
    logout,
    isAuthChecking,
    role,
    activeBranchId,
    isPageVisible,
  } = useBunk();
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [width, setWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  const isDesktop = width >= SIDEBAR_BREAKPOINT;

  // If current screen becomes restricted (e.g. toggled off), redirect safely
  useEffect(() => {
    if (isLoggedIn && !isPageVisible(currentScreen, role, activeBranchId)) {
      setCurrentScreen('dashboard');
    }
  }, [currentScreen, role, activeBranchId, isPageVisible, isLoggedIn]);

  // ── Initial session check (show clean splash while verifying session) ────
  if (isAuthChecking) {
    return (
      <SafeAreaView style={[styles.appRoot, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Restoring session…</Text>
      </SafeAreaView>
    );
  }

  // ── Auth gate: show login only if confirmed not authenticated ───────────
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.appRoot}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <LoginScreen onLoginSuccess={login} />
      </SafeAreaView>
    );
  }

  const renderActiveScreen = () => {

    if (!isPageVisible(currentScreen, role, activeBranchId)) {
      return (
        <View style={styles.restrictedContainer}>
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedText}>
            You do not have permission to access this page. This page has been hidden by the station owner.
          </Text>
          <TouchableOpacity
            style={styles.restrictedBtn}
            onPress={() => setCurrentScreen('dashboard')}
          >
            <Text style={styles.restrictedBtnText}>Return to Dashboard</Text>
          </TouchableOpacity>
        </View>
      );
    }

    switch (currentScreen) {
      case 'dashboard': return <DashboardScreen onNavigate={setCurrentScreen} />;
      case 'shifts':   return <ShiftOperationsScreen />;
      case 'tanks':    return <TankDipScreen />;
      case 'credit':   return <CreditLedgerScreen />;
      case 'expenses': return <ExpensesScreen />;
      case 'rates':    return <RateManagementScreen />;
      case 'cashbank': return <CashBankScreen />;
      case 'reports':     return <ReportsScreen />;
      case 'masters':     return <MastersScreen />;
      case 'permissions': return <RolePermissionsScreen />;
      default:            return <DashboardScreen onNavigate={setCurrentScreen} />;
    }
  };


  return (
    <SafeAreaView style={styles.appRoot}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <Header />
      {isDesktop ? (
        <View style={styles.desktopLayout}>
          <NavigationBar currentScreen={currentScreen} onSelectScreen={setCurrentScreen} isSidebar={true} />
          <View style={styles.contentArea}>
            <ErrorBoundary sourceName={currentScreen}>
              {renderActiveScreen()}
            </ErrorBoundary>
          </View>
        </View>
      ) : (
        <View style={styles.mobileLayout}>
          <View style={styles.contentArea}>
            <ErrorBoundary sourceName={currentScreen}>
              {renderActiveScreen()}
            </ErrorBoundary>
          </View>
          <NavigationBar currentScreen={currentScreen} onSelectScreen={setCurrentScreen} isSidebar={false} />
        </View>
      )}
    </SafeAreaView>
  );
};

export const App: React.FC = () => (
  <BunkProvider>
    <MainAppContent />
  </BunkProvider>
);

export default App;

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: colors.background,
    height: '100%' as any,
    width: '100%',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden' as any,
  },
  mobileLayout: {
    flex: 1,
    flexDirection: 'column',
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden' as any,
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden' as any,
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  restrictedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  restrictedText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 420,
    marginBottom: 20,
    lineHeight: 20,
  },
  restrictedBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  restrictedBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});