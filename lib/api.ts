import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import { File as ExpoFile, UploadType as FileSystemUploadType } from "expo-file-system";
import * as Sharing from "expo-sharing";
import NetInfo from "@react-native-community/netinfo";
import { apiCache, CACHE_CONFIG, getCacheKey } from "./cache";
import { getLRDisplayId } from "./lr-utils";
import {
  buildStatsFromLrs,
  filterLrsInCurrentMonth,
} from "./dashboard-utils";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
const TOKEN_KEY = "rono_auth_token";
const REQUEST_TIMEOUT = 30000; // 30 seconds
const AUTH_TIMEOUT = 12000; // 12 seconds for login/OTP
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

type ReportRoute = {
  id: string;
  route: string;
  from: string;
  to: string;
  totalLR: number;
  freightValue: number;
  activeLRCount: number;
  activeLRs: Array<{
    id: string;
    lrNumber: string;
    from: string;
    to: string;
    time: string;
    date: string;
    createdAt: string;
  }>;
};

type ReportPayload = {
  totalLRsThisMonth: number;
  freightTotal: number;
  monthName: string;
  year: number;
  topRoutes: ReportRoute[];
};

export function absUrl(url: string) {
  if (url.startsWith("http")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function normalizePhone10(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length < 10) return digits;
  return digits.slice(-10);
}

function normalizeDispatchDate(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value instanceof Date) return value.toISOString().split("T")[0];
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  return str;
}

function normalizeLrPatchBody(
  body: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  const consignorName = body.consignerName ?? body.consignorName;
  if (consignorName !== undefined) out.consignorName = consignorName;

  const consignorAddress = body.consignerAddress ?? body.consignorAddress;
  if (consignorAddress !== undefined) out.consignorAddress = consignorAddress;

  if (body.consigneeCompany !== undefined) out.consigneeCompany = body.consigneeCompany;

  const consigneePhone = body.consigneeMobile ?? body.consigneePhone;
  if (consigneePhone !== undefined) {
    out.consigneePhone = normalizePhone10(consigneePhone);
  }

  const noOfPackages = body.packageCount ?? body.noOfPackages;
  if (noOfPackages !== undefined) out.noOfPackages = noOfPackages;

  const weightKg = body.weight ?? body.weightKg;
  if (weightKg !== undefined) out.weightKg = weightKg;

  const photos = body.goodsPhotos ?? body.photos;
  if (photos !== undefined) out.photos = photos;

  const signatureUrl = body.executiveSignature ?? body.signatureUrl;
  if (signatureUrl !== undefined) out.signatureUrl = signatureUrl;

  const specialInstructions =
    body.goodsDescriptionDetail ?? body.specialInstructions;
  if (specialInstructions !== undefined) {
    out.specialInstructions = specialInstructions;
  }

  for (const key of [
    "consigneeName",
    "consigneeAddress",
    "originCity",
    "destinationCity",
    "vehicleNumber",
    "goodsDescription",
    "declaredValue",
    "freightAmount",
    "paymentMode",
    "dispatchDate",
    "status",
  ] as const) {
    if (body[key] !== undefined) out[key] = body[key];
  }

  const dispatchDate = body.lrDate ?? body.dispatchDate;
  if (dispatchDate !== undefined) {
    out.dispatchDate = normalizeDispatchDate(dispatchDate);
  }

  return out;
}

/** Best-effort MIME type from a local file URI's extension. The backend
 * additionally sniffs the real file bytes as a safety net, but sending the
 * correct Content-Type here avoids relying on that fallback (and keeps
 * behavior sane on the multipart request itself). */
