import { Types } from "mongoose";
import { VendorRespondentSession } from "../models/VendorRespondentSession";
import { VendorSurveyAllocation } from "../models/VendorSurveyAllocation";

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
