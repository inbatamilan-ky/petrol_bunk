import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Dimensions, ActivityIndicator, Text } from 'react-native';
import { BunkProvider, useBunk } from './context/BunkContext';
import { Header } from './components/Header';
import { NavigationBar, ScreenId } from './components/NavigationBar';
import { LoginScreen } from './screens/LoginScreen';

import { DashboardScreen } from './screens/DashboardScreen';
import { ShiftOperationsScreen } from './screens/ShiftOperationsScreen';
import { CreditLedgerScreen } from './screens/CreditLedgerScreen';
import { ExpensesScreen } from './screens/ExpensesScreen';
import { RateManagementScreen } from './screens/RateManagementScreen';
import { CashBankScreen } from './screens/CashBankScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { MastersScreen } from './screens/MastersScreen';
import { colors } from './theme/colors';

const SIDEBAR_BREAKPOINT = 900;

const MainAppContent: React.FC = () => {
  const { isLoggedIn, login, loading, currentUser } = useBunk();
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [width, setWidth] = useState(Dimensions.get('window').width);

useEffect(() => {
  const subscription = Dimensions.addEventListener('change', ({ window }) => {
    setWidth(window.width);
  });

  return () => subscription?.remove();
}, []);

  const isDesktop = width >= SIDEBAR_BREAKPOINT;

  // ── Auth gate: show login if not authenticated ───────────────────────────
  if (!isLoggedIn && !loading) {
    return (
      <SafeAreaView style={styles.appRoot}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <LoginScreen onLoginSuccess={login} />
      </SafeAreaView>
    );
  }

  // ── Initial loading spinner (auto-login in progress) ─────────────────────
  if (!isLoggedIn && loading) {
    return (
      <SafeAreaView style={[styles.appRoot, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Connecting…</Text>
      </SafeAreaView>
    );
  }

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'dashboard': return <DashboardScreen onNavigate={setCurrentScreen} />;
      case 'shifts':   return <ShiftOperationsScreen />;
      case 'credit':   return <CreditLedgerScreen />;
      case 'expenses': return <ExpensesScreen />;
      case 'rates':    return <RateManagementScreen />;
      case 'cashbank': return <CashBankScreen />;
      case 'reports':  return <ReportsScreen />;
      case 'masters':  return <MastersScreen />;
      default:         return <DashboardScreen onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <SafeAreaView style={styles.appRoot}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <Header />
      {isDesktop ? (
        <View style={styles.desktopLayout}>
          <NavigationBar currentScreen={currentScreen} onSelectScreen={setCurrentScreen} isSidebar={true} />
          <View style={styles.contentArea}>{renderActiveScreen()}</View>
        </View>
      ) : (
        <View style={styles.mobileLayout}>
          <View style={styles.contentArea}>{renderActiveScreen()}</View>
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
});