function guessImageMimeType(uri: string): string {
  const clean = uri.split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".heic") || clean.endsWith(".heif")) return "image/heic";
  if (clean.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

async function uploadImageFile(uri: string, endpoint: string) {
  try {
    const token = await getToken();
    const file = new ExpoFile(uri);
    const result = await file.upload(`${API_URL}${endpoint}`, {
      httpMethod: "POST",
      uploadType: FileSystemUploadType.MULTIPART,
      fieldName: "file",
      mimeType: guessImageMimeType(uri),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    let json: any = {};
    try {
      json = JSON.parse(result.body);
    } catch {
      // ignore — fall through to status-based error below
    }

    if (result.status < 200 || result.status >= 300) {
      return { success: false, error: json.error || "Upload failed" };
    }

    return { success: true, data: json.data };
  } catch (error: any) {
    return { success: false, error: error.message || "Upload failed" };
  }
}

const isWeb = Platform.OS === "web";

// ━━━ Secure Token Storage ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let memoryToken: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (memoryToken !== undefined) return memoryToken;

  const stored = isWeb
    ? localStorage.getItem(TOKEN_KEY)
    : await SecureStore.getItemAsync(TOKEN_KEY);
  memoryToken = stored;
  return stored;
}

export async function setToken(token: string): Promise<void> {
  memoryToken = token;
  if (isWeb) {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  memoryToken = null;
  if (isWeb) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// ━━━ Network Detection ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let isOnline = true;

function updateOnlineState(state: {
  isConnected: boolean | null;
  isInternetReachable?: boolean | null;
}) {
  // "Unknown" reachability should not block requests — only explicit offline does.
  if (state.isConnected === false) {
    isOnline = false;
    return;
  }
  if (state.isInternetReachable === false) {
    isOnline = false;
    return;
  }
  isOnline = true;
}

/** Bumped on login/logout so stale in-flight 401s cannot clear a new session. */
let authEpoch = 0;

export function bumpAuthEpoch() {
  authEpoch += 1;
}

export function getAuthEpoch() {
  return authEpoch;
}

void NetInfo.fetch().then(updateOnlineState).catch(() => {
  isOnline = true;
});

NetInfo.addEventListener(updateOnlineState);

export function checkNetworkConnection(): boolean {
  return isOnline;
}

// ━━━ Retry Logic with Exponential Backoff ━━━━━━━━━━━━━━━━━━

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithTimeout(url, options, REQUEST_TIMEOUT);
    } catch (error) {
      if (attempt === retries) throw error;
      
      // Check if it's a network error (not server error)
      if (error instanceof Error && error.name === "AbortError") {
        await sleep(RETRY_DELAY * Math.pow(2, attempt)); // Exponential backoff
        continue;
      }
      
      throw error; // Don't retry on other errors
    }
  }
  throw new Error("Max retries exceeded");
}

// ━━━ Enhanced API Request with Error Handling ━━━━━━━━━━━━━━━

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isNetworkError = false
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  skipRetry = false,
  timeout = REQUEST_TIMEOUT
): Promise<ApiResponse<T>> {
  const isAuthPath = path.startsWith("/api/auth/");

  // Let auth requests reach the server; stale NetInfo state was blocking first login.
  if (!isAuthPath && !checkNetworkConnection()) {
    return {
      success: false,
      error: "No internet connection. Please check your network and try again.",
      statusCode: 0,
    };
  }

  const requestEpoch = authEpoch;
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client": "mobile",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = skipRetry
      ? await fetchWithTimeout(`${API_URL}${path}`, { ...options, headers }, timeout)
      : await fetchWithRetry(`${API_URL}${path}`, { ...options, headers });

    const contentType = res.headers.get("content-type");
    const isJson = contentType?.includes("application/json");

    // Handle non-JSON responses
    if (!isJson) {
      if (!res.ok) {
        return {
          success: false,
          error: `Server error (${res.status})`,
          statusCode: res.status,
        };
      }
      return { success: true, data: undefined as T };
    }

    // Parse JSON response
    const json = await res.json();

    // Handle 401 Unauthorized (token expired)
    if (res.status === 401) {
      if (requestEpoch === authEpoch) {
        await clearToken();
        onUnauthorized?.();
      }
      return {
        success: false,
        error: "Session expired. Please login again.",
        statusCode: 401,
      };
    }

    // Handle other error status codes
    if (!res.ok) {
      return {
        success: false,
        error: json.error || json.message || `Server error (${res.status})`,
        statusCode: res.status,
      };
    }

    return json;
  } catch (e) {
    console.error(`API Error [${path}]:`, e);

    if (e instanceof Error) {
      if (e.name === "AbortError") {
        return {
          success: false,
          error: "Request timeout. Please try again.",
          statusCode: 408,
        };
      }

      // Network error
      return {
        success: false,
        error: e.message.includes("fetch")
          ? "Network error. Please check your connection."
          : e.message,
        statusCode: 0,
      };
    }

    return {
      success: false,
      error: "An unexpected error occurred",
      statusCode: 500,
    };
  }
}

