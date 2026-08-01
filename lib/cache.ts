/**
 * Simple in-memory cache for API responses
 * Reduces redundant API calls and improves performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.expiresIn) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(keyPattern?: string): void {
    if (!keyPattern) {
      this.cache.clear();
      return;
    }

    // Clear keys matching pattern
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }

  clearAll(): void {
    this.cache.clear();
  }
}

export const apiCache = new ApiCache();

/**
 * Cache configuration for different API endpoints
 */
export const CACHE_CONFIG = {
  // Short-lived cache (1 minute)
  dashboard: 60 * 1000,
  lrs: 60 * 1000,
  executives: 60 * 1000,
  
  // Medium-lived cache (5 minutes)
  branches: 5 * 60 * 1000,
  profile: 5 * 60 * 1000,
  notifications: 5 * 60 * 1000,
  
  // Long-lived cache (30 minutes)
  companyProfile: 30 * 60 * 1000,
};

/**
 * Helper to generate cache keys
 */
export function getCacheKey(endpoint: string, params?: Record<string, any>): string {
  if (!params) return endpoint;
  const query = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return `${endpoint}?${query}`;
}
