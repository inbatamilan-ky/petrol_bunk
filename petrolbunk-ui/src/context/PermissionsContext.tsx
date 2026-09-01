import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PageId, PagePermissionConfig, UserRole } from '../types';

export type { PageId, PagePermissionConfig };


export const PAGE_CONFIGS: PagePermissionConfig[] = [
  {
    id: 'dashboard',
    title: 'Dashboard & Summary',
    category: 'Operations',
    description: 'Station overview, sales volume, payment channel summaries, and safe status.',
    defaultManagerAccess: true,
  },
  {
    id: 'shifts',
    title: 'Shift Operations & Tally',
    category: 'Operations',
    description: 'Operator shift assignments, collections entry, daily handover tally, and live reconciliation.',
    defaultManagerAccess: true,
  },
  {
    id: 'tanks',
    title: 'Nozzle Meters & Dips',
    category: 'Inventory',
    description: 'Daily opening/closing totalizer meter readings, tank dip recordings, and decantation.',
    defaultManagerAccess: true,
  },
  {
    id: 'credit',
    title: 'Credit Ledger (Khata)',
    category: 'Finance & Sales',
    description: 'Customer credit accounts, vehicle-wise credit dispensing, repayment log, and 12-month Khata matrix.',
    defaultManagerAccess: true,
  },
  {
    id: 'expenses',
    title: 'Daily Expenses',
    category: 'Finance & Sales',
    description: 'Bunk operational expense tracking, category-wise vouchers, and monthly expense matrix.',
    defaultManagerAccess: true,
  },
  {
    id: 'rates',
    title: 'Daily Fuel Rates',
    category: 'Operations',
    description: 'Manual and CSV daily fuel price revision, scheduled updates, and price audit history.',
    defaultManagerAccess: true,
  },
  {
    id: 'cashbank',
    title: 'Cash & Bank Settlements',
    category: 'Finance & Sales',
    description: 'Bank swipe settlements matrix, safe cash reconciliation, and bank deposit logging.',
    defaultManagerAccess: true,
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    category: 'Administration',
    description: 'Executive DSR, OMC inspection audit reports, profit & loss, and CSV/Excel exports.',
    defaultManagerAccess: false,
  },
  {
    id: 'masters',
    title: 'Masters & Settings',
    category: 'Administration',
    description: 'Branch profiles, pump nozzles, product catalog, customer registry, staff list, and expense heads.',
    defaultManagerAccess: false,
  },
  {
    id: 'permissions',
    title: 'Role Access Control',
    category: 'Administration',
    description: 'Configure page visibility and system access for Station Managers.',
    defaultManagerAccess: false,
    ownerOnly: true,
  },
];

export const DEFAULT_PAGE_PERMISSIONS: Record<PageId, boolean> = {
  dashboard: true,
  shifts: true,
  tanks: true,
  credit: true,
  expenses: true,
  rates: true,
  cashbank: true,
  reports: false,
  masters: false,
  permissions: false,
};

const STORAGE_KEY = 'fuelpulse_page_perms_store_v1';

interface PermissionsContextType {
  isPageVisible: (pageId: PageId, role?: UserRole, branchId?: string) => boolean;
  getAllowedPages: (role?: UserRole, branchId?: string) => PageId[];
  getPagePermissionsForTarget: (targetKey: string) => Record<PageId, boolean>;
  savePagePermissions: (targetKey: string, permissions: Record<PageId, boolean>) => Promise<void>;
  resetPagePermissions: (targetKey: string) => Promise<void>;
  isLoaded: boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Map of targetKey ('GLOBAL_MANAGER' or branchId) -> Record<PageId, boolean>
  const [permissionsStore, setPermissionsStore] = useState<Record<string, Record<PageId, boolean>>>({
    GLOBAL_MANAGER: { ...DEFAULT_PAGE_PERMISSIONS },
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load stored permissions on startup
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setPermissionsStore((prev) => ({
            ...prev,
            ...parsed,
          }));
        }
      } catch (err) {
        console.warn('Failed to load page permissions from AsyncStorage:', err);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const getPagePermissionsForTarget = useCallback(
    (targetKey: string): Record<PageId, boolean> => {
      const specific = permissionsStore[targetKey];
      if (specific) {
        return { ...DEFAULT_PAGE_PERMISSIONS, ...specific };
      }
      const global = permissionsStore['GLOBAL_MANAGER'];
      return global ? { ...DEFAULT_PAGE_PERMISSIONS, ...global } : { ...DEFAULT_PAGE_PERMISSIONS };
    },
    [permissionsStore]
  );

  const savePagePermissions = useCallback(
    async (targetKey: string, permissions: Record<PageId, boolean>) => {
      const updatedStore = {
        ...permissionsStore,
        [targetKey]: {
          ...permissions,
          permissions: false, // Permissions page is strictly owner-only
        },
      };
      setPermissionsStore(updatedStore);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStore));
      } catch (err) {
        console.warn('Failed to save page permissions to AsyncStorage:', err);
      }
    },
    [permissionsStore]
  );

  const resetPagePermissions = useCallback(
    async (targetKey: string) => {
      const updatedStore = { ...permissionsStore };
      if (targetKey === 'GLOBAL_MANAGER') {
        updatedStore['GLOBAL_MANAGER'] = { ...DEFAULT_PAGE_PERMISSIONS };
      } else {
        delete updatedStore[targetKey];
      }
      setPermissionsStore(updatedStore);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStore));
      } catch (err) {
        console.warn('Failed to reset page permissions:', err);
      }
    },
    [permissionsStore]
  );

  const isPageVisible = useCallback(
    (pageId: PageId, role: UserRole = 'Owner', branchId: string = 'GLOBAL_MANAGER'): boolean => {
      // Owner always has access to all pages
      if (role === 'Owner') {
        return true;
      }

      // Permissions page is strictly Owner-only
      if (pageId === 'permissions') {
        return false;
      }

      // Check branch-specific permissions first, fallback to GLOBAL_MANAGER
      const perms = getPagePermissionsForTarget(branchId);
      return perms[pageId] ?? DEFAULT_PAGE_PERMISSIONS[pageId] ?? false;
    },
    [getPagePermissionsForTarget]
  );

  const getAllowedPages = useCallback(
    (role: UserRole = 'Owner', branchId: string = 'GLOBAL_MANAGER'): PageId[] => {
      return PAGE_CONFIGS.filter((p) => isPageVisible(p.id, role, branchId)).map((p) => p.id);
    },
    [isPageVisible]
  );

  return (
    <PermissionsContext.Provider
      value={{
        isPageVisible,
        getAllowedPages,
        getPagePermissionsForTarget,
        savePagePermissions,
        resetPagePermissions,
        isLoaded,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};