export const api = {
  sendOtp: (
    mobile: string,
    options?: { purpose?: "login" | "profile_update" },
  ) =>
    request<{ message: string; devOtp?: string; smsSent?: boolean }>(
      "/api/auth/send-otp",
      {
        method: "POST",
        body: JSON.stringify({
          mobile,
          ...(options?.purpose ? { purpose: options.purpose } : {}),
        }),
      },
      true,
      AUTH_TIMEOUT,
    ),

  verifyOtp: (mobile: string, otp: string) =>
    request<{ token: string; user: import("../types").User }>(
      "/api/auth/verify-otp",
      {
        method: "POST",
        body: JSON.stringify({ mobile, otp }),
      },
      true,
      AUTH_TIMEOUT
    ),

  logout: () => {
    apiCache.clearAll(); // Clear all cache on logout
    return request("/api/auth/logout", { method: "POST" }, true);
  },

  getLRs: async (params?: {
    status?: string;
    statuses?: string[];
    search?: string;
    from?: string;
    to?: string;
  }) => {
    const cacheKey = getCacheKey("/api/lr", params ?? {});
    const cached = apiCache.get<import("../types").LRRequest[]>(cacheKey);
    if (cached) return { success: true, data: cached };

    const qs = new URLSearchParams();
    if (params?.statuses?.length) {
      qs.set("statuses", params.statuses.join(","));
    } else if (params?.status && params.status !== "all") {
      qs.set("status", params.status);
    }
    if (params?.search) qs.set("search", params.search);
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    const tail = qs.toString();
    const result = await request<import("../types").LRRequest[]>(
      `/api/lr${tail ? `?${tail}` : ""}`,
    );
    
    if (result.success && result.data) {
      apiCache.set(cacheKey, result.data, CACHE_CONFIG.lrs);
    }
    return result;
  },

  getLR: async (id: string) => {
    return request<import("../types").LRRequest>(`/api/lr/${id}`);
  },

  createLR: (body: Record<string, unknown>) => {
    apiCache.clear("/api/lr");
    apiCache.clear("/api/company/dashboard");
    apiCache.clear("/api/executive/dashboard");
    return request<import("../types").LRRequest>("/api/lr", {
      method: "POST",
      body: JSON.stringify({
        consignorName: body.consignerName || body.consignorName,
        consignorAddress: body.consignerAddress || body.consignorAddress,
        consigneeCompany: body.consigneeCompany,
        consigneeName: body.consigneeName,
        consigneeAddress: body.consigneeAddress,
        consigneePhone: normalizePhone10(body.consigneeMobile ?? body.consigneePhone),
        originCity: body.originCity,
        destinationCity: body.destinationCity,
        vehicleNumber: body.vehicleNumber,
        goodsDescription: body.goodsDescription,
        noOfPackages: body.packageCount || body.noOfPackages,
        weightKg: body.weight || body.weightKg,
        declaredValue: body.declaredValue,
        freightAmount: body.freightAmount,
        paymentMode: body.paymentMode,
        dispatchDate:
          normalizeDispatchDate(body.lrDate ?? body.dispatchDate) ??
          new Date().toISOString().split("T")[0],
        specialInstructions: body.goodsDescriptionDetail || body.specialInstructions,
        photos: body.goodsPhotos || body.photos || [],
        signatureUrl: body.executiveSignature || body.signatureUrl,
      }),
    }, true);
  },

  updateLR: async (id: string, body: Record<string, unknown>) => {
    apiCache.clear("/api/lr");
    apiCache.clear("/api/executive/dashboard");
    return request<import("../types").LRRequest>(`/api/lr/${id}`, {
      method: "PATCH",
      body: JSON.stringify(normalizeLrPatchBody(body)),
    }, true);
  },

  approveLR: (id: string) => {
    apiCache.clear("/api/lr");
    apiCache.clear("/api/company/dashboard");
    return request(`/api/lr/${id}/approve`, { method: "PUT" }, true);
  },

  rejectLR: (id: string, reason: string) => {
    apiCache.clear("/api/lr");
    apiCache.clear("/api/company/dashboard");
    return request(`/api/lr/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    }, true);
  },

  markDelivered: async (id: string) => {
    apiCache.clear("/api/lr");
    apiCache.clear("/api/executive/dashboard");
    return request(`/api/lr/${id}/delivered`, { method: "PUT" }, true);
  },

  uploadPhoto: async (uri: string) => uploadImageFile(uri, "/api/upload/photo"),

  uploadLogo: async (uri: string) => uploadImageFile(uri, "/api/upload/logo"),

  uploadStamp: async (uri: string) => uploadImageFile(uri, "/api/upload/stamp"),

  uploadSignature: (dataUri: string) =>
    request<{ url: string; bytes: number; mime: string }>(
      "/api/upload/signature",
      {
        method: "POST",
        body: JSON.stringify({ data: dataUri }),
      },
      true
    ),

  getDashboard: async () => {
    const cacheKey = "/api/company/dashboard";
    const cached = apiCache.get<{
      company?: import("../types").Company | null;
      stats: import("../types").DashboardStats;
      recentLrs: import("../types").LRRequest[];
      topRoutes?: { route: string; count: number; freight: number }[];
      quota?: {
        branches: { used: number; max: number };
        executives: { used: number; max: number };
        lrs: { used: number; max: number };
      };
    }>(cacheKey);
    if (cached) return { success: true, data: cached };

    const result = await request<{
      company?: import("../types").Company | null;
      stats: import("../types").DashboardStats;
      recentLrs: import("../types").LRRequest[];
      topRoutes?: { route: string; count: number; freight: number }[];
      quota?: {
        branches: { used: number; max: number };
        executives: { used: number; max: number };
        lrs: { used: number; max: number };
      };
    }>("/api/company/dashboard");
    
    if (result.success && result.data) {
      apiCache.set(cacheKey, result.data, CACHE_CONFIG.dashboard);
    }
    return result;
  },

  getExecutives: async () => {
    const cacheKey = "/api/executives";
    const cached = apiCache.get<import("../types").Executive[]>(cacheKey);
    if (cached) return { success: true, data: cached };

    const result = await request<import("../types").Executive[]>("/api/executives");
    
    if (result.success && result.data) {
      apiCache.set(cacheKey, result.data, CACHE_CONFIG.executives);
    }
    return result;
  },

  inviteExecutive: (mobile: string, branchId: string, name?: string) => {
    apiCache.clear("/api/executives"); // Invalidate executives cache
    return request<{ id: string }>("/api/executives/invite", {
      method: "POST",
      body: JSON.stringify({ mobile, branchId, name }),
    }, true);
  },

  removeExecutive: (id: string) => {
    apiCache.clear("/api/executives"); // Invalidate executives cache
    return request(`/api/executives/${id}`, { method: "DELETE" }, true);
  },

  getBranches: async () => {
    const cacheKey = "/api/branches";
    const cached = apiCache.get<
      Array<{
        id: string;
        name: string;
        city: string;
        state: string;
        executiveCount: number;
        lrsThisMonth: number;
      }>
    >(cacheKey);
    if (cached) return { success: true, data: cached };

    const result = await request<
      Array<{
        id: string;
        name: string;
        city: string;
        state: string;
        executiveCount: number;
        lrsThisMonth: number;
      }>
    >("/api/branches");
    
    if (result.success && result.data) {
      apiCache.set(cacheKey, result.data, CACHE_CONFIG.branches);
    }
    return result;
  },

  getCompanyProfile: async () => {
    const cacheKey = "/api/company/profile";
    const cached = apiCache.get<import("../types").Company>(cacheKey);
    if (cached) return { success: true, data: cached };

    const result = await request<import("../types").Company>("/api/company/profile");
    
    if (result.success && result.data) {
      apiCache.set(cacheKey, result.data, CACHE_CONFIG.companyProfile);
    }
    return result;
  },

  updateCompanyProfile: (
    body: Partial<{
      name: string;
      address: string;
      gstNumber: string;
      logoUrl: string;
      stampUrl: string;
    }>,
  ) => {
    apiCache.clear("/api/company/profile");
    return request<import("../types").Company>("/api/company/profile", {
      method: "POST",
      body: JSON.stringify(body),
    }, true);
  },

  getProfile: () =>
    request<import("../types").User>("/api/auth/profile"),

  updateProfile: (body: { name?: string; mobile?: string; otp?: string; profileImageUrl?: string }) => {
    apiCache.clear("/api/auth/profile");
    return request<import("../types").User>("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(body),
    }, true);
  },

  getNotifications: async () => {
    const cacheKey = "/api/notifications";
    const cached = apiCache.get<import("../types").Notification[]>(cacheKey);
    if (cached) return { success: true, data: cached };

    const result = await request<import("../types").Notification[]>("/api/notifications");
    
    if (result.success && result.data) {
      apiCache.set(cacheKey, result.data, CACHE_CONFIG.notifications);
    }
    return result;
  },

  markNotificationRead: (id: string) => {
    apiCache.clear("/api/notifications"); // Invalidate notifications cache
    return request(`/api/notifications/${id}/read`, {
      method: "PUT",
    }, true);
  },

  markAllNotificationsRead: () => {
    apiCache.clear("/api/notifications"); // Invalidate notifications cache
    return request("/api/notifications/read-all", {
      method: "PUT",
    }, true);
  },

  getExecutiveDashboard: async () => {
    return request<{
      stats: import("../types").ExecutiveDashboardStats;
      latestLr: import("../types").LRRequest | null;
      history: import("../types").LRRequest[];
    }>("/api/executive/dashboard");
  },

  /**
   * Fetches the LR PDF with the auth token and saves it to a local cache
   * file. Does NOT open any share/save UI — callers decide what to do with
   * the resulting file (save it, share it, etc).
   */
  fetchLRPdfFile: async (id: string) => {
    const token = await getToken();
    if (!token) {
      return { success: false as const, error: "Not authenticated" };
    }

    const url = `${API_URL}/api/lr/${id}/pdf`;
    const fileName = `lr-${id}.pdf`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    try {
      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (result.status !== 200) {
        console.error("[PDF] Non-200 status:", result.status);

        try {
          const errorText = await FileSystem.readAsStringAsync(result.uri);
          console.error("[PDF] Error response:", errorText);
          const errorJson = JSON.parse(errorText);
          return { success: false as const, error: errorJson.error || "Failed to fetch PDF" };
        } catch {
          return { success: false as const, error: `Failed to fetch PDF (status ${result.status})` };
        }
      }

      return { success: true as const, uri: result.uri, fileName };
    } catch (error) {
      console.error("[PDF] Exception:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch PDF";
      return { success: false as const, error: errorMessage };
    }
  },

  /**
   * "Download" — saves the PDF to the device without opening the share-to-
   * other-apps sheet. On Android we ask the user to pick a folder (via the
   * Storage Access Framework, e.g. "Downloads") and write the file there.
   * On iOS, apps are sandboxed and there is no equivalent "Downloads"
   * location, so we fall back to the system "Save to Files…" sheet, which
   * is Apple's standard save mechanism (not a general share sheet).
   */
  downloadLRPdf: async (id: string) => {
    const fetched = await api.fetchLRPdfFile(id);
    if (!fetched.success) return fetched;

    try {
      if (Platform.OS === "android") {
        const SAF = (FileSystem as unknown as {
          StorageAccessFramework?: {
            requestDirectoryPermissionsAsync: () => Promise<{ granted: boolean; directoryUri: string }>;
            createFileAsync: (dirUri: string, name: string, mime: string) => Promise<string>;
          };
        }).StorageAccessFramework;

        if (SAF) {
          const perm = await SAF.requestDirectoryPermissionsAsync();
          if (perm.granted) {
            const base64 = await FileSystem.readAsStringAsync(fetched.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const destUri = await SAF.createFileAsync(
              perm.directoryUri,
              fetched.fileName,
              "application/pdf"
            );
            await FileSystem.writeAsStringAsync(destUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            return { success: true as const };
          }
        }
      }

      // iOS (or Android SAF declined) — use the OS "Save to Files" sheet.
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fetched.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Save LR PDF",
          UTI: "com.adobe.pdf",
        });
      }
      return { success: true as const };
    } catch (error) {
      console.error("[PDF Download] Exception:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save PDF";
      return { success: false as const, error: errorMessage };
    }
  },

  /**
   * "Share" — always opens the native share sheet with the generated LR
   * PDF attached, so the user can send it via WhatsApp, email, etc.
   */
  shareLRPdf: async (id: string) => {
    const fetched = await api.fetchLRPdfFile(id);
    if (!fetched.success) return fetched;

    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fetched.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share LR PDF",
          UTI: "com.adobe.pdf",
        });
        return { success: true as const };
      }
      return { success: false as const, error: "Sharing is not available on this device" };
    } catch (error) {
      console.error("[PDF Share] Exception:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to share PDF";
      return { success: false as const, error: errorMessage };
    }
  },

  /** @deprecated Use downloadLRPdf instead */
  getLRPdf: (id: string) =>
    request<{ url: string }>(`/api/lr/${id}/pdf`),

  getAddresses: (type?: "consigner" | "consignee") => {
    const qs = type ? `?type=${type}` : "";
    return request<import("../types").Address[]>(`/api/addresses${qs}`);
  },

  createAddress: (body: Omit<import("../types").Address, "id" | "userId" | "createdAt">) => {
    apiCache.clear("/api/addresses");
    return request<import("../types").Address>("/api/addresses", {
      method: "POST",
      body: JSON.stringify(body),
    }, true);
  },

  updateAddress: (id: string, body: Partial<Omit<import("../types").Address, "id" | "userId" | "createdAt">>) => {
    apiCache.clear("/api/addresses");
    return request<import("../types").Address>(`/api/addresses/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }, true);
  },

  deleteAddress: (id: string) => {
    apiCache.clear("/api/addresses");
    return request(`/api/addresses/${id}`, { method: "DELETE" }, true);
  },

  searchAddresses: (query: string) =>
    request<import("../types").Address[]>(`/api/addresses/search?q=${encodeURIComponent(query)}`),

  getReports: async () => {
    const cacheKey = "/api/reports";
    const cached = apiCache.get<ReportPayload>(cacheKey);
    if (cached) return { success: true, data: cached };

    const [dashboardRes, lrsRes] = await Promise.all([
      api.getDashboard(),
      api.getLRs(),
    ]);

    if (!dashboardRes.success || !dashboardRes.data) {
      return {
        success: false,
        error: dashboardRes.error || "Failed to load reports",
      };
    }

    const { stats, topRoutes = [] } = dashboardRes.data;
    const allLrs = lrsRes.success && lrsRes.data ? lrsRes.data : [];
    const allStats = buildStatsFromLrs(allLrs);
    const monthStats = buildStatsFromLrs(filterLrsInCurrentMonth(allLrs));
    const now = new Date();
    const activeStatuses = new Set(["pending", "approved", "in_transit"]);

    const transformedRoutes = topRoutes.map((route, index) => {
      const [from = "", to = ""] = route.route.split("→").map((part) => part.trim());
      const routeLrs = allLrs.filter(
        (lr) => lr.originCity === from && lr.destinationCity === to
      );
      const activeLrs = routeLrs.filter((lr) => activeStatuses.has(lr.status));
      const routeFreight = routeLrs.reduce(
        (sum, lr) => sum + (lr.freightAmount ?? 0),
        0,
      );

      return {
        id: `route-${index}`,
        route: `${from} to ${to}`,
        from,
        to,
        totalLR: routeLrs.length || route.count,
        freightValue: Math.round(routeFreight || route.freight),
        activeLRCount: activeLrs.length,
        activeLRs: activeLrs.map((lr) => {
          const created = new Date(lr.createdAt);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isToday = created >= today;

          return {
            id: lr.id,
            lrNumber: getLRDisplayId(lr),
            from: lr.originCity,
            to: lr.destinationCity,
            time: created.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            date: isToday
              ? "Today"
              : created.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
            createdAt: lr.createdAt,
          };
        }),
      };
    });

    const data: ReportPayload = {
      totalLRsThisMonth: allStats.totalLrs || monthStats.totalLrs || stats.totalLrs,
      freightTotal: Math.round(allStats.freightTotal || stats.freightTotal),
      monthName: now.toLocaleDateString("en-GB", { month: "long" }),
      year: now.getFullYear(),
      topRoutes: transformedRoutes,
    };

    apiCache.set(cacheKey, data, CACHE_CONFIG.dashboard);
    return { success: true, data };
  },

  exportReport: async (format: "pdf" | "csv") => {
    const token = await getToken();
    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
    const url = `${API_URL}/api/reports/${format}?from=${from}&to=${to}`;
    const fileName = `rono-report-${from}.${format}`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    try {
      console.log(`[Export] Requesting ${format} report from ${from} to ${to}`);
      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (result.status !== 200) {
        console.error("[Export] Non-200 status:", result.status);
        
        // Try to read error message from response if available
        try {
          const errorText = await FileSystem.readAsStringAsync(result.uri);
          console.error("[Export] Error response:", errorText);
          
          // Try parsing as JSON first
          try {
            const errorJson = JSON.parse(errorText);
            return { 
              success: false, 
              error: errorJson.error || `Export failed (status ${result.status})` 
            };
          } catch {
            // If not JSON, return first 200 chars of error text
            return { 
              success: false, 
              error: errorText.length > 200 
                ? `${errorText.slice(0, 200)}...` 
                : errorText || `Export failed (status ${result.status})`
            };
          }
        } catch {
          return { success: false, error: `Export failed (status ${result.status})` };
        }
      }

      console.log(`[Export] ${format} report downloaded successfully, sharing...`);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: format === "csv" ? "text/csv" : "application/pdf",
          dialogTitle: `Export Report as ${format.toUpperCase()}`,
          UTI: format === "csv" ? "public.comma-separated-values-text" : "com.adobe.pdf",
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error("[Export] Exception:", error);
      const errorMessage = error instanceof Error ? error.message : "Export failed";
      return { success: false, error: errorMessage };
    }
  },
};

export { API_URL };
