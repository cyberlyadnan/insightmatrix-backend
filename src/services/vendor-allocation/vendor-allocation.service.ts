import { Types } from "mongoose";
import { ApiError } from "../../utils/ApiError";
import { PanelSurvey } from "../../models/PanelSurvey";
import { Vendor } from "../../models/Vendor";
import { vendorAllocationRepository, type VendorAllocationFilter } from "../../repositories/vendor-allocation.repository";
import { generateNextAllocationCode } from "../../utils/allocation-code";
import { buildVendorAllocationRoutingLink } from "../../utils/vendor-routing-link";
import { generateUniqueRoutingSlug } from "../../utils/routing-slug";
import {
  computeLiveRemainingQuota,
  computeRates,
  validateAllocationQuotaAgainstSurvey,
  refreshAllocationQuotaFields
} from "./allocation-quota.service";
import type { VendorAllocationStatus } from "../../constants/vendor-allocation";

type CreatePayload = {
  panelSurveyId: string;
  vendorId: string;
  allocatedQuota: number;
  vendorCpi?: number;
  clientCpi?: number;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string;
  createdBy?: Types.ObjectId;
};

type UpdatePayload = {
  allocatedQuota?: number;
  vendorCpi?: number;
  clientCpi?: number;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string;
  updatedBy?: Types.ObjectId;
};

function parseDate(v: string | null | undefined): Date | null {
  if (v === null || v === undefined || v === "") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, "Invalid date");
  return d;
}

function margin(clientCpi: number, vendorCpi: number) {
  return Math.round((clientCpi - vendorCpi) * 100) / 100;
}

