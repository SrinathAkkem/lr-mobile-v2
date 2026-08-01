import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  api,
  bumpAuthEpoch,
  clearToken,
  getToken,
  setOnUnauthorized,
  setToken,
} from "./api";
import { apiCache } from "./cache";
import { SKIP_LOGIN, DEV_ROLE } from "./config";
import type { User } from "../types";

const USER_KEY = "rono_user";
const LAST_FIRST_NAME_KEY = "@rono:last_first_name";
const isWeb = Platform.OS === "web";

function getMockUser(): User {
  return DEV_ROLE === "executive"
    ? {
        id: "dev-exec-1",
        name: "Rajan Patel",
        mobile: "9012343217",
        role: "executive",
        companyId: "dev-company-1",
        branchId: "dev-branch-1",
        company: { id: "dev-company-1", name: "Rono", lrCode: "RH" },
        branch: { id: "dev-branch-1", name: "ABC", city: "Hyderabad" },
      }
    : {
        id: "dev-user-1",
        name: "Rajesh Kumar",
        mobile: "9012343216",
        role: "company_admin",
        companyId: "dev-company-1",
        branchId: "dev-branch-1",
        company: { id: "dev-company-1", name: "Rono", lrCode: "RH" },
        branch: { id: "dev-branch-1", name: "ABC", city: "Hyderabad" },
      };
}

function normalizeUser(raw: User): User {
  return { ...raw };
}

async function getStoredUser(): Promise<User | null> {
  try {
    const stored = isWeb
      ? localStorage.getItem(USER_KEY)
      : await SecureStore.getItemAsync(USER_KEY);
    if (!stored) return null;
    return normalizeUser(JSON.parse(stored) as User);
  } catch {
    if (isWeb) localStorage.removeItem(USER_KEY);
    else await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
    return null;
  }
}

export async function getLastFirstName(): Promise<string | null> {
  try {
    const stored = isWeb
      ? localStorage.getItem(LAST_FIRST_NAME_KEY)
      : await SecureStore.getItemAsync(LAST_FIRST_NAME_KEY);
    return stored || null;
  } catch {
    return null;
  }
}

async function setLastFirstName(name: string) {
  const firstName = name.trim().split(/\s+/)[0];
  if (!firstName) return;
  if (isWeb) localStorage.setItem(LAST_FIRST_NAME_KEY, firstName);
  else await SecureStore.setItemAsync(LAST_FIRST_NAME_KEY, firstName);
}

