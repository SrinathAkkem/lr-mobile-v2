import type { LRRequest } from "../types";

/** Formal LR number after approval; tracking ID is assigned immediately on submit. */
export function getLRDisplayId(
  lr: Pick<LRRequest, "lrNumber" | "trackingId"> | null | undefined,
) {
  if (!lr) return "—";
  return lr.lrNumber ?? lr.trackingId ?? "—";
}

export function matchesLRSearch(
  lr: LRRequest,
  query: string,
  extraFields: string[] = [],
) {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  const haystack = [
    lr.lrNumber ?? "",
    lr.trackingId ?? "",
    lr.originCity ?? "",
    lr.destinationCity ?? "",
    lr.executive?.name ?? "",
    ...extraFields,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}