export const vendorAllocationService = {
  async list(filter: VendorAllocationFilter) {
    return vendorAllocationRepository.list(filter);
  },

  async getById(id: string) {
    const doc = await vendorAllocationRepository.findById(id);
    if (!doc) throw new ApiError(404, "Allocation not found");
    return doc;
  },

  async create(payload: CreatePayload) {
    if (!Types.ObjectId.isValid(payload.panelSurveyId)) {
      throw new ApiError(400, "Invalid panel survey id");
    }
    if (!Types.ObjectId.isValid(payload.vendorId)) {
      throw new ApiError(400, "Invalid vendor id");
    }

    const [survey, vendor] = await Promise.all([
      PanelSurvey.findById(payload.panelSurveyId).lean(),
      Vendor.findById(payload.vendorId).select("status companyName").lean()
    ]);
    if (!survey) throw new ApiError(404, "Panel survey not found");
    if (!vendor) throw new ApiError(404, "Vendor not found");
    if (vendor.status === "suspended") {
      throw new ApiError(400, "Cannot assign surveys to a suspended vendor");
    }

    await validateAllocationQuotaAgainstSurvey(payload.panelSurveyId, payload.allocatedQuota);

    const allocationCode = await generateNextAllocationCode();
    const routingSlug = await generateUniqueRoutingSlug();
    const routingLink = buildVendorAllocationRoutingLink(routingSlug);
    const vendorCpi = Number(payload.vendorCpi ?? 0);
    const clientCpi = Number(payload.clientCpi ?? survey.revenuePerComplete ?? 0);
    const liveRemainingQuota = payload.allocatedQuota;
    const { conversionRate, incidenceRate } = computeRates(0, 0);

    const doc = await vendorAllocationRepository.create({
      allocationCode,
      routingSlug,
      panelSurveyId: payload.panelSurveyId,
      vendorId: payload.vendorId,
      status: "active",
      allocatedQuota: payload.allocatedQuota,
      liveRemainingQuota,
      conversionRate,
      incidenceRate,
      vendorCpi,
      clientCpi,
      marginPerComplete: margin(clientCpi, vendorCpi),
      routingLink,
      startDate: parseDate(payload.startDate),
      endDate: parseDate(payload.endDate),
      notes: String(payload.notes ?? "").trim(),
      createdBy: payload.createdBy ?? null
    });

    return vendorAllocationRepository.findById(String(doc._id));
  },

  async update(id: string, payload: UpdatePayload) {
    const existing = await vendorAllocationRepository.findById(id);
    if (!existing) throw new ApiError(404, "Allocation not found");

    if (existing.status === "closed") {
      throw new ApiError(400, "Closed allocations cannot be edited");
    }

    const update: Record<string, unknown> = { updatedBy: payload.updatedBy ?? null };

    if (payload.allocatedQuota !== undefined) {
      await validateAllocationQuotaAgainstSurvey(
        String(existing.panelSurveyId?._id ?? existing.panelSurveyId),
        payload.allocatedQuota,
        id
      );
      update.allocatedQuota = payload.allocatedQuota;
      update.liveRemainingQuota = computeLiveRemainingQuota(
        payload.allocatedQuota,
        Number(existing.completedCount ?? 0)
      );
    }

    if (payload.vendorCpi !== undefined) update.vendorCpi = payload.vendorCpi;
    if (payload.clientCpi !== undefined) update.clientCpi = payload.clientCpi;
    if (payload.notes !== undefined) update.notes = String(payload.notes).trim();
    if (payload.startDate !== undefined) update.startDate = parseDate(payload.startDate);
    if (payload.endDate !== undefined) update.endDate = parseDate(payload.endDate);

    const clientCpi = Number(
      payload.clientCpi ?? existing.clientCpi ?? 0
    );
    const vendorCpi = Number(payload.vendorCpi ?? existing.vendorCpi ?? 0);
    update.marginPerComplete = margin(clientCpi, vendorCpi);

    const doc = await vendorAllocationRepository.updateById(id, update);
    if (!doc) throw new ApiError(404, "Allocation not found");
    await refreshAllocationQuotaFields(new Types.ObjectId(id));
    return vendorAllocationRepository.findById(id);
  },

  async setStatus(id: string, status: VendorAllocationStatus, updatedBy?: Types.ObjectId) {
    const existing = await vendorAllocationRepository.findById(id);
    if (!existing) throw new ApiError(404, "Allocation not found");

    const allowed: Record<VendorAllocationStatus, VendorAllocationStatus[]> = {
      active: ["paused", "closed", "completed"],
      paused: ["active", "closed"],
      completed: ["closed"],
      closed: []
    };

    const current = existing.status as VendorAllocationStatus;
    if (current === status) return existing;

    if (!allowed[current]?.includes(status) && current !== status) {
      if (status === "active" && current === "paused") {
        // ok resume
      } else if (status !== "active" || current !== "paused") {
        if (!(status === "completed" && current === "active")) {
          // allow auto-complete via refresh; manual close always ok from non-closed
        }
      }
    }

    if (status === "closed" && current === "closed") {
      throw new ApiError(400, "Allocation is already closed");
    }

    const doc = await vendorAllocationRepository.updateById(id, {
      status,
      updatedBy: updatedBy ?? null
    });
    return doc;
  },

  async pause(id: string, updatedBy?: Types.ObjectId) {
    return this.setStatus(id, "paused", updatedBy);
  },

  async resume(id: string, updatedBy?: Types.ObjectId) {
    const doc = await vendorAllocationRepository.findById(id);
    if (!doc) throw new ApiError(404, "Allocation not found");
    if (doc.status !== "paused") {
      throw new ApiError(400, "Only paused allocations can be resumed");
    }
    return this.setStatus(id, "active", updatedBy);
  },

  async close(id: string, updatedBy?: Types.ObjectId) {
    return this.setStatus(id, "closed", updatedBy);
  },

  async remove(id: string) {
    const doc = await vendorAllocationRepository.findById(id);
    if (!doc) throw new ApiError(404, "Allocation not found");
    if ((doc.startedCount ?? 0) > 0) {
      throw new ApiError(
        400,
        "Cannot delete allocation with recorded sessions. Close it instead."
      );
    }
    await vendorAllocationRepository.deleteById(id);
  },

  async listForVendor(vendorId: string, filter: Omit<VendorAllocationFilter, "vendorId">) {
    return vendorAllocationRepository.list({ ...filter, vendorId });
  },

  async getForVendor(vendorId: string, allocationId: string) {
    const doc = await vendorAllocationRepository.findById(allocationId);
    if (!doc) throw new ApiError(404, "Allocation not found");
    if (String(doc.vendorId?._id ?? doc.vendorId) !== vendorId) {
      throw new ApiError(404, "Allocation not found");
    }
    return doc;
  }
};
