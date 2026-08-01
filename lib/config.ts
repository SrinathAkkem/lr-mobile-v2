/** @deprecated Use real API only — kept for optional local UI tooling. */
export const USE_DUMMY_DATA =
  process.env.EXPO_PUBLIC_USE_DUMMY_DATA === "true";

/** Skip auth gate for local UI preview only. */
export const SKIP_LOGIN = process.env.EXPO_PUBLIC_SKIP_LOGIN === "true";

/** Dev-only role override for skip-login preview: `executive` | `company_admin` */
export const DEV_ROLE = process.env.EXPO_PUBLIC_DEV_ROLE as
  | "executive"
  | "company_admin"
  | undefined;
