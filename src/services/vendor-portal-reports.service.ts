import { Types } from "mongoose";
import { VendorRespondentSession } from "../models/VendorRespondentSession";
import { VendorSurveyAllocation } from "../models/VendorSurveyAllocation";
import { Vendor } from "../models/Vendor";

export type DateRangeInput = {
  dateFrom?: string;
  dateTo?: string;
};

export type VendorHourlyReportParams = {
  dateFrom?: string;
  dateTo?: string;
  allocationId?: string;
  status?: string;
  country?: string;
  tzOffsetMinutes?: number;
};

export type HourlyCellMetrics = {
  starts: number;
  completes: number;
  terminates: number;
  quotaFull: number;
  qualityRejects: number;
  revenue: number;
  conversionRate: number;
};

export type HourlySlotRow = {
  hour: number;
  label: string;
  cells: Record<string, HourlyCellMetrics>;
  total: HourlyCellMetrics;
};

export type MarketRow = {
  market: string;
  cells: Record<string, HourlyCellMetrics>;
  total: HourlyCellMetrics;
};

export type VendorHourlyReportDto = {
  dateFrom: string;
  dateTo: string;
  dates: string[];
  summary: {
    totalStarts: number;
    totalCompletes: number;
    totalTerminates: number;
    totalQuotaFull: number;
    totalQualityRejects: number;
    totalRevenue: number;
    conversionRate: number;
    peakHourLabel: string | null;
    peakHourTraffic: number;
    topMarket: string | null;
    topMarketTraffic: number;
  };
  dailyTotals: Record<string, HourlyCellMetrics>;
  hourlyRows: HourlySlotRow[];
  marketRows: MarketRow[];
  filtersMeta: {
    allocations: Array<{
      id: string;
      allocationCode: string;
      surveyName: string;
      surveyCode: string;
    }>;
    countries: string[];
  };
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function emptyCell(): HourlyCellMetrics {
  return {
    starts: 0,
    completes: 0,
    terminates: 0,
    quotaFull: 0,
    qualityRejects: 0,
    revenue: 0,
    conversionRate: 0
  };
}

function finalizeCell(cell: HourlyCellMetrics): HourlyCellMetrics {
  return {
    ...cell,
    revenue: round2(cell.revenue),
    conversionRate: cell.starts > 0 ? round2((cell.completes / cell.starts) * 100) : 0
  };
}

function formatHourSlot(hour: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hour)}:00-${pad(hour + 1)}:00`;
}

/** Parse optional dateFrom/dateTo while preserving exact ISO timestamps if `T` is present. */
export function parseDateBounds(input?: DateRangeInput): { start?: Date; end?: Date } {
  let start: Date | undefined;
  let end: Date | undefined;

  const rawFrom = input?.dateFrom?.trim();
  const rawTo = input?.dateTo?.trim();

  if (rawFrom) {
    const d = new Date(rawFrom);
    if (!Number.isNaN(d.getTime())) {
      if (!rawFrom.includes("T")) {
        d.setHours(0, 0, 0, 0);
      }
      start = d;
    }
  }

  if (rawTo) {
    const d = new Date(rawTo);
    if (!Number.isNaN(d.getTime())) {
      if (!rawTo.includes("T")) {
        d.setHours(23, 59, 59, 999);
      }
      end = d;
    }
  }

  return { start, end };
}

/**
 * Shift a UTC Date by `tzOffsetMinutes` (minutes EAST of UTC, e.g. IST = +330, EST = -300)
 * so we can read local YYYY-MM-DD and hour (0..23) using UTC getters cleanly.
 */
function toShiftedUtcDate(date: Date, tzOffsetMinutes: number): Date {
  return new Date(date.getTime() + tzOffsetMinutes * 60_000);
}

function formatDateKey(shiftedDate: Date): string {
  const y = shiftedDate.getUTCFullYear();
  const m = String(shiftedDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shiftedDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Date-range filtered KPI aggregation for Vendor Dashboard.
 */
export async function fetchVendorDashboardStatsForRange(
  vendorId: string,
  range: DateRangeInput
) {
  const vid = new Types.ObjectId(vendorId);
  const { start, end } = parseDateBounds(range);

  const match: Record<string, unknown> = { vendorId: vid };
  if (start || end) {
    const createdAt: Record<string, Date> = {};
    if (start) createdAt.$gte = start;
    if (end) createdAt.$lte = end;
    match.createdAt = createdAt;
  }

  const [allocations, sessionBuckets] = await Promise.all([
    VendorSurveyAllocation.find({ vendorId: vid })
      .select("_id vendorCpi status vendorResponseStatus")
      .lean(),
    VendorRespondentSession.aggregate<{
      _id: { allocationId: Types.ObjectId; status: string };
      count: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: { allocationId: "$allocationId", status: "$status" },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const cpiMap = new Map<string, number>();
  let activeAssignments = 0;
  for (const a of allocations) {
    cpiMap.set(String(a._id), Number(a.vendorCpi ?? 0));
    if (a.status === "active" && (a as Record<string, unknown>).vendorResponseStatus !== "rejected") {
      activeAssignments += 1;
    }
  }

  let totalStarts = 0;
  let totalCompletes = 0;
  let totalTerminates = 0;
  let totalQuotaFull = 0;
  let totalQualityRejects = 0;
  let totalRevenueGenerated = 0;

  for (const row of sessionBuckets) {
    const count = Number(row.count ?? 0);
    totalStarts += count;
    const st = row._id.status;
    if (st === "complete") {
      totalCompletes += count;
      const cpi = cpiMap.get(String(row._id.allocationId)) ?? 0;
      totalRevenueGenerated += count * cpi;
    } else if (st === "terminate") {
      totalTerminates += count;
    } else if (st === "quota_full") {
      totalQuotaFull += count;
    } else if (st === "quality_reject") {
      totalQualityRejects += count;
    }
  }

  const terminalOutcomes =
    totalCompletes + totalTerminates + totalQuotaFull + totalQualityRejects;

  return {
    activeAssignments,
    totalStarts,
    totalCompletes,
    totalTerminates,
    totalQuotaFull,
    totalQualityRejects,
    conversionRate: totalStarts > 0 ? round2((totalCompletes / totalStarts) * 100) : 0,
    terminationRate:
      terminalOutcomes > 0 ? round2((totalTerminates / terminalOutcomes) * 100) : 0,
    totalRevenueGenerated: round2(totalRevenueGenerated),
    totalPayoutDue: round2(totalRevenueGenerated)
  };
}

/**
 * Full Hourly Report for Vendor Portal:
 * - Hour Wise Traffic (24 slots x dates)
 * - Market Wise Traffic (countries x dates)
 * - Revenue Wise Traffic (24 slots x dates, $)
 * - Conversion Rate (24 slots x dates, %)
 */
export async function fetchVendorHourlyReport(
  vendorId: string,
  params: VendorHourlyReportParams
): Promise<VendorHourlyReportDto> {
  const vid = new Types.ObjectId(vendorId);

  // Clamp timezone offset to valid range (-12h .. +14h)
  const tzOffsetMinutes =
    typeof params.tzOffsetMinutes === "number" &&
    Number.isFinite(params.tzOffsetMinutes) &&
    Math.abs(params.tzOffsetMinutes) <= 840
      ? Math.round(params.tzOffsetMinutes)
      : 0;

  // Resolve date range (default: last 7 days inclusive, ending today in vendor's timezone)
  const now = new Date();
  const parsed = parseDateBounds({ dateFrom: params.dateFrom, dateTo: params.dateTo });

  let endDate = parsed.end ?? now;
  let startDate = parsed.start;
  if (!startDate) {
    const shiftedEnd = toShiftedUtcDate(endDate, tzOffsetMinutes);
    const shiftedStart = new Date(
      Date.UTC(
        shiftedEnd.getUTCFullYear(),
        shiftedEnd.getUTCMonth(),
        shiftedEnd.getUTCDate() - 6,
        0,
        0,
        0,
        0
      )
    );
    startDate = new Date(shiftedStart.getTime() - tzOffsetMinutes * 60_000);
  }

  // Ensure startDate <= endDate and cap max span to 31 days for crisp pivot columns
  if (startDate.getTime() > endDate.getTime()) {
    const tmp = startDate;
    startDate = endDate;
    endDate = tmp;
  }
  const maxSpanMs = 31 * 24 * 60 * 60 * 1000;
  if (endDate.getTime() - startDate.getTime() > maxSpanMs) {
    startDate = new Date(endDate.getTime() - maxSpanMs);
  }

  // Generate ordered list of YYYY-MM-DD columns in vendor's timezone
  const dates: string[] = [];
  const startKeyDate = toShiftedUtcDate(startDate, tzOffsetMinutes);
  const endKeyDate = toShiftedUtcDate(endDate, tzOffsetMinutes);
  const cursor = new Date(
    Date.UTC(startKeyDate.getUTCFullYear(), startKeyDate.getUTCMonth(), startKeyDate.getUTCDate())
  );
  const endDayUtc = new Date(
    Date.UTC(endKeyDate.getUTCFullYear(), endKeyDate.getUTCMonth(), endKeyDate.getUTCDate())
  );

  while (cursor.getTime() <= endDayUtc.getTime() && dates.length < 32) {
    dates.push(formatDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // Fetch all vendor allocations with populated survey metadata for CPI, countries & filter options
  const allocations = await VendorSurveyAllocation.find({ vendorId: vid })
    .populate("panelSurveyId", "surveyName surveyCode targetCountries")
    .select("_id allocationCode vendorCpi panelSurveyId")
    .sort({ createdAt: -1 })
    .lean();

  const allocationMetaMap = new Map<
    string,
    {
      vendorCpi: number;
      countries: string[];
      surveyName: string;
      surveyCode: string;
      allocationCode: string;
    }
  >();
  const allCountriesSet = new Set<string>();
  const filterAllocations: VendorHourlyReportDto["filtersMeta"]["allocations"] = [];

  for (const alloc of allocations) {
    const survey = (alloc.panelSurveyId ?? {}) as unknown as Record<string, unknown>;
    const countries = Array.isArray(survey.targetCountries)
      ? survey.targetCountries.map((c) => String(c).trim().toUpperCase()).filter(Boolean)
      : [];
    for (const c of countries) allCountriesSet.add(c);

    const id = String(alloc._id);
    const surveyName = String(survey.surveyName ?? "Survey");
    const surveyCode = String(survey.surveyCode ?? "");
    const allocationCode = String(alloc.allocationCode ?? "");

    allocationMetaMap.set(id, {
      vendorCpi: Number(alloc.vendorCpi ?? 0),
      countries,
      surveyName,
      surveyCode,
      allocationCode
    });

    filterAllocations.push({ id, allocationCode, surveyName, surveyCode });
  }

  // Build session match filter
  const sessionMatch: Record<string, unknown> = {
    vendorId: vid,
    createdAt: { $gte: startDate, $lte: endDate }
  };

  if (params.allocationId && Types.ObjectId.isValid(params.allocationId)) {
    sessionMatch.allocationId = new Types.ObjectId(params.allocationId);
  }

  if (params.status && params.status !== "all") {
    sessionMatch.status = params.status;
  }

  // Filter by country via matching allocations if country filter is specified
  const normalizedCountry = params.country?.trim().toUpperCase();
  if (normalizedCountry) {
    const matchingAllocIds: Types.ObjectId[] = [];
    for (const [id, meta] of allocationMetaMap.entries()) {
      if (meta.countries.includes(normalizedCountry)) {
        matchingAllocIds.push(new Types.ObjectId(id));
      }
    }
    if (params.allocationId && Types.ObjectId.isValid(params.allocationId)) {
      const requested = params.allocationId;
      const allowed = matchingAllocIds.some((oid) => String(oid) === requested);
      if (!allowed) {
        sessionMatch.allocationId = new Types.ObjectId("000000000000000000000000");
      }
    } else {
      sessionMatch.allocationId = { $in: matchingAllocIds };
    }
  }

  // Fetch matching sessions (lightweight projection)
  const sessions = await VendorRespondentSession.find(sessionMatch)
    .select("allocationId status createdAt")
    .lean();

  // Initialize hourly matrix (0..23 x dates) and daily totals
  const dailyTotalsRaw: Record<string, HourlyCellMetrics> = {};
  for (const d of dates) {
    dailyTotalsRaw[d] = emptyCell();
  }

  const hourlyRaw: Array<{
    hour: number;
    label: string;
    cells: Record<string, HourlyCellMetrics>;
    total: HourlyCellMetrics;
  }> = Array.from({ length: 24 }, (_, hour) => {
    const cells: Record<string, HourlyCellMetrics> = {};
    for (const d of dates) cells[d] = emptyCell();
    return {
      hour,
      label: formatHourSlot(hour),
      cells,
      total: emptyCell()
    };
  });

  const marketMap = new Map<
    string,
    { cells: Record<string, HourlyCellMetrics>; total: HourlyCellMetrics }
  >();

  const ensureMarket = (market: string) => {
    let entry = marketMap.get(market);
    if (!entry) {
      const cells: Record<string, HourlyCellMetrics> = {};
      for (const d of dates) cells[d] = emptyCell();
      entry = { cells, total: emptyCell() };
      marketMap.set(market, entry);
    }
    return entry;
  };

  const accumulate = (cell: HourlyCellMetrics, status: string, cpi: number) => {
    cell.starts += 1;
    if (status === "complete") {
      cell.completes += 1;
      cell.revenue += cpi;
    } else if (status === "terminate") {
      cell.terminates += 1;
    } else if (status === "quota_full") {
      cell.quotaFull += 1;
    } else if (status === "quality_reject") {
      cell.qualityRejects += 1;
    }
  };

  const grandTotalRaw = emptyCell();

  for (const session of sessions) {
    const createdAt = session.createdAt ? new Date(session.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) continue;

    const shifted = toShiftedUtcDate(createdAt, tzOffsetMinutes);
    const dateKey = formatDateKey(shifted);
    const hour = shifted.getUTCHours();

    if (!dailyTotalsRaw[dateKey]) continue;

    const allocMeta = allocationMetaMap.get(String(session.allocationId));
    const cpi = allocMeta?.vendorCpi ?? 0;
    const status = String(session.status ?? "started");

    accumulate(hourlyRaw[hour].cells[dateKey], status, cpi);
    accumulate(hourlyRaw[hour].total, status, cpi);
    accumulate(dailyTotalsRaw[dateKey], status, cpi);
    accumulate(grandTotalRaw, status, cpi);

    const market =
      allocMeta && allocMeta.countries.length > 0 ? allocMeta.countries[0] : "Global";
    const marketEntry = ensureMarket(market);
    accumulate(marketEntry.cells[dateKey], status, cpi);
    accumulate(marketEntry.total, status, cpi);
  }

  // Finalize cells and compute peak hour & top market
  let peakHourLabel: string | null = null;
  let peakHourTraffic = 0;

  const hourlyRows: HourlySlotRow[] = hourlyRaw.map((row) => {
    const cells: Record<string, HourlyCellMetrics> = {};
    for (const d of dates) {
      cells[d] = finalizeCell(row.cells[d]);
    }
    const total = finalizeCell(row.total);
    if (total.starts > peakHourTraffic) {
      peakHourTraffic = total.starts;
      peakHourLabel = row.label;
    }
    return {
      hour: row.hour,
      label: row.label,
      cells,
      total
    };
  });

  const dailyTotals: Record<string, HourlyCellMetrics> = {};
  for (const d of dates) {
    dailyTotals[d] = finalizeCell(dailyTotalsRaw[d]);
  }

  const marketRows: MarketRow[] = Array.from(marketMap.entries())
    .map(([market, entry]) => {
      const cells: Record<string, HourlyCellMetrics> = {};
      for (const d of dates) {
        cells[d] = finalizeCell(entry.cells[d]);
      }
      return {
        market,
        cells,
        total: finalizeCell(entry.total)
      };
    })
    .sort((a, b) => b.total.starts - a.total.starts);

  const topMarketRow = marketRows[0];
  const grandTotal = finalizeCell(grandTotalRaw);

  return {
    dateFrom: dates[0] ?? formatDateKey(startKeyDate),
    dateTo: dates[dates.length - 1] ?? formatDateKey(endKeyDate),
    dates,
    summary: {
      totalStarts: grandTotal.starts,
      totalCompletes: grandTotal.completes,
      totalTerminates: grandTotal.terminates,
      totalQuotaFull: grandTotal.quotaFull,
      totalQualityRejects: grandTotal.qualityRejects,
      totalRevenue: grandTotal.revenue,
      conversionRate: grandTotal.conversionRate,
      peakHourLabel,
      peakHourTraffic,
      topMarket: topMarketRow?.market ?? null,
      topMarketTraffic: topMarketRow?.total.starts ?? 0
    },
    dailyTotals,
    hourlyRows,
    marketRows,
    filtersMeta: {
      allocations: filterAllocations,
      countries: Array.from(allCountriesSet).sort()
    }
  };
}

export type VendorApiTrafficReportParams = {
  dateFrom?: string;
  dateTo?: string;
  country?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type VendorApiTrafficRowDto = {
  id: string;
  respondentId: string;
  internalSessionToken: string;
  surveyId: string;
  allocationCode: string;
  projectName: string;
  market: string;
  countryCode: string;
  entryTime: string | null;
  exitTime: string | null;
  rawStatus: string;
  status: string;
  cpi: number;
  revenue: number;
  redirectStatus: string;
  device: "desktop" | "mobile" | "tablet";
  entryUrl: string | null;
  exitUrl: string | null;
};

export type VendorApiTrafficReportDto = {
  items: VendorApiTrafficRowDto[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalAttempts: number;
    completes: number;
    terminates: number;
    dropOuts: number;
    quotaFull: number;
    qualityRejects: number;
    totalRevenue: number;
    conversionRate: number;
  };
  availableCountries: string[];
};

function detectDeviceFromUserAgent(ua: string): "desktop" | "mobile" | "tablet" {
  const lower = (ua || "").toLowerCase();
  if (!lower) return "desktop";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(lower)) {
    return "tablet";
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(lower)) {
    return "mobile";
  }
  return "desktop";
}

function mapTrafficStatusLabels(
  rawStatus: string,
  allocationStatus?: string,
  surveyStatus?: string
): { status: string; redirectStatus: string } {
  switch (rawStatus) {
    case "complete":
      return { status: "Complete", redirectStatus: "Survey Completed" };
    case "terminate":
      return { status: "Terminate", redirectStatus: "Screened Out / Terminated" };
    case "quota_full":
      return { status: "Quota Full", redirectStatus: "Quota Full" };
    case "quality_reject":
      return { status: "Quality Reject", redirectStatus: "Quality / Security Reject" };
    case "redirected":
      return { status: "Drop Out", redirectStatus: "Client Side Drop Out" };
    case "started":
    default:
      if (
        allocationStatus === "paused" ||
        allocationStatus === "closed" ||
        (surveyStatus && surveyStatus !== "active")
      ) {
        return { status: "Survey Inactive", redirectStatus: "Survey Inactive" };
      }
      return { status: "Drop Out", redirectStatus: "Client Side Drop Out" };
  }
}

function resolveExitUrl(
  rawStatus: string,
  callbackForwarded: boolean,
  callbackUrls: Record<string, string | undefined> | undefined,
  respondentId: string
): string | null {
  if (!callbackForwarded || !callbackUrls) return null;
  const template = callbackUrls[rawStatus];
  if (!template) return null;
  if (!respondentId) return template;
  return template
    .replace(/\[toid\]/gi, encodeURIComponent(respondentId))
    .replace(/\{toid\}/gi, encodeURIComponent(respondentId));
}

/**
 * Detailed respondent-level API traffic report for the authenticated vendor.
 */
export async function fetchVendorApiTrafficReport(
  vendorId: string,
  params: VendorApiTrafficReportParams
): Promise<VendorApiTrafficReportDto> {
  const vid = new Types.ObjectId(vendorId);
  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = Math.min(500, Math.max(1, Number(params.pageSize ?? 50)));
  const skip = (page - 1) * pageSize;

  const [vendorDoc, allocations] = await Promise.all([
    Vendor.findById(vid).select("callbackUrls").lean(),
    VendorSurveyAllocation.find({ vendorId: vid })
      .populate("panelSurveyId", "surveyName surveyCode surveyStatus targetCountries")
      .select("_id allocationCode status vendorResponseStatus vendorCpi routingLink panelSurveyId")
      .lean()
  ]);

  type AllocInfo = {
    allocationCode: string;
    status: string;
    vendorResponseStatus: string;
    vendorCpi: number;
    routingLink: string;
    surveyName: string;
    surveyCode: string;
    surveyStatus: string;
    countries: string[];
  };

  const allocMap = new Map<string, AllocInfo>();
  const availableCountriesSet = new Set<string>();

  for (const alloc of allocations) {
    const survey = (alloc.panelSurveyId ?? {}) as unknown as Record<string, unknown>;
    const countries = Array.isArray(survey.targetCountries)
      ? survey.targetCountries.map((c) => String(c).trim().toUpperCase()).filter(Boolean)
      : [];
    for (const c of countries) availableCountriesSet.add(c);

    allocMap.set(String(alloc._id), {
      allocationCode: String(alloc.allocationCode ?? ""),
      status: String(alloc.status ?? "active"),
      vendorResponseStatus: String(
        (alloc as Record<string, unknown>).vendorResponseStatus ?? "pending"
      ),
      vendorCpi: Number(alloc.vendorCpi ?? 0),
      routingLink: String(alloc.routingLink ?? ""),
      surveyName: String(survey.surveyName ?? "Survey"),
      surveyCode: String(survey.surveyCode ?? ""),
      surveyStatus: String(survey.surveyStatus ?? ""),
      countries
    });
  }

  const match: Record<string, unknown> = { vendorId: vid };

  // Date range bounds
  const { start, end } = parseDateBounds({ dateFrom: params.dateFrom, dateTo: params.dateTo });
  if (start || end) {
    const createdAt: Record<string, Date> = {};
    if (start) createdAt.$gte = start;
    if (end) createdAt.$lte = end;
    match.createdAt = createdAt;
  }

  // Status filter
  const normalizedStatus = params.status?.trim();
  if (normalizedStatus && normalizedStatus !== "all") {
    if (normalizedStatus === "drop_out") {
      match.status = { $in: ["started", "redirected"] };
    } else {
      match.status = normalizedStatus;
    }
  }

  // Country filter via matching allocations
  const normalizedCountry = params.country?.trim().toUpperCase();
  if (normalizedCountry) {
    const matchingAllocIds: Types.ObjectId[] = [];
    for (const [id, info] of allocMap.entries()) {
      if (info.countries.includes(normalizedCountry)) {
        matchingAllocIds.push(new Types.ObjectId(id));
      }
    }
    match.allocationId = { $in: matchingAllocIds };
  }

  // Search filter (respondent ID, internal token, or matching survey/allocation)
  const q = params.search?.trim();
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    const matchingAllocIdsForSearch: Types.ObjectId[] = [];
    for (const [id, info] of allocMap.entries()) {
      if (
        regex.test(info.surveyName) ||
        regex.test(info.surveyCode) ||
        regex.test(info.allocationCode)
      ) {
        matchingAllocIdsForSearch.push(new Types.ObjectId(id));
      }
    }
    match.$or = [
      { vendorRespondentToid: regex },
      { vendorRespondentId: regex },
      { internalSessionToken: regex },
      ...(matchingAllocIdsForSearch.length > 0
        ? [{ allocationId: { $in: matchingAllocIdsForSearch } }]
        : [])
    ];
  }

  const [sessions, total, summaryAgg] = await Promise.all([
    VendorRespondentSession.find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .select(
        "_id vendorRespondentToid vendorRespondentId internalSessionToken allocationId status callbackForwarded userAgent startedAt completedAt createdAt"
      )
      .lean(),
    VendorRespondentSession.countDocuments(match),
    VendorRespondentSession.aggregate<{
      _id: { allocationId: Types.ObjectId; status: string };
      count: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: { allocationId: "$allocationId", status: "$status" },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  let totalAttempts = 0;
  let completes = 0;
  let terminates = 0;
  let dropOuts = 0;
  let quotaFull = 0;
  let qualityRejects = 0;
  let totalRevenue = 0;

  for (const bucket of summaryAgg) {
    const count = Number(bucket.count ?? 0);
    totalAttempts += count;
    const st = bucket._id.status;
    if (st === "complete") {
      completes += count;
      const cpi = allocMap.get(String(bucket._id.allocationId))?.vendorCpi ?? 0;
      totalRevenue += count * cpi;
    } else if (st === "terminate") {
      terminates += count;
    } else if (st === "quota_full") {
      quotaFull += count;
    } else if (st === "quality_reject") {
      qualityRejects += count;
    } else {
      dropOuts += count;
    }
  }

  const callbackUrls = (vendorDoc?.callbackUrls ?? undefined) as
    | Record<string, string | undefined>
    | undefined;

  const items: VendorApiTrafficRowDto[] = sessions.map((s) => {
    const alloc = allocMap.get(String(s.allocationId));
    const respondentId =
      String(s.vendorRespondentToid || s.vendorRespondentId || s.internalSessionToken || "");
    const rawStatus = String(s.status ?? "started");
    const cpi = alloc?.vendorCpi ?? 0;
    const revenue = rawStatus === "complete" ? round2(cpi) : 0;
    const countryCode = alloc && alloc.countries.length > 0 ? alloc.countries[0] : "GLOBAL";
    const labels = mapTrafficStatusLabels(rawStatus, alloc?.status, alloc?.surveyStatus);
    const entryDate = s.startedAt ?? s.createdAt;
    const exitDate = s.completedAt ?? null;
    const isAccepted = alloc?.vendorResponseStatus === "accepted";
    const entryUrl =
      isAccepted && alloc?.routingLink
        ? `${alloc.routingLink}?toid=${encodeURIComponent(respondentId)}`
        : null;
    const exitUrl = resolveExitUrl(
      rawStatus,
      Boolean(s.callbackForwarded),
      callbackUrls,
      respondentId
    );

    return {
      id: String(s._id),
      respondentId,
      internalSessionToken: String(s.internalSessionToken ?? ""),
      surveyId: alloc?.surveyCode || alloc?.allocationCode || "—",
      allocationCode: alloc?.allocationCode || "—",
      projectName: alloc?.surveyName || "Survey",
      market: countryCode,
      countryCode,
      entryTime: entryDate ? new Date(entryDate).toISOString() : null,
      exitTime: exitDate ? new Date(exitDate).toISOString() : null,
      rawStatus,
      status: labels.status,
      cpi: round2(cpi),
      revenue,
      redirectStatus: labels.redirectStatus,
      device: detectDeviceFromUserAgent(String(s.userAgent ?? "")),
      entryUrl,
      exitUrl
    };
  });

  return {
    items,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    },
    summary: {
      totalAttempts,
      completes,
      terminates,
      dropOuts,
      quotaFull,
      qualityRejects,
      totalRevenue: round2(totalRevenue),
      conversionRate: totalAttempts > 0 ? round2((completes / totalAttempts) * 100) : 0
    },
    availableCountries: Array.from(availableCountriesSet).sort()
  };
}

export type VendorLiveInventoryRowDto = {
  countryCode: string;
  liveSurveys: number;
  liveInventories: number;
  totalAllocatedQuota: number;
  avgCpi: number;
  avgLoi: number | null;
  avgIr: number | null;
};

export type VendorLiveInventoryDto = {
  items: VendorLiveInventoryRowDto[];
  summary: {
    totalCountries: number;
    totalLiveSurveys: number;
    totalLiveInventories: number;
    topCountryCode: string | null;
  };
  availableCountries: string[];
};

/**
 * Country-wise live inventory available to the authenticated vendor.
 */
export async function fetchVendorLiveInventory(
  vendorId: string,
  params?: { country?: string }
): Promise<VendorLiveInventoryDto> {
  const vid = new Types.ObjectId(vendorId);

  const allocations = await VendorSurveyAllocation.find({
    vendorId: vid,
    status: "active",
    vendorResponseStatus: { $ne: "rejected" }
  })
    .populate(
      "panelSurveyId",
      "surveyStatus targetCountries estimatedLOI incidenceRate remainingQuota totalQuota"
    )
    .select("allocatedQuota completedCount liveRemainingQuota vendorCpi panelSurveyId")
    .lean();

  const bucketMap = new Map<
    string,
    {
      liveSurveys: number;
      liveInventories: number;
      totalAllocatedQuota: number;
      cpiSum: number;
      cpiCount: number;
      loiSum: number;
      loiCount: number;
      irSum: number;
      irCount: number;
    }
  >();

  const availableCountriesSet = new Set<string>();
  const filterCountry = params?.country?.trim().toUpperCase();

  for (const alloc of allocations) {
    const survey = (alloc.panelSurveyId ?? {}) as unknown as Record<string, unknown>;
    if (!survey || !survey._id) continue;

    // Live inventory only includes active surveys with remaining capacity
    const surveyStatus = String(survey.surveyStatus ?? "active");
    if (surveyStatus !== "active") continue;

    const remaining = Math.max(
      0,
      Number(
        alloc.liveRemainingQuota ??
          Math.max(0, Number(alloc.allocatedQuota ?? 0) - Number(alloc.completedCount ?? 0))
      )
    );
    if (remaining <= 0) continue;

    const rawCountries = Array.isArray(survey.targetCountries)
      ? survey.targetCountries.map((c) => String(c).trim().toUpperCase()).filter(Boolean)
      : [];
    const countries = rawCountries.length > 0 ? rawCountries : ["GLOBAL"];

    const cpi = Number(alloc.vendorCpi ?? 0);
    const loi =
      survey.estimatedLOI !== null && survey.estimatedLOI !== undefined
        ? Number(survey.estimatedLOI)
        : null;
    const ir =
      survey.incidenceRate !== null && survey.incidenceRate !== undefined
        ? Number(survey.incidenceRate)
        : null;

    for (const code of countries) {
      availableCountriesSet.add(code);
      if (filterCountry && code !== filterCountry) continue;

      let entry = bucketMap.get(code);
      if (!entry) {
        entry = {
          liveSurveys: 0,
          liveInventories: 0,
          totalAllocatedQuota: 0,
          cpiSum: 0,
          cpiCount: 0,
          loiSum: 0,
          loiCount: 0,
          irSum: 0,
          irCount: 0
        };
        bucketMap.set(code, entry);
      }

      entry.liveSurveys += 1;
      entry.liveInventories += remaining;
      entry.totalAllocatedQuota += Number(alloc.allocatedQuota ?? 0);
      if (cpi > 0) {
        entry.cpiSum += cpi;
        entry.cpiCount += 1;
      }
      if (loi !== null && Number.isFinite(loi)) {
        entry.loiSum += loi;
        entry.loiCount += 1;
      }
      if (ir !== null && Number.isFinite(ir)) {
        entry.irSum += ir;
        entry.irCount += 1;
      }
    }
  }

  const items: VendorLiveInventoryRowDto[] = Array.from(bucketMap.entries())
    .map(([countryCode, b]) => ({
      countryCode,
      liveSurveys: b.liveSurveys,
      liveInventories: b.liveInventories,
      totalAllocatedQuota: b.totalAllocatedQuota,
      avgCpi: b.cpiCount > 0 ? round2(b.cpiSum / b.cpiCount) : 0,
      avgLoi: b.loiCount > 0 ? Math.round(b.loiSum / b.loiCount) : null,
      avgIr: b.irCount > 0 ? Math.round(b.irSum / b.irCount) : null
    }))
    .sort((a, b) => a.countryCode.localeCompare(b.countryCode));

  let totalLiveSurveys = 0;
  let totalLiveInventories = 0;
  let topCountryCode: string | null = null;
  let topInventory = -1;

  for (const row of items) {
    totalLiveSurveys += row.liveSurveys;
    totalLiveInventories += row.liveInventories;
    if (row.liveInventories > topInventory) {
      topInventory = row.liveInventories;
      topCountryCode = row.countryCode;
    }
  }

  return {
    items,
    summary: {
      totalCountries: items.length,
      totalLiveSurveys,
      totalLiveInventories,
      topCountryCode
    },
    availableCountries: Array.from(availableCountriesSet).sort()
  };
}
