import React, { useCallback } from 'react';
import { AuthProvider, useAuthContext } from './AuthContext';
import { MastersProvider, useMasters } from './MastersContext';
import { ShiftOperationsProvider, useShiftOperationsContext } from './ShiftOperationsContext';
import { TankDipProvider, useTankDipContext } from './TankDipContext';
import { CreditLedgerProvider, useCreditLedgerContext } from './CreditLedgerContext';
import { ExpensesProvider, useExpensesContext } from './ExpensesContext';
import { RateManagementProvider, useRateManagementContext } from './RateManagementContext';
import { CashBankProvider, useCashBankContext } from './CashBankContext';
import { DashboardProvider, useDashboardContext } from './DashboardContext';
import { ReportsProvider, useReportsContext } from './ReportsContext';
import { PermissionsProvider, usePermissions } from './PermissionsContext';

export const BunkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <PermissionsProvider>
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
      </PermissionsProvider>
    </AuthProvider>
  );
};


export const useBunk = () => {
  const auth = useAuthContext();
  const masters = useMasters();
  const shiftOps = useShiftOperationsContext();
  const tankDip = useTankDipContext();
  const credit = useCreditLedgerContext();
  const exp = useExpensesContext();
  const rates = useRateManagementContext();
  const cashBank = useCashBankContext();
  const dashboard = useDashboardContext();
  const reports = useReportsContext();
  const perms = usePermissions();


  const syncWithBackend = useCallback(async () => {
    auth.setLoading(true);
    auth.setError(null);
    try {
      await Promise.all([
        masters.syncMasters(),
        shiftOps.syncOperationsData(),
        tankDip.syncDailyNozzleMeters(),
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
    setProducts: masters.setProducts,
    pumps: masters.pumps,
    setPumps: masters.setPumps,
    operators: masters.operators,
    setOperators: masters.setOperators,
    customers: masters.customers,
    setCustomers: masters.setCustomers,
    expenseTypes: masters.expenseTypes,
    setExpenseTypes: masters.setExpenseTypes,
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

    // Shift / Pump Attribution Operations
    attributions: shiftOps.attributions,
    saveAttribution: shiftOps.saveAttribution,
    deleteAttribution: shiftOps.deleteAttribution,
    saveNozzleMetersBatch: shiftOps.saveNozzleMetersBatch,
    shifts: shiftOps.attributions,
    activeShift: shiftOps.attributions[0] || null,

    // Nozzle Meters
    dailyNozzleMeters: tankDip.dailyNozzleMeters,
    saveBatchNozzleMeters: tankDip.saveBatchNozzleMeters,

    // Credit Ledger
    creditTransactions: credit.creditTransactions,
    setCreditTransactions: credit.setCreditTransactions,
    creditPayments: credit.creditPayments,
    setCreditPayments: credit.setCreditPayments,
    addCreditSale: credit.addCreditSale,
    recordCreditRepayment: credit.recordCreditRepayment,

    // Expenses
    expenses: exp.expenses,
    setExpenses: exp.setExpenses,
    addExpense: exp.addExpense,

    // Rates
    fuelRateHistory: rates.fuelRateHistory,
    updateFuelRate: rates.updateFuelRate,
    updateBatchFuelRates: rates.updateBatchFuelRates,

    // Cash & Bank
    bankDeposits: cashBank.bankDeposits,
    settlements: cashBank.settlements,
    dailyReconciliation: cashBank.dailyReconciliation,
    recordBankDeposit: cashBank.recordBankDeposit,
    saveReconciliation: cashBank.saveReconciliation,
    saveSettlementsBatch: cashBank.saveSettlementsBatch,

    // Dashboard
    totalSalesToday: dashboard.totalSalesToday,
    totalLitresToday: dashboard.totalLitresToday,
    totalCashCollected: dashboard.totalCashCollected,
    totalExpenses: dashboard.totalExpenses,
    totalCreditOutstanding: dashboard.totalCreditOutstanding,
    netCashOnHand: dashboard.netCashOnHand,

    // Reports
    generateReport: reports.generateReport,

    // Page-Wise Permissions
    isPageVisible: perms.isPageVisible,
    getAllowedPages: perms.getAllowedPages,
    getPagePermissionsForTarget: perms.getPagePermissionsForTarget,
    savePagePermissions: perms.savePagePermissions,
    resetPagePermissions: perms.resetPagePermissions,
    isPermissionsLoaded: perms.isLoaded,

    // Sync
    syncWithBackend,
  };
};

