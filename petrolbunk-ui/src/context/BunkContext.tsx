import React, { useCallback } from 'react';
import { AuthProvider, useAuthContext } from './AuthContext';
import { MastersProvider, useMastersContext } from './MastersContext';
import { ShiftOperationsProvider, useShiftOperationsContext } from './ShiftOperationsContext';
import { TankDipProvider, useTankDipContext } from './TankDipContext';
import { CreditLedgerProvider, useCreditLedgerContext } from './CreditLedgerContext';
import { ExpensesProvider, useExpensesContext } from './ExpensesContext';
import { RateManagementProvider, useRateManagementContext } from './RateManagementContext';
import { CashBankProvider, useCashBankContext } from './CashBankContext';
import { DashboardProvider, useDashboardContext } from './DashboardContext';
import { ReportsProvider, useReportsContext } from './ReportsContext';
import { DEFAULT_PRODUCTS, DEFAULT_PUMPS } from './mappers';

export { DEFAULT_PRODUCTS, DEFAULT_PUMPS };

export const BunkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <MastersProvider>
        <ShiftOperationsProvider>
          <TankDipProvider>
            <CreditLedgerProvider>
              <ExpensesProvider>
                <RateManagementProvider>
                  <CashBankProvider>
                    <DashboardProvider>
                      <ReportsProvider>{children}</ReportsProvider>
                    </DashboardProvider>
                  </CashBankProvider>
                </RateManagementProvider>
              </ExpensesProvider>
            </CreditLedgerProvider>
          </TankDipProvider>
        </ShiftOperationsProvider>
      </MastersProvider>
    </AuthProvider>
  );
};

export const useBunk = () => {
  const auth = useAuthContext();
  const masters = useMastersContext();
  const shiftOps = useShiftOperationsContext();
  const tankDip = useTankDipContext();
  const credit = useCreditLedgerContext();
  const exp = useExpensesContext();
  const rates = useRateManagementContext();
  const cashBank = useCashBankContext();
  const dashboard = useDashboardContext();
  const reports = useReportsContext();

  const syncWithBackend = useCallback(async () => {
    auth.setLoading(true);
    auth.setError(null);
    try {
      await Promise.all([
        masters.syncMasters(),
        shiftOps.syncShifts(),
        tankDip.syncTankDips(),
        credit.syncCredit(),
        exp.syncExpenses(),
        rates.syncRatesAndLogs(),
        cashBank.syncCashBank(),
      ]);
      auth.setApiConnected(true);
    } catch (e: any) {
      auth.setApiConnected(false);
      auth.setError(e.message || 'Failed to sync with backend');
    } finally {
      auth.setLoading(false);
    }
  }, [auth, masters, shiftOps, tankDip, credit, exp, rates, cashBank]);

  return {
    // Auth & App
    currentUser: auth.currentUser,
    isLoggedIn: auth.isLoggedIn,
    isAuthChecking: auth.isAuthChecking,
    login: auth.login,
    logout: auth.logout,
    role: auth.role,
    setRole: auth.setRole,
    isMobileView: auth.isMobileView,
    setIsMobileView: auth.setIsMobileView,
    toggleMobileView: auth.toggleMobileView,
    activeBranchId: auth.activeBranchId,
    branches: auth.branches,
    switchBranch: auth.switchBranch,
    hasSelectedBunk: auth.hasSelectedBunk,
    selectBunk: auth.selectBunk,
    returnToBunkSelection: auth.returnToBunkSelection,
    bunkProfile: auth.bunkProfile,
    addBranch: auth.addBranch,
    updateBranch: auth.updateBranch,
    deleteBranch: auth.deleteBranch,
    apiConnected: auth.apiConnected,
    loading: auth.loading,
    error: auth.error,

    // Masters
    products: masters.products,
    pumps: masters.pumps,
    operators: masters.operators,
    customers: masters.customers,
    expenseTypes: masters.expenseTypes,
    addProduct: masters.addProduct,
    updateProduct: masters.updateProduct,
    deleteProduct: masters.deleteProduct,
    addPump: masters.addPump,
    updatePump: masters.updatePump,
    deletePump: masters.deletePump,
    addOperator: masters.addOperator,
    updateOperator: masters.updateOperator,
    deleteOperator: masters.deleteOperator,
    addCustomer: masters.addCustomer,
    updateCustomer: masters.updateCustomer,
    deleteCustomer: masters.deleteCustomer,
    addExpenseType: masters.addExpenseType,
    updateExpenseType: masters.updateExpenseType,
    deleteExpenseType: masters.deleteExpenseType,

    // Shifts
    shifts: shiftOps.shifts,
    activeShift: shiftOps.activeShift,
    openNewShift: shiftOps.openNewShift,
    saveShiftDraft: shiftOps.saveShiftDraft,
    closeShift: shiftOps.closeShift,
    updateShift: shiftOps.updateShift,
    deleteShift: shiftOps.deleteShift,

    // Tanks & Dips & Meters
    tanks: tankDip.tanks,
    dips: tankDip.dips,
    dailyNozzleMeters: tankDip.dailyNozzleMeters,
    saveBatchNozzleMeters: tankDip.saveBatchNozzleMeters,
    recordTankDip: tankDip.recordTankDip,

    // Credit Ledger
    creditTransactions: credit.creditTransactions,
    creditPayments: credit.creditPayments,
    addCreditSale: credit.addCreditSale,
    recordCreditRepayment: credit.recordCreditRepayment,

    // Expenses
    expenses: exp.expenses,
    addExpense: exp.addExpense,

    // Rates & SMS Logs
    fuelRateHistory: rates.fuelRateHistory,
    smsLogs: rates.smsLogs,
    autoListenEnabled: rates.autoListenEnabled,
    setAutoListenEnabled: rates.setAutoListenEnabled,
    autoApplySms: rates.autoApplySms,
    setAutoApplySms: rates.setAutoApplySms,
    updateFuelRate: rates.updateFuelRate,
    updateBatchFuelRates: rates.updateBatchFuelRates,
    addSmsLog: rates.addSmsLog,
    updateSmsLogStatus: rates.updateSmsLogStatus,
    clearSmsLogs: rates.clearSmsLogs,
    triggerDailyCronSync: rates.triggerDailyCronSync,

    // Cash & Bank
    bankDeposits: cashBank.bankDeposits,
    bankAccounts: cashBank.bankAccounts,
    recordBankDeposit: cashBank.recordBankDeposit,
    addBankAccount: cashBank.addBankAccount,
    updateBankAccount: cashBank.updateBankAccount,
    deleteBankAccount: cashBank.deleteBankAccount,
    saveCashSafeLedger: cashBank.saveCashSafeLedger,

    // Dashboard Aggregates
    totalSalesToday: dashboard.totalSalesToday,
    totalLitresToday: dashboard.totalLitresToday,
    totalCashCollected: dashboard.totalCashCollected,
    totalExpenses: dashboard.totalExpenses,
    totalCreditOutstanding: dashboard.totalCreditOutstanding,
    netCashOnHand: dashboard.netCashOnHand,

    // Backend sync
    syncWithBackend,
  };
};

export default BunkProvider;
