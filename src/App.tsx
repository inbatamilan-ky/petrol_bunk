import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, useWindowDimensions } from 'react-native';
import { BunkProvider } from './context/BunkContext';
import { Header } from './components/Header';
import { NavigationBar, ScreenId } from './components/NavigationBar';

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
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const { width } = useWindowDimensions();
  const isDesktop = width >= SIDEBAR_BREAKPOINT;

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
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileLayout: {
    flex: 1,
    flexDirection: 'column',
  },
  contentArea: {
    flex: 1,
  },
});