async function setStoredUser(user: User | null) {
  if (!user) {
    if (isWeb) localStorage.removeItem(USER_KEY);
    else await SecureStore.deleteItemAsync(USER_KEY);
    return;
  }
  const payload = JSON.stringify(user);
  if (isWeb) localStorage.setItem(USER_KEY, payload);
  else await SecureStore.setItemAsync(USER_KEY, payload);
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (mobile: string, otp: string) => Promise<{ ok: boolean; error?: string }>;
  sendOtp: (
    mobile: string,
    options?: { purpose?: "login" | "profile_update" },
  ) => Promise<{ ok: boolean; error?: string; devOtp?: string; smsSent?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: (patch: Partial<User>) => Promise<void>;
  reloadProfile: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const bootstrapIdRef = useRef(0);

  useEffect(() => {
    const bootstrapId = ++bootstrapIdRef.current;
    let cancelled = false;

    const signOut = async () => {
      if (cancelled || bootstrapId !== bootstrapIdRef.current) return;
      bumpAuthEpoch();
      await clearToken();
      await setStoredUser(null);
      setUser(null);
    };

    setOnUnauthorized(() => {
      void signOut();
    });

    (async () => {
      if (SKIP_LOGIN) {
        const mockUser = getMockUser();
        setUser(mockUser);
        await setStoredUser(mockUser);
        setLoading(false);
        return;
      }

      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const stored = await getStoredUser();
      if (stored && bootstrapId === bootstrapIdRef.current) {
        setUser(stored);
      }
      setLoading(false);

      const profileRes = await api.getProfile();
      if (cancelled || bootstrapId !== bootstrapIdRef.current) return;

      if (profileRes.success && profileRes.data) {
        const nextUser = normalizeUser(profileRes.data);
        setUser(nextUser);
        await setStoredUser(nextUser);
      } else if (profileRes.statusCode === 401) {
        await signOut();
      }
    })();

    return () => {
      cancelled = true;
      setOnUnauthorized(null);
    };
  }, []);

  async function sendOtp(
    mobile: string,
    options?: { purpose?: "login" | "profile_update" },
  ) {
    // Normalize mobile to 10 digits (strip non-digits, remove country code if present)
    const normalized = mobile.replace(/\D/g, "");
    const finalMobile = normalized.length === 12 && normalized.startsWith("91") 
      ? normalized.slice(2) 
      : normalized.length > 10 
      ? normalized.slice(-10) 
      : normalized;
    
    const res = await api.sendOtp(finalMobile, options);
    return res.success
      ? { ok: true, devOtp: res.data?.devOtp, smsSent: res.data?.smsSent }
      : { ok: false, error: res.error };
  }

  const login = useCallback(async (mobile: string, otp: string) => {
    const res = await api.verifyOtp(mobile, otp);
    if (!res.success || !res.data) {
      return { ok: false, error: res.error ?? "Login failed" };
    }

    bootstrapIdRef.current += 1;
    bumpAuthEpoch();

    const nextUser = normalizeUser(res.data.user);
    await setToken(res.data.token);
    setUser(nextUser);
    setLoading(false);
    apiCache.clearAll();
    void setStoredUser(nextUser);
    void setLastFirstName(nextUser.name);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    bootstrapIdRef.current += 1;
    bumpAuthEpoch();
    await api.logout();
    await clearToken();
    await setStoredUser(null);
    setUser(null);
  }, []);

  const reloadProfile = useCallback(async (): Promise<User | null> => {
    const res = await api.getProfile();
    if (!res.success || !res.data) return null;

    let nextUser = normalizeUser(res.data);

    if (
      nextUser.role === "executive" &&
      (!nextUser.company?.name || !nextUser.branch?.name)
    ) {
      const lrRes = await api.getLRs();
      const lr =
        lrRes.success && lrRes.data?.length
          ? lrRes.data.find((item) => item.branch?.name || item.company?.name) ??
            lrRes.data[0]
          : null;

      if (lr) {
        nextUser = normalizeUser({
          ...nextUser,
          company: nextUser.company?.name
            ? nextUser.company
            : lr.company
              ? {
                  id: lr.companyId ?? lr.company.id,
                  name: lr.company.name,
                  lrCode: lr.company.lrCode,
                }
              : nextUser.company,
          branch: nextUser.branch?.name
            ? nextUser.branch
            : lr.branch
              ? {
                  id: lr.branch.id,
                  name: lr.branch.name,
                  city: lr.branch.city,
                }
              : nextUser.branch,
        });
      }
    }

    setUser((prev) => {
      if (
        prev?.id === nextUser.id &&
        prev?.name === nextUser.name &&
        prev?.mobile === nextUser.mobile &&
        prev?.status === nextUser.status &&
        prev?.company?.name === nextUser.company?.name &&
        prev?.branch?.name === nextUser.branch?.name
      ) {
        return prev;
      }
      return nextUser;
    });
    await setStoredUser(nextUser);
    return nextUser;
  }, []);

  const refreshUser = useCallback(async (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = normalizeUser({
        ...prev,
        ...patch,
        company: patch.company ?? prev.company,
        branch: patch.branch ?? prev.branch,
      });
      void setStoredUser(updated);
      return updated;
    });
  }, []);

  const sendOtpStable = useCallback(
    (
      mobile: string,
      options?: { purpose?: "login" | "profile_update" },
    ) => sendOtp(mobile, options),
    [],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      sendOtp: sendOtpStable,
      logout,
      refreshUser,
      reloadProfile,
    }),
    [user, loading, login, sendOtpStable, logout, refreshUser, reloadProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
