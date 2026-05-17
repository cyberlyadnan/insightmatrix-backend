import type { VendorStatus } from "../constants/vendor";
import type { VendorCallbackUrls } from "../types/vendor-callback";
import { normalizeVendorCallbackUrls } from "./vendor-callback";
import { buildVendorCallbackConfigurationStatus } from "./vendor-callback-status";

export type VendorDto = {
  id: string;
  vendorCode: string;
  vendorUid: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  status: VendorStatus;
  callbackUrls: VendorCallbackUrls;
  callbackConfigurationStatus: ReturnType<typeof buildVendorCallbackConfigurationStatus>;
  allowedIps: string[];
  allowedCountries: string[];
  notes: string;
  totalAssignedQuota: number;
  totalCompletes: number;
  totalTerminates: number;
  totalQuotaFull: number;
  totalQualityRejects: number;
  totalRevenueGenerated: number;
  totalPayoutDue: number;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type VendorAnalyticsSummaryDto = {
  vendorId: string;
  vendorCode: string;
  companyName: string;
  status: VendorStatus;
  totalAssignedQuota: number;
  totalCompletes: number;
  totalTerminates: number;
  totalQuotaFull: number;
  totalQualityRejects: number;
  totalRevenueGenerated: number;
  totalPayoutDue: number;
  conversionRate: number;
  terminationRate: number;
  lastLoginAt: string | null;
};

export type VendorDashboardSummaryDto = {
  activeAssignments: number;
  totalCompletes: number;
  totalTerminates: number;
  totalQuotaFull: number;
  totalQualityRejects: number;
  conversionRate: number;
  terminationRate: number;
  todayCompletes: number;
  weeklyCompletes: number;
  monthlyCompletes: number;
  totalRevenueGenerated: number;
  totalPayoutDue: number;
};

type VendorDoc = {
  _id: { toString(): string };
  vendorCode: string;
  vendorUid: string;
  companyName: string;
  contactPerson?: string;
  email: string;
  phone?: string;
  website?: string;
  status: VendorStatus;
  callbackUrls?: Partial<VendorCallbackUrls> | VendorCallbackUrls | null;
  /** @deprecated Legacy field — read-only migration source */
  callbackBaseUrl?: string;
  allowedIps?: string[];
  allowedCountries?: string[];
  notes?: string;
  totalAssignedQuota?: number;
  totalCompletes?: number;
  totalTerminates?: number;
  totalQuotaFull?: number;
  totalQualityRejects?: number;
  totalRevenueGenerated?: number;
  totalPayoutDue?: number;
  lastLoginAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toVendorDto(doc: VendorDoc): VendorDto {
  return {
    id: String(doc._id),
    vendorCode: doc.vendorCode,
    vendorUid: doc.vendorUid,
    companyName: doc.companyName,
    contactPerson: doc.contactPerson ?? "",
    email: doc.email,
    phone: doc.phone ?? "",
    website: doc.website ?? "",
    status: doc.status,
    callbackUrls: normalizeVendorCallbackUrls(doc.callbackUrls, doc.callbackBaseUrl),
    callbackConfigurationStatus: buildVendorCallbackConfigurationStatus(
      normalizeVendorCallbackUrls(doc.callbackUrls, doc.callbackBaseUrl)
    ),
    allowedIps: doc.allowedIps ?? [],
    allowedCountries: doc.allowedCountries ?? [],
    notes: doc.notes ?? "",
    totalAssignedQuota: doc.totalAssignedQuota ?? 0,
    totalCompletes: doc.totalCompletes ?? 0,
    totalTerminates: doc.totalTerminates ?? 0,
    totalQuotaFull: doc.totalQuotaFull ?? 0,
    totalQualityRejects: doc.totalQualityRejects ?? 0,
    totalRevenueGenerated: doc.totalRevenueGenerated ?? 0,
    totalPayoutDue: doc.totalPayoutDue ?? 0,
    lastLoginAt: doc.lastLoginAt ? doc.lastLoginAt.toISOString() : null,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null
  };
}

export function toVendorPublicProfile(doc: VendorDoc) {
  return {
    id: String(doc._id),
    vendorCode: doc.vendorCode,
    companyName: doc.companyName,
    contactPerson: doc.contactPerson ?? "",
    email: doc.email,
    phone: doc.phone ?? "",
    website: doc.website ?? "",
    status: doc.status,
    callbackUrls: normalizeVendorCallbackUrls(doc.callbackUrls, doc.callbackBaseUrl),
    callbackConfigurationStatus: buildVendorCallbackConfigurationStatus(
      normalizeVendorCallbackUrls(doc.callbackUrls, doc.callbackBaseUrl)
    ),
    lastLoginAt: doc.lastLoginAt ? doc.lastLoginAt.toISOString() : null
  };
}

function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export function toVendorAnalyticsSummary(doc: VendorDoc): VendorAnalyticsSummaryDto {
  const completes = doc.totalCompletes ?? 0;
  const terminates = doc.totalTerminates ?? 0;
  const quotaFull = doc.totalQuotaFull ?? 0;
  const quality = doc.totalQualityRejects ?? 0;
  const sessions = completes + terminates + quotaFull + quality;

  return {
    vendorId: String(doc._id),
    vendorCode: doc.vendorCode,
    companyName: doc.companyName,
    status: doc.status,
    totalAssignedQuota: doc.totalAssignedQuota ?? 0,
    totalCompletes: completes,
    totalTerminates: terminates,
    totalQuotaFull: quotaFull,
    totalQualityRejects: quality,
    totalRevenueGenerated: doc.totalRevenueGenerated ?? 0,
    totalPayoutDue: doc.totalPayoutDue ?? 0,
    conversionRate: safeRate(completes, sessions),
    terminationRate: safeRate(terminates, sessions),
    lastLoginAt: doc.lastLoginAt ? doc.lastLoginAt.toISOString() : null
  };
}

export function toVendorDashboardSummary(doc: VendorDoc): VendorDashboardSummaryDto {
  const completes = doc.totalCompletes ?? 0;
  const terminates = doc.totalTerminates ?? 0;
  const quotaFull = doc.totalQuotaFull ?? 0;
  const quality = doc.totalQualityRejects ?? 0;
  const sessions = completes + terminates + quotaFull + quality;

  return {
    activeAssignments: 0,
    totalCompletes: completes,
    totalTerminates: terminates,
    totalQuotaFull: quotaFull,
    totalQualityRejects: quality,
    conversionRate: safeRate(completes, sessions),
    terminationRate: safeRate(terminates, sessions),
    todayCompletes: 0,
    weeklyCompletes: 0,
    monthlyCompletes: 0,
    totalRevenueGenerated: doc.totalRevenueGenerated ?? 0,
    totalPayoutDue: doc.totalPayoutDue ?? 0
  };
}
