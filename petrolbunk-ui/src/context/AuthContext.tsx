import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole, Branch } from '../types';
import {
  apiFetch,
  getAuthSession,
  getSyncAuthSession,
  getSyncSelectedBunk,
  getStoredSelectedBunk,
  setStoredSelectedBunk,
  clearActiveBranch,
} from '../api/client';
import { AuthUser, getMe, logout as apiLogout } from '../api/auth';
import { mapBranch } from './mappers';

export interface AuthContextType {
  currentUser: AuthUser | null;
  isLoggedIn: boolean;
  isAuthChecking: boolean;
  login: (user: AuthUser, isRestore?: boolean) => void;
  logout: () => void;

  role: UserRole;
  setRole: (role: UserRole) => void;
  isMobileView: boolean;
  setIsMobileView: (val: boolean) => void;
  toggleMobileView: () => void;

  activeBranchId: string;
  branches: Branch[];
  switchBranch: (id: string) => Promise<void>;
  hasSelectedBunk: boolean;
  selectBunk: (id: string) => Promise<void>;
  returnToBunkSelection: () => void;

  bunkProfile: Branch | null;
  setBunkProfile: React.Dispatch<React.SetStateAction<Branch | null>>;
  addBranch: (b: Partial<Branch>) => Promise<void>;
  updateBranch: (profile: Partial<Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;

  apiConnected: boolean;
  setApiConnected: (val: boolean) => void;
  loading: boolean;
  setLoading: (val: boolean) => void;
  error: string | null;
  setError: (val: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialSession = getSyncAuthSession();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(initialSession?.user || null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!initialSession);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(!initialSession);

  const initialRole: UserRole =
    initialSession?.user?.role === 1 ||
    (initialSession?.user?.role as any) === '1' ||
    (initialSession?.user?.role as any) === 'ADMIN' ||
    (initialSession?.user?.role as any) === 'OWNER' ||
    (initialSession?.user?.role as any) === 'Owner'
      ? 'Owner'
      : 'Manager';

  const [role, setRole] = useState<UserRole>(initialRole);
  const [hasSelectedBunk, setHasSelectedBunk] = useState<boolean>(
    initialRole === 'Manager' || getSyncSelectedBunk()
  );
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [apiConnected, setApiConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeBranchId, setActiveBranchId] = useState<string>('B-01');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [bunkProfile, setBunkProfile] = useState<Branch | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    const { getActiveBranch } = require('../api/client');
    getActiveBranch().then((b: string | null) => {
      if (b) {
        setActiveBranchId(b);
        const match = branches.find((br) => br.id === b);
        if (match) setBunkProfile(match);
      }
    });
    apiFetch('/api/branches')
      .then((data: any) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(mapBranch);
          setBranches(mapped);
          const current = mapped.find((b: Branch) => b.id === activeBranchId) || mapped[0];
          if (current) setBunkProfile(current);
        }
      })
      .catch(() => {});
  }, [isLoggedIn, activeBranchId]);

  const login = useCallback((user: AuthUser, isRestore: boolean = false) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    const isOwner =
      user.role === 1 ||
      (user.role as any) === '1' ||
      (user.role as any) === 'ADMIN' ||
      (user.role as any) === 'OWNER' ||
      (user.role as any) === 'Owner';

    if (isOwner) {
      setRole('Owner');
      if (isRestore) {
        const wasSelected = getSyncSelectedBunk();
        setHasSelectedBunk(wasSelected);
      } else {
        setHasSelectedBunk(false);
        setStoredSelectedBunk(false);
      }
    } else {
      setRole('Manager');
      setHasSelectedBunk(true);
      setStoredSelectedBunk(true);
      if (user.branch_id || user.assigned_branch_id) {
        const branchId = user.branch_id || user.assigned_branch_id || 'B-01';
        setActiveBranchId(branchId);
        const match = branches.find((b) => b.id === branchId);
        if (match) setBunkProfile(match);
      }
    }
  }, [branches]);

  const logout = useCallback(() => {
    apiLogout();
    setStoredSelectedBunk(false);
    clearActiveBranch();
    setCurrentUser(null);
    setIsLoggedIn(false);
    setHasSelectedBunk(false);
  }, []);

  // Restore session with timer on mount
  useEffect(() => {
    let logoutTimer: any = null;

    (async () => {
      try {
        const session = await getAuthSession();
        if (session) {
          const storedSelected = await getStoredSelectedBunk();
          login(session.user, true);
          if (storedSelected) {
            setHasSelectedBunk(true);
          }
          logoutTimer = setTimeout(() => {
            logout();
          }, session.remainingMs);

          getMe()
            .then((freshUser) => {
              if (freshUser) login(freshUser, true);
            })
            .catch(() => {});
        }
      } catch {
        // Stay logged out on error
      } finally {
        setIsAuthChecking(false);
      }
    })();

    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
    };
  }, [login, logout]);

  const toggleMobileView = useCallback(() => {
    setIsMobileView((prev) => !prev);
  }, []);

  const switchBranch = useCallback(
    async (branchId: string) => {
      setActiveBranchId(branchId);
      setStoredSelectedBunk(true);
      const match = branches.find((b) => b.id === branchId);
      if (match) setBunkProfile(match);
      try {
        await apiFetch(`/api/branches/${branchId}/select`, { method: 'POST' });
      } catch {
        // ignore
      }
    },
    [branches]
  );

  const selectBunk = useCallback(
    async (branchId: string) => {
      setActiveBranchId(branchId);
      setStoredSelectedBunk(true);
      const match = branches.find((b) => b.id === branchId);
      if (match) setBunkProfile(match);
      setHasSelectedBunk(true);
      try {
        await apiFetch(`/api/branches/${branchId}/select`, { method: 'POST' });
      } catch {
        // ignore
      }
    },
    [branches]
  );

  const returnToBunkSelection = useCallback(() => {
    setHasSelectedBunk(false);
  }, []);

  const addBranch = useCallback(
    async (branchData: Partial<Branch>) => {
      const payload = {
        name: branchData.name || 'New Petrol Station',
        omc_brand: branchData.omc_brand || 'BPCL',
        dealer_code: branchData.dealer_code || '',
        location: branchData.location || '',
        is_active: branchData.is_active !== false,
      };
      try {
        const created = await apiFetch('/api/branches', { method: 'POST', body: JSON.stringify(payload) });
        setBranches((prev) => [...prev, mapBranch(created)]);
      } catch {
        const newBunk: Branch = {
          id: `B-${String(branches.length + 1).padStart(2, '0')}`,
          name: payload.name,
          omc_brand: payload.omc_brand as any,
          dealer_code: payload.dealer_code,
          location: payload.location || 'Tamil Nadu',
          is_active: payload.is_active,
        };
        setBranches((prev) => [...prev, newBunk]);
      }
    },
    [branches.length]
  );

  const updateBranch = useCallback(async (profileUpdates: Partial<Branch>) => {
    try {
      const payload: any = {};
      if (profileUpdates.name !== undefined) payload.name = profileUpdates.name;
      if (profileUpdates.omc_brand !== undefined) payload.omc_brand = profileUpdates.omc_brand;
      if (profileUpdates.dealer_code !== undefined) payload.dealer_code = profileUpdates.dealer_code;
      if (profileUpdates.location !== undefined) payload.location = profileUpdates.location;

      const targetId = profileUpdates.id || activeBranchId;
      const updated = await apiFetch(`/api/branches/${targetId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setBunkProfile(mapBranch(updated));
    } catch {
      setBunkProfile((prev) => (prev ? { ...prev, ...profileUpdates } : (profileUpdates as Branch)));
    }
    if (profileUpdates.id) {
      setBranches((prev) =>
        prev.map((b) => (b.id === profileUpdates.id ? { ...b, ...profileUpdates } : b))
      );
    }
  }, [activeBranchId]);

  const deleteBranch = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/branches/${id}`, { method: 'DELETE' });
    } catch {}
    setBranches((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoggedIn,
        isAuthChecking,
        login,
        logout,
        role,
        setRole,
        isMobileView,
        setIsMobileView,
        toggleMobileView,
        activeBranchId,
        branches,
        switchBranch,
        hasSelectedBunk,
        selectBunk,
        returnToBunkSelection,
        bunkProfile,
        setBunkProfile,
        addBranch,
        updateBranch,
        deleteBranch,
        apiConnected,
        setApiConnected,
        loading,
        setLoading,
        error,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };
