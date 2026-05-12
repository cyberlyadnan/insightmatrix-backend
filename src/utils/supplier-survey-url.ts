/**
 * Partner-supplied survey entry URLs often include `pid` = company project/study id.
 * Callbacks repeat this `pid` so we can resolve which InsightMatrix routing survey was touched.
 * Respondent-level ids use separate keys (toid, uid, …).
 */
export function extractSupplierProjectPidFromUrl(urlString: string): string | null {
  const raw = urlString?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const v = u.searchParams.get("pid");
    if (v == null) return null;
    const t = v.trim();
    return t.length ? t : null;
  } catch {
    return null;
  }
}
