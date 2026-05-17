import crypto from "node:crypto";
import { ApiError } from "../utils/ApiError";
import { hashPassword } from "../utils/password";
import { generateNextVendorCode } from "../utils/vendor-code";
import { VendorRefreshToken } from "../models/VendorRefreshToken";
import { vendorRepository, type VendorFilter } from "../repositories/vendor.repository";
import type { VendorStatus } from "../constants/vendor";
import type { VendorCallbackUrls } from "../types/vendor-callback";
import { normalizeVendorCallbackUrls, pickCallbackUrlsFromBody } from "../utils/vendor-callback";

const SORT_WHITELIST = [
  "companyName",
  "vendorCode",
  "email",
  "status",
  "createdAt",
  "totalCompletes",
  "lastLoginAt"
] as const;

type SortField = (typeof SORT_WHITELIST)[number];

type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: VendorStatus;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

function isMongoDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

export const vendorService = {
  create: async (
    payload: {
      companyName: string;
      contactPerson?: string;
      email: string;
      password: string;
      phone?: string;
      website?: string;
      callbackUrls?: Partial<VendorCallbackUrls>;
      allowedIps?: string[];
      allowedCountries?: string[];
      notes?: string;
      status?: VendorStatus;
    },
    createdBy?: string
  ) => {
    const email = payload.email.trim().toLowerCase();
    const rawPassword = payload.password?.trim() ?? "";
    if (rawPassword.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }

    const existing = await vendorRepository.findByEmail(email);
    if (existing) throw new ApiError(409, "A vendor with this email already exists");

    try {
      const vendorCode = await generateNextVendorCode();
      const vendorUid = crypto.randomUUID();

      return vendorRepository.create({
        vendorCode,
        vendorUid,
        companyName: payload.companyName.trim(),
        contactPerson: payload.contactPerson?.trim() ?? "",
        email,
        passwordHash: await hashPassword(rawPassword),
        phone: payload.phone?.trim() ?? "",
        website: payload.website?.trim() ?? "",
        status: payload.status ?? "active",
        callbackUrls: normalizeVendorCallbackUrls(payload.callbackUrls),
        allowedIps: normalizeStringArray(payload.allowedIps),
        allowedCountries: normalizeStringArray(payload.allowedCountries),
        notes: payload.notes?.trim() ?? "",
        createdBy: createdBy ?? null,
        updatedBy: createdBy ?? null
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (isMongoDuplicateKey(error)) throw new ApiError(409, "Vendor email or code already exists");
      throw error;
    }
  },

  list: async (params: ListParams) => {
    const page = Math.max(1, Number(params.page ?? 1));
    const pageSize = Math.min(500, Math.max(1, Number(params.pageSize ?? 20)));
    const filter: VendorFilter = {};

    if (params.status) filter.status = params.status;

    if (params.search?.trim()) {
      const q = params.search.trim();
      filter.$or = [
        { companyName: { $regex: q, $options: "i" } },
        { vendorCode: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { contactPerson: { $regex: q, $options: "i" } }
      ];
    }

    const sortField: SortField = SORT_WHITELIST.includes(params.sortBy as SortField)
      ? (params.sortBy as SortField)
      : "createdAt";
    const order: 1 | -1 = params.sortOrder === "asc" ? 1 : -1;
    const sort = { [sortField]: order } as Record<string, 1 | -1>;

    const [items, total] = await Promise.all([
      vendorRepository.findPaged(filter, sort, (page - 1) * pageSize, pageSize),
      vendorRepository.count(filter)
    ]);

    return {
      items,
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
    };
  },

  getById: async (id: string) => {
    const doc = await vendorRepository.findById(id);
    if (!doc) throw new ApiError(404, "Vendor not found");
    return doc;
  },

  getAnalyticsSummary: async (id: string) => {
    const doc = await vendorService.getById(id);
    return doc;
  },

  updateById: async (
    id: string,
    payload: Record<string, unknown>,
    updatedBy?: string
  ) => {
    const update: Record<string, unknown> = { ...payload, updatedBy: updatedBy ?? null };

    if (typeof update.email === "string") {
      const email = update.email.trim().toLowerCase();
      const clash = await vendorRepository.findByEmail(email);
      if (clash && String(clash._id) !== id) {
        throw new ApiError(409, "A vendor with this email already exists");
      }
      update.email = email;
    }

    if (update.allowedIps !== undefined) update.allowedIps = normalizeStringArray(update.allowedIps);
    if (update.allowedCountries !== undefined) {
      update.allowedCountries = normalizeStringArray(update.allowedCountries);
    }

    let nextPassword = "";
    if (typeof update.password === "string") {
      nextPassword = update.password.trim();
    }
    delete update.password;
    delete update.passwordHash;
    delete update.vendorCode;
    delete update.vendorUid;
    delete update.callbackBaseUrl;

    const callbackUrls = pickCallbackUrlsFromBody(update);
    if (callbackUrls !== undefined) {
      update.callbackUrls = callbackUrls;
    }

    try {
      if (nextPassword) {
        await vendorRepository.setPasswordHash(id, await hashPassword(nextPassword));
        await VendorRefreshToken.deleteMany({ vendorId: id });
      }

      const doc = await vendorRepository.updateById(id, update);
      if (!doc) throw new ApiError(404, "Vendor not found");
      return doc;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (isMongoDuplicateKey(error)) throw new ApiError(409, "Vendor email already exists");
      throw error;
    }
  },

  setStatus: async (id: string, status: VendorStatus, updatedBy?: string) => {
    const doc = await vendorRepository.updateById(id, { status, updatedBy: updatedBy ?? null });
    if (!doc) throw new ApiError(404, "Vendor not found");
    return doc;
  },

  deleteById: async (id: string) => {
    const doc = await vendorRepository.deleteById(id);
    if (!doc) throw new ApiError(404, "Vendor not found");
    return doc;
  }
